import { getDb } from "../db/queries";
import type { Context, Group, GroupLink, Task, TaskComment } from "../types";
import {
  pushContextsUpsertMany,
  pushGroupLinksUpsertMany,
  pushGroupsUpsertMany,
  pushTaskCommentsUpsertMany,
  pushTasksUpsertMany,
} from "./workspacePush";

/**
 * One-time migration for turning personal cloud sync on: reassigns every
 * local-only row (workspace_id IS NULL) to `workspaceId`, then pushes them
 * with the same batched helpers used for team workspaces. Idempotent — each
 * UPDATE only touches rows still marked NULL, so re-running after a partial
 * failure (e.g. a push error) safely finishes the job.
 */
export async function promoteLocalDataToWorkspace(
  workspaceId: string,
): Promise<void> {
  const db = await getDb();

  await db.execute(
    "UPDATE contexts SET workspace_id = $1 WHERE workspace_id IS NULL",
    [workspaceId],
  );
  await db.execute(
    "UPDATE groups SET workspace_id = $1 WHERE workspace_id IS NULL",
    [workspaceId],
  );
  await db.execute(
    "UPDATE group_links SET workspace_id = $1 WHERE workspace_id IS NULL",
    [workspaceId],
  );
  await db.execute(
    "UPDATE tasks SET workspace_id = $1 WHERE workspace_id IS NULL",
    [workspaceId],
  );
  await db.execute(
    "UPDATE task_comments SET workspace_id = $1 WHERE workspace_id IS NULL",
    [workspaceId],
  );

  const contexts = await db.select<(Context & { updated_at: string })[]>(
    `SELECT id, name, color, description, position, created_at, updated_at
     FROM contexts WHERE workspace_id = $1`,
    [workspaceId],
  );
  await pushContextsUpsertMany(contexts, workspaceId);

  const groups = await db.select<Group[]>(
    `SELECT id, context_id, name, description, color, position, created_at, updated_at
     FROM groups WHERE workspace_id = $1`,
    [workspaceId],
  );
  await pushGroupsUpsertMany(groups, workspaceId);

  const links = await db.select<
    (GroupLink & { created_at: string; updated_at: string })[]
  >(
    `SELECT id, group_id, label, url, kind, position, created_at, updated_at
     FROM group_links WHERE workspace_id = $1`,
    [workspaceId],
  );
  await pushGroupLinksUpsertMany(
    links.map((link) => ({
      link,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
    })),
    workspaceId,
  );

  const tasks = await db.select<Task[]>(
    `SELECT id, title, description, context_id, group_id, state, is_today,
            start_date, end_date, position, recurrence, archived_at,
            created_at, updated_at, assignee_id, created_by_id
     FROM tasks WHERE workspace_id = $1`,
    [workspaceId],
  );
  await pushTasksUpsertMany(tasks, workspaceId);

  const comments = await db.select<TaskComment[]>(
    `SELECT id, workspace_id, task_id, author_id, body, created_at, updated_at
     FROM task_comments WHERE workspace_id = $1`,
    [workspaceId],
  );
  await pushTaskCommentsUpsertMany(comments, workspaceId);
}
