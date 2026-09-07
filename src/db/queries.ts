import Database from "@tauri-apps/plugin-sql";
import type {
  Context,
  Group,
  GroupLink,
  GroupLinkKind,
  GroupWithCount,
  Task,
  TaskRecurrence,
  TaskState,
} from "../types";
import { nextTaskState } from "../lib/taskStates";
import { shiftDateByRecurrence } from "../lib/recurrence";
import {
  PERSONAL_SCOPE,
  type QueryScope,
  workspaceIdFromScope,
} from "./dataScope";
import { getRowWorkspaceId } from "./workspaceCache";
import {
  pushContextDelete,
  pushContextUpsert,
  pushGroupDelete,
  pushGroupLinkDelete,
  pushGroupLinkUpsert,
  pushGroupUpsert,
  pushTaskDelete,
  pushTaskUpsert,
  pushTasksByIds,
} from "../sync/workspacePush";
import { deleteTaskCommentsForTask } from "./taskComments";

const DB_URL = "sqlite:devtask.db";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_URL);
  }
  return db;
}

function now(): string {
  return new Date().toISOString();
}

function workspaceWhereSql(scope: QueryScope): string {
  return workspaceIdFromScope(scope)
    ? "workspace_id = $1"
    : "workspace_id IS NULL";
}

function workspaceWhereParams(scope: QueryScope): string[] {
  const wsId = workspaceIdFromScope(scope);
  return wsId ? [wsId] : [];
}

async function pushTaskIfCloud(taskId: string): Promise<void> {
  const wsId = await getRowWorkspaceId("tasks", taskId);
  if (!wsId) return;
  const task = await getTask(taskId);
  if (task) await pushTaskUpsert(task, wsId);
}

const TASK_ORDER = `
  CASE state
    WHEN 'in_progress' THEN 0
    WHEN 'todo' THEN 1
    WHEN 'testing' THEN 2
    WHEN 'done' THEN 3
    ELSE 4
  END,
  position ASC,
  created_at DESC
`;

