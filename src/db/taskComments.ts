import Database from "@tauri-apps/plugin-sql";
import { getRowWorkspaceId } from "./workspaceCache";
import type { TaskComment } from "../types";
import {
  pushTaskCommentDelete,
  pushTaskCommentUpsert,
} from "../sync/workspacePush";

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

async function pushCommentIfCloud(commentId: string): Promise<void> {
  const wsId = await getRowWorkspaceId("task_comments", commentId);
  if (!wsId) return;
  const comment = await getTaskComment(commentId);
  if (comment) await pushTaskCommentUpsert(comment, wsId);
}

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const database = await getDb();
  return database.select<TaskComment[]>(
    `SELECT * FROM task_comments
     WHERE task_id = $1
     ORDER BY created_at ASC`,
    [taskId],
  );
}

export async function getTaskComment(
  commentId: string,
): Promise<TaskComment | null> {
  const database = await getDb();
  const rows = await database.select<TaskComment[]>(
    "SELECT * FROM task_comments WHERE id = $1",
    [commentId],
  );
  return rows[0] ?? null;
}

export async function createTaskComment(input: {
  taskId: string;
  workspaceId: string;
  authorId: string;
  body: string;
}): Promise<TaskComment> {
  const database = await getDb();
  const id = crypto.randomUUID();
  const timestamp = now();
  const body = input.body.trim();
  if (!body) throw new Error("Comment cannot be empty.");

  await database.execute(
    `INSERT INTO task_comments (
       id, workspace_id, task_id, author_id, body, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.workspaceId,
      input.taskId,
      input.authorId,
      body,
      timestamp,
      timestamp,
    ],
  );

  const rows = await database.select<TaskComment[]>(
    "SELECT * FROM task_comments WHERE id = $1",
    [id],
  );
  const comment = rows[0];
  if (!comment) throw new Error("Failed to create comment.");

  await pushTaskCommentUpsert(comment, input.workspaceId);
  return comment;
}

export async function updateTaskComment(
  commentId: string,
  body: string,
): Promise<void> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Comment cannot be empty.");

  const database = await getDb();
  await database.execute(
    "UPDATE task_comments SET body = $1, updated_at = $2 WHERE id = $3",
    [trimmed, now(), commentId],
  );
  await pushCommentIfCloud(commentId);
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  const database = await getDb();
  const wsId = await getRowWorkspaceId("task_comments", commentId);
  await database.execute("DELETE FROM task_comments WHERE id = $1", [
    commentId,
  ]);
  if (wsId) await pushTaskCommentDelete(commentId);
}

export async function deleteTaskCommentsForTask(taskId: string): Promise<void> {
  const database = await getDb();
  const rows = await database.select<{ id: string }[]>(
    "SELECT id FROM task_comments WHERE task_id = $1",
    [taskId],
  );
  for (const row of rows) {
    const wsId = await getRowWorkspaceId("task_comments", row.id);
    await database.execute("DELETE FROM task_comments WHERE id = $1", [
      row.id,
    ]);
    if (wsId) await pushTaskCommentDelete(row.id);
  }
}
