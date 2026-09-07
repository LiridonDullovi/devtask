import { getSupabase } from "../lib/supabase";
import {
  upsertCloudComment,
  upsertCloudContext,
  upsertCloudGroup,
  upsertCloudGroupLink,
  upsertCloudTask,
} from "../db/workspaceCache";

async function fetchCloudTask(id: string) {
  const { data, error } = await getSupabase()
    .from("tasks")
    .select(
      `id, context_id, group_id, parent_id, title, description, state, is_today,
       start_date, end_date, position, recurrence, archived_at,
       created_at, updated_at, assignee_id, created_by_id, workspace_id, deleted_at`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchCloudContext(id: string) {
  const { data, error } = await getSupabase()
    .from("contexts")
    .select(
      "id, name, color, description, position, created_at, updated_at, workspace_id, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchCloudGroup(id: string) {
  const { data, error } = await getSupabase()
    .from("groups")
    .select(
      "id, context_id, name, description, color, position, created_at, updated_at, workspace_id, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchCloudGroupLink(id: string) {
  const { data, error } = await getSupabase()
    .from("group_links")
    .select(
      "id, group_id, label, url, kind, position, created_at, updated_at, workspace_id, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchCloudComment(id: string) {
  const { data, error } = await getSupabase()
    .from("task_comments")
    .select(
      "id, task_id, author_id, body, created_at, updated_at, workspace_id, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Replace one local row with the current cloud version (after push conflict). */
export async function applyCloudTaskById(taskId: string): Promise<void> {
  const row = await fetchCloudTask(taskId);
  if (!row || row.deleted_at) return;
  await upsertCloudTask(row.workspace_id, {
    id: row.id,
    context_id: row.context_id,
    group_id: row.group_id,
    parent_id: row.parent_id,
    title: row.title,
    description: row.description,
    state: row.state,
    is_today: row.is_today,
    start_date: row.start_date,
    end_date: row.end_date,
    position: row.position,
    recurrence: row.recurrence,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assignee_id: row.assignee_id,
    created_by_id: row.created_by_id,
  });
}

export async function applyCloudContextById(contextId: string): Promise<void> {
  const row = await fetchCloudContext(contextId);
  if (!row || row.deleted_at) return;
  await upsertCloudContext(row.workspace_id, row);
}

export async function applyCloudGroupById(groupId: string): Promise<void> {
  const row = await fetchCloudGroup(groupId);
  if (!row || row.deleted_at) return;
  await upsertCloudGroup(row.workspace_id, row);
}

export async function applyCloudGroupLinkById(linkId: string): Promise<void> {
  const row = await fetchCloudGroupLink(linkId);
  if (!row || row.deleted_at) return;
  await upsertCloudGroupLink(row.workspace_id, row);
}

export async function applyCloudCommentById(commentId: string): Promise<void> {
  const row = await fetchCloudComment(commentId);
  if (!row || row.deleted_at) return;
  await upsertCloudComment(row.workspace_id, row);
}
