-- Task ownership fields for team workspaces (assignee + creator)

alter table public.tasks
  add column if not exists assignee_id uuid references auth.users (id) on delete set null,
  add column if not exists created_by_id uuid references auth.users (id) on delete set null;

create index if not exists tasks_assignee_id_idx
  on public.tasks (assignee_id)
  where deleted_at is null;

create index if not exists tasks_created_by_id_idx
  on public.tasks (created_by_id)
  where deleted_at is null;
