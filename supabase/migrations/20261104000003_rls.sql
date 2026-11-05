revoke all on public.profiles, public.objects, public.tasks, public.task_history
  from anon, authenticated;

grant select on public.profiles to authenticated;

grant select, delete on public.objects to authenticated;
grant insert (name, address), update (name, address) on public.objects to authenticated;

grant select, delete on public.tasks to authenticated;
grant insert (title, description, object_id, assignee_id),
      update (title, description, object_id, assignee_id)
  on public.tasks to authenticated;

grant select on public.task_history to authenticated;

revoke execute on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant  execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;
revoke execute on function public.is_manager() from public, anon;
grant  execute on function public.is_manager() to authenticated;
revoke execute on function public.status_label(public.task_status) from anon;
revoke execute on function public.transition_actor(public.task_status, public.task_status) from anon;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.tasks_before_insert()  from public, anon, authenticated;
revoke execute on function public.tasks_before_update()  from public, anon, authenticated;
revoke execute on function public.tasks_write_history()  from public, anon, authenticated;

alter table public.profiles     enable row level security;
alter table public.objects      enable row level security;
alter table public.tasks        enable row level security;
alter table public.task_history enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

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

create policy task_history_select on public.task_history
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.id = task_history.task_id and t.assignee_id = (select auth.uid())
    )
  );
