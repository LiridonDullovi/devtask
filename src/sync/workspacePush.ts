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
import { guardPushByUpdatedAt, guardPushManyByUpdatedAt } from "./conflictGuard";

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

/** Batched variant of pushContextUpsert — one guard call, one upsert call, for N rows. */
export async function pushContextsUpsertMany(
  contexts: (Context & { updated_at: string })[],
  workspaceId: string,
): Promise<void> {
  if (contexts.length === 0) return;

  const guard = await guardPushManyByUpdatedAt(
    "contexts",
    contexts.map((ctx) => ({ id: ctx.id, updatedAt: ctx.updated_at })),
  );

  if (guard.skipped.length > 0) {
    await Promise.all(
      guard.skipped.map((s) => applyCloudContextById(s.id)),
    );
    notifySyncConflict();
  }

  const pushIds = new Set(guard.pushIds);
  const toPush = contexts.filter((ctx) => pushIds.has(ctx.id));
  if (toPush.length === 0) return;

  const { error } = await supabaseClient()
    .from("contexts")
    .upsert(
      toPush.map((ctx) => ({
        id: ctx.id,
        workspace_id: workspaceId,
        name: ctx.name,
        color: ctx.color,
        description: ctx.description,
        position: ctx.position,
        created_at: ctx.created_at,
        updated_at: ctx.updated_at,
        deleted_at: null,
      })),
    );
  if (error) throw error;
}

/** Batched variant of pushGroupUpsert. */
export async function pushGroupsUpsertMany(
  groups: Group[],
  workspaceId: string,
): Promise<void> {
  if (groups.length === 0) return;

  const guard = await guardPushManyByUpdatedAt(
    "groups",
    groups.map((group) => ({ id: group.id, updatedAt: group.updated_at })),
  );

  if (guard.skipped.length > 0) {
    await Promise.all(guard.skipped.map((s) => applyCloudGroupById(s.id)));
    notifySyncConflict();
  }

  const pushIds = new Set(guard.pushIds);
  const toPush = groups.filter((group) => pushIds.has(group.id));
  if (toPush.length === 0) return;

  const { error } = await supabaseClient()
    .from("groups")
    .upsert(
      toPush.map((group) => ({
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
      })),
    );
  if (error) throw error;
}

/** Batched variant of pushGroupLinkUpsert. */
export async function pushGroupLinksUpsertMany(
  links: { link: GroupLink; createdAt: string; updatedAt: string }[],
  workspaceId: string,
): Promise<void> {
  if (links.length === 0) return;

  const guard = await guardPushManyByUpdatedAt(
    "group_links",
    links.map(({ link, updatedAt }) => ({ id: link.id, updatedAt })),
  );

  if (guard.skipped.length > 0) {
    await Promise.all(
      guard.skipped.map((s) => applyCloudGroupLinkById(s.id)),
    );
    notifySyncConflict();
  }

  const pushIds = new Set(guard.pushIds);
  const toPush = links.filter(({ link }) => pushIds.has(link.id));
  if (toPush.length === 0) return;

  const { error } = await supabaseClient()
    .from("group_links")
    .upsert(
      toPush.map(({ link, createdAt, updatedAt }) => ({
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
      })),
    );
  if (error) throw error;
}

/** Batched variant of pushTaskUpsert — one guard call, one upsert call, for N tasks. */
export async function pushTasksUpsertMany(
  tasks: Task[],
  workspaceId: string,
): Promise<void> {
  if (tasks.length === 0) return;

  const guard = await guardPushManyByUpdatedAt(
    "tasks",
    tasks.map((task) => ({ id: task.id, updatedAt: task.updated_at })),
  );

  if (guard.skipped.length > 0) {
    await Promise.all(guard.skipped.map((s) => applyCloudTaskById(s.id)));
    notifySyncConflict();
  }

  const pushIds = new Set(guard.pushIds);
  const toPush = tasks.filter((task) => pushIds.has(task.id));
  if (toPush.length === 0) return;

  const { error } = await supabaseClient()
    .from("tasks")
    .upsert(
      toPush.map((task) => ({
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
      })),
    );
  if (error) throw error;
}

/** Batched variant of pushTaskCommentUpsert. */
export async function pushTaskCommentsUpsertMany(
  comments: {
    id: string;
    task_id: string;
    author_id: string;
    body: string;
    created_at: string;
    updated_at: string;
  }[],
  workspaceId: string,
): Promise<void> {
  if (comments.length === 0) return;

  const guard = await guardPushManyByUpdatedAt(
    "task_comments",
    comments.map((c) => ({ id: c.id, updatedAt: c.updated_at })),
  );

  if (guard.skipped.length > 0) {
    await Promise.all(guard.skipped.map((s) => applyCloudCommentById(s.id)));
    notifySyncConflict();
  }

  const pushIds = new Set(guard.pushIds);
  const toPush = comments.filter((c) => pushIds.has(c.id));
  if (toPush.length === 0) return;

  const { error } = await supabaseClient()
    .from("task_comments")
    .upsert(
      toPush.map((comment) => ({
        id: comment.id,
        workspace_id: workspaceId,
        task_id: comment.task_id,
        author_id: comment.author_id,
        body: comment.body,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        deleted_at: null,
      })),
    );
  if (error) throw error;
}

export async function pushTasksByIds(
  taskIds: string[],
  workspaceId: string,
  loadTask: (id: string) => Promise<Task | null>,
): Promise<void> {
  const tasks: Task[] = [];
  for (const id of taskIds) {
    const task = await loadTask(id);
    if (task) tasks.push(task);
  }
  await pushTasksUpsertMany(tasks, workspaceId);
}
