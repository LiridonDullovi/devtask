import { getSupabase } from "../lib/supabase";
import { isSyncNewer } from "./syncTimestamps";

export type PushGuardResult =
  | { action: "push" }
  | { action: "skip"; cloudUpdatedAt: string };

/** Skip push when cloud row is newer than the local copy. */
export async function guardPushByUpdatedAt(
  table:
    | "contexts"
    | "groups"
    | "group_links"
    | "tasks"
    | "task_comments",
  id: string,
  localUpdatedAt: string,
): Promise<PushGuardResult> {
  const { data, error } = await getSupabase()
    .from(table)
    .select("updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data?.updated_at) return { action: "push" };

  if (isSyncNewer(data.updated_at, localUpdatedAt)) {
    return { action: "skip", cloudUpdatedAt: data.updated_at };
  }

  return { action: "push" };
}

export async function fetchDeletedIds(
  table:
    | "contexts"
    | "groups"
    | "group_links"
    | "tasks"
    | "task_comments",
  workspaceId: string,
  sinceIso: string,
): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select("id")
    .eq("workspace_id", workspaceId)
    .not("deleted_at", "is", null)
    .gte("deleted_at", sinceIso);

  if (error) throw error;
  return (data ?? []).map((row) => row.id);
}
