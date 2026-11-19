\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

\set M '''00000000-0000-0000-0000-00000000000a'''
\set I '''00000000-0000-0000-0000-00000000000b'''
\set P '''00000000-0000-0000-0000-00000000000c'''

\echo '--- Объекты: новые поля'
select t.login(:M);
set role authenticated;

select t.ok(t.affected($$ update objects set status = 'active', client = 'ООО «Заказчик»', budget = 1000000,
                          start_date = '2026-01-10', end_date = '2026-12-31'
                        where id = '10000000-0000-0000-0000-000000000002' $$) = 1,
  'постановщик заполняет статус, заказчика, бюджет и сроки объекта');
select t.fails($$ update objects set start_date = '2026-05-01', end_date = '2026-04-01'
                  where id = '10000000-0000-0000-0000-000000000002' $$,
               'objects_dates_check', 'дата окончания не раньше даты начала');
select t.fails($$ update objects set budget = -1 where id = '10000000-0000-0000-0000-000000000002' $$,
               'check constraint', 'бюджет не может быть отрицательным');
select t.fails($$ update objects set created_by = '00000000-0000-0000-0000-00000000000b' $$,
               'permission denied', 'автора объекта не подменить');

\echo '--- Задачи: приоритет и срок'
select t.ok(t.affected($$ insert into tasks (title, object_id, assignee_id, priority, due_date) values
  ('Просроченная', '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-00000000000c', 'urgent', current_date - 3) $$) = 1,
  'постановщик создаёт задачу с приоритетом и сроком');
select t.ok((select priority from tasks where id = (select id from tasks where title = 'Просроченная')) = 'urgent', 'приоритет сохранён');

\echo '--- Сводка по объектам (view с правами вызывающего)'
select t.ok((select tasks_total from object_summary where object_id = '10000000-0000-0000-0000-000000000002') = 2,
  'постановщик видит все задачи объекта в сводке');
select t.ok((select tasks_overdue from object_summary where object_id = '10000000-0000-0000-0000-000000000002') = 1,
  'просроченная задача посчитана');

\echo '--- Расходы: только постановщик'
select t.ok(t.affected($$ insert into expenses (object_id, category, amount, description) values
  ('10000000-0000-0000-0000-000000000002', 'materials', 150000, '  Бетон М300  '),
  ('10000000-0000-0000-0000-000000000002', 'labor', 50000.50, 'Бригада') $$) = 2,
  'постановщик добавляет расходы');
select t.ok((select created_by from expenses where description = 'Бетон М300') = :M,
  'автор расхода проставлен автоматически, описание обрезано');
select t.ok((select spent from object_summary where object_id = '10000000-0000-0000-0000-000000000002') = 200000.50,
  'сводка считает сумму расходов');
select t.fails($$ insert into expenses (object_id, amount) values ('10000000-0000-0000-0000-000000000002', 0) $$,
               'check constraint', 'сумма расхода должна быть больше нуля');
select t.fails($$ insert into expenses (object_id, amount, created_by)
                  values ('10000000-0000-0000-0000-000000000002', 10, '00000000-0000-0000-0000-00000000000b') $$,
               'permission denied', 'нельзя подставить автора расхода');
select t.fails($$ delete from objects where id = '10000000-0000-0000-0000-000000000002' $$,
               'foreign key', 'объект с задачами или расходами не удаляется');

\echo '--- Исполнитель: финансы закрыты'
select t.login(:P);
select t.ok((select count(*) from expenses) = 0, 'исполнитель не видит расходы');
select t.ok((select spent from object_summary where object_id = '10000000-0000-0000-0000-000000000002') = 0,
  'в сводке исполнитель не видит сумму расходов');
select t.fails($$ insert into expenses (object_id, amount) values ('10000000-0000-0000-0000-000000000002', 10) $$,
               'row-level security', 'исполнитель не может добавить расход');
