-- Fix: creating a workspace failed because
-- 1) workspace_members INSERT required existing owner/admin role
-- 2) workspaces INSERT ... RETURNING required SELECT as member (not yet)

create or replace function public.create_workspace(workspace_name text)
returns table (
  id uuid,
  name text,
  slug text,
  plan public.workspace_plan
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_name := trim(workspace_name);
  if v_name = '' then
    raise exception 'Workspace name is required';
  end if;

  insert into public.workspaces (name)
  values (v_name)
  returning workspaces.id into v_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  return query
  select w.id, w.name, w.slug, w.plan
  from public.workspaces w
  where w.id = v_id;
end;
$$;

revoke all on function public.create_workspace(text) from public;
grant execute on function public.create_workspace(text) to authenticated;