export async function getContexts(
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Context[]> {
  const database = await getDb();
  const params = workspaceWhereParams(scope);
  return database.select<Context[]>(
    `SELECT id, name, color, description, position, created_at
     FROM contexts WHERE ${workspaceWhereSql(scope)} ORDER BY position ASC`,
    params,
  );
}

export async function createContext(
  input: {
    name: string;
    color?: string;
  },
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Context> {
  const database = await getDb();
  const workspaceId = workspaceIdFromScope(scope);
  const id = crypto.randomUUID();
  const timestamp = now();
  const name = input.name.trim();
  if (!name) throw new Error("Context name is required.");

  const maxPosSql = workspaceId
    ? "SELECT MAX(position) AS max_pos FROM contexts WHERE workspace_id = $1"
    : "SELECT MAX(position) AS max_pos FROM contexts WHERE workspace_id IS NULL";
  const rows = await database.select<{ max_pos: number | null }[]>(
    maxPosSql,
    workspaceId ? [workspaceId] : [],
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;
  const colors = ["#378ADD", "#1D9E75", "#7F77DD", "#E24B4A", "#534AB7"];
  const color = input.color ?? colors[position % colors.length];

  await database.execute(
    `INSERT INTO contexts (
       id, name, color, position, created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, name, color, position, timestamp, timestamp, workspaceId],
  );

  const created = await database.select<Context[]>(
    "SELECT id, name, color, description, position, created_at FROM contexts WHERE id = $1",
    [id],
  );
  const context = created[0];
  if (workspaceId) await pushContextUpsert(context, workspaceId, timestamp);
  return context;
}

export async function updateContext(
  contextId: string,
  updates: { name?: string; color?: string; description?: string },
): Promise<void> {
  const database = await getDb();
  const rows = await database.select<Context[]>(
    "SELECT * FROM contexts WHERE id = $1",
    [contextId],
  );
  const context = rows[0];
  if (!context) throw new Error("Context not found.");

  const name =
    updates.name !== undefined ? updates.name.trim() : context.name;
  if (!name) throw new Error("Context name is required.");

  const color =
    updates.color !== undefined ? updates.color : context.color;

  const description =
    updates.description !== undefined
      ? updates.description.trim() || null
      : context.description;

  const timestamp = now();
  await database.execute(
    "UPDATE contexts SET name = $1, color = $2, description = $3, updated_at = $4 WHERE id = $5",
    [name, color, description, timestamp, contextId],
  );

  const wsId = await getRowWorkspaceId("contexts", contextId);
  if (wsId) {
    await pushContextUpsert(
      {
        id: contextId,
        name,
        color,
        description,
        position: context.position,
        created_at: context.created_at,
      },
      wsId,
      timestamp,
    );
  }
}

export async function getAppSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const rows = await database.select<{ value: string }[]>(
    "SELECT value FROM app_settings WHERE key = $1",
    [key],
  );
  return rows[0]?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function isSetupComplete(): Promise<boolean> {
  const value = await getAppSetting("setup_completed");
  return value === "1";
}

export async function initializeFreshSetup(): Promise<Context> {
  const database = await getDb();
  const existing = await getContexts();
  if (existing.length > 0) {
    await setAppSetting("setup_completed", "1");
    return existing[0];
  }

  const id = crypto.randomUUID();
  const timestamp = now();
  await database.execute(
    `INSERT INTO contexts (id, name, color, position, created_at)
     VALUES ($1, 'General', '#378ADD', 0, $2)`,
    [id, timestamp],
  );
  await setAppSetting("setup_completed", "1");

  const created = await database.select<Context[]>(
    "SELECT * FROM contexts WHERE id = $1",
    [id],
  );
  return created[0];
}

export async function initializeDemoSetup(): Promise<void> {
  const database = await getDb();
  const { seedDemoData } = await import("./demoSeed");
  await seedDemoData(database);
  await setAppSetting("setup_completed", "1");
}

export type DeleteContextMode = "cascade" | "reassign";

export interface ContextDeleteSummary {
  groups: { id: string; name: string; task_count: number }[];
  ungroupedTaskCount: number;
  totalTaskCount: number;
}

export async function getContextDeleteSummary(
  contextId: string,
): Promise<ContextDeleteSummary> {
  const database = await getDb();
  const groups = await database.select<
    { id: string; name: string; task_count: number }[]
  >(
    `SELECT g.id, g.name, COUNT(t.id) AS task_count
     FROM groups g
     LEFT JOIN tasks t ON t.group_id = g.id
     WHERE g.context_id = $1
     GROUP BY g.id
     ORDER BY g.position ASC, g.created_at ASC`,
    [contextId],
  );
  const ungroupedRows = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE context_id = $1 AND group_id IS NULL`,
    [contextId],
  );
  const ungroupedTaskCount = ungroupedRows[0]?.count ?? 0;
  const groupedTaskCount = groups.reduce((sum, g) => sum + g.task_count, 0);

  return {
    groups,
    ungroupedTaskCount,
    totalTaskCount: groupedTaskCount + ungroupedTaskCount,
  };
}

export async function deleteContext(
  input: {
    contextId: string;
    mode: DeleteContextMode;
    reassignToContextId?: string;
  },
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<void> {
  const database = await getDb();
  const { contextId, mode } = input;
  const wsId = await getRowWorkspaceId("contexts", contextId);

  const allContexts = await getContexts(scope);
  if (allContexts.length <= 1) {
    throw new Error("You must keep at least one context.");
  }

  const context = allContexts.find((c) => c.id === contextId);
  if (!context) throw new Error("Context not found.");

  const summary = await getContextDeleteSummary(contextId);
  const hasContent = summary.groups.length > 0 || summary.totalTaskCount > 0;

  try {
    if (mode === "cascade") {
      if (wsId) {
        const taskRows = await database.select<{ id: string }[]>(
          "SELECT id FROM tasks WHERE context_id = $1",
          [contextId],
        );
        for (const row of taskRows) {
          await pushTaskDelete(row.id);
        }
        for (const g of summary.groups) {
          await pushGroupDelete(g.id);
        }
      }

      await database.execute(
        `DELETE FROM group_links
         WHERE group_id IN (SELECT id FROM groups WHERE context_id = $1)`,
        [contextId],
      );
      await database.execute(
        `DELETE FROM tasks
         WHERE context_id = $1
            OR group_id IN (SELECT id FROM groups WHERE context_id = $1)`,
        [contextId],
      );
      await database.execute("DELETE FROM groups WHERE context_id = $1", [
        contextId,
      ]);
      await database.execute("DELETE FROM contexts WHERE id = $1", [contextId]);
      if (wsId) await pushContextDelete(contextId);
      return;
    }

    const targetId = input.reassignToContextId;
    if (!targetId || targetId === contextId) {
      throw new Error("Choose a context to move tasks and groups into.");
    }

    const target = allContexts.find((c) => c.id === targetId);
    if (!target) throw new Error("Target context not found.");

    const timestamp = now();
    await database.execute(
      "UPDATE groups SET context_id = $1, updated_at = $2 WHERE context_id = $3",
      [targetId, timestamp, contextId],
    );
    await database.execute(
      "UPDATE tasks SET context_id = $1, updated_at = $2 WHERE context_id = $3",
      [targetId, timestamp, contextId],
    );
    await database.execute(
      `UPDATE tasks SET context_id = $1, updated_at = $2
       WHERE group_id IN (SELECT id FROM groups WHERE context_id = $1)
         AND context_id = $3`,
      [targetId, timestamp, targetId, contextId],
    );
    await database.execute("DELETE FROM contexts WHERE id = $1", [contextId]);
    if (wsId) await pushContextDelete(contextId);
  } catch (error) {
    if (isForeignKeyError(error) && hasContent) {
      throw new Error(formatContextDeleteBlockers(summary));
    }
    throw error;
  }
}

function formatContextDeleteBlockers(summary: ContextDeleteSummary): string {
  const parts: string[] = [];

  if (summary.groups.length > 0) {
    const groupList = summary.groups.map((g) => g.name).join(", ");
    parts.push(
      summary.groups.length === 1
        ? `group "${groupList}"`
        : `${summary.groups.length} groups (${groupList})`,
    );
  }

  if (summary.totalTaskCount > 0) {
    parts.push(
      summary.totalTaskCount === 1
        ? "1 task"
        : `${summary.totalTaskCount} tasks`,
    );
  }

  if (parts.length === 0) return "";

  return `Couldn't delete this context. Delete ${parts.join(" and ")} first, or choose an option below to handle them automatically.`;
}

function isForeignKeyError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return /FOREIGN KEY|foreign key constraint|code: 787/i.test(message);
}

export async function getGroupsByContext(
  contextId: string,
): Promise<GroupWithCount[]> {
  const database = await getDb();
  return database.select<GroupWithCount[]>(
    `SELECT g.*, COUNT(t.id) AS task_count
     FROM groups g
     LEFT JOIN tasks t ON t.group_id = g.id AND t.archived_at IS NULL
     WHERE g.context_id = $1
     GROUP BY g.id
     ORDER BY g.position ASC, g.created_at ASC`,
    [contextId],
  );
}

export async function getAllGroups(
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Group[]> {
  const database = await getDb();
  const params = workspaceWhereParams(scope);
  return database.select<Group[]>(
    `SELECT id, context_id, name, description, color, position, created_at, updated_at
     FROM groups WHERE ${workspaceWhereSql(scope)}
     ORDER BY context_id, position ASC`,
    params,
  );
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const database = await getDb();
  const rows = await database.select<Group[]>(
    "SELECT * FROM groups WHERE id = $1",
    [groupId],
  );
  return rows[0] ?? null;
}

export async function getGroupLinks(groupId: string): Promise<GroupLink[]> {
  const database = await getDb();
  const rows = await database.select<GroupLink[]>(
    "SELECT * FROM group_links WHERE group_id = $1 ORDER BY position ASC",
    [groupId],
  );
  return rows.map((link) => ({
    ...link,
    kind: link.kind === "folder" ? "folder" : "url",
  }));
}

export async function createGroup(
  input: {
    contextId: string;
    name: string;
    description?: string;
  },
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Group> {
  const database = await getDb();
  const workspaceId = workspaceIdFromScope(scope);
  const id = crypto.randomUUID();
  const timestamp = now();
  const rows = await database.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) AS max_pos FROM groups WHERE context_id = $1",
    [input.contextId],
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;

  await database.execute(
    `INSERT INTO groups (
       id, context_id, name, description, color, position,
       created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)`,
    [
      id,
      input.contextId,
      input.name.trim(),
      input.description?.trim() || null,
      position,
      timestamp,
      timestamp,
      workspaceId,
    ],
  );

  const group = await getGroup(id);
  if (workspaceId && group) await pushGroupUpsert(group, workspaceId);
  return group!;
}

export async function updateGroupDescription(
  groupId: string,
  description: string,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE groups SET description = $1, updated_at = $2 WHERE id = $3",
    [description.trim() || null, now(), groupId],
  );
  const group = await getGroup(groupId);
  const wsId = await getRowWorkspaceId("groups", groupId);
  if (wsId && group) await pushGroupUpsert(group, wsId);
}

export async function updateGroupName(
  groupId: string,
  name: string,
): Promise<void> {
  const database = await getDb();
  const trimmed = name.trim();
  if (!trimmed) return;
  await database.execute(
    "UPDATE groups SET name = $1, updated_at = $2 WHERE id = $3",
    [trimmed, now(), groupId],
  );
  const group = await getGroup(groupId);
  const wsId = await getRowWorkspaceId("groups", groupId);
  if (wsId && group) await pushGroupUpsert(group, wsId);
}

export async function updateGroupColor(
  groupId: string,
  color: string | null,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE groups SET color = $1, updated_at = $2 WHERE id = $3",
    [color, now(), groupId],
  );
  const group = await getGroup(groupId);
  const wsId = await getRowWorkspaceId("groups", groupId);
  if (wsId && group) await pushGroupUpsert(group, wsId);
}

export async function createGroupLink(
  input: {
    groupId: string;
    label: string;
    url: string;
    kind?: GroupLinkKind;
  },
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<GroupLink> {
  const database = await getDb();
  const workspaceId = workspaceIdFromScope(scope);
  const id = crypto.randomUUID();
  const kind = input.kind ?? "url";
  const timestamp = now();
  const rows = await database.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) AS max_pos FROM group_links WHERE group_id = $1",
    [input.groupId],
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;

  await database.execute(
    `INSERT INTO group_links (
       id, group_id, label, url, kind, position,
       created_at, updated_at, workspace_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.groupId,
      input.label.trim() || null,
      input.url.trim(),
      kind,
      position,
      timestamp,
      timestamp,
      workspaceId,
    ],
  );

  const links = await getGroupLinks(input.groupId);
  const link = links.find((l) => l.id === id)!;
  if (workspaceId) {
    await pushGroupLinkUpsert(link, workspaceId, {
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  return link;
}

export async function updateGroupLink(
  linkId: string,
  updates: { label?: string; url?: string; kind?: GroupLinkKind },
): Promise<void> {
  const database = await getDb();
  const rows = await database.select<GroupLink[]>(
    "SELECT * FROM group_links WHERE id = $1",
    [linkId],
  );
  const link = rows[0];
  if (!link) return;

  const timestamp = now();
  await database.execute(
    "UPDATE group_links SET label = $1, url = $2, kind = $3, updated_at = $4 WHERE id = $5",
    [
      updates.label !== undefined
        ? updates.label.trim() || null
        : link.label,
      updates.url !== undefined ? updates.url.trim() : link.url,
      updates.kind !== undefined ? updates.kind : link.kind,
      timestamp,
      linkId,
    ],
  );

  const wsId = await getRowWorkspaceId("group_links", linkId);
  if (wsId) {
    const updated: GroupLink = {
      id: linkId,
      group_id: link.group_id,
      label:
        updates.label !== undefined
          ? updates.label.trim() || null
          : link.label,
      url: updates.url !== undefined ? updates.url.trim() : link.url,
      kind: updates.kind !== undefined ? updates.kind : link.kind,
      position: link.position,
    };
    await pushGroupLinkUpsert(updated, wsId, {
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}

export async function deleteGroupLink(linkId: string): Promise<void> {
  const database = await getDb();
  const wsId = await getRowWorkspaceId("group_links", linkId);
  await database.execute("DELETE FROM group_links WHERE id = $1", [linkId]);
  if (wsId) await pushGroupLinkDelete(linkId);
}

export type DeleteGroupMode = "cascade" | "ungroup";

export async function deleteGroup(input: {
  groupId: string;
  mode: DeleteGroupMode;
}): Promise<void> {
  const database = await getDb();
  const group = await getGroup(input.groupId);
  if (!group) throw new Error("Group not found.");
  const wsId = await getRowWorkspaceId("groups", input.groupId);

  const taskRows = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM tasks WHERE group_id = $1",
    [input.groupId],
  );
  const taskCount = taskRows[0]?.count ?? 0;

  try {
    if (input.mode === "cascade") {
      if (wsId) {
        const cascadeTasks = await database.select<{ id: string }[]>(
          "SELECT id FROM tasks WHERE group_id = $1",
          [input.groupId],
        );
        for (const row of cascadeTasks) {
          await pushTaskDelete(row.id);
        }
      }
      await database.execute("DELETE FROM tasks WHERE group_id = $1", [
        input.groupId,
      ]);
    } else {
      await database.execute(
        "UPDATE tasks SET group_id = NULL, updated_at = $1 WHERE group_id = $2",
        [now(), input.groupId],
      );
    }

    await database.execute("DELETE FROM group_links WHERE group_id = $1", [
      input.groupId,
    ]);
    await database.execute("DELETE FROM groups WHERE id = $1", [input.groupId]);
    if (wsId) await pushGroupDelete(input.groupId);
  } catch (error) {
    if (isForeignKeyError(error) && taskCount > 0) {
      throw new Error(
        `Couldn't delete "${group.name}". Delete its ${taskCount === 1 ? "1 task" : `${taskCount} tasks`} first, or choose an option below to handle them automatically.`,
      );
    }
    throw error;
  }
}

