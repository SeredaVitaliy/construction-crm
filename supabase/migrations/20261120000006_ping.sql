create function public.ping()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

revoke execute on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
