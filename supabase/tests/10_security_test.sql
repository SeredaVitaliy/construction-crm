-- =====================================================================
-- Тесты доступа «в обход интерфейса». Запуск: ./supabase/tests/run.sh
-- Каждый шаг выполняется от роли authenticated с JWT конкретного пользователя —
-- ровно так же, как запрос из браузера через supabase-js / REST.
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- Тестовые пользователи (в Supabase их создают в Dashboard → Authentication)
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'manager@test.local', '{"full_name":"Анна Постановщик"}', '{"role":"manager"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ivanov@test.local',  '{"full_name":"Иван Иванов"}',      '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'petrov@test.local',  '{"full_name":"Пётр Петров"}',      '{"role":"executor"}');

-- ---------- помощники ----------
create schema t;
grant usage on schema t to authenticated, anon;

create function t.ok(cond boolean, msg text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', msg; end if;
  raise notice 'ok   %', msg;
end $$;

-- Ожидаем, что запрос упадёт с ошибкой, текст которой содержит pattern
create function t.fails(q text, pattern text, msg text) returns void language plpgsql as $$
begin
  execute q;
  raise exception 'FAIL (запрос прошёл, а не должен был): %', msg;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if position(lower(pattern) in lower(sqlerrm)) = 0 then
    raise exception 'FAIL: % — неожиданная ошибка: %', msg, sqlerrm;
  end if;
  raise notice 'ok   % (%)', msg, sqlerrm;
end $$;

-- Сколько строк затронул запрос
create function t.affected(q text) returns int language plpgsql as $$
declare n int; begin execute q; get diagnostics n = row_count; return n; end $$;

grant execute on all functions in schema t to authenticated, anon;

create function t.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;
grant execute on function t.login(text) to authenticated, anon;

\set M '''00000000-0000-0000-0000-00000000000a'''
\set I '''00000000-0000-0000-0000-00000000000b'''
\set P '''00000000-0000-0000-0000-00000000000c'''

select t.ok((select role from profiles where email='manager@test.local') = 'manager', 'профиль постановщика создан триггером с ролью manager');
select t.ok((select role from profiles where email='ivanov@test.local') = 'executor', 'по умолчанию роль — executor');

-- =====================================================================
\echo '--- Постановщик'
-- Фиксированные id задаём служебной ролью (клиенту колонка id недоступна),
-- но с JWT постановщика — чтобы сработали триггеры автора и истории.
select t.login(:M);
insert into objects (id, name, address) values
  ('10000000-0000-0000-0000-000000000001', 'ЖК Северный', 'ул. Ленина, 1'),
  ('10000000-0000-0000-0000-000000000002', 'Склад Южный', 'пр. Мира, 15'),
  ('10000000-0000-0000-0000-000000000003', 'Офис Центр',  'ул. Пушкина, 7');

insert into tasks (id, title, object_id, assignee_id) values
  ('20000000-0000-0000-0000-000000000001', 'Залить фундамент', '10000000-0000-0000-0000-000000000001', :I),
  ('20000000-0000-0000-0000-000000000002', 'Покрасить фасад',  '10000000-0000-0000-0000-000000000002', :P);

set role authenticated;
select t.ok(t.affected($$ insert into objects (name, address) values ('Новый объект','ул. Тестовая, 1') $$) = 1, 'постановщик создаёт объект через API');
select t.ok(t.affected($$ insert into tasks (title, object_id, assignee_id) values ('Тестовая','10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-00000000000c') $$) = 1, 'постановщик создаёт задачу через API');
select t.ok(t.affected($$ delete from tasks where title='Тестовая' $$) = 1, 'постановщик удаляет задачу');
select t.ok(t.affected($$ delete from objects where name='Новый объект' $$) = 1, 'постановщик удаляет пустой объект');

select t.ok((select status from tasks where id='20000000-0000-0000-0000-000000000001') = 'new', 'задача создаётся в статусе new');
select t.ok((select author_id from tasks where id='20000000-0000-0000-0000-000000000001') = :M, 'автор проставлен автоматически');
select t.ok((select count(*) from task_history) = 2, 'создание задачи записано в историю');

select t.fails($$ insert into tasks (title, object_id, assignee_id, status)
                  values ('x','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','accepted') $$,
               'permission denied', 'нельзя создать задачу сразу в нужном статусе');
select t.fails($$ insert into tasks (title, object_id, assignee_id, author_id)
                  values ('x','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-00000000000c') $$,
               'permission denied', 'нельзя подставить чужого автора');
select t.fails($$ update tasks set status = 'accepted' $$,
               'permission denied', 'постановщик не может поменять статус прямым UPDATE');
select t.fails($$ insert into tasks (title, object_id, assignee_id)
                  values ('x','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a') $$,
               'Исполнителем можно назначить', 'нельзя назначить исполнителем постановщика');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'in_progress') $$,
               'только назначенный исполнитель', 'постановщик не может взять задачу в работу за исполнителя');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'accepted') $$,
               'запрещён', 'new → accepted запрещён даже постановщику');

-- =====================================================================
\echo '--- Исполнитель Иванов: чужое не видно и не меняется'
select t.login(:I);

select t.ok((select count(*) from tasks) = 1, 'видит только свою задачу');
select t.ok((select count(*) from tasks where id='20000000-0000-0000-0000-000000000002') = 0, 'чужую задачу по id не получить');
select t.ok((select count(*) from objects) = 1, 'видит только объект, где у него есть задача');
select t.ok((select count(*) from task_history where task_id='20000000-0000-0000-0000-000000000002') = 0, 'историю чужой задачи не видит');