export async function getDueTodayTaskCount(
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<number> {
  const database = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const wsId = workspaceIdFromScope(scope);
  const rows = wsId
    ? await database.select<{ count: number }[]>(
        `SELECT COUNT(*) AS count FROM tasks
         WHERE archived_at IS NULL
           AND state != 'done'
           AND end_date IS NOT NULL
           AND date(end_date) <= date($1)
           AND workspace_id = $2`,
        [today, wsId],
      )
    : await database.select<{ count: number }[]>(
        `SELECT COUNT(*) AS count FROM tasks
         WHERE archived_at IS NULL
           AND state != 'done'
           AND end_date IS NOT NULL
           AND date(end_date) <= date($1)
           AND workspace_id IS NULL`,
        [today],
      );
  return rows[0]?.count ?? 0;
}

async function nextTaskPosition(
  database: Database,
  scope: { contextId: string; groupId?: string | null },
): Promise<number> {
  const rows = await database.select<{ max_pos: number | null }[]>(
    scope.groupId
      ? "SELECT MAX(position) AS max_pos FROM tasks WHERE group_id = $1 AND archived_at IS NULL"
      : "SELECT MAX(position) AS max_pos FROM tasks WHERE context_id = $1 AND group_id IS NULL AND archived_at IS NULL",
    scope.groupId ? [scope.groupId] : [scope.contextId],
  );
  return (rows[0]?.max_pos ?? -1) + 1;
}

async function cloneRecurringTaskIfNeeded(task: Task): Promise<void> {
  if (!task.recurrence || task.recurrence === "none") return;

  const database = await getDb();
  const workspaceId = await getRowWorkspaceId("tasks", task.id);
  const id = crypto.randomUUID();
  const timestamp = now();
  const position = await nextTaskPosition(database, {
    contextId: task.context_id,
    groupId: task.group_id,
  });

  await database.execute(
    `INSERT INTO tasks (
       id, title, description, context_id, group_id, parent_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at,
       created_at, updated_at, workspace_id, assignee_id, created_by_id
     ) VALUES ($1, $2, $3, $4, $5, $6, 'todo', $7, $8, $9, $10, $11, NULL, $12, $13, $14, $15, $16)`,
    [
      id,
      task.title,
      task.description,
      task.context_id,
      task.group_id,
      task.parent_id ?? null,
      task.is_today,
      shiftDateByRecurrence(task.start_date, task.recurrence),
      shiftDateByRecurrence(task.end_date, task.recurrence),
      position,
      task.recurrence,
      timestamp,
      timestamp,
      workspaceId,
      task.assignee_id ?? null,
      task.created_by_id ?? null,
    ],
  );

  if (workspaceId) {
    const cloned = await getTask(id);
    if (cloned) await pushTaskUpsert(cloned, workspaceId);
  }
}

function taskScopeSql(scope: QueryScope): { sql: string; params: string[] } {
  return {
    sql: workspaceWhereSql(scope),
    params: workspaceWhereParams(scope),
  };
}

export async function getTasks(
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Task[]> {
  const database = await getDb();
  const ws = taskScopeSql(scope);
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND ${ws.sql}
     ORDER BY ${TASK_ORDER}`,
    ws.params,
  );
}

export async function getTodayTasks(
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Task[]> {
  const database = await getDb();
  const ws = taskScopeSql(scope);
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND is_today = 1 AND ${ws.sql}
     ORDER BY ${TASK_ORDER}`,
    ws.params,
  );
}

export async function getTasksByContext(contextId: string): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND context_id = $1
     ORDER BY ${TASK_ORDER}`,
    [contextId],
  );
}

export async function getTasksByGroup(groupId: string): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND group_id = $1
     ORDER BY ${TASK_ORDER}`,
    [groupId],
  );
}

