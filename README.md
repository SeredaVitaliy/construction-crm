# Объекты и задачи — мини-CRM для строительной компании

Постановщик заводит объекты (стройки) и ставит по ним задачи исполнителям. Исполнитель берёт задачу
в работу и сдаёт на проверку, постановщик принимает или возвращает на доработку с комментарием.
Каждая смена статуса попадает в историю.

Права доступа, переходы статусов и история защищены **на уровне базы** (RLS, гранты на колонки,
триггеры), поэтому работают и при обращении к Supabase напрямую, в обход интерфейса.

- Демо: _ссылка после деплоя_
- Доступы: см. сообщение со сдачей
- Как устроено простыми словами: [docs/for-manager.md](docs/for-manager.md)
- Решения и допущения: [docs/decisions.md](docs/decisions.md)

## Стек

React 19, TypeScript, Vite, Ant Design 6, React Router 7, Supabase (Postgres, Auth, RLS).

## Как устроена защита

| Требование | Как сделано | Где |
|---|---|---|
| Права закрыты в базе | RLS на всех таблицах; anon не имеет прав ни на что | `003_rls.sql` |
| Исполнитель не видит и не меняет чужое | `tasks_select`: постановщик или `assignee_id = auth.uid()`; запись — только постановщик | `003_rls.sql` |
| Переходы статусов проверяет база | Колонку `status` нельзя обновить напрямую (нет гранта). Смена — только через RPC `change_task_status`, правила — в триггере `tasks_before_update` | `002_status_machine.sql` |
| Историю нельзя подделать | На `task_history` выдан только `select`; пишет её только триггер | `002`, `003` |
| Регистрация закрыта | Настройка Supabase Auth + роль по умолчанию «исполнитель» | README, `001_schema.sql` |
| Секреты не во фронте | Во фронте только URL и anon/publishable ключ; `.env` в `.gitignore` | `.env.example` |

## Запуск

### 1. База (Supabase)

1. Создать проект на [supabase.com](https://supabase.com) (бесплатный тариф).
2. SQL Editor → выполнить по порядку файлы из `supabase/migrations/`
   (или `npx supabase link --project-ref <ref> && npx supabase db push`).
3. Authentication → Sign In / Providers → выключить **Allow new users to sign up**.
4. Authentication → Users → Add user (Auto Confirm): `manager@example.com`, `ivanov@example.com`, `petrov@example.com`.
5. SQL Editor → выполнить `supabase/seed.sql` (роли + 3 объекта + 6 задач во всех статусах).

### 2. Фронт

```bash
cp .env.example .env   # вписать URL и anon/publishable ключ из Project Settings → API
npm install
npm run dev
```

### 3. Тесты базы (необязательно)

Миграции и правила доступа проверяются на локальном PostgreSQL 15+ с эмуляцией окружения Supabase:

```bash
PGHOST=localhost PGUSER=postgres npm run test:db
```

Тест входит от имени постановщика, двух исполнителей и анонима и проверяет, что запрещённое запрещено:
чтение и изменение чужих задач, запрещённые переходы, подделка и удаление истории, повышение роли.

## Структура

```
supabase/migrations/   001 схема · 002 переходы статусов и история · 003 гранты и RLS
supabase/seed.sql      демо-данные
supabase/tests/        тесты доступа
src/api/               типы базы (контракт фронт ↔ база), подписи статусов
src/lib/supabase.ts    клиент Supabase
docs/                  решения, объяснение для руководителя, план фронта
```
