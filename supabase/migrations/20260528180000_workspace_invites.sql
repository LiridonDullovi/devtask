-- Pending invites — invite a teammate by email before they have a DevTask account.
-- Extends invite_workspace_member (was: hard error when no auth.users row matched)
-- and handle_new_user (now consumes matching pending invites on signup).

-- ---------------------------------------------------------------------------
-- workspace_invites
-- ---------------------------------------------------------------------------
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index workspace_invites_workspace_email_idx
  on public.workspace_invites (workspace_id, lower(email));

create index workspace_invites_email_idx on public.workspace_invites (lower(email));

alter table public.workspace_invites enable row level security;

create policy "workspace_invites_select_owner_admin"
  on public.workspace_invites for select
  using (public.get_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_invites_insert_owner_admin"
  on public.workspace_invites for insert
  with check (public.get_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_invites_delete_owner_admin"
  on public.workspace_invites for delete
  using (public.get_workspace_role(workspace_id) in ('owner', 'admin'));

revoke all on public.workspace_invites from public;
grant select, insert, delete on public.workspace_invites to authenticated;

-- ---------------------------------------------------------------------------
-- invite_workspace_member — now creates a pending invite instead of failing
-- when no account exists yet. Return shape changed (added `status`), so the
-- function must be dropped and recreated rather than CREATE OR REPLACE'd.
-- ---------------------------------------------------------------------------
drop function if exists public.invite_workspace_member(uuid, text, public.workspace_role);

create function public.invite_workspace_member(
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

    -- account existed, so any stale pending invite for this email is moot
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

-- ---------------------------------------------------------------------------
-- list_pending_invites / revoke_workspace_invite
-- ---------------------------------------------------------------------------
create function public.list_pending_invites(p_workspace_id uuid)
returns table (
  id uuid,
  email text,
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

  if public.get_workspace_role(p_workspace_id) not in ('owner', 'admin') then
    raise exception 'Only workspace owners and admins can view invites';
  end if;

  return query
  select wi.id, wi.email, wi.role, wi.created_at
  from public.workspace_invites wi
  where wi.workspace_id = p_workspace_id
  order by wi.created_at asc;
end;
$$;

create function public.revoke_workspace_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select wi.workspace_id into v_workspace_id
  from public.workspace_invites wi
  where wi.id = p_invite_id;

  if v_workspace_id is null then
    raise exception 'Invite not found';
  end if;

  if public.get_workspace_role(v_workspace_id) not in ('owner', 'admin') then
    raise exception 'Only workspace owners and admins can revoke invites';
  end if;

  delete from public.workspace_invites where id = p_invite_id;
end;
$$;

revoke all on function public.list_pending_invites(uuid) from public;
revoke all on function public.revoke_workspace_invite(uuid) from public;
grant execute on function public.list_pending_invites(uuid) to authenticated;
grant execute on function public.revoke_workspace_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- handle_new_user — now also consumes pending invites for the new user's email
-- Same signature as before (no args, returns trigger), so CREATE OR REPLACE
-- keeps the existing on_auth_user_created trigger attached.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );

  insert into public.workspace_members (workspace_id, user_id, role)
  select wi.workspace_id, new.id, wi.role
  from public.workspace_invites wi
  where lower(wi.email) = lower(new.email)
  on conflict (workspace_id, user_id) do nothing;

  delete from public.workspace_invites
  where lower(email) = lower(new.email);

  return new;
end;
$$;
