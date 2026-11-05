create function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager'
  );
$$;

create function public.status_label(p public.task_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p
    when 'new'         then 'Новая'
    when 'in_progress' then 'В работе'
    when 'review'      then 'На проверке'
    when 'accepted'    then 'Принята'
    when 'rework'      then 'На доработке'
  end;
$$;

create function public.transition_actor(p_from public.task_status, p_to public.task_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_from = 'new'         and p_to = 'in_progress' then 'assignee'
    when p_from = 'in_progress' and p_to = 'review'      then 'assignee'
    when p_from = 'review'      and p_to = 'accepted'    then 'manager'
    when p_from = 'review'      and p_to = 'rework'      then 'manager'
    when p_from = 'rework'      and p_to = 'in_progress' then 'assignee'
    else null
  end;
$$;

create function public.tasks_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Не авторизован' using errcode = '42501';
  end if;

  new.status     := 'new';
  new.author_id  := auth.uid();
  new.created_at := now();
  new.updated_at := now();

  if not exists (
    select 1 from public.profiles where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'Исполнителем можно назначить только пользователя с ролью «Исполнитель»'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tasks_before_insert
  before insert on public.tasks
  for each row execute function public.tasks_before_insert();

create function public.tasks_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor   text;
  v_comment text := nullif(trim(current_setting('app.status_comment', true)), '');
begin
  new.id         := old.id;
  new.author_id  := old.author_id;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.assignee_id is distinct from old.assignee_id and not exists (
    select 1 from public.profiles where id = new.assignee_id and role = 'executor'
  ) then
    raise exception 'Исполнителем можно назначить только пользователя с ролью «Исполнитель»'
      using errcode = '23514';
  end if;

  if new.status is distinct from old.status then
    v_actor := public.transition_actor(old.status, new.status);

    if v_actor is null then
      raise exception 'Переход «%» → «%» запрещён',
        public.status_label(old.status), public.status_label(new.status)
        using errcode = 'P0001';
    end if;

    if v_actor = 'assignee' and auth.uid() is distinct from old.assignee_id then
      raise exception 'Этот переход может сделать только назначенный исполнитель'
        using errcode = '42501';
    end if;

    if v_actor = 'manager' and not public.is_manager() then
      raise exception 'Этот переход может сделать только постановщик'
        using errcode = '42501';
    end if;

    if new.status = 'rework' and v_comment is null then
      raise exception 'При возврате на доработку комментарий обязателен'
        using errcode = '23514';
    end if;

    if new.assignee_id is distinct from old.assignee_id then
      raise exception 'Нельзя одновременно менять статус и исполнителя'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger tasks_before_update
  before update on public.tasks
  for each row execute function public.tasks_before_update();

create function public.tasks_write_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
    values (new.id, null, new.status, new.author_id, null);
  elsif new.status is distinct from old.status then
    insert into public.task_history (task_id, from_status, to_status, changed_by, comment)
    values (
      new.id, old.status, new.status, auth.uid(),
      nullif(trim(current_setting('app.status_comment', true)), '')
    );
  end if;
  return null;
end;
$$;

create trigger tasks_write_history
  after insert or update on public.tasks
  for each row execute function public.tasks_write_history();

create function public.change_task_status(
  p_task_id uuid,
  p_to      public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks;
begin
  if auth.uid() is null then
    raise exception 'Не авторизован' using errcode = '42501';
  end if;

  select * into v_task from public.tasks
  where id = p_task_id
    and (public.is_manager() or assignee_id = auth.uid())
  for update;

  if not found then
    raise exception 'Задача не найдена' using errcode = 'P0002';
  end if;

  if v_task.status = p_to then
    raise exception 'Задача уже в статусе «%». Обновите страницу.', public.status_label(p_to)
      using errcode = 'P0001';
  end if;

  perform set_config('app.status_comment', coalesce(p_comment, ''), true);

  update public.tasks set status = p_to where id = p_task_id
  returning * into v_task;

  perform set_config('app.status_comment', '', true);
  return v_task;
end;
$$;
