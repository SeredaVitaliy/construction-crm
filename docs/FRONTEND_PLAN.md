# План фронта по шагам

Каждый шаг: сделать → `npm run typecheck` → проверить в браузере → коммит.
Ориентир по времени — около 2 часов на всё. Если время поджимает, шаг 7 можно упростить.

Контракт с базой — в `src/api/database.types.ts`. Клиент — `src/lib/supabase.ts`.
Всё, что делает supabase-js, возвращает `{ data, error }` и **не бросает исключение**:
проверяй `error` после каждого запроса.

---

## Шаг 0. Поднять Supabase (≈15 мин, руками)

1. supabase.com → New project (Free). Регион ближе к Европе.
2. **SQL Editor** → по очереди выполнить три файла из `supabase/migrations/` (по порядку номеров).
3. **Authentication → Sign In / Providers** → выключить **Allow new users to sign up**.
   Почему это важно: иначе любой может вызвать `signUp` с публичным ключом и получить аккаунт.
   (Даже тогда он станет исполнителем без задач и ничего не увидит, но требование ТЗ — закрыть.)
4. **Authentication → Users → Add user → Create new user**, галочка *Auto Confirm User*:
   `manager@example.com`, `ivanov@example.com`, `petrov@example.com` (пароли придумай и запиши).
5. **SQL Editor** → выполнить `supabase/seed.sql`. Он назначит роли и создаст 3 объекта и 6 задач.
6. **Project Settings → API**: скопировать URL и anon (или publishable) ключ в `.env` по образцу `.env.example`.
   `service_role`/secret ключ не трогаем вообще.

Проверка: `npm run dev` открывается, в Table Editor видны данные.

---

## Шаг 1. Вход и сессия

**Что:** `LoginPage` (email + пароль, `supabase.auth.signInWithPassword`), контекст авторизации,
приватные роуты.

**Подсказки:**
- Сессию при старте берёт `supabase.auth.getSession()`, а дальше подписка
  `supabase.auth.onAuthStateChange` (не забудь отписаться в cleanup эффекта).
- После получения сессии загрузи **профиль** из `profiles` по `session.user.id` — там `role` и `full_name`.
  Контекст отдаёт `{ session, profile, loading, signOut }`.
- Пока `loading` — спиннер, иначе PrivateRoute на долю секунды выкинет на /login.

**Почему роль из `profiles`, а не из `user.user_metadata`:** user_metadata пользователь может изменить
сам через `supabase.auth.updateUser`. Роль в `profiles` через API поменять нельзя — это проверено тестом.

**Связь с твоим опытом:** в CRM у ментора ты хранил токен в замыкании `tokenService`.
Здесь токенами управляет сам supabase-js (хранит в localStorage и обновляет refresh-токеном) —
это как твой axios-интерсептор, только готовый. На созвоне могут спросить про XSS и localStorage:
ответ тот же, что ты разбирал, плюс «даже с украденным токеном человек получит только права своей роли».

Проверка: вход под каждым из трёх, неверный пароль показывает ошибку, F5 не выкидывает.

---

## Шаг 2. Раскладка и роутинг

Роуты: `/login`, `/objects`, `/objects/:id`, `/tasks/:id`, `/my-tasks`.
Layout с меню: «Объекты» (всем), «Мои задачи» (только исполнителю), имя пользователя и «Выйти».

**Подсказка:** для меню достаточно `profile.role`. Это чисто UI-решение — права всё равно проверяет база.

---

## Шаг 3. Список объектов

`supabase.from('objects').select('*').order('created_at')` — **без фильтров**.

**Почему без фильтра для исполнителя:** RLS сама вернёт ему только объекты, где у него есть задачи.
Если добавить фильтр в коде, это будет дублирование, которое легко рассинхронизировать.

Для постановщика: кнопка «Добавить», редактирование и удаление (Modal + Form antd).
Удаление объекта с задачами база отклонит (ошибка внешнего ключа) — покажи понятное сообщение
вроде «Сначала удалите задачи объекта». Код ошибки — `error.code === '23503'`.

---

## Шаг 4. Карточка объекта

Объект + его задачи: `from('tasks').select('id, title, status, assignee:profiles!tasks_assignee_id_fkey(full_name)').eq('object_id', id)`.

**Почему `!tasks_assignee_id_fkey`:** у `tasks` две ссылки на `profiles` (исполнитель и автор),
без явного имени связи Supabase не поймёт, какую подтягивать, и вернёт ошибку.

Постановщику: создать / редактировать / удалить задачу. Список исполнителей для Select:
`from('profiles').select('id, full_name').eq('role', 'executor')`.
В insert передаёшь только `title, description, object_id, assignee_id` — статус и автора ставит база
(типы не дадут передать лишнее).

Исполнитель на этой странице видит только свои задачи этого объекта — опять же благодаря RLS.

---

## Шаг 5. Карточка задачи — главный экран

Три части: данные, кнопки действий, история.

**Действия.** Напиши чистую функцию `getAvailableActions(task, profile)`, которая возвращает список
переходов (`{ to, label, needsComment }`) по таблице из ТЗ:

| из | в | кто |
|---|---|---|
| new | in_progress | назначенный исполнитель |
| in_progress | review | назначенный исполнитель |
| review | accepted | постановщик |
| review | rework (комментарий обязателен) | постановщик |
| rework | in_progress | назначенный исполнитель |

«Назначенный исполнитель» = `task.assignee_id === profile.id`, а не просто роль executor.
Это зеркало правил базы **для показа кнопок**; реальную проверку делает триггер. Если таблицы разойдутся,
база просто откажет — данные не испортятся. Скажи это на созвоне: это ответ на «а что если фронт ошибётся».

Вызов: `supabase.rpc('change_task_status', { p_task_id, p_to, p_comment })`.
Для «На доработку» — модалка с обязательным TextArea. После успеха перезагрузи задачу и историю.
При ошибке — `message.error(error.message)` (тексты из базы уже на русском).

**История:** `from('task_history').select('*, author:profiles!task_history_changed_by_fkey(full_name)').eq('task_id', id).order('id')`.
Отрисуй antd `Timeline`: дата (`dayjs`), кто, «из → в», комментарий. `from_status === null` = «Задача создана».

Проверка: пройди полный цикл задачей двумя пользователями в двух окнах (обычное + инкогнито).

---

## Шаг 6. «Мои задачи»

`from('tasks').select('..., object:objects(name)').eq('assignee_id', profile.id)`.
Здесь фильтр нужен уже не для безопасности, а по смыслу экрана. Удобно добавить фильтр по статусу
(Segmented или Tabs) — у тебя в b2b был такой же фильтр заказов через `useSearchParams`.

---

## Шаг 7. Проверка «взломом» (для созвона)

Под исполнителем в консоли браузера (DevTools), где `supabase` доступен, например, через временный
`window.supabase = supabase` в dev-режиме:

```js
await supabase.from('tasks').update({ title: 'взлом' }).not('id', 'is', null).select() // data: [] — 0 строк
await supabase.rpc('change_task_status', { p_task_id: '<чужая>', p_to: 'in_progress' }) // «Задача не найдена»
await supabase.from('task_history').delete().gt('id', 0)                      // permission denied
```

Это лучшая демонстрация на созвоне: «интерфейс прячет кнопки, но и без интерфейса ничего не выйдет».
`window.supabase` после проверки убрать.

---

## Шаг 8. Деплой на Vercel

Import репозитория → Framework: Vite → Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
`vercel.json` уже настроен, чтобы F5 на `/tasks/...` не давал 404.
В Supabase → Authentication → URL Configuration добавить адрес Vercel в Site URL.