select t.ok(t.affected($$ update tasks set title='взлом' $$) = 0, 'не может редактировать даже свою задачу (RLS: 0 строк)');
select t.ok(t.affected($$ delete from tasks $$) = 0, 'не может удалять задачи');
select t.ok(t.affected($$ delete from objects $$) = 0, 'не может удалять объекты');
select t.fails($$ insert into objects (name, address) values ('x','y') $$, 'row-level security', 'не может создать объект');
select t.fails($$ insert into tasks (title, object_id, assignee_id) values ('x','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b') $$,
               'row-level security', 'не может создать задачу');
select t.fails($$ update tasks set status='review' $$, 'permission denied', 'не может сменить статус прямым UPDATE');
select t.fails($$ update profiles set role='manager' $$, 'permission denied', 'не может повысить себе роль');

select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000002', 'in_progress') $$,
               'не найдена', 'не может двигать чужую задачу (и не узнаёт, что она есть)');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'review') $$,
               'запрещён', 'new → review (перепрыгнуть «в работе») запрещён');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'accepted') $$,
               'запрещён', 'new → accepted запрещён');

\echo '--- История нельзя подделать / изменить / удалить'
select t.fails($$ insert into task_history (task_id, to_status, changed_by)
                  values ('20000000-0000-0000-0000-000000000001','accepted','00000000-0000-0000-0000-00000000000a') $$,
               'permission denied', 'нельзя вставить запись в историю');
select t.fails($$ update task_history set comment='подделка' $$, 'permission denied', 'нельзя изменить историю');
select t.fails($$ delete from task_history $$, 'permission denied', 'нельзя удалить историю');

\echo '--- Полный цикл'
select change_task_status('20000000-0000-0000-0000-000000000001', 'in_progress');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'in_progress') $$,
               'уже в статусе', 'повторный переход в тот же статус отклоняется');
select change_task_status('20000000-0000-0000-0000-000000000001', 'review', 'Готово, фото в чате');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'accepted') $$,
               'только постановщик', 'исполнитель не может сам принять задачу');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'rework', 'сам себе') $$,
               'только постановщик', 'исполнитель не может сам вернуть на доработку');

select t.login(:P);
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'in_progress') $$,
               'не найдена', 'Петров не может трогать задачу Иванова');

select t.login(:M);
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'rework') $$,
               'комментарий обязателен', 'на доработку без комментария нельзя');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'rework', '   ') $$,
               'комментарий обязателен', 'комментарий из пробелов не считается');
select change_task_status('20000000-0000-0000-0000-000000000001', 'rework', 'Нет фото армирования');

select t.login(:I);
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'review') $$,
               'запрещён', 'rework → review напрямую запрещён');
select change_task_status('20000000-0000-0000-0000-000000000001', 'in_progress');
select change_task_status('20000000-0000-0000-0000-000000000001', 'review');

select t.login(:M);
select change_task_status('20000000-0000-0000-0000-000000000001', 'accepted');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'rework', 'передумал') $$,
               'запрещён', 'из accepted никуда нельзя');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001', 'new') $$,
               'запрещён', 'вернуть в new нельзя');

select t.ok(
  (select string_agg(coalesce(from_status::text,'∅') || '→' || to_status, ' ' order by id)
     from task_history where task_id='20000000-0000-0000-0000-000000000001')
  = '∅→new new→in_progress in_progress→review review→rework rework→in_progress in_progress→review review→accepted',
  'история содержит все 7 шагов по порядку');
select t.ok(
  (select changed_by from task_history where task_id='20000000-0000-0000-0000-000000000001' and to_status='rework') = :M
  and (select comment from task_history where task_id='20000000-0000-0000-0000-000000000001' and to_status='rework') = 'Нет фото армирования',
  'в истории верные автор и комментарий возврата');
select t.ok(
  (select count(*) from task_history where task_id='20000000-0000-0000-0000-000000000001'
     and to_status in ('in_progress','review') and changed_by = :I) = 4,
  'переходы исполнителя записаны на исполнителя');

\echo '--- Постановщик: прочее'
select t.fails($$ delete from objects where id='10000000-0000-0000-0000-000000000001' $$,
               'foreign key', 'нельзя удалить объект, на котором есть задачи');
select t.ok(t.affected($$ update tasks set assignee_id='00000000-0000-0000-0000-00000000000c' where id='20000000-0000-0000-0000-000000000002' $$) = 1,
  'постановщик может переназначить задачу');
select t.ok(t.affected($$ update objects set name='ЖК Северный-2' where id='10000000-0000-0000-0000-000000000001' $$) = 1,
  'постановщик редактирует объект');

\echo '--- Без входа (anon)'
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.fails($$ select * from tasks $$,        'permission denied', 'anon не читает задачи');
select t.fails($$ select * from objects $$,      'permission denied', 'anon не читает объекты');
select t.fails($$ select * from task_history $$, 'permission denied', 'anon не читает историю');
select t.fails($$ select change_task_status('20000000-0000-0000-0000-000000000001','new') $$,
               'permission denied', 'anon не может вызвать RPC');
reset role;

\echo ''
\echo 'ВСЕ ТЕСТЫ ПРОШЛИ'