export async function getTasksNonGroupByContext(contextId: string): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND context_id = $1 AND group_id IS NULL
     ORDER BY ${TASK_ORDER}`,
    [contextId],
  );
}

export async function getTask(taskId: string): Promise<Task | null> {
  const database = await getDb();
  const rows = await database.select<Task[]>(
    "SELECT * FROM tasks WHERE id = $1",
    [taskId],
  );
  return rows[0] ?? null;
}

export async function getChildTasks(
  parentId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Task[]> {
  const database = await getDb();
  const archivedSql = options.includeArchived
    ? ""
    : "AND archived_at IS NULL";
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE parent_id = $1 ${archivedSql}
     ORDER BY position ASC, created_at ASC`,
    [parentId],
  );
}

async function pushChildrenIfCloud(parentId: string): Promise<void> {
  const children = await getChildTasks(parentId, { includeArchived: true });
  for (const child of children) {
    await pushTaskIfCloud(child.id);
  }
}

async function assertCanNestUnder(parentId: string): Promise<Task> {
  const parent = await getTask(parentId);
  if (!parent) throw new Error("Parent task not found.");
  if (parent.parent_id) {
    throw new Error("Subtasks cannot have their own subtasks.");
  }
  return parent;
}

export async function createTask(
  input: {
    title: string;
    contextId: string;
    groupId?: string | null;
    parentId?: string | null;
    isToday?: boolean;
    description?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    recurrence?: TaskRecurrence;
    assigneeId?: string | null;
    createdById?: string | null;
  },
  scope: QueryScope = PERSONAL_SCOPE,
): Promise<Task> {
  const database = await getDb();
  let workspaceId = workspaceIdFromScope(scope);
  const id = crypto.randomUUID();
  const timestamp = now();
  const isToday = input.isToday ? 1 : 0;
  let contextId = input.contextId;
  let groupId = input.groupId ?? null;
  let parentId = input.parentId ?? null;

  if (parentId) {
    const parent = await assertCanNestUnder(parentId);
    contextId = parent.context_id;
    groupId = parent.group_id;
    workspaceId = await getRowWorkspaceId("tasks", parentId);
  } else if (groupId) {
    const group = await getGroup(groupId);
    if (group) {
      contextId = group.context_id;
    } else {
      groupId = null;
    }
  }

  const position = await nextTaskPosition(database, { contextId, groupId });
  const recurrence = input.recurrence ?? "none";
  const assigneeId = workspaceId ? (input.assigneeId ?? null) : null;
  const createdById = workspaceId ? (input.createdById ?? null) : null;

  await database.execute(
    `INSERT INTO tasks (
       id, title, description, context_id, group_id, parent_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at,
       created_at, updated_at, workspace_id, assignee_id, created_by_id
     ) VALUES ($1, $2, $3, $4, $5, $6, 'todo', $7, $8, $9, $10, $11, NULL, $12, $13, $14, $15, $16)`,
    [
      id,
      input.title.trim(),
      input.description?.trim() || null,
      contextId,
      groupId,
      parentId,
      isToday,
      input.startDate ?? null,
      input.endDate ?? null,
      position,
      recurrence,
      timestamp,
      timestamp,
      workspaceId,
      assigneeId,
      createdById,
    ],
  );

  const rows = await database.select<Task[]>(
    "SELECT * FROM tasks WHERE id = $1",
    [id],
  );
  const task = rows[0];
  if (workspaceId) await pushTaskUpsert(task, workspaceId);
  return task;
}

