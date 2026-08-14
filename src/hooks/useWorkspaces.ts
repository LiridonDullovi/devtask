import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import type { WorkspacePlan, WorkspaceRole, WorkspaceSummary } from "../types/workspace";

export interface WorkspaceListItem extends WorkspaceSummary {
  role: WorkspaceRole;
}

async function fetchWorkspaces(): Promise<WorkspaceListItem[]> {
  const supabase = getSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      "role, workspaces ( id, name, slug, plan, created_at, is_personal )",
    )
    .eq("user_id", userData.user.id);

  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const ws = row.workspaces;
    if (!ws || Array.isArray(ws)) return [];
    return [
      {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan as WorkspacePlan,
        role: row.role as WorkspaceRole,
        is_personal: ws.is_personal,
      },
    ];
  });
}

export function useWorkspaces(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["workspaces", userId ?? "anonymous"],
    queryFn: fetchWorkspaces,
    enabled: Boolean(userId),
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const supabase = getSupabase();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("Sign in required.");

      const { data: rows, error: createError } = await supabase.rpc(
        "create_workspace",
        { workspace_name: name.trim() },
      );

      if (createError) throw createError;

      const workspace = Array.isArray(rows) ? rows[0] : rows;
      if (!workspace) {
        throw new Error("Workspace was created but no data was returned.");
      }

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan as WorkspacePlan,
        role: "owner" as const,
      } satisfies WorkspaceListItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

/** Returns the caller's private personal workspace, creating it on first use. */
export function useEnsurePersonalWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WorkspaceListItem> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("ensure_personal_workspace");
      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        throw new Error("Personal workspace was created but no data was returned.");
      }

      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        plan: row.plan as WorkspacePlan,
        role: "owner" as const,
        is_personal: row.is_personal,
      } satisfies WorkspaceListItem;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
