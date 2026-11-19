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
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
}
async function newUser(browser, email, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !m.text().startsWith('Failed to load resource') && errors.push(email + ': ' + m.text()));
  page.on('pageerror', (e) => errors.push(email + ' pageerror: ' + e.message));
  await login(page, email);
  await page.waitForURL(B + '/');
  return { ctx, page };
}
const rows = async (page, n) => { for (let i = 0; i < 40; i++) { if (await page.locator('.ant-table-row').count() === n) return true; await page.waitForTimeout(100); } return false; };
const shot = (page, name) => page.screenshot({ path: SH + String(++step).padStart(2, '0') + '-' + name + '.png', fullPage: true });
const statusIs = (page, label) => page.locator('.task-main .ant-tag').getByText(label, { exact: true }).waitFor();
const historyCount = (page) => page.locator('.ant-card').filter({ hasText: 'История статусов' }).locator('.ant-timeline-item').count();
const confirm = (page, name = 'Удалить') => page.locator('.ant-popconfirm').getByRole('button', { name }).click();

(async () => {
  const browser = await chromium.launch();

  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); const page = await ctx.newPage();
    await login(page, 'ivanov@example.com', 'wrong');
    await page.getByText('Неверный email или пароль').waitFor();
    ok(true, 'неверный пароль → понятная ошибка');
    await shot(page, 'login-error'); await ctx.close();
  }

  const iv = await newUser(browser, 'ivanov@example.com');
  let p = iv.page;
  await p.getByText('Ваши задачи по срокам').waitFor();
  ok(await p.getByRole('link', { name: 'Финансы' }).count() === 0, 'у исполнителя нет раздела «Финансы»');
  await shot(p, 'executor-dashboard');

  await p.getByRole('link', { name: 'Объекты', exact: true }).click();
  await p.getByRole('heading', { name: 'ЖК «Северный»' }).waitFor();
  ok(await p.getByRole('heading', { name: 'Реконструкция школы № 12' }).count() === 0, 'исполнитель не видит объект без своих задач');
  ok(await p.getByRole('button', { name: 'Новый объект' }).count() === 0, 'исполнитель не видит «Новый объект»');
  ok(await p.getByText('Бюджет').count() === 0, 'исполнитель не видит бюджеты');
  await shot(p, 'executor-objects');

  await p.goto(B + '/finance');
  await p.waitForURL(B + '/');
  ok(true, '«Финансы» по прямой ссылке исполнителю недоступны');

  await p.goto(B + '/tasks');
  await p.getByRole('link', { name: 'Опалубка колонн 1-го этажа' }).waitFor();
  ok(await rows(p, 6), 'в «Моих задачах» ровно 6 задач Иванова');
  await p.goto(B + '/tasks?status=accepted');
  ok(await rows(p, 2), 'фильтр по статусу из адреса работает');
  await p.reload();
  await p.getByRole('link', { name: 'Прокладка кабеля' }).waitFor();
  ok(await rows(p, 2), 'после F5 сессия и фильтр сохранились');

  await p.goto(B + '/tasks');
  await p.getByRole('link', { name: 'Опалубка колонн 1-го этажа' }).click();
  await statusIs(p, 'Новая');
  ok(await p.getByRole('button', { name: 'Взять в работу' }).count() === 1, 'Новая: исполнитель видит «Взять в работу»');
  ok(await p.getByRole('button', { name: 'Принять' }).count() === 0, 'исполнитель не видит «Принять»');
  ok(await p.getByRole('button', { name: 'Изменить' }).count() === 0, 'исполнитель не может редактировать задачу');
  await p.getByRole('button', { name: 'Взять в работу' }).click();
  await statusIs(p, 'В работе');
  await p.getByRole('button', { name: 'Отправить на проверку' }).click();
  await statusIs(p, 'На проверке');
  ok(await p.locator('.task-main').getByRole('button').count() === 0, 'На проверке: у исполнителя кнопок нет');
  ok(await historyCount(p) === 3, 'история: 3 записи');
  await p.getByLabel('Новый комментарий').fill('Опалубка выставлена, прошу проверить');
  await p.getByRole('button', { name: 'Отправить', exact: true }).click();
  await p.locator('.comment-body').getByText('Опалубка выставлена, прошу проверить').waitFor();
  ok(true, 'исполнитель пишет комментарий к своей задаче');
  const taskUrl = p.url();
  await shot(p, 'executor-task-review');

  await p.goto(B + '/tasks/' + PETROV_TASK);
  await p.getByText('Задача не найдена').waitFor();
  ok(true, 'чужая задача по прямой ссылке → «не найдена»');

  const m = await newUser(browser, 'manager@example.com');
  p = m.page;
  await p.getByText('Ждут вашей проверки').waitFor();
  await p.locator('.ant-card').filter({ hasText: 'Ждут вашей проверки' }).getByText('Опалубка колонн 1-го этажа').waitFor();
  ok(true, 'сданная задача появилась у постановщика в «Ждут проверки»');
  await shot(p, 'manager-dashboard');

  await p.goto(taskUrl);
  await statusIs(p, 'На проверке');
  await p.getByText('Опалубка выставлена, прошу проверить').waitFor();
  ok(await p.getByRole('button', { name: 'Взять в работу' }).count() === 0, 'постановщик не видит действий исполнителя');
  await p.getByRole('button', { name: 'Вернуть на доработку' }).click();
  const dlg = p.getByRole('dialog');
  await dlg.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await p.getByText('Комментарий обязателен').waitFor();
  ok(true, 'на доработку без комментария не отправить');
  await dlg.getByRole('textbox').fill('Щиты не раскреплены у колонны 4');
  await dlg.getByRole('button', { name: 'Вернуть на доработку' }).click();
  await statusIs(p, 'На доработке');
  await p.locator('.ant-timeline').getByText('Щиты не раскреплены у колонны 4').waitFor();
  ok(true, 'возврат на доработку с комментарием, комментарий в истории');
  await shot(p, 'manager-task-rework');

  await p.goto(B + '/objects');
  await p.getByRole('button', { name: 'Новый объект' }).click();
  let d = p.getByRole('dialog');
  await d.getByLabel('Название').fill('Баня в Светлогорске');
  await d.getByLabel('Адрес').fill('Светлогорск, ул. Лесная, 3');
  await d.getByLabel('Заказчик').fill('Частный заказчик');
  await d.getByLabel('Бюджет, ₽').fill('1500000');
  await d.getByRole('button', { name: 'Создать объект' }).click();
  await p.getByRole('heading', { name: /Баня в Светлогорске/ }).waitFor();
  ok(true, 'постановщик создаёт объект и попадает в его карточку');

  await p.getByRole('button', { name: 'Новая задача' }).click();
  d = p.getByRole('dialog');
  await d.getByLabel('Название').fill('Фундамент бани');
  await d.getByLabel('Описание').fill('Ленточный, 6×4 м');
  await d.getByLabel('Исполнитель').click();
  await p.locator('.ant-select-item-option').filter({ hasText: 'Пётр Петров' }).click();
  ok(await p.locator('.ant-select-item-option').filter({ hasText: 'Анна' }).count() === 0, 'в списке исполнителей нет постановщика');
  await shot(p, 'manager-new-task');
  await d.getByRole('button', { name: 'Создать задачу' }).click();
  await p.locator('.board-card').filter({ hasText: 'Фундамент бани' }).waitFor();
  ok(true, 'задача появилась на доске объекта');

  await p.getByRole('tab', { name: 'Расходы' }).click();
  await p.getByRole('button', { name: 'Добавить расход' }).click();
  d = p.getByRole('dialog');
  await d.getByLabel('Сумма, ₽').fill('250000');
  await d.getByLabel('За что').fill('Бетон и арматура');
  await d.getByRole('button', { name: 'Добавить расход' }).click();
  await p.getByRole('cell', { name: 'Бетон и арматура' }).waitFor();
  ok(true, 'постановщик добавляет расход по объекту');
  await shot(p, 'manager-object-finance');

  await p.getByRole('button', { name: /^(delete )?Удалить$/ }).click();
  await confirm(p);
  await p.getByText('Нельзя удалить: есть связанные задачи или расходы').waitFor();
  ok(true, 'объект с задачами не удаляется, понятная ошибка');

  const pt = await newUser(browser, 'petrov@example.com');
  await pt.page.goto(B + '/tasks');
  await pt.page.getByRole('link', { name: 'Фундамент бани' }).waitFor();
  ok(true, 'назначенная задача появилась у Петрова');
  await pt.page.goto(taskUrl);
  await pt.page.getByText('Задача не найдена').waitFor();
  ok(true, 'Петров не открывает задачу Иванова');

  await p.getByRole('cell', { name: 'Бетон и арматура' }).waitFor();
  await p.getByRole('button', { name: 'Удалить расход' }).click();
  await confirm(p);
  await p.getByText('Расход удалён').waitFor();
  await p.getByRole('tab', { name: /Задачи/ }).click();
  await p.locator('.board-card').filter({ hasText: 'Фундамент бани' }).click();
  await statusIs(p, 'Новая');
  await p.getByRole('button', { name: /^(delete )?Удалить$/ }).click();
  await confirm(p);
  await p.getByText('Задача удалена').waitFor();
  await p.getByRole('button', { name: /^(delete )?Удалить$/ }).click();
  await confirm(p);
  await p.getByText('Объект удалён').waitFor();
  ok(true, 'постановщик удаляет расход, задачу и пустой объект');

  await p.goto(B + '/tasks?view=board');
  const card = p.locator('.board-card').filter({ hasText: 'Освещение складской зоны' });
  await card.waitFor();
  const from = await card.boundingBox();
  const to = await p.locator('section.board-col[aria-label="Принята"]').boundingBox();
  await p.mouse.move(from.x + 20, from.y + 15);
  await p.mouse.down();
  await p.mouse.move(from.x + 40, from.y + 30, { steps: 5 });
  await p.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 10 });
  await p.mouse.up();
  await p.getByText('Статус: Принята').waitFor();
  await p.locator('section.board-col[aria-label="Принята"]').getByText('Освещение складской зоны').waitFor();
  ok(true, 'на доске постановщик принимает задачу перетаскиванием');
  await shot(p, 'manager-board');

  await p.goto(B + '/finance');
  await p.getByText('Бюджет по объектам').waitFor();
  await shot(p, 'manager-finance');
  await p.goto(B + '/team');
  await p.getByText('Олег Козлов').waitFor();
  ok(true, 'постановщик видит финансы и команду');

  p = iv.page;
  await p.goto(taskUrl);
  await statusIs(p, 'На доработке');
  await p.getByRole('button', { name: 'Взять в работу' }).click();
  await statusIs(p, 'В работе');
  ok(await historyCount(p) === 5, 'доработка → в работе, история из 5 шагов');

  await p.getByRole('button', { name: 'Отправить на проверку' }).waitFor();
  const p2 = await iv.ctx.newPage(); await p2.goto(taskUrl);
  await p2.getByRole('button', { name: 'Отправить на проверку' }).click();
  await statusIs(p2, 'На проверке');
  await p.getByRole('button', { name: 'Отправить на проверку' }).click();
  await p.getByText('Задача уже в статусе «На проверке»').waitFor();
  await statusIs(p, 'На проверке');
  ok(true, 'устаревшая кнопка: база отказала, экран обновился');

  await p.goto(B + '/profile');
  await p.getByLabel('Должность').fill('Старший прораб');
  await p.getByRole('button', { name: 'Сохранить' }).click();
  await p.getByText('Профиль сохранён').waitFor();
  ok(true, 'исполнитель редактирует свой профиль');

  const mob = await newUser(browser, 'manager@example.com', { width: 390, height: 844 });
  await mob.page.getByText('Ждут вашей проверки').waitFor();
  await shot(mob.page, 'manager-mobile');
  await mob.page.getByRole('button', { name: 'Меню', exact: true }).click();
  await mob.page.getByRole('link', { name: 'Финансы' }).click();
  await mob.page.getByText('Бюджет по объектам').waitFor();
  ok(true, 'на телефоне меню открывается в шторке');

  await p.getByRole('button', { name: 'Меню пользователя' }).click();
  await p.getByRole('menuitem', { name: 'Выйти' }).click();
  await p.waitForURL('**/login');
  await p.goto(B + '/objects'); await p.waitForURL('**/login');
  ok(true, 'после выхода приватные страницы недоступны');

  await browser.close();
  ok(errors.length === 0, 'ошибок в консоли браузера нет' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log('ВСЕ СЦЕНАРИИ ПРОШЛИ');
})().catch(async (e) => { console.error(e.message); console.error('console errors:', errors); process.exit(1); });