export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE tasks SET assignee_id = $1, updated_at = $2 WHERE id = $3",
    [assigneeId, now(), taskId],
  );
  await pushTaskIfCloud(taskId);
}

export async function updateTaskRecurrence(
  taskId: string,
  recurrence: TaskRecurrence,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE tasks SET recurrence = $1, updated_at = $2 WHERE id = $3",
    [recurrence, now(), taskId],
  );
  await pushTaskIfCloud(taskId);
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  const wsId =
    taskIds.length > 0
      ? await getRowWorkspaceId("tasks", taskIds[0])
      : null;
  for (let i = 0; i < taskIds.length; i++) {
    await database.execute(
      "UPDATE tasks SET position = $1, updated_at = $2 WHERE id = $3",
      [i, timestamp, taskIds[i]],
    );
  }
  if (wsId) await pushTasksByIds(taskIds, wsId, getTask);
}

export async function reorderGroups(
  contextId: string,
  groupIds: string[],
): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  const wsId =
    groupIds.length > 0
      ? await getRowWorkspaceId("groups", groupIds[0])
      : null;
  for (let i = 0; i < groupIds.length; i++) {
    await database.execute(
      "UPDATE groups SET position = $1, updated_at = $2 WHERE id = $3 AND context_id = $4",
      [i, timestamp, groupIds[i], contextId],
    );
  }
  if (wsId) {
    for (const groupId of groupIds) {
      const group = await getGroup(groupId);
      if (group) await pushGroupUpsert(group, wsId);
    }
  }
}

