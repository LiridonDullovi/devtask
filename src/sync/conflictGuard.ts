import { getSupabase } from "../lib/supabase";
import { isSyncNewer } from "./syncTimestamps";

export type PushGuardResult =
  | { action: "push" }
  | { action: "skip"; cloudUpdatedAt: string };

export type PushGuardTable =
  | "contexts"
  | "groups"
  | "group_links"
  | "tasks"
  | "task_comments";

export interface PushGuardManyResult {
  pushIds: string[];
  skipped: { id: string; cloudUpdatedAt: string }[];
}

/**
 * Skip pushing rows whose cloud version is newer than the local copy.
 * One network round trip regardless of how many ids are checked.
 */
export async function guardPushManyByUpdatedAt(
  table: PushGuardTable,
  rows: { id: string; updatedAt: string }[],
): Promise<PushGuardManyResult> {
  if (rows.length === 0) return { pushIds: [], skipped: [] };

  const { data, error } = await getSupabase()
    .from(table)
    .select("id, updated_at")
    .in(
      "id",
      rows.map((r) => r.id),
    );
  if (error) throw error;

  const cloudUpdatedAt = new Map(
    (data ?? []).map((row) => [row.id as string, row.updated_at as string]),
  );

  const pushIds: string[] = [];
  const skipped: { id: string; cloudUpdatedAt: string }[] = [];
  for (const row of rows) {
    const cloud = cloudUpdatedAt.get(row.id);
    if (cloud && isSyncNewer(cloud, row.updatedAt)) {
      skipped.push({ id: row.id, cloudUpdatedAt: cloud });
    } else {
      pushIds.push(row.id);
    }
  }
  return { pushIds, skipped };
}

/** Skip push when cloud row is newer than the local copy. */
export async function guardPushByUpdatedAt(
  table: PushGuardTable,
  id: string,
  localUpdatedAt: string,
): Promise<PushGuardResult> {
  const { skipped } = await guardPushManyByUpdatedAt(table, [
    { id, updatedAt: localUpdatedAt },
  ]);
  const skip = skipped[0];
  return skip
    ? { action: "skip", cloudUpdatedAt: skip.cloudUpdatedAt }
    : { action: "push" };
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
