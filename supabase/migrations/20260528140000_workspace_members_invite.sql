-- Invite / list / remove workspace members (email-based invite for existing auth users)

create or replace function public.list_workspace_members(p_workspace_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.workspace_role,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_workspace_member(p_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  return query
  select
    wm.user_id,
    u.email::text,
    p.display_name,
    wm.role,
    wm.created_at
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  left join public.profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace_id
  order by wm.created_at asc;
end;
$$;

create or replace function public.invite_workspace_member(
  p_workspace_id uuid,
  p_email text,
  p_role public.workspace_role default 'member'
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role public.workspace_role,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.get_workspace_role(p_workspace_id) not in ('owner', 'admin') then
    raise exception 'Only workspace owners and admins can invite members';
  end if;

  v_email := lower(trim(p_email));
  if v_email = '' then
    raise exception 'Email is required';
  end if;

  if p_role = 'owner' then
    raise exception 'Cannot invite as owner; transfer ownership is not supported yet';
  end if;

  select u.id into v_invitee_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_invitee_id is null then
    raise exception 'No account found for this email. Ask them to sign up first, then invite again.';
  end if;

  if exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = v_invitee_id
  ) then
    raise exception 'This user is already a member of the workspace';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (p_workspace_id, v_invitee_id, p_role);

  return query
  select
    wm.user_id,
    u.email::text,
    pr.display_name,
    wm.role,
    wm.created_at
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  left join public.profiles pr on pr.id = wm.user_id
  where wm.workspace_id = p_workspace_id
    and wm.user_id = v_invitee_id;
end;
$$;

create or replace function public.remove_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role public.workspace_role;
  v_target_role public.workspace_role;
  v_owner_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_caller_role := public.get_workspace_role(p_workspace_id);

  select wm.role into v_target_role
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id;

  if v_target_role is null then
    raise exception 'User is not a member of this workspace';
  end if;

  if p_user_id = auth.uid() then
    if v_target_role = 'owner' then
      select count(*)::int into v_owner_count
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.role = 'owner';

      if v_owner_count <= 1 then
        raise exception 'Cannot leave: you are the only owner. Transfer ownership or delete the workspace first.';
      end if;
    end if;
  elsif v_caller_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can remove other members';
  elsif v_target_role = 'owner' and v_caller_role <> 'owner' then
    raise exception 'Only owners can remove another owner';
  end if;

  delete from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = p_user_id;
end;
$$;

revoke all on function public.list_workspace_members(uuid) from public;
revoke all on function public.invite_workspace_member(uuid, text, public.workspace_role) from public;
revoke all on function public.remove_workspace_member(uuid, uuid) from public;

grant execute on function public.list_workspace_members(uuid) to authenticated;
grant execute on function public.invite_workspace_member(uuid, text, public.workspace_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
