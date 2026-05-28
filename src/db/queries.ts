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

const DB_URL = "sqlite:devtask.db";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load(DB_URL);
  }
  return db;
}

function now(): string {
  return new Date().toISOString();
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

export async function getContexts(): Promise<Context[]> {
  const database = await getDb();
  return database.select<Context[]>(
    "SELECT * FROM contexts ORDER BY position ASC",
  );
}

export async function createContext(input: {
  name: string;
  color?: string;
}): Promise<Context> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const timestamp = now();
  const name = input.name.trim();
  if (!name) throw new Error("Context name is required.");

  const rows = await database.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) AS max_pos FROM contexts",
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;
  const colors = ["#378ADD", "#1D9E75", "#7F77DD", "#E24B4A", "#534AB7"];
  const color = input.color ?? colors[position % colors.length];

  await database.execute(
    `INSERT INTO contexts (id, name, color, position, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, name, color, position, timestamp],
  );

  const created = await database.select<Context[]>(
    "SELECT * FROM contexts WHERE id = $1",
    [id],
  );
  return created[0];
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

  await database.execute(
    "UPDATE contexts SET name = $1, color = $2, description = $3 WHERE id = $4",
    [name, color, description, contextId],
  );
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

export async function deleteContext(input: {
  contextId: string;
  mode: DeleteContextMode;
  reassignToContextId?: string;
}): Promise<void> {
  const database = await getDb();
  const { contextId, mode } = input;

  const allContexts = await getContexts();
  if (allContexts.length <= 1) {
    throw new Error("You must keep at least one context.");
  }

  const context = allContexts.find((c) => c.id === contextId);
  if (!context) throw new Error("Context not found.");

  const summary = await getContextDeleteSummary(contextId);
  const hasContent = summary.groups.length > 0 || summary.totalTaskCount > 0;

  try {
    if (mode === "cascade") {
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

export async function getAllGroups(): Promise<Group[]> {
  const database = await getDb();
  return database.select<Group[]>(
    "SELECT * FROM groups ORDER BY context_id, position ASC",
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

export async function createGroup(input: {
  contextId: string;
  name: string;
  description?: string;
}): Promise<Group> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const timestamp = now();
  const rows = await database.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) AS max_pos FROM groups WHERE context_id = $1",
    [input.contextId],
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;

  await database.execute(
    `INSERT INTO groups (id, context_id, name, description, color, position, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)`,
    [
      id,
      input.contextId,
      input.name.trim(),
      input.description?.trim() || null,
      position,
      timestamp,
      timestamp,
    ],
  );

  const group = await getGroup(id);
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
}

export async function createGroupLink(input: {
  groupId: string;
  label: string;
  url: string;
  kind?: GroupLinkKind;
}): Promise<GroupLink> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const kind = input.kind ?? "url";
  const rows = await database.select<{ max_pos: number | null }[]>(
    "SELECT MAX(position) AS max_pos FROM group_links WHERE group_id = $1",
    [input.groupId],
  );
  const position = (rows[0]?.max_pos ?? -1) + 1;

  await database.execute(
    `INSERT INTO group_links (id, group_id, label, url, kind, position)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      input.groupId,
      input.label.trim() || null,
      input.url.trim(),
      kind,
      position,
    ],
  );

  const links = await getGroupLinks(input.groupId);
  return links.find((l) => l.id === id)!;
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

  await database.execute(
    "UPDATE group_links SET label = $1, url = $2, kind = $3 WHERE id = $4",
    [
      updates.label !== undefined
        ? updates.label.trim() || null
        : link.label,
      updates.url !== undefined ? updates.url.trim() : link.url,
      updates.kind !== undefined ? updates.kind : link.kind,
      linkId,
    ],
  );
}

export async function deleteGroupLink(linkId: string): Promise<void> {
  const database = await getDb();
  await database.execute("DELETE FROM group_links WHERE id = $1", [linkId]);
}

export type DeleteGroupMode = "cascade" | "ungroup";

export async function deleteGroup(input: {
  groupId: string;
  mode: DeleteGroupMode;
}): Promise<void> {
  const database = await getDb();
  const group = await getGroup(input.groupId);
  if (!group) throw new Error("Group not found.");

  const taskRows = await database.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM tasks WHERE group_id = $1",
    [input.groupId],
  );
  const taskCount = taskRows[0]?.count ?? 0;

  try {
    if (input.mode === "cascade") {
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
  } catch (error) {
    if (isForeignKeyError(error) && taskCount > 0) {
      throw new Error(
        `Couldn't delete "${group.name}". Delete its ${taskCount === 1 ? "1 task" : `${taskCount} tasks`} first, or choose an option below to handle them automatically.`,
      );
    }
    throw error;
  }
}

