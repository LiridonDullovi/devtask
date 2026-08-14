-- DevTask — Workspace / team cloud schema (v1)
-- Apply in Supabase SQL Editor or via: supabase db push / MCP apply_migration
-- Personal device sync is OUT OF SCOPE for this migration.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (align with src/types.ts)
-- ---------------------------------------------------------------------------
create type public.task_state as enum ('todo', 'in_progress', 'testing', 'done');
create type public.task_recurrence as enum ('none', 'daily', 'weekly');
create type public.group_link_kind as enum ('url', 'folder');
create type public.workspace_role as enum ('owner', 'admin', 'member');
create type public.workspace_plan as enum ('free', 'pro', 'team');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Workspaces & membership
-- ---------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  plan public.workspace_plan not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- ---------------------------------------------------------------------------
-- Task hierarchy (workspace-scoped)
-- ---------------------------------------------------------------------------
create table public.contexts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null,
  color text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index contexts_workspace_id_idx on public.contexts (workspace_id);
create index contexts_workspace_position_idx on public.contexts (workspace_id, position);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  context_id uuid not null references public.contexts (id) on delete cascade,
  name text not null,
  description text,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index groups_workspace_id_idx on public.groups (workspace_id);
create index groups_context_id_idx on public.groups (context_id);

create table public.group_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  label text,
  url text not null,
  kind public.group_link_kind not null default 'url',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index group_links_group_id_idx on public.group_links (group_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  context_id uuid not null references public.contexts (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  title text not null,
  description text,
  state public.task_state not null default 'todo',
  is_today boolean not null default false,
  start_date date,
  end_date date,
  position integer not null default 0,
  recurrence public.task_recurrence not null default 'none',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_workspace_id_idx on public.tasks (workspace_id);
create index tasks_context_id_idx on public.tasks (context_id);
create index tasks_group_id_idx on public.tasks (group_id);
create index tasks_workspace_updated_idx on public.tasks (workspace_id, updated_at);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create trigger contexts_set_updated_at
  before update on public.contexts
  for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
  before update on public.groups
  for each row execute function public.set_updated_at();

create trigger group_links_set_updated_at
  before update on public.group_links
  for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.get_workspace_role(ws_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = ws_id
    and wm.user_id = auth.uid()
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.contexts enable row level security;
alter table public.groups enable row level security;
alter table public.group_links enable row level security;
alter table public.tasks enable row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- workspaces
create policy "workspaces_select_member"
  on public.workspaces for select
  using (public.is_workspace_member(id));

create policy "workspaces_insert_authenticated"
  on public.workspaces for insert
  to authenticated
  with check (true);

create policy "workspaces_update_owner_admin"
  on public.workspaces for update
  using (public.get_workspace_role(id) in ('owner', 'admin'));

create policy "workspaces_delete_owner"
  on public.workspaces for delete
  using (public.get_workspace_role(id) = 'owner');

-- workspace_members
create policy "workspace_members_select_member"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));

create policy "workspace_members_insert_owner_admin"
  on public.workspace_members for insert
  with check (public.get_workspace_role(workspace_id) in ('owner', 'admin'));

create policy "workspace_members_delete_owner_admin"
  on public.workspace_members for delete
  using (
    public.get_workspace_role(workspace_id) in ('owner', 'admin')
    or user_id = auth.uid()
  );

-- contexts
create policy "contexts_select_member"
  on public.contexts for select
  using (public.is_workspace_member(workspace_id) and deleted_at is null);

create policy "contexts_insert_member"
  on public.contexts for insert
  with check (public.is_workspace_member(workspace_id));

create policy "contexts_update_member"
  on public.contexts for update
  using (public.is_workspace_member(workspace_id));

create policy "contexts_delete_member"
  on public.contexts for delete
  using (public.get_workspace_role(workspace_id) in ('owner', 'admin', 'member'));

-- groups
create policy "groups_select_member"
  on public.groups for select
  using (public.is_workspace_member(workspace_id) and deleted_at is null);

create policy "groups_insert_member"
  on public.groups for insert
  with check (public.is_workspace_member(workspace_id));

create policy "groups_update_member"
  on public.groups for update
  using (public.is_workspace_member(workspace_id));

create policy "groups_delete_member"
  on public.groups for delete
  using (public.is_workspace_member(workspace_id));

-- group_links
create policy "group_links_select_member"
  on public.group_links for select
  using (public.is_workspace_member(workspace_id) and deleted_at is null);

create policy "group_links_insert_member"
  on public.group_links for insert
  with check (public.is_workspace_member(workspace_id));

create policy "group_links_update_member"
  on public.group_links for update
  using (public.is_workspace_member(workspace_id));

create policy "group_links_delete_member"
  on public.group_links for delete
  using (public.is_workspace_member(workspace_id));

-- tasks
create policy "tasks_select_member"
  on public.tasks for select
  using (public.is_workspace_member(workspace_id) and deleted_at is null);

create policy "tasks_insert_member"
  on public.tasks for insert
  with check (public.is_workspace_member(workspace_id));

create policy "tasks_update_member"
  on public.tasks for update
  using (public.is_workspace_member(workspace_id));

create policy "tasks_delete_member"
  on public.tasks for delete
  using (public.is_workspace_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- After creating a workspace, caller must insert themselves as owner (app logic)
-- Example:
--   insert into workspaces (name) values ('Acme') returning id;
--   insert into workspace_members (workspace_id, user_id, role)
--   values (<id>, auth.uid(), 'owner');
-- ---------------------------------------------------------------------------
