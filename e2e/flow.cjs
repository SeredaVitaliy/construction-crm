const { chromium } = require('playwright');
const B = 'http://localhost:5173', PW = 'Demo12345!', SH = require('path').join(__dirname, 'screenshots') + '/';
const PETROV_TASK = process.env.PETROV_TASK;
const errors = [];
let step = 0;
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ', m); };

async function login(page, email, pw = PW) {
  await page.goto(B + '/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(pw);
  await page.getByRole('button', { name: 'Войти' }).click();
}
async function newUser(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on('console', (m) => ['error','warning'].includes(m.type()) && !m.text().startsWith('Failed to load resource') && errors.push(email + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(email + ' pageerror: ' + e.message));
  await login(page, email);
  await page.waitForURL('**/objects');
  return { ctx, page };
}
const rows = async (page, n) => { for (let i = 0; i < 40; i++) { if (await page.locator('.ant-table-row').count() === n) return true; await page.waitForTimeout(100); } return false; };
const shot = (page, name) => page.screenshot({ path: SH + String(++step).padStart(2, '0') + '-' + name + '.png', fullPage: true });
const statusIs = async (page, label) => page.locator('.ant-card-head').first().getByText(label, { exact: true }).waitFor();

(async () => {
  const browser = await chromium.launch();

  {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    await login(page, 'ivanov@example.com', 'wrong');
    await page.getByText('Неверный email или пароль').waitFor();
    ok(true, 'неверный пароль → понятная ошибка');
    await shot(page, 'login-error'); await ctx.close();
  }

  const iv = await newUser(browser, 'ivanov@example.com');
  let p = iv.page;
  await p.getByRole('link', { name: 'ЖК «Северный»' }).waitFor();
  ok(await p.getByRole('link', { name: 'Склад «Южный»' }).count() === 0, 'исполнитель не видит объект без своих задач');
  ok(await p.getByRole('button', { name: 'Добавить объект' }).count() === 0, 'исполнитель не видит «Добавить объект»');
  ok(await p.getByRole('button', { name: 'Изменить' }).count() === 0, 'исполнитель не видит «Изменить» у объектов');
  await shot(p, 'executor-objects');

  await p.getByRole('link', { name: 'Мои задачи' }).click();
  await p.getByRole('link', { name: 'Разметка котлована' }).waitFor();
  ok(await rows(p, 3), 'в «Моих задачах» ровно 3 задачи Иванова');
  await shot(p, 'executor-my-tasks');
  await p.getByText('Принята (1)').click();
  await p.waitForURL('**status=accepted');
  ok(await rows(p, 1), 'фильтр по статусу работает и пишется в URL');
  await p.reload();
  await p.getByRole('link', { name: 'Прокладка кабеля' }).waitFor();
  ok(true, 'после F5 сессия и фильтр сохранились');

  await p.goto(B + '/my-tasks');
  await p.getByRole('link', { name: 'Разметка котлована' }).click();
  await statusIs(p, 'Новая');
  ok(await p.getByRole('button', { name: 'Взять в работу' }).count() === 1, 'Новая: исполнитель видит «Взять в работу»');
  ok(await p.getByRole('button', { name: 'Принять' }).count() === 0, 'исполнитель не видит «Принять»');
  ok(await p.getByRole('button', { name: 'Удалить' }).count() === 0, 'исполнитель не видит «Удалить»');
  await shot(p, 'executor-task-new');
  await p.getByRole('button', { name: 'Взять в работу' }).click();
  await statusIs(p, 'В работе');
  await p.getByRole('button', { name: 'Отправить на проверку' }).click();
  await statusIs(p, 'На проверке');
  ok(await p.locator('.ant-card-body').first().getByRole('button').count() === 0, 'На проверке: у исполнителя кнопок нет');
  ok(await p.locator('.ant-timeline-item').count() === 3, 'история: 3 записи');
  const taskUrl = p.url();
  await shot(p, 'executor-task-review');

  await p.goto(B + '/tasks/' + PETROV_TASK);
  await p.getByText('Задача не найдена').waitFor();
  ok(true, 'чужая задача по прямой ссылке → «не найдена»');
  await shot(p, 'executor-foreign-task');

  const m = await newUser(browser, 'manager@example.com');
  p = m.page;
  await p.getByRole('link', { name: 'Склад «Южный»' }).waitFor();
  ok(await p.getByRole('link', { name: 'Мои задачи' }).count() === 0, 'у постановщика нет «Мои задачи»');
  await shot(p, 'manager-objects');

  await p.goto(taskUrl);
  await statusIs(p, 'На проверке');
  ok(await p.getByRole('button', { name: 'Взять в работу' }).count() === 0, 'постановщик не видит действий исполнителя');
  await p.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await p.getByRole('dialog').getByRole('button', { name: 'Отправить' }).click();
  await p.getByText('Комментарий обязателен').waitFor();
  ok(true, 'на доработку без комментария не отправить');
  await p.getByRole('dialog').getByRole('textbox').fill('Разметка смещена на 20 см по оси Б');
  await shot(p, 'manager-rework-modal');
  await p.getByRole('dialog').getByRole('button', { name: 'Отправить' }).click();
  await statusIs(p, 'На доработке');
  await p.getByText('«Разметка смещена на 20 см по оси Б»').waitFor();
  ok(true, 'возврат на доработку с комментарием, комментарий в истории');
  await shot(p, 'manager-task-rework');

  await p.goto(B + '/objects');
  await p.getByRole('button', { name: 'Добавить объект' }).click();
  await p.getByRole('dialog').getByLabel('Название').fill('Коттедж в Зеленоградске');
  await p.getByRole('dialog').getByLabel('Адрес').fill('Зеленоградск, ул. Морская, 3');
  await p.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click();
  await p.getByRole('link', { name: 'Коттедж в Зеленоградске' }).click();
  await p.getByRole('button', { name: 'Новая задача' }).click();
  const d = p.getByRole('dialog');
  await d.getByLabel('Название').fill('Устройство кровли');
  await d.getByLabel('Описание').fill('Металлочерепица, 140 м²');
  await d.getByLabel('Исполнитель').click();
  await p.locator('.ant-select-item-option').filter({ hasText: 'Пётр Петров' }).click();
  ok(await p.locator('.ant-select-item-option').filter({ hasText: 'Анна' }).count() === 0, 'в списке исполнителей нет постановщика');
  await shot(p, 'manager-new-task');
  await d.getByRole('button', { name: 'Сохранить' }).click();
  await p.getByRole('link', { name: 'Устройство кровли' }).click();
  await statusIs(p, 'Новая');
  ok(await p.locator('.ant-timeline-item').count() === 1, 'новая задача: запись «создана» в истории');
  await p.getByRole('button', { name: 'Изменить' }).click();
  await p.getByRole('dialog').getByLabel('Название').fill('Устройство кровли (утеплённой)');
  await p.getByRole('dialog').getByRole('button', { name: 'Сохранить' }).click();
  await p.getByText('Устройство кровли (утеплённой)').first().waitFor();
  ok(true, 'постановщик редактирует задачу');
  await shot(p, 'manager-task-card');

  await p.goto(B + '/objects');
  const row = p.locator('.ant-table-row').filter({ hasText: 'Коттедж в Зеленоградске' });
  await row.getByRole('button', { name: 'Удалить' }).click();
  await p.locator('.ant-popconfirm').getByRole('button', { name: 'Удалить' }).click();
  await p.getByText('Нельзя удалить: есть связанные задачи').waitFor();
  ok(true, 'объект с задачами не удаляется, понятная ошибка');

  const pt = await newUser(browser, 'petrov@example.com');
  await pt.page.goto(B + '/my-tasks');
  await pt.page.getByRole('link', { name: 'Устройство кровли (утеплённой)' }).waitFor();
  ok(true, 'назначенная задача появилась у Петрова');
  await pt.page.goto(taskUrl);
  await pt.page.getByText('Задача не найдена').waitFor();
  ok(true, 'Петров не открывает задачу Иванова');

  await p.goto(B + '/objects');
  await p.getByRole('link', { name: 'Коттедж в Зеленоградске' }).click();
  await p.getByRole('link', { name: 'Устройство кровли (утеплённой)' }).click();
  await p.getByRole('button', { name: 'Удалить' }).click();
  await p.locator('.ant-popconfirm').getByRole('button', { name: 'Удалить' }).click();
  await p.getByText('Задача удалена').waitFor();
  await p.goto(B + '/objects');
  await p.locator('.ant-table-row').filter({ hasText: 'Коттедж' }).getByRole('button', { name: 'Удалить' }).click();
  await p.locator('.ant-popconfirm').getByRole('button', { name: 'Удалить' }).click();
  await p.getByText('Объект удалён').waitFor();
  ok(true, 'постановщик удаляет задачу и пустой объект');

  p = iv.page;
  await p.goto(taskUrl);
  await statusIs(p, 'На доработке');
  await p.getByRole('button', { name: 'Взять в работу' }).click();
  await statusIs(p, 'В работе');
  ok(await p.locator('.ant-timeline-item').count() === 5, 'доработка → в работе, история из 5 шагов');
  await shot(p, 'executor-task-history');

  await p.getByRole('button', { name: 'Отправить на проверку' }).waitFor();
  const p2 = await iv.ctx.newPage(); await p2.goto(taskUrl);
  await p2.getByRole('button', { name: 'Отправить на проверку' }).click();
  await statusIs(p2, 'На проверке');
  await p.getByRole('button', { name: 'Отправить на проверку' }).click();
  await p.getByText('Задача уже в статусе «На проверке»').waitFor();
  await statusIs(p, 'На проверке');
  ok(true, 'устаревшая кнопка: база отказала, экран обновился');

  await p.getByRole('button', { name: 'Выйти' }).click();
  await p.waitForURL('**/login');
  await p.goto(B + '/objects'); await p.waitForURL('**/login');
  ok(true, 'после выхода приватные страницы недоступны');

  await browser.close();
  ok(errors.length === 0, 'ошибок в консоли браузера нет' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log('ВСЕ СЦЕНАРИИ ПРОШЛИ');
})().catch(async (e) => { console.error(e.message); console.error('console errors:', errors); process.exit(1); });
