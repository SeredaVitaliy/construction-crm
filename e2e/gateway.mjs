// Мини-заглушка Supabase: /auth/v1 (вход по паролю, refresh, user, logout) + прокси /rest/v1 → PostgREST
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET не задан');
const PGRST = 'http://127.0.0.1:3000';
const PASSWORD = 'Demo12345!';
const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
export const sign = (payload) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(payload);
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
};
// `node gateway.mjs anon-key` — напечатать публичный ключ (JWT с ролью anon) и выйти
if (process.argv[2] === 'anon-key') { console.log(sign({ role: 'anon', iss: 'supabase' })); process.exit(0); }

const verify = (t) => {
  const [h, p, s] = (t || '').split('.');
  if (!s || crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url') !== s) return null;
  return JSON.parse(Buffer.from(p, 'base64url').toString());
};
const users = Object.fromEntries(
  execFileSync('psql', ['-d', 'e2e', '-Atc', 'select email, id from auth.users'])  // PGHOST/PGPORT/PGUSER из окружения
    .toString().trim().split('\n').map((l) => l.split('|')),
);
const refresh = new Map();
const session = (email) => {
  const id = users[email], now = Math.floor(Date.now() / 1000);
  const user = { id, email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
  const rt = crypto.randomUUID(); refresh.set(rt, email);
  return { access_token: sign({ sub: id, email, role: 'authenticated', aud: 'authenticated', exp: now + 3600, iat: now }), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: rt, user };
};
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*' };
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const url = new URL(req.url, 'http://x');
  const chunks = []; for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  if (url.pathname.startsWith('/auth/v1/')) {
    const body = raw.length ? JSON.parse(raw) : {};
    const path = url.pathname.slice(9);
    if (path === 'token' && url.searchParams.get('grant_type') === 'password') {
      if (!users[body.email] || body.password !== PASSWORD) return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', message: 'Invalid login credentials' });
      return json(res, 200, session(body.email));
    }
    if (path === 'token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const email = refresh.get(body.refresh_token);
      return email ? json(res, 200, session(email)) : json(res, 400, { error: 'invalid_grant', message: 'Invalid Refresh Token' });
    }
    if (path === 'user') {
      const c = verify((req.headers.authorization || '').replace('Bearer ', ''));
      return c?.sub ? json(res, 200, { id: c.sub, email: c.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) : json(res, 401, { message: 'invalid JWT' });
    }
    if (path === 'logout') { res.writeHead(204, cors); return res.end(); }
    if (path === 'signup') return json(res, 422, { code: 'signup_disabled', message: 'Signups not allowed for this instance' });
    return json(res, 404, { message: 'not mocked: ' + path });
  }
  if (url.pathname.startsWith('/rest/v1')) {
    const headers = { ...req.headers }; delete headers.host; delete headers['content-length'];
    const r = await fetch(PGRST + url.pathname.slice(8) + url.search, { method: req.method, headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : raw });
    const out = Buffer.from(await r.arrayBuffer());
    const h = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'transfer-encoding', 'content-length'].includes(k)));
    res.writeHead(r.status, { ...h, ...cors }); return res.end(out);
  }
  json(res, 404, { message: 'not found' });
}).listen(54321, () => console.log('gateway :54321'));