export async function updateTaskDescription(
  taskId: string,
  description: string,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    "UPDATE tasks SET description = $1, updated_at = $2 WHERE id = $3",
    [description.trim() || null, now(), taskId],
  );
  await pushTaskIfCloud(taskId);
}

export async function updateTaskDates(
  taskId: string,
  dates: { startDate: string | null; endDate: string | null },
): Promise<void> {
  const database = await getDb();
  let { startDate, endDate } = dates;

  if (startDate && endDate && startDate > endDate) {
    endDate = startDate;
  }

  await database.execute(
    `UPDATE tasks SET start_date = $1, end_date = $2, updated_at = $3 WHERE id = $4`,
    [startDate, endDate, now(), taskId],
  );
  await pushTaskIfCloud(taskId);
}

export async function updateTaskGroup(
  taskId: string,
  groupId: string | null,
): Promise<void> {
  const database = await getDb();
  const timestamp = now();

  if (groupId) {
    const group = await getGroup(groupId);
    if (!group) return;

    await database.execute(
      `UPDATE tasks SET group_id = $1, context_id = $2, updated_at = $3
       WHERE id = $4 OR parent_id = $4`,
      [groupId, group.context_id, timestamp, taskId],
    );
    await pushTaskIfCloud(taskId);
    await pushChildrenIfCloud(taskId);
    return;
  }

  await database.execute(
    `UPDATE tasks SET group_id = NULL, updated_at = $1 WHERE id = $2 OR parent_id = $2`,
    [timestamp, taskId],
  );
  await pushTaskIfCloud(taskId);
  await pushChildrenIfCloud(taskId);
}

