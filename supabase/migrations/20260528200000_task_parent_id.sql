-- One-level child tasks. Children inherit context/group/workspace from the parent.
alter table public.tasks
  add column parent_id uuid references public.tasks (id) on delete cascade;

create index tasks_parent_id_idx on public.tasks (parent_id);

-- Move comments with a task across workspaces (authors cannot update others' rows via RLS).
create or replace function public.reassign_task_comments_workspace(
  task_ids uuid[],
  dest_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if dest_workspace_id is not null
     and not public.is_workspace_member(dest_workspace_id) then
    raise exception 'Not a member of destination workspace';
  end if;

  if dest_workspace_id is null then
    update public.task_comments
    set deleted_at = now(),
        updated_at = now()
    where task_id = any(task_ids)
      and public.is_workspace_member(workspace_id);
    return;
  end if;

  update public.task_comments
  set workspace_id = dest_workspace_id,
      deleted_at = null,
      updated_at = now()
  where task_id = any(task_ids)
    and public.is_workspace_member(workspace_id);
end;
$$;

grant execute on function public.reassign_task_comments_workspace(uuid[], uuid)
  to authenticated;
