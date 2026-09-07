import Database from "@tauri-apps/plugin-sql";
import type { Task } from "../types";
import { isSyncNewerOrEqual } from "../sync/syncTimestamps";

const DB_URL = "sqlite:devtask.db";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_URL);
  }
  return db;
}

/** Keep multi-row statements well under SQLite's bound-parameter limit. */
const BATCH_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/** Batch-fetch local `updated_at` for a set of ids (one query per chunk, not one per row). */
async function fetchLocalUpdatedAtMap(
  table: "contexts" | "groups" | "group_links" | "tasks" | "task_comments",
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const database = await getDb();
  for (const batch of chunk(ids, BATCH_SIZE)) {
    const placeholders = batch.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await database.select<{ id: string; updated_at: string }[]>(
      `SELECT id, updated_at FROM ${table} WHERE id IN (${placeholders})`,
      batch,
    );
    for (const row of rows) map.set(row.id, row.updated_at);
  }
  return map;
}

export type CloudContext = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type CloudGroup = {
  id: string;
  context_id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type CloudGroupLink = {
  id: string;
  group_id: string;
  label: string | null;
  url: string;
  kind: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type CloudTask = {
  id: string;
  context_id: string;
  group_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  state: Task["state"];
  is_today: boolean;
  start_date: string | null;
  end_date: string | null;
  position: number;
  recurrence: Task["recurrence"];
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_id: string | null;
  created_by_id: string | null;
};

export type CloudTaskComment = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export interface WorkspacePullPayload {
  contexts: CloudContext[];
  groups: CloudGroup[];
  groupLinks: CloudGroupLink[];
  tasks: CloudTask[];
  taskComments: CloudTaskComment[];
}

export interface WorkspaceMergeResult {
  localWins: number;
  repushTaskIds: string[];
  repushContextIds: string[];
  repushGroupIds: string[];
  repushGroupLinkIds: string[];
  repushCommentIds: string[];
}

export interface WorkspaceMergeOptions {
  deletedContextIds?: string[];
  deletedGroupIds?: string[];
  deletedGroupLinkIds?: string[];
  deletedTaskIds?: string[];
  deletedCommentIds?: string[];
  lastSyncedAt?: string | null;
}

export async function upsertCloudContext(
  workspaceId: string,
  ctx: CloudContext,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO contexts (
       id, name, color, description, position, created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       color = excluded.color,
       description = excluded.description,
       position = excluded.position,
       updated_at = excluded.updated_at,
       workspace_id = excluded.workspace_id`,
    [
      ctx.id,
      ctx.name,
      ctx.color,
      ctx.description,
      ctx.position,
      ctx.created_at,
      ctx.updated_at,
      workspaceId,
    ],
  );
}

export async function upsertCloudGroup(
  workspaceId: string,
  group: CloudGroup,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO groups (
       id, context_id, name, description, color, position,
       created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT(id) DO UPDATE SET
       context_id = excluded.context_id,
       name = excluded.name,
       description = excluded.description,
       color = excluded.color,
       position = excluded.position,
       updated_at = excluded.updated_at,
       workspace_id = excluded.workspace_id`,
    [
      group.id,
      group.context_id,
      group.name,
      group.description,
      group.color,
      group.position,
      group.created_at,
      group.updated_at,
      workspaceId,
    ],
  );
}

export async function upsertCloudGroupLink(
  workspaceId: string,
  link: CloudGroupLink,
): Promise<void> {
  const database = await getDb();
  const kind = link.kind === "folder" ? "folder" : "url";
  await database.execute(
    `INSERT INTO group_links (
       id, group_id, label, url, kind, position,
       created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT(id) DO UPDATE SET
       group_id = excluded.group_id,
       label = excluded.label,
       url = excluded.url,
       kind = excluded.kind,
       position = excluded.position,
       updated_at = excluded.updated_at,
       workspace_id = excluded.workspace_id`,
    [
      link.id,
      link.group_id,
      link.label,
      link.url,
      kind,
      link.position,
      link.created_at,
      link.updated_at,
      workspaceId,
    ],
  );
}

export async function upsertCloudTask(
  workspaceId: string,
  task: CloudTask,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO tasks (
       id, title, description, context_id, group_id, parent_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at,
       created_at, updated_at, workspace_id, assignee_id, created_by_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       context_id = excluded.context_id,
       group_id = excluded.group_id,
       parent_id = excluded.parent_id,
       state = excluded.state,
       is_today = excluded.is_today,
       start_date = excluded.start_date,
       end_date = excluded.end_date,
       position = excluded.position,
       recurrence = excluded.recurrence,
       archived_at = excluded.archived_at,
       updated_at = excluded.updated_at,
       workspace_id = excluded.workspace_id,
       assignee_id = excluded.assignee_id,
       created_by_id = excluded.created_by_id`,
    [
      task.id,
      task.title,
      task.description,
      task.context_id,
      task.group_id,
      task.parent_id,
      task.state,
      task.is_today ? 1 : 0,
      task.start_date,
      task.end_date,
      task.position,
      task.recurrence,
      task.archived_at,
      task.created_at,
      task.updated_at,
      workspaceId,
      task.assignee_id,
      task.created_by_id,
    ],
  );
}

export async function upsertCloudComment(
  workspaceId: string,
  comment: CloudTaskComment,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO task_comments (
       id, workspace_id, task_id, author_id, body, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT(id) DO UPDATE SET
       body = excluded.body,
       updated_at = excluded.updated_at,
       task_id = excluded.task_id,
       author_id = excluded.author_id,
       workspace_id = excluded.workspace_id`,
    [
      comment.id,
      workspaceId,
      comment.task_id,
      comment.author_id,
      comment.body,
      comment.created_at,
      comment.updated_at,
    ],
  );
}

export async function upsertCloudContextsMany(
  workspaceId: string,
  contexts: CloudContext[],
): Promise<void> {
  if (contexts.length === 0) return;
  const database = await getDb();
  for (const batch of chunk(contexts, BATCH_SIZE)) {
    const values: unknown[] = [];
    const rows = batch.map((ctx, i) => {
      const b = i * 8;
      values.push(
        ctx.id,
        ctx.name,
        ctx.color,
        ctx.description,
        ctx.position,
        ctx.created_at,
        ctx.updated_at,
        workspaceId,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`;
    });
    await database.execute(
      `INSERT INTO contexts (
         id, name, color, description, position, created_at, updated_at, workspace_id
       ) VALUES ${rows.join(", ")}
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         color = excluded.color,
         description = excluded.description,
         position = excluded.position,
         updated_at = excluded.updated_at,
         workspace_id = excluded.workspace_id`,
      values,
    );
  }
}

export async function upsertCloudGroupsMany(
  workspaceId: string,
  groups: CloudGroup[],
): Promise<void> {
  if (groups.length === 0) return;
  const database = await getDb();
  for (const batch of chunk(groups, BATCH_SIZE)) {
    const values: unknown[] = [];
    const rows = batch.map((group, i) => {
      const b = i * 9;
      values.push(
        group.id,
        group.context_id,
        group.name,
        group.description,
        group.color,
        group.position,
        group.created_at,
        group.updated_at,
        workspaceId,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`;
    });
    await database.execute(
      `INSERT INTO groups (
         id, context_id, name, description, color, position,
         created_at, updated_at, workspace_id
       ) VALUES ${rows.join(", ")}
       ON CONFLICT(id) DO UPDATE SET
         context_id = excluded.context_id,
         name = excluded.name,
         description = excluded.description,
         color = excluded.color,
         position = excluded.position,
         updated_at = excluded.updated_at,
         workspace_id = excluded.workspace_id`,
      values,
    );
  }
}

export async function upsertCloudGroupLinksMany(
  workspaceId: string,
  links: CloudGroupLink[],
): Promise<void> {
  if (links.length === 0) return;
  const database = await getDb();
  for (const batch of chunk(links, BATCH_SIZE)) {
    const values: unknown[] = [];
    const rows = batch.map((link, i) => {
      const b = i * 9;
      const kind = link.kind === "folder" ? "folder" : "url";
      values.push(
        link.id,
        link.group_id,
        link.label,
        link.url,
        kind,
        link.position,
        link.created_at,
        link.updated_at,
        workspaceId,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9})`;
    });
    await database.execute(
      `INSERT INTO group_links (
         id, group_id, label, url, kind, position,
         created_at, updated_at, workspace_id
       ) VALUES ${rows.join(", ")}
       ON CONFLICT(id) DO UPDATE SET
         group_id = excluded.group_id,
         label = excluded.label,
         url = excluded.url,
         kind = excluded.kind,
         position = excluded.position,
         updated_at = excluded.updated_at,
         workspace_id = excluded.workspace_id`,
      values,
    );
  }
}

export async function upsertCloudTasksMany(
  workspaceId: string,
  tasks: CloudTask[],
): Promise<void> {
  if (tasks.length === 0) return;
  const database = await getDb();
  const ordered = [...tasks].sort((a, b) => {
    if (!a.parent_id && b.parent_id) return -1;
    if (a.parent_id && !b.parent_id) return 1;
    return 0;
  });
  for (const batch of chunk(ordered, BATCH_SIZE)) {
    const values: unknown[] = [];
    const rows = batch.map((task, i) => {
      const b = i * 18;
      values.push(
        task.id,
        task.title,
        task.description,
        task.context_id,
        task.group_id,
        task.parent_id,
        task.state,
        task.is_today ? 1 : 0,
        task.start_date,
        task.end_date,
        task.position,
        task.recurrence,
        task.archived_at,
        task.created_at,
        task.updated_at,
        workspaceId,
        task.assignee_id,
        task.created_by_id,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, $${b + 9}, $${b + 10}, $${b + 11}, $${b + 12}, $${b + 13}, $${b + 14}, $${b + 15}, $${b + 16}, $${b + 17}, $${b + 18})`;
    });
    await database.execute(
      `INSERT INTO tasks (
         id, title, description, context_id, group_id, parent_id, state, is_today,
         start_date, end_date, position, recurrence, archived_at,
         created_at, updated_at, workspace_id, assignee_id, created_by_id
       ) VALUES ${rows.join(", ")}
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         context_id = excluded.context_id,
         group_id = excluded.group_id,
         parent_id = excluded.parent_id,
         state = excluded.state,
         is_today = excluded.is_today,
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         position = excluded.position,
         recurrence = excluded.recurrence,
         archived_at = excluded.archived_at,
         updated_at = excluded.updated_at,
         workspace_id = excluded.workspace_id,
         assignee_id = excluded.assignee_id,
         created_by_id = excluded.created_by_id`,
      values,
    );
  }
}

export async function upsertCloudCommentsMany(
  workspaceId: string,
  comments: CloudTaskComment[],
): Promise<void> {
  if (comments.length === 0) return;
  const database = await getDb();
  for (const batch of chunk(comments, BATCH_SIZE)) {
    const values: unknown[] = [];
    const rows = batch.map((comment, i) => {
      const b = i * 7;
      values.push(
        comment.id,
        workspaceId,
        comment.task_id,
        comment.author_id,
        comment.body,
        comment.created_at,
        comment.updated_at,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`;
    });
    await database.execute(
      `INSERT INTO task_comments (
         id, workspace_id, task_id, author_id, body, created_at, updated_at
       ) VALUES ${rows.join(", ")}
       ON CONFLICT(id) DO UPDATE SET
         body = excluded.body,
         updated_at = excluded.updated_at,
         task_id = excluded.task_id,
         author_id = excluded.author_id,
         workspace_id = excluded.workspace_id`,
      values,
    );
  }
}

async function deleteByIds(
  table: "contexts" | "groups" | "group_links" | "tasks" | "task_comments",
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  const database = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  await database.execute(
    `DELETE FROM ${table} WHERE id IN (${placeholders})`,
    ids,
  );
}

async function purgeStaleOrphans(
  table: "contexts" | "groups" | "tasks" | "task_comments",
  workspaceId: string,
  cloudIds: Set<string>,
  lastSyncedAt: string,
): Promise<void> {
  const database = await getDb();
  const rows = await database.select<{ id: string }[]>(
    `SELECT id FROM ${table} WHERE workspace_id = $1`,
    [workspaceId],
  );
  const toDelete = rows.map((r) => r.id).filter((id) => !cloudIds.has(id));
  if (toDelete.length === 0) return;

  const placeholders = toDelete.map((_, i) => `$${i + 2}`).join(", ");
  await database.execute(
    `DELETE FROM ${table}
     WHERE workspace_id = $1
       AND id IN (${placeholders})
       AND updated_at <= $${toDelete.length + 2}`,
    [workspaceId, ...toDelete, lastSyncedAt],
  );
}

async function purgeStaleGroupLinkOrphans(
  workspaceId: string,
  cloudIds: Set<string>,
  lastSyncedAt: string,
): Promise<void> {
  const database = await getDb();
  const rows = await database.select<{ id: string }[]>(
    `SELECT id FROM group_links
     WHERE workspace_id = $1
        OR group_id IN (SELECT id FROM groups WHERE workspace_id = $1)`,
    [workspaceId],
  );
  const toDelete = rows.map((r) => r.id).filter((id) => !cloudIds.has(id));
  if (toDelete.length === 0) return;

  const placeholders = toDelete.map((_, i) => `$${i + 1}`).join(", ");
  await database.execute(
    `DELETE FROM group_links
     WHERE id IN (${placeholders})
       AND updated_at <= $${toDelete.length + 1}`,
    [...toDelete, lastSyncedAt],
  );
}

/** Merge cloud rows into local cache (last-write-wins by updated_at). */
export async function mergeWorkspaceCache(
  workspaceId: string,
  payload: WorkspacePullPayload,
  options: WorkspaceMergeOptions = {},
): Promise<WorkspaceMergeResult> {
  const database = await getDb();
  let localWins = 0;
  const repushTaskIds: string[] = [];
  const repushContextIds: string[] = [];
  const repushGroupIds: string[] = [];
  const repushGroupLinkIds: string[] = [];
  const repushCommentIds: string[] = [];
  const lastSyncedAt = options.lastSyncedAt ?? "1970-01-01T00:00:00.000Z";

  await deleteByIds("contexts", options.deletedContextIds ?? []);
  await deleteByIds("groups", options.deletedGroupIds ?? []);
  await deleteByIds("group_links", options.deletedGroupLinkIds ?? []);
  await deleteByIds("tasks", options.deletedTaskIds ?? []);
  await deleteByIds("task_comments", options.deletedCommentIds ?? []);

  const contextIds = new Set(payload.contexts.map((c) => c.id));
  const localContextUpdatedAt = await fetchLocalUpdatedAtMap(
    "contexts",
    [...contextIds],
  );
  const contextsToUpsert: CloudContext[] = [];
  for (const ctx of payload.contexts) {
    const localUpdated = localContextUpdatedAt.get(ctx.id);
    if (localUpdated && !isSyncNewerOrEqual(ctx.updated_at, localUpdated)) {
      localWins++;
      repushContextIds.push(ctx.id);
      continue;
    }
    contextsToUpsert.push(ctx);
  }
  await upsertCloudContextsMany(workspaceId, contextsToUpsert);

  const groupIds = new Set(payload.groups.map((g) => g.id));
  const localGroupUpdatedAt = await fetchLocalUpdatedAtMap(
    "groups",
    [...groupIds],
  );
  const groupsToUpsert: CloudGroup[] = [];
  for (const group of payload.groups) {
    const localUpdated = localGroupUpdatedAt.get(group.id);
    if (localUpdated && !isSyncNewerOrEqual(group.updated_at, localUpdated)) {
      localWins++;
      repushGroupIds.push(group.id);
      continue;
    }
    groupsToUpsert.push(group);
  }
  await upsertCloudGroupsMany(workspaceId, groupsToUpsert);

  const linkIds = new Set(payload.groupLinks.map((l) => l.id));
  const localLinkUpdatedAt = await fetchLocalUpdatedAtMap(
    "group_links",
    [...linkIds],
  );
  const linksToUpsert: CloudGroupLink[] = [];
  for (const link of payload.groupLinks) {
    const localUpdated = localLinkUpdatedAt.get(link.id);
    if (localUpdated && !isSyncNewerOrEqual(link.updated_at, localUpdated)) {
      localWins++;
      repushGroupLinkIds.push(link.id);
      continue;
    }
    linksToUpsert.push(link);
  }
  await upsertCloudGroupLinksMany(workspaceId, linksToUpsert);

  const taskIds = new Set(payload.tasks.map((t) => t.id));
  const localTaskUpdatedAt = await fetchLocalUpdatedAtMap(
    "tasks",
    [...taskIds],
  );
  const tasksToUpsert: CloudTask[] = [];
  for (const task of payload.tasks) {
    const localUpdated = localTaskUpdatedAt.get(task.id);
    if (localUpdated && !isSyncNewerOrEqual(task.updated_at, localUpdated)) {
      localWins++;
      repushTaskIds.push(task.id);
      continue;
    }
    tasksToUpsert.push(task);
  }
  await upsertCloudTasksMany(workspaceId, tasksToUpsert);

  const localCommentUpdatedAt = await fetchLocalUpdatedAtMap(
    "task_comments",
    payload.taskComments.map((c) => c.id),
  );
  const commentsToUpsert: CloudTaskComment[] = [];
  for (const comment of payload.taskComments) {
    const localUpdated = localCommentUpdatedAt.get(comment.id);
    if (
      localUpdated &&
      !isSyncNewerOrEqual(comment.updated_at, localUpdated)
    ) {
      localWins++;
      repushCommentIds.push(comment.id);
      continue;
    }
    commentsToUpsert.push(comment);
  }
  await upsertCloudCommentsMany(workspaceId, commentsToUpsert);

  await purgeStaleOrphans("contexts", workspaceId, contextIds, lastSyncedAt);
  await purgeStaleOrphans("groups", workspaceId, groupIds, lastSyncedAt);
  await purgeStaleOrphans("tasks", workspaceId, taskIds, lastSyncedAt);
  await purgeStaleGroupLinkOrphans(workspaceId, linkIds, lastSyncedAt);

  const commentCloudIds = new Set(payload.taskComments.map((c) => c.id));
  await purgeStaleOrphans(
    "task_comments",
    workspaceId,
    commentCloudIds,
    lastSyncedAt,
  );

  const syncedAt = new Date().toISOString();
  await database.execute(
    `INSERT INTO workspace_sync_meta (workspace_id, last_synced_at)
     VALUES ($1, $2)
     ON CONFLICT(workspace_id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
    [workspaceId, syncedAt],
  );

  return {
    localWins,
    repushTaskIds,
    repushContextIds,
    repushGroupIds,
    repushGroupLinkIds,
    repushCommentIds,
  };
}

export async function getWorkspaceLastSyncedAt(
  workspaceId: string,
): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ last_synced_at: string }[]>(
    "SELECT last_synced_at FROM workspace_sync_meta WHERE workspace_id = $1",
    [workspaceId],
  );
  return rows[0]?.last_synced_at ?? null;
}

export async function getRowWorkspaceId(
  table: "contexts" | "groups" | "tasks" | "group_links" | "task_comments",
  id: string,
): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ workspace_id: string | null }[]>(
    `SELECT workspace_id FROM ${table} WHERE id = $1`,
    [id],
  );
  return rows[0]?.workspace_id ?? null;
}

export async function getLocalUpdatedAt(
  table: "contexts" | "groups" | "group_links" | "tasks" | "task_comments",
  id: string,
): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ updated_at: string }[]>(
    `SELECT updated_at FROM ${table} WHERE id = $1`,
    [id],
  );
  return rows[0]?.updated_at ?? null;
}
