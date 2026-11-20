create schema if not exists demo;
revoke all on schema demo from public;

create table if not exists demo.seed_age (task_id uuid primary key, age int not null);

create or replace function demo.login(p_uid uuid) returns void language sql set search_path = '' as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid)::text, true);
$$;

create or replace function demo.task(
  p_object   uuid,
  p_assignee uuid,
  p_title    text,
  p_desc     text,
  p_priority public.task_priority,
  p_due      int,
  p_age      int,
  p_path     public.task_status[] default '{}',
  p_comments text[] default '{}'
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_manager uuid := (select id from public.profiles where role = 'manager' order by created_at limit 1);
  v_id      uuid;
  v_cur     public.task_status := 'new';
  i         int;
begin
  perform demo.login(v_manager);
  insert into public.tasks (title, description, object_id, assignee_id, priority, due_date)
  values (p_title, p_desc, p_object, p_assignee, p_priority,
          case when p_due is null then null else current_date + p_due end)
  returning id into v_id;

  for i in 1 .. coalesce(array_length(p_path, 1), 0) loop
    perform demo.login(
      case public.transition_actor(v_cur, p_path[i]) when 'manager' then v_manager else p_assignee end
    );
    perform public.change_task_status(v_id, p_path[i], p_comments[i]);
    v_cur := p_path[i];
  end loop;

  insert into demo.seed_age values (v_id, p_age);
  return v_id;
end;
$$;

create or replace function demo.comment(p_task uuid, p_author uuid, p_body text, p_hours_ago int) returns void language plpgsql set search_path = '' as $$
declare v_id bigint;
begin
  perform demo.login(p_author);
  insert into public.task_comments (task_id, body) values (p_task, p_body) returning id into v_id;
  update public.task_comments set created_at = now() - make_interval(hours => p_hours_ago) where id = v_id;
end;
$$;

create or replace function demo.reset() returns void language plpgsql set search_path = '' as $fn$
declare
  m  uuid := (select id from public.profiles where email = 'manager@example.com');
  iv uuid := (select id from public.profiles where email = 'ivanov@example.com');
  pt uuid := (select id from public.profiles where email = 'petrov@example.com');
  kz uuid := coalesce((select id from public.profiles where email = 'kozlov@example.com'), iv);
  sk uuid := coalesce((select id from public.profiles where email = 'sokolova@example.com'), pt);
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid;
  t  uuid;
begin
  delete from public.task_comments;
  delete from public.expenses;
  delete from public.tasks;
  delete from public.objects;
  delete from demo.seed_age;

  update public.profiles set role = 'manager',  full_name = 'Анна Смирнова',   position = 'Руководитель проектов', phone = '+7 911 450-12-34' where email = 'manager@example.com';
  update public.profiles set role = 'executor', full_name = 'Иван Иванов',     position = 'Прораб',                phone = '+7 911 451-22-10' where email = 'ivanov@example.com';
  update public.profiles set role = 'executor', full_name = 'Пётр Петров',     position = 'Монтажник',             phone = '+7 911 452-33-21' where email = 'petrov@example.com';
  update public.profiles set role = 'executor', full_name = 'Олег Козлов',     position = 'Электрик',              phone = '+7 911 453-44-32' where email = 'kozlov@example.com';
  update public.profiles set role = 'executor', full_name = 'Мария Соколова',  position = 'Инженер ПТО',           phone = '+7 911 454-55-43' where email = 'sokolova@example.com';

  if m is null or iv is null or pt is null then
    raise exception 'Сначала создайте пользователей в Authentication → Users (минимум manager, ivanov, petrov)';
  end if;

  perform demo.login(m);

  insert into public.objects (name, address, status, client, description, budget, start_date, end_date)
  values ('ЖК «Северный»', 'Калининград, ул. Горького, 120', 'active', 'ООО «БалтСтрой Девелопмент»',
          'Монолитный жилой дом, 9 этажей, 126 квартир. Подземный паркинг на 60 мест.',
          48500000, current_date - 120, current_date + 240)
  returning id into o1;

  insert into public.objects (name, address, status, client, description, budget, start_date, end_date)
  values ('Склад «Южный»', 'Калининград, ул. Дзержинского, 45', 'active', 'ИП Ковалёв А. Н.',
          'Складской комплекс класса B, 2 400 м², стеллажное хранение.',
          12800000, current_date - 60, current_date + 90)
  returning id into o2;

  insert into public.objects (name, address, status, client, description, budget, start_date, end_date)
  values ('Офис на Ленинском', 'Калининград, Ленинский пр., 30', 'completed', 'АО «Янтарь Консалт»',
          'Капитальный ремонт офиса 640 м²: инженерные сети, отделка, слаботочка.',
          6200000, current_date - 200, current_date - 10)
  returning id into o3;

  insert into public.objects (name, address, status, client, description, budget, start_date, end_date)
  values ('Коттедж в Зеленоградске', 'Зеленоградск, ул. Приморская, 8', 'planning', 'Частный заказчик',
          'Двухэтажный дом из газобетона, 210 м², с террасой.',
          9400000, current_date + 20, current_date + 200)
  returning id into o4;

  insert into public.objects (name, address, status, client, description, budget, start_date, end_date)
  values ('Реконструкция школы № 12', 'Калининград, ул. Чернышевского, 5', 'paused', 'Администрация г. Калининграда',
          'Замена кровли и фасада, усиление перекрытий. Приостановлено до согласования сметы.',
          31000000, current_date - 90, current_date + 300)
  returning id into o5;

  perform demo.task(o1, iv, 'Разметка котлована', 'Вынести оси по проекту, составить акт разбивки.', 'high', -100, 118,
    '{in_progress,review,accepted}', '{null,"Акт разбивки подписан",null}');
  t := demo.task(o1, iv, 'Армирование плиты', 'Сетка 200×200, Ø12, защитный слой 40 мм.', 'urgent', 3, 30,
    '{in_progress}');
  perform demo.comment(t, iv, 'Арматура Ø12 приедет только в четверг, пока вяжу первую захватку.', 26);
  perform demo.comment(t, m, 'Принято. Поставщика поторопила, обещают в среду.', 20);
  perform demo.task(o1, kz, 'Временное электроснабжение', 'Щит ВРУ, кабель до бытовок и крана.', 'high', -40, 90,
    '{in_progress,review,accepted}');
  perform demo.task(o1, sk, 'Исполнительная документация по фундаменту', 'Исполнительные схемы, акты скрытых работ.', 'medium', -2, 25,
    '{in_progress}');
  perform demo.task(o1, pt, 'Гидроизоляция стен паркинга', 'Обмазочная в 2 слоя + профилированная мембрана.', 'medium', 14, 6);
  perform demo.task(o1, iv, 'Опалубка колонн 1-го этажа', 'Щитовая опалубка, 24 колонны.', 'medium', 21, 2);

  t := demo.task(o2, pt, 'Монтаж стеллажей', 'Зона А, 12 секций.', 'high', 1, 20,
    '{in_progress,review}', '{null,"Смонтировано, фото в комментариях"}');
  perform demo.comment(t, pt, 'Все секции выставлены по уровню, анкеровка выполнена.', 5);
  perform demo.task(o2, pt, 'Покраска фасада', 'Цвет RAL 7035, два слоя.', 'medium', -5, 40,
    '{in_progress,review,rework}', '{null,null,"Подтёки у входной группы, перекрасить второй слой"}');
  perform demo.task(o2, kz, 'Освещение складской зоны', 'Светильники LED 150 Вт, 64 шт.', 'medium', 10, 15,
    '{in_progress,review}');
  perform demo.task(o2, sk, 'Пожарная сигнализация: проект', 'Согласовать проект АПС с заказчиком.', 'urgent', -7, 35,
    '{in_progress}');
  perform demo.task(o2, iv, 'Устройство пандуса', 'Бетонный пандус у ворот № 2.', 'low', 30, 1);

  perform demo.task(o3, iv, 'Прокладка кабеля', 'Кабель ВВГнг 3×2.5 до щитовой.', 'high', -60, 180,
    '{in_progress,review,rework,in_progress,review,accepted}', '{null,null,"Нет маркировки линий",null,"Маркировка нанесена",null}');
  perform demo.task(o3, kz, 'Слаботочные сети', 'СКС на 48 портов, видеонаблюдение.', 'medium', -40, 150,
    '{in_progress,review,accepted}');
  perform demo.task(o3, pt, 'Чистовая отделка', 'Покраска стен, монтаж потолка Армстронг.', 'medium', -15, 90,
    '{in_progress,review,accepted}');
  perform demo.task(o3, sk, 'Акт приёмки объекта', 'Подготовить пакет документов для заказчика.', 'high', -10, 30,
    '{in_progress,review,accepted}');

  perform demo.task(o4, sk, 'Геология участка', 'Заказать инженерно-геологические изыскания.', 'high', 12, 4);
  perform demo.task(o4, iv, 'Расчистка участка', 'Вывоз мусора, спил двух деревьев по согласованию.', 'low', 25, 3);

  t := demo.task(o5, pt, 'Демонтаж кровли', 'Снятие старого покрытия, 1 200 м².', 'urgent', -20, 85,
    '{in_progress}');
  perform demo.comment(t, pt, 'Работы остановлены, ждём решения по смете.', 70);
  perform demo.task(o5, sk, 'Обследование перекрытий', 'Заключение по усилению перекрытий 2-го этажа.', 'high', -30, 80,
    '{in_progress,review,accepted}');

  perform demo.login(m);
  insert into public.expenses (object_id, category, amount, spent_on, description) values
    (o1, 'materials', 6850000, current_date - 95, 'Бетон В25, 1 140 м³'),
    (o1, 'materials', 3120000, current_date - 40, 'Арматура А500С, 48 т'),
    (o1, 'labor',     4200000, current_date - 30, 'Бригада монолитчиков, 2 месяца'),
    (o1, 'equipment', 1650000, current_date - 100, 'Аренда башенного крана'),
    (o1, 'transport',  380000, current_date - 60, 'Доставка материалов'),
    (o2, 'materials', 2940000, current_date - 45, 'Сэндвич-панели'),
    (o2, 'materials', 1780000, current_date - 20, 'Стеллажи, 12 секций'),
    (o2, 'labor',     1950000, current_date - 15, 'Монтажная бригада'),
    (o2, 'equipment',  410000, current_date - 25, 'Аренда подъёмника'),
    (o3, 'materials', 2100000, current_date - 150, 'Кабель, щиты, автоматика'),
    (o3, 'labor',     2450000, current_date - 60, 'Отделочные работы'),
    (o3, 'other',      980000, current_date - 15, 'Мебель и вывеска'),
    (o4, 'other',      120000, current_date - 5,  'Топосъёмка участка'),
    (o5, 'labor',     1300000, current_date - 70, 'Демонтажные работы'),
    (o5, 'other',      450000, current_date - 80, 'Техническое обследование');

  alter table public.tasks disable trigger tasks_before_update;

  update public.tasks t
  set created_at = now() - make_interval(days => a.age, hours => 3)
  from demo.seed_age a
  where a.task_id = t.id;

  update public.task_history h
  set created_at = t.created_at + (x.rn - 1) * ((now() - interval '3 hours' - t.created_at) / x.cnt)
  from (
    select id, row_number() over w as rn, count(*) over (partition by task_id) as cnt
    from public.task_history
    window w as (partition by task_id order by id)
  ) x, public.tasks t
  where x.id = h.id and t.id = h.task_id;

  update public.tasks t
  set updated_at = (select max(created_at) from public.task_history h where h.task_id = t.id);

  alter table public.tasks enable trigger tasks_before_update;
  perform set_config('request.jwt.claims', '', true);
end;
$fn$;

revoke all on all functions in schema demo from public, anon, authenticated;
revoke all on all tables in schema demo from public, anon, authenticated;

select demo.reset();
