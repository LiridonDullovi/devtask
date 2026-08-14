import { getDb, getTask } from "../db/queries";
import { getTaskComment } from "../db/taskComments";
import type { Context, Group, GroupLink, Task } from "../types";
import {
  getWorkspaceLastSyncedAt,
  mergeWorkspaceCache,
  type WorkspaceMergeResult,
} from "../db/workspaceCache";
import { getSupabase } from "../lib/supabase";
import { fetchDeletedIds } from "./conflictGuard";
import {
  pushContextsUpsertMany,
  pushGroupLinksUpsertMany,
  pushGroupsUpsertMany,
  pushTaskCommentsUpsertMany,
  pushTasksUpsertMany,
} from "./workspacePush";

export interface WorkspaceSyncCounts {
  contexts: number;
  groups: number;
  tasks: number;
  comments: number;
  syncedAt: string;
  localWins: number;
}

async function repushLocalWinners(
  workspaceId: string,
  merge: WorkspaceMergeResult,
): Promise<void> {
  const database = await getDb();

  if (merge.repushContextIds.length > 0) {
    const placeholders = merge.repushContextIds
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const ctxRows = await database.select<(Context & { updated_at: string })[]>(
      `SELECT id, name, color, description, position, created_at, updated_at
       FROM contexts WHERE id IN (${placeholders})`,
      merge.repushContextIds,
    );
    await pushContextsUpsertMany(ctxRows, workspaceId);
  }

  if (merge.repushGroupIds.length > 0) {
    const placeholders = merge.repushGroupIds
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const groupRows = await database.select<Group[]>(
      `SELECT * FROM groups WHERE id IN (${placeholders})`,
      merge.repushGroupIds,
    );
    await pushGroupsUpsertMany(groupRows, workspaceId);
  }

  if (merge.repushGroupLinkIds.length > 0) {
    const placeholders = merge.repushGroupLinkIds
      .map((_, i) => `$${i + 1}`)
      .join(", ");
    const linkRows = await database.select<
      (GroupLink & { created_at: string; updated_at: string })[]
    >(
      `SELECT * FROM group_links WHERE id IN (${placeholders})`,
      merge.repushGroupLinkIds,
    );
    await pushGroupLinksUpsertMany(
      linkRows.map((link) => ({
        link,
        createdAt: link.created_at,
        updatedAt: link.updated_at,
      })),
      workspaceId,
    );
  }

  if (merge.repushTaskIds.length > 0) {
    const tasks: Task[] = [];
    for (const id of merge.repushTaskIds) {
      const task = await getTask(id);
      if (task) tasks.push(task);
    }
    await pushTasksUpsertMany(tasks, workspaceId);
  }

  if (merge.repushCommentIds.length > 0) {
    const comments: Parameters<typeof pushTaskCommentsUpsertMany>[0] = [];
    for (const id of merge.repushCommentIds) {
      const comment = await getTaskComment(id);
      if (comment) comments.push(comment);
    }
    await pushTaskCommentsUpsertMany(comments, workspaceId);
  }
}

/**
 * Pull workspace hierarchy from Supabase into the local SQLite cache.
 * Personal rows (workspace_id IS NULL) are untouched.
 */
export async function syncWorkspacePull(
  workspaceId: string,
): Promise<WorkspaceSyncCounts> {
  const supabase = getSupabase();
  const lastSyncedAt = await getWorkspaceLastSyncedAt(workspaceId);
  const since = lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  const [
    contextsRes,
    groupsRes,
    linksRes,
    tasksRes,
    commentsRes,
    deletedContextIds,
    deletedGroupIds,
    deletedGroupLinkIds,
    deletedTaskIds,
    deletedCommentIds,
  ] = await Promise.all([
    supabase
      .from("contexts")
      .select(
        "id, name, color, description, position, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("groups")
      .select(
        "id, context_id, name, description, color, position, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("group_links")
      .select(
        "id, group_id, label, url, kind, position, created_at, updated_at",
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("tasks")
      .select(
        `id, context_id, group_id, title, description, state, is_today,
         start_date, end_date, position, recurrence, archived_at,
         created_at, updated_at, assignee_id, created_by_id`,
      )
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("position"),
    supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at, updated_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at"),
    fetchDeletedIds("contexts", workspaceId, since),
    fetchDeletedIds("groups", workspaceId, since),
    fetchDeletedIds("group_links", workspaceId, since),
    fetchDeletedIds("tasks", workspaceId, since),
    fetchDeletedIds("task_comments", workspaceId, since),
  ]);

  if (contextsRes.error) throw contextsRes.error;
  if (groupsRes.error) throw groupsRes.error;
  if (linksRes.error) throw linksRes.error;
  if (tasksRes.error) throw tasksRes.error;
  if (commentsRes.error) throw commentsRes.error;

  const syncedAt = new Date().toISOString();

  const merge = await mergeWorkspaceCache(
    workspaceId,
    {
      contexts: contextsRes.data ?? [],
      groups: groupsRes.data ?? [],
      groupLinks: linksRes.data ?? [],
      tasks: tasksRes.data ?? [],
      taskComments: commentsRes.data ?? [],
    },
    {
      lastSyncedAt,
      deletedContextIds,
      deletedGroupIds,
      deletedGroupLinkIds,
      deletedTaskIds,
      deletedCommentIds,
    },
  );

  await repushLocalWinners(workspaceId, merge);

  return {
    contexts: contextsRes.data?.length ?? 0,
    groups: groupsRes.data?.length ?? 0,
    tasks: tasksRes.data?.length ?? 0,
    comments: commentsRes.data?.length ?? 0,
    syncedAt,
    localWins: merge.localWins,
  };
}

/** @deprecated Use syncWorkspacePull — kept for compatibility during transition */
export async function pullWorkspaceSnapshot(
  workspaceId: string,
): Promise<WorkspaceSyncCounts> {
  return syncWorkspacePull(workspaceId);
}
