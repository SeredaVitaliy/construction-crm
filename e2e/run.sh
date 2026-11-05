#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
SECRET=$(openssl rand -hex 32)

psql -q -d postgres -c "drop database if exists e2e with (force)" -c "create database e2e"
for f in supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d e2e -f "$f"; done
psql -q -d e2e -c "insert into auth.users(email) values ('manager@example.com'),('ivanov@example.com'),('petrov@example.com')" \
  -c "do \$\$ begin if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator login noinherit; end if; end \$\$" \
  -c "grant anon, authenticated to authenticator"
psql -q -v ON_ERROR_STOP=1 -d e2e -f supabase/seed.sql

cat > e2e/.pgrst.conf <<CONF
db-uri = "postgres://authenticator@/e2e?host=${PGHOST:-/var/run/postgresql}&port=${PGPORT:-5432}"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$SECRET"
server-port = 3000
CONF

trap 'kill $(jobs -p) 2>/dev/null' EXIT
postgrest e2e/.pgrst.conf > /dev/null 2>&1 &
JWT_SECRET=$SECRET node e2e/gateway.mjs > /dev/null 2>&1 &
ANON=$(JWT_SECRET=$SECRET node e2e/gateway.mjs anon-key | tail -1)
VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=$ANON ./node_modules/.bin/vite --port 5173 --strictPort > /dev/null 2>&1 &
sleep 4

mkdir -p e2e/screenshots
PETROV_TASK=$(psql -d e2e -Atc "select id from tasks where title='Монтаж стеллажей'") node e2e/flow.cjs
