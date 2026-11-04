-- =====================================================================
-- 3. ДОСТУП: гранты (какие колонки вообще можно трогать) + RLS (какие строки).
--    Два слоя: даже если ошибиться в политике, гранты не дадут
--    записать статус или историю напрямую.
-- =====================================================================

-- Supabase по умолчанию выдаёт anon/authenticated все права на новые таблицы.
-- Забираем всё и выдаём только нужное.
revoke all on public.profiles, public.objects, public.tasks, public.task_history
  from anon, authenticated;

-- Анонимам (без входа) не доступно ничего.

-- profiles: только чтение (имена в карточках и истории, список исполнителей)
grant select on public.profiles to authenticated;

-- objects: чтение всем вошедшим (фильтрует RLS), запись — RLS только постановщику
grant select, delete on public.objects to authenticated;
grant insert (name, address), update (name, address) on public.objects to authenticated;

-- tasks: status, author_id, created_at напрямую не пишутся никем.
-- Статус меняется только через RPC change_task_status.
grant select, delete on public.tasks to authenticated;
grant insert (title, description, object_id, assignee_id),
      update (title, description, object_id, assignee_id)
  on public.tasks to authenticated;

-- task_history: только чтение. insert/update/delete не выдаём вообще.
grant select on public.task_history to authenticated;

-- Функции: Supabase по умолчанию даёт EXECUTE всем (в т.ч. anon)
revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant  execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
revoke execute on function public.is_manager() from public, anon;
grant  execute on function public.is_manager() to authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.tasks_before_insert()  from public, anon, authenticated;
revoke execute on function public.tasks_before_update()  from public, anon, authenticated;
revoke execute on function public.tasks_write_history()  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.objects      enable row level security;
alter table public.tasks        enable row level security;
alter table public.task_history enable row level security;

-- PROFILES -------------------------------------------------------------
-- Все сотрудники видят друг друга (ФИО и роль), чтобы показать автора,
-- исполнителя и кто менял статус. Изменение — только из дашборда.
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

-- TASKS ----------------------------------------------------------------
-- Постановщик видит всё, исполнитель — только задачи, где он исполнитель.
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_manager() or assignee_id = (select auth.uid()));

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (public.is_manager());

create policy tasks_update on public.tasks
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy tasks_delete on public.tasks
  for delete to authenticated
  using (public.is_manager());

-- OBJECTS --------------------------------------------------------------
-- Исполнитель видит объект, только если у него есть задача на этом объекте.
create policy objects_select on public.objects
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id and t.assignee_id = (select auth.uid())
    )
  );

create policy objects_insert on public.objects
  for insert to authenticated
  with check (public.is_manager());

create policy objects_update on public.objects
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy objects_delete on public.objects
  for delete to authenticated
  using (public.is_manager());

-- TASK_HISTORY ---------------------------------------------------------
-- Видна тем, кто видит саму задачу. Политик на запись нет => запись запрещена.
create policy task_history_select on public.task_history
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.id = task_history.task_id and t.assignee_id = (select auth.uid())
    )
  );
