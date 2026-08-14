import type {
  Context,
  DatabaseExport,
  Group,
  GroupLink,
  Task,
} from "../types";
import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:devtask.db";

async function getDb(): Promise<Database> {
  return Database.load(DB_URL);
}

function now(): string {
  return new Date().toISOString();
}

export async function exportDatabaseSnapshot(): Promise<DatabaseExport> {
  const database = await getDb();
  const [contexts, groups, group_links, tasks] = await Promise.all([
    database.select<Context[]>("SELECT * FROM contexts ORDER BY position ASC"),
    database.select<Group[]>(
      "SELECT * FROM groups ORDER BY context_id, position ASC",
    ),
    database.select<GroupLink[]>(
      "SELECT * FROM group_links ORDER BY group_id, position ASC",
    ),
    database.select<Task[]>("SELECT * FROM tasks ORDER BY created_at DESC"),
  ]);

  return {
    exported_at: now(),
    version: 1,
    contexts,
    groups,
    group_links,
    tasks,
  };
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function exportTasksCsv(): Promise<string> {
  const snapshot = await exportDatabaseSnapshot();
  const contextById = Object.fromEntries(
    snapshot.contexts.map((c) => [c.id, c.name]),
  );
  const groupById = Object.fromEntries(
    snapshot.groups.map((g) => [g.id, g.name]),
  );

  const headers = [
    "id",
    "title",
    "description",
    "context",
    "group",
    "state",
    "is_today",
    "start_date",
    "end_date",
    "archived_at",
    "created_at",
    "updated_at",
  ];

  const rows = snapshot.tasks.map((task) =>
    [
      task.id,
      task.title,
      task.description,
      contextById[task.context_id] ?? task.context_id,
      task.group_id ? (groupById[task.group_id] ?? task.group_id) : "",
      task.state,
      task.is_today,
      task.start_date,
      task.end_date,
      task.archived_at,
      task.created_at,
      task.updated_at,
    ]
      .map(csvCell)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function exportFilename(prefix: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${prefix}-${date}.${extension}`;
}