export async function updateTaskContext(
  taskId: string,
  contextId: string,
): Promise<void> {
  const database = await getDb();
  const timestamp = now();

  await database.execute(
    `UPDATE tasks SET context_id = $1, group_id = NULL, updated_at = $2
     WHERE id = $3 OR parent_id = $3`,
    [contextId, timestamp, taskId],
  );
  await pushTaskIfCloud(taskId);
  await pushChildrenIfCloud(taskId);
}

async function clearOtherInProgress(
  database: Database,
  exceptId: string,
  workspaceId: string | null,
): Promise<void> {
  const timestamp = now();
  const cleared = workspaceId
    ? await database.select<{ id: string }[]>(
        `SELECT id FROM tasks
         WHERE state = 'in_progress' AND id != $1 AND archived_at IS NULL
           AND workspace_id = $2`,
        [exceptId, workspaceId],
      )
    : await database.select<{ id: string }[]>(
        `SELECT id FROM tasks
         WHERE state = 'in_progress' AND id != $1 AND archived_at IS NULL
           AND workspace_id IS NULL`,
        [exceptId],
      );

  if (workspaceId) {
    await database.execute(
      `UPDATE tasks SET state = 'todo', updated_at = $1
       WHERE state = 'in_progress' AND id != $2 AND archived_at IS NULL
         AND workspace_id = $3`,
      [timestamp, exceptId, workspaceId],
    );
  } else {
    await database.execute(
      `UPDATE tasks SET state = 'todo', updated_at = $1
       WHERE state = 'in_progress' AND id != $2 AND archived_at IS NULL
         AND workspace_id IS NULL`,
      [timestamp, exceptId],
    );
  }

  if (workspaceId) {
    for (const row of cleared) {
      await pushTaskIfCloud(row.id);
    }
  }
}