export async function getDueTodayTaskCount(): Promise<number> {
  const database = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM tasks
     WHERE archived_at IS NULL
       AND state != 'done'
       AND end_date IS NOT NULL
       AND date(end_date) <= date($1)`,
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
  const id = crypto.randomUUID();
  const timestamp = now();
  const position = await nextTaskPosition(database, {
    contextId: task.context_id,
    groupId: task.group_id,
  });

  await database.execute(
    `INSERT INTO tasks (
       id, title, description, context_id, group_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8, $9, $10, NULL, $11, $12)`,
    [
      id,
      task.title,
      task.description,
      task.context_id,
      task.group_id,
      task.is_today,
      shiftDateByRecurrence(task.start_date, task.recurrence),
      shiftDateByRecurrence(task.end_date, task.recurrence),
      position,
      task.recurrence,
      timestamp,
      timestamp,
    ],
  );
}

export async function getTasks(): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    `SELECT * FROM tasks WHERE archived_at IS NULL ORDER BY ${TASK_ORDER}`,
  );
}

export async function getTodayTasks(): Promise<Task[]> {
  const database = await getDb();
  return database.select<Task[]>(
    `SELECT * FROM tasks
     WHERE archived_at IS NULL AND is_today = 1
     ORDER BY ${TASK_ORDER}`,
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

export async function createTask(input: {
  title: string;
  contextId: string;
  groupId?: string | null;
  isToday?: boolean;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  recurrence?: TaskRecurrence;
}): Promise<Task> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const timestamp = now();
  const isToday = input.isToday ? 1 : 0;
  let contextId = input.contextId;
  let groupId = input.groupId ?? null;

  if (groupId) {
    const group = await getGroup(groupId);
    if (group) {
      contextId = group.context_id;
    } else {
      groupId = null;
    }
  }

  const position = await nextTaskPosition(database, { contextId, groupId });
  const recurrence = input.recurrence ?? "none";

  await database.execute(
    `INSERT INTO tasks (
       id, title, description, context_id, group_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'todo', $6, $7, $8, $9, $10, NULL, $11, $12)`,
    [
      id,
      input.title.trim(),
      input.description?.trim() || null,
      contextId,
      groupId,
      isToday,
      input.startDate ?? null,
      input.endDate ?? null,
      position,
      recurrence,
      timestamp,
      timestamp,
    ],
  );

  const rows = await database.select<Task[]>(
    "SELECT * FROM tasks WHERE id = $1",
    [id],
  );
  return rows[0];
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
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  for (let i = 0; i < taskIds.length; i++) {
    await database.execute(
      "UPDATE tasks SET position = $1, updated_at = $2 WHERE id = $3",
      [i, timestamp, taskIds[i]],
    );
  }
}

export async function reorderGroups(
  contextId: string,
  groupIds: string[],
): Promise<void> {
  const database = await getDb();
  const timestamp = now();
  for (let i = 0; i < groupIds.length; i++) {
    await database.execute(
      "UPDATE groups SET position = $1, updated_at = $2 WHERE id = $3 AND context_id = $4",
      [i, timestamp, groupIds[i], contextId],
    );
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
      `UPDATE tasks SET group_id = $1, context_id = $2, updated_at = $3 WHERE id = $4`,
      [groupId, group.context_id, timestamp, taskId],
    );
    return;
  }

  await database.execute(
    "UPDATE tasks SET group_id = NULL, updated_at = $1 WHERE id = $2",
    [timestamp, taskId],
  );
}

export async function updateTaskContext(
  taskId: string,
  contextId: string,
): Promise<void> {
  const database = await getDb();
  const timestamp = now();

  await database.execute(
    `UPDATE tasks SET context_id = $1, group_id = NULL, updated_at = $2 WHERE id = $3`,
    [contextId, timestamp, taskId],
  );
}

async function clearOtherInProgress(
  database: Database,
  exceptId: string,
): Promise<void> {
  await database.execute(
    `UPDATE tasks SET state = 'todo', updated_at = $1
     WHERE state = 'in_progress' AND id != $2 AND archived_at IS NULL`,
    [now(), exceptId],
  );
}

export async function updateTaskState(
  taskId: string,
  state: TaskState,
): Promise<void> {
  const database = await getDb();
  if (state === "in_progress") {
    await clearOtherInProgress(database, taskId);
  }
  await database.execute(
    "UPDATE tasks SET state = $1, updated_at = $2 WHERE id = $3",
    [state, now(), taskId],
  );

  if (state === "done") {
    const task = await getTask(taskId);
    if (task) await cloneRecurringTaskIfNeeded(task);
  }
}

export async function cycleTaskState(taskId: string): Promise<TaskState> {
  const database = await getDb();
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
    await clearOtherInProgress(database, taskId);
  }

  await database.execute(
    "UPDATE tasks SET state = $1, updated_at = $2 WHERE id = $3",
    [next, now(), taskId],
  );

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
}

export async function archiveOldDoneTasks(): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE tasks SET archived_at = $1
     WHERE state = 'done'
       AND archived_at IS NULL
       AND updated_at < datetime('now', '-7 days')`,
    [now()],
  );
}

export async function deleteTask(taskId: string): Promise<void> {
  const database = await getDb();
  const task = await getTask(taskId);
  if (!task) throw new Error("Task not found.");
  await database.execute("DELETE FROM tasks WHERE id = $1", [taskId]);
}
