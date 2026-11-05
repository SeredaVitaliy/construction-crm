update public.profiles set role = 'manager',  full_name = 'Анна Смирнова (постановщик)' where email = 'manager@example.com';
update public.profiles set role = 'executor', full_name = 'Иван Иванов'                  where email = 'ivanov@example.com';
update public.profiles set role = 'executor', full_name = 'Пётр Петров'                  where email = 'petrov@example.com';

do $$
declare
  m  uuid := (select id from public.profiles where email = 'manager@example.com');
  iv uuid := (select id from public.profiles where email = 'ivanov@example.com');
  pt uuid := (select id from public.profiles where email = 'petrov@example.com');
  o1 uuid; o2 uuid; o3 uuid;
  t  uuid;
begin
  if m is null or iv is null or pt is null then
    raise exception 'Сначала создайте трёх пользователей в Authentication → Users';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);

  insert into public.objects (name, address) values ('ЖК «Северный»',  'Калининград, ул. Горького, 120') returning id into o1;
  insert into public.objects (name, address) values ('Склад «Южный»',   'Калининград, ул. Дзержинского, 45') returning id into o2;
  insert into public.objects (name, address) values ('Офис на Ленинском', 'Калининград, Ленинский пр., 30') returning id into o3;

  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Разметка котлована', 'Вынести оси по проекту, акт разбивки', o1, iv);

  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Армирование плиты', 'Сетка 200×200, Ø12, защитный слой 40 мм', o1, iv) returning id into t;
  perform set_config('request.jwt.claims', json_build_object('sub', iv)::text, true);
  perform public.change_task_status(t, 'in_progress');

  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Монтаж стеллажей', 'Зона А, 12 секций', o2, pt) returning id into t;
  perform set_config('request.jwt.claims', json_build_object('sub', pt)::text, true);
  perform public.change_task_status(t, 'in_progress');
  perform public.change_task_status(t, 'review', 'Смонтировано, фото в приложении');

  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Покраска фасада', 'Цвет RAL 7035, два слоя', o2, pt) returning id into t;
  perform set_config('request.jwt.claims', json_build_object('sub', pt)::text, true);
  perform public.change_task_status(t, 'in_progress');
  perform public.change_task_status(t, 'review');
  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  perform public.change_task_status(t, 'rework', 'Подтёки у входной группы, перекрасить второй слой');

  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Прокладка кабеля', 'Кабель ВВГнг 3×2.5 до щитовой', o3, iv) returning id into t;
  perform set_config('request.jwt.claims', json_build_object('sub', iv)::text, true);
  perform public.change_task_status(t, 'in_progress');
  perform public.change_task_status(t, 'review');
  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  perform public.change_task_status(t, 'rework', 'Нет маркировки линий');
  perform set_config('request.jwt.claims', json_build_object('sub', iv)::text, true);
  perform public.change_task_status(t, 'in_progress');
  perform public.change_task_status(t, 'review', 'Маркировка нанесена');
  perform set_config('request.jwt.claims', json_build_object('sub', m)::text, true);
  perform public.change_task_status(t, 'accepted');

  insert into public.tasks (title, description, object_id, assignee_id)
  values ('Уборка территории', 'Вывоз строительного мусора', o3, pt);
end $$;
