-- Personal cross-device sync — every signed-in user gets one private,
-- single-member "personal workspace" they can opt into syncing their own
-- tasks through, reusing the exact same sync machinery as team workspaces.

alter table public.workspaces
  add column is_personal boolean not null default false,
  add column owner_user_id uuid references auth.users (id) on delete cascade;

-- Guarantees a user can't end up with two personal workspaces even under a
-- race (two devices calling ensure_personal_workspace at the same instant).
create unique index workspaces_personal_owner_idx
  on public.workspaces (owner_user_id)
  where is_personal;

create function public.ensure_personal_workspace()
returns table (
  id uuid,
  name text,
  slug text,
  plan public.workspace_plan,
  is_personal boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select w.id into v_id
  from public.workspaces w
  where w.owner_user_id = v_uid and w.is_personal;

  if v_id is null then
    begin
      insert into public.workspaces (name, is_personal, owner_user_id)
      values ('Personal', true, v_uid)
      returning workspaces.id into v_id;

      insert into public.workspace_members (workspace_id, user_id, role)
      values (v_id, v_uid, 'owner');
    exception when unique_violation then
      -- Another concurrent call already created it; use that one.
      select w.id into v_id
      from public.workspaces w
      where w.owner_user_id = v_uid and w.is_personal;
    end;
  end if;

  return query
  select w.id, w.name, w.slug, w.plan, w.is_personal
  from public.workspaces w
  where w.id = v_id;
end;
$$;

revoke all on function public.ensure_personal_workspace() from public;
grant execute on function public.ensure_personal_workspace() to authenticated;

-- Defense in depth: block inviting anyone into a personal workspace even if
-- the UI never exposes that path. Same return signature as the version in
-- 20260528180000_workspace_invites.sql, so CREATE OR REPLACE is sufficient.
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
  created_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitee_id uuid;
  v_email text;
  v_invite_created_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.is_personal
  ) then
    raise exception 'Cannot invite members to a personal workspace';
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

  if v_invitee_id is not null then
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

    delete from public.workspace_invites wi
    where wi.workspace_id = p_workspace_id
      and lower(wi.email) = v_email;

    return query
    select
      wm.user_id,
      u.email::text,
      pr.display_name,
      wm.role,
      wm.created_at,
      'member'::text as status
    from public.workspace_members wm
    join auth.users u on u.id = wm.user_id
    left join public.profiles pr on pr.id = wm.user_id
    where wm.workspace_id = p_workspace_id
      and wm.user_id = v_invitee_id;
  else
    insert into public.workspace_invites (workspace_id, email, role, invited_by)
    values (p_workspace_id, v_email, p_role, auth.uid())
    on conflict (workspace_id, lower(email))
    do update set role = excluded.role
    returning workspace_invites.created_at into v_invite_created_at;

    return query
    select
      null::uuid as user_id,
      v_email as email,
      null::text as display_name,
      p_role as role,
      v_invite_created_at as created_at,
      'pending'::text as status;
  end if;
end;
$$;

revoke all on function public.invite_workspace_member(uuid, text, public.workspace_role) from public;
grant execute on function public.invite_workspace_member(uuid, text, public.workspace_role) to authenticated;