export async function updateTaskState(
  taskId: string,
  state: TaskState,
): Promise<void> {
  const database = await getDb();
  const wsId = await getRowWorkspaceId("tasks", taskId);
  if (state === "in_progress") {
    await clearOtherInProgress(database, taskId, wsId);
  }
  await database.execute(
    "UPDATE tasks SET state = $1, updated_at = $2 WHERE id = $3",
    [state, now(), taskId],
  );
  await pushTaskIfCloud(taskId);

  if (state === "done") {
    const task = await getTask(taskId);
    if (task) await cloneRecurringTaskIfNeeded(task);
  }
}

export async function cycleTaskState(taskId: string): Promise<TaskState> {
  const database = await getDb();
  const wsId = await getRowWorkspaceId("tasks", taskId);
  const rows = await database.select<
    { state: TaskState; recurrence: Task["recurrence"] }[]
  >("SELECT state, recurrence FROM tasks WHERE id = $1", [taskId]);
  const current = rows[0]?.state ?? "todo";
  const recurrence = rows[0]?.recurrence ?? "none";

  if (current === "done" && recurrence !== "none") {
    return "done";
  }

  const next = nextTaskState(current);

  if (next === "in_progress") {
    await clearOtherInProgress(database, taskId, wsId);
  }

  await database.execute(
    "UPDATE tasks SET state = $1, updated_at = $2 WHERE id = $3",
    [next, now(), taskId],
  );
  await pushTaskIfCloud(taskId);

  if (next === "done") {
    const task = await getTask(taskId);
    if (task) await cloneRecurringTaskIfNeeded(task);
  }

  return next;
}

export async function toggleTaskToday(taskId: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE tasks SET is_today = CASE is_today WHEN 1 THEN 0 ELSE 1 END, updated_at = $1
     WHERE id = $2`,
    [now(), taskId],
  );
  await pushTaskIfCloud(taskId);
}

export async function archiveOldDoneTasks(): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  await database.execute(
    `UPDATE tasks SET archived_at = $1
     WHERE state = 'done'
       AND archived_at IS NULL
       AND workspace_id IS NULL
       AND updated_at < datetime('now', '-7 days')`,
    [timestamp],
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  const children = await getChildTasks(taskId, { includeArchived: true });
  for (const child of children) {
    await deleteTask(child.id);
  }

  const database = await getDb();
  const task = await getTask(taskId);
  if (!task) throw new Error("Task not found.");
  const wsId = await getRowWorkspaceId("tasks", taskId);
  await deleteTaskCommentsForTask(taskId);
  await database.execute("DELETE FROM tasks WHERE id = $1", [taskId]);
  if (wsId) await pushTaskDelete(taskId);
}
