-- Task comments for team workspaces

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index task_comments_workspace_id_idx
  on public.task_comments (workspace_id);

create index task_comments_task_id_idx
  on public.task_comments (task_id)
  where deleted_at is null;

create index task_comments_task_created_idx
  on public.task_comments (task_id, created_at)
  where deleted_at is null;

create trigger task_comments_set_updated_at
  before update on public.task_comments
  for each row execute function public.set_updated_at();

alter table public.task_comments enable row level security;

create policy "task_comments_select_member"
  on public.task_comments for select
  using (public.is_workspace_member(workspace_id) and deleted_at is null);

create policy "task_comments_insert_member"
  on public.task_comments for insert
  with check (
    public.is_workspace_member(workspace_id)
    and author_id = auth.uid()
  );

create policy "task_comments_update_author"
  on public.task_comments for update
  using (
    public.is_workspace_member(workspace_id)
    and author_id = auth.uid()
  );

create policy "task_comments_delete_author"
  on public.task_comments for delete
  using (
    public.is_workspace_member(workspace_id)
    and author_id = auth.uid()
  );
