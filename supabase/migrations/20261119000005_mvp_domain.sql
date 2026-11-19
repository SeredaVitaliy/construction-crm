create type public.object_status as enum ('planning', 'active', 'paused', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.expense_category as enum ('materials', 'labor', 'equipment', 'transport', 'other');

alter table public.objects
  add column status      public.object_status not null default 'planning',
  add column client      text not null default '',
  add column description text not null default '',
  add column budget      numeric(14, 2) not null default 0 check (budget >= 0),
  add column start_date  date,
  add column end_date    date,
  add constraint objects_dates_check check (end_date is null or start_date is null or end_date >= start_date);

alter table public.tasks
  add column priority public.task_priority not null default 'medium',
  add column due_date date;

create index tasks_status_idx   on public.tasks (status);
create index tasks_due_date_idx on public.tasks (due_date) where status <> 'accepted';

alter table public.profiles
  add column phone    text not null default '' check (length(phone) <= 32),
  add column position text not null default '' check (length(position) <= 80),
  add constraint profiles_full_name_len check (length(full_name) <= 100);

create table public.task_comments (
  id         bigint generated always as identity primary key,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles (id),
  body       text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index task_comments_task_id_idx on public.task_comments (task_id, created_at);

create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  object_id   uuid not null references public.objects (id) on delete restrict,
  category    public.expense_category not null default 'materials',
  amount      numeric(14, 2) not null check (amount > 0),
  spent_on    date not null default current_date,
  description text not null default '' check (length(description) <= 500),
  created_by  uuid not null default auth.uid() references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index expenses_object_id_idx on public.expenses (object_id, spent_on);

create function public.task_comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Не авторизован' using errcode = '42501';
  end if;
  new.author_id  := auth.uid();
  new.created_at := now();
  new.body       := trim(new.body);
  return new;
end;
$$;

create trigger task_comments_before_insert
  before insert on public.task_comments
  for each row execute function public.task_comments_before_insert();

create function public.expenses_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null then
      raise exception 'Не авторизован' using errcode = '42501';
    end if;
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.id         := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.description := trim(new.description);
  return new;
end;
$$;

create trigger expenses_before_write
  before insert or update on public.expenses
  for each row execute function public.expenses_before_write();

create view public.object_summary
with (security_invoker = true)
as
select
  o.id as object_id,
  (select count(*) from public.tasks t where t.object_id = o.id)::int as tasks_total,
  (select count(*) from public.tasks t where t.object_id = o.id and t.status = 'accepted')::int as tasks_done,
  (select count(*) from public.tasks t where t.object_id = o.id and t.status = 'review')::int as tasks_review,
  (select count(*) from public.tasks t
     where t.object_id = o.id and t.status <> 'accepted' and t.due_date < current_date)::int as tasks_overdue,
  (select coalesce(sum(e.amount), 0) from public.expenses e where e.object_id = o.id) as spent
from public.objects o;

revoke all on public.task_comments, public.expenses, public.object_summary from anon, authenticated;

grant insert (status, client, description, budget, start_date, end_date),
      update (status, client, description, budget, start_date, end_date)
  on public.objects to authenticated;

grant insert (priority, due_date), update (priority, due_date) on public.tasks to authenticated;

grant update (full_name, phone, position) on public.profiles to authenticated;

grant select, delete on public.task_comments to authenticated;
grant insert (task_id, body) on public.task_comments to authenticated;

grant select, delete on public.expenses to authenticated;
grant insert (object_id, category, amount, spent_on, description),
      update (object_id, category, amount, spent_on, description)
  on public.expenses to authenticated;

grant select on public.object_summary to authenticated;

revoke execute on function public.task_comments_before_insert() from public, anon, authenticated;
revoke execute on function public.expenses_before_write()       from public, anon, authenticated;

alter table public.task_comments enable row level security;
alter table public.expenses      enable row level security;

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy task_comments_select on public.task_comments
  for select to authenticated
  using (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and t.assignee_id = (select auth.uid())
    )
  );

create policy task_comments_insert on public.task_comments
  for insert to authenticated
  with check (
    public.is_manager()
    or exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and t.assignee_id = (select auth.uid())
    )
  );

create policy task_comments_delete on public.task_comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

create policy expenses_select on public.expenses
  for select to authenticated
  using (public.is_manager());

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (public.is_manager());

create policy expenses_update on public.expenses
  for update to authenticated
  using (public.is_manager())
  with check (public.is_manager());

create policy expenses_delete on public.expenses
  for delete to authenticated
  using (public.is_manager());
