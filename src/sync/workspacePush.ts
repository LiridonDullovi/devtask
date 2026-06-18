import { notifySyncConflict } from "../lib/syncConflicts";
import { getSupabase } from "../lib/supabase";
import type { Context, Group, GroupLink, Task } from "../types";
import {
  applyCloudCommentById,
  applyCloudContextById,
  applyCloudGroupById,
  applyCloudGroupLinkById,
  applyCloudTaskById,
} from "./cloudApply";
import { guardPushByUpdatedAt } from "./conflictGuard";

function supabaseClient() {
  return getSupabase();
}

export async function pushContextUpsert(
  context: Context,
  workspaceId: string,
  localUpdatedAt: string,
): Promise<void> {
  const guard = await guardPushByUpdatedAt(
    "contexts",
    context.id,
    localUpdatedAt,
  );
  if (guard.action === "skip") {
    await applyCloudContextById(context.id);
    notifySyncConflict();
    return;
  }

  const { error } = await supabaseClient()
    .from("contexts")
    .upsert({
      id: context.id,
      workspace_id: workspaceId,
      name: context.name,
      color: context.color,
      description: context.description,
      position: context.position,
      created_at: context.created_at,
      updated_at: localUpdatedAt,
      deleted_at: null,
    });
  if (error) throw error;
}

export async function pushContextDelete(contextId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabaseClient()
    .from("contexts")
    .update({ deleted_at: ts, updated_at: ts })
    .eq("id", contextId);
  if (error) throw error;
}

export async function pushGroupUpsert(
  group: Group,
  workspaceId: string,
): Promise<void> {
  const guard = await guardPushByUpdatedAt(
    "groups",
    group.id,
    group.updated_at,
  );
  if (guard.action === "skip") {
    await applyCloudGroupById(group.id);
    notifySyncConflict();
    return;
  }

  const { error } = await supabaseClient()
    .from("groups")
    .upsert({
      id: group.id,
      workspace_id: workspaceId,
      context_id: group.context_id,
      name: group.name,
      description: group.description,
      color: group.color,
      position: group.position,
      created_at: group.created_at,
      updated_at: group.updated_at,
      deleted_at: null,
    });
  if (error) throw error;
}

export async function pushGroupDelete(groupId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabaseClient()
    .from("groups")
    .update({ deleted_at: ts, updated_at: ts })
    .eq("id", groupId);
  if (error) throw error;
}

export async function pushGroupLinkUpsert(
  link: GroupLink,
  workspaceId: string,
  timestamps?: { createdAt: string; updatedAt: string },
): Promise<void> {
  const createdAt = timestamps?.createdAt ?? new Date().toISOString();
  const updatedAt = timestamps?.updatedAt ?? createdAt;

  const guard = await guardPushByUpdatedAt(
    "group_links",
    link.id,
    updatedAt,
  );
  if (guard.action === "skip") {
    await applyCloudGroupLinkById(link.id);
    notifySyncConflict();
    return;
  }

  const { error } = await supabaseClient()
    .from("group_links")
    .upsert({
      id: link.id,
      workspace_id: workspaceId,
      group_id: link.group_id,
      label: link.label,
      url: link.url,
      kind: link.kind,
      position: link.position,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    });
  if (error) throw error;
}

export async function pushGroupLinkDelete(linkId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabaseClient()
    .from("group_links")
    .update({ deleted_at: ts, updated_at: ts })
    .eq("id", linkId);
  if (error) throw error;
}

export async function pushTaskUpsert(
  task: Task,
  workspaceId: string,
): Promise<void> {
  const guard = await guardPushByUpdatedAt(
    "tasks",
    task.id,
    task.updated_at,
  );
  if (guard.action === "skip") {
    await applyCloudTaskById(task.id);
    notifySyncConflict();
    return;
  }

  const { error } = await supabaseClient()
    .from("tasks")
    .upsert({
      id: task.id,
      workspace_id: workspaceId,
      context_id: task.context_id,
      group_id: task.group_id,
      title: task.title,
      description: task.description,
      state: task.state,
      is_today: task.is_today === 1,
      start_date: task.start_date,
      end_date: task.end_date,
      position: task.position,
      recurrence: task.recurrence,
      archived_at: task.archived_at,
      created_at: task.created_at,
      updated_at: task.updated_at,
      assignee_id: task.assignee_id ?? null,
      created_by_id: task.created_by_id ?? null,
      deleted_at: null,
    });
  if (error) throw error;
}

export async function pushTaskDelete(taskId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabaseClient()
    .from("tasks")
    .update({ deleted_at: ts, updated_at: ts })
    .eq("id", taskId);
  if (error) throw error;
}

export async function pushTaskCommentUpsert(
  comment: {
    id: string;
    task_id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
  },
  workspaceId: string,
): Promise<void> {
  const guard = await guardPushByUpdatedAt(
    "task_comments",
    comment.id,
    comment.updated_at,
  );
  if (guard.action === "skip") {
    await applyCloudCommentById(comment.id);
    notifySyncConflict();
    return;
  }

  const { error } = await supabaseClient()
    .from("task_comments")
    .upsert({
      id: comment.id,
      workspace_id: workspaceId,
      task_id: comment.task_id,
      author_id: comment.author_id,
      body: comment.body,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      deleted_at: null,
    });
  if (error) throw error;
}

export async function pushTaskCommentDelete(commentId: string): Promise<void> {
  const ts = new Date().toISOString();
  const { error } = await supabaseClient()
    .from("task_comments")
    .update({ deleted_at: ts, updated_at: ts })
    .eq("id", commentId);
  if (error) throw error;
}

export async function pushTasksByIds(
  taskIds: string[],
  workspaceId: string,
  loadTask: (id: string) => Promise<Task | null>,
): Promise<void> {
  for (const id of taskIds) {
    const task = await loadTask(id);
    if (task) await pushTaskUpsert(task, workspaceId);
  }
}