select t.ok(t.affected($$ update expenses set amount = 1 $$) = 0, 'исполнитель не может изменить расход');
select t.ok(t.affected($$ delete from expenses $$) = 0, 'исполнитель не может удалить расход');
select t.ok(t.affected($$ update objects set budget = 1 $$) = 0, 'исполнитель не может менять бюджет объекта');
select t.ok(t.affected($$ update tasks set priority = 'low', due_date = null $$) = 0,
  'исполнитель не может менять приоритет и срок');

select t.login(:I);
select t.ok((select count(*) from object_summary where object_id = '10000000-0000-0000-0000-000000000002') = 0,
  'чужой объект не виден и в сводке');

\echo '--- Комментарии к задачам'
select t.login(:P);
select t.ok(t.affected($$ insert into task_comments (task_id, body)
                          values ((select id from tasks where title = 'Просроченная'), 'Нужен доступ на объект') $$) = 1,
  'исполнитель комментирует свою задачу');
select t.ok((select author_id from task_comments where body = 'Нужен доступ на объект') = :P,
  'автор комментария — текущий пользователь');
select t.fails($$ insert into task_comments (task_id, body, author_id)
                  values ((select id from tasks where title = 'Просроченная'), 'x', '00000000-0000-0000-0000-00000000000a') $$,
               'permission denied', 'нельзя написать комментарий от чужого имени');
select t.fails($$ insert into task_comments (task_id, body) values ((select id from tasks where title = 'Просроченная'), '   ') $$,
               'check constraint', 'пустой комментарий не принимается');

select t.login(:I);
select t.fails($$ insert into task_comments (task_id, body) values ((select id from tasks where title = 'Просроченная'), 'влез') $$,
               'row-level security', 'нельзя комментировать чужую задачу');
select t.ok((select count(*) from task_comments) = 0, 'чужие комментарии не видны');

select t.login(:M);
select t.ok((select count(*) from task_comments) = 1, 'постановщик видит комментарии');
select t.ok(t.affected($$ insert into task_comments (task_id, body)
                          values ((select id from tasks where title = 'Просроченная'), 'Пропуск заказан') $$) = 1,
  'постановщик отвечает в комментариях');
select t.ok(t.affected($$ delete from task_comments where body = 'Нужен доступ на объект' $$) = 0,
  'постановщик не удаляет чужой комментарий');
select t.fails($$ update task_comments set body = 'подделка' $$, 'permission denied', 'комментарии нельзя редактировать');

select t.login(:P);
select t.ok(t.affected($$ delete from task_comments where body = 'Нужен доступ на объект' $$) = 1,
  'автор удаляет свой комментарий');

\echo '--- Профиль'
select t.ok(t.affected($$ update profiles set full_name = 'Пётр Петров', phone = '+7 900 000-00-00', position = 'Монтажник'
                        where id = '00000000-0000-0000-0000-00000000000c' $$) = 1,
  'сотрудник редактирует свой профиль');
select t.ok(t.affected($$ update profiles set full_name = 'Взлом' where id = '00000000-0000-0000-0000-00000000000b' $$) = 0,
  'чужой профиль не редактируется');
select t.fails($$ update profiles set role = 'manager' where id = '00000000-0000-0000-0000-00000000000c' $$,
               'permission denied', 'роль через профиль не повысить');
select t.fails($$ update profiles set email = 'x@x' where id = '00000000-0000-0000-0000-00000000000c' $$,
               'permission denied', 'email через профиль не меняется');

\echo '--- Без входа (anon)'
reset role;
set role anon;
select set_config('request.jwt.claims', '', false);
select t.fails($$ select * from expenses $$,       'permission denied', 'anon не читает расходы');
select t.fails($$ select * from task_comments $$,  'permission denied', 'anon не читает комментарии');
select t.fails($$ select * from object_summary $$, 'permission denied', 'anon не читает сводку');
reset role;
