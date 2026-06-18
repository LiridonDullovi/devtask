import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabase } from "../lib/supabase";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import type { WorkspaceRole } from "../types/workspace";

export interface WorkspaceMemberRow {
  user_id: string;
  email: string;
  display_name: string | null;
  role: WorkspaceRole;
  created_at: string;
}

function isActiveWorkspaceId(id: string | undefined): id is string {
  return Boolean(id && id !== DEFAULT_WORKSPACE.id);
}

async function fetchWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("list_workspace_members", {
    p_workspace_id: workspaceId,
  });
  if (error) throw error;
  return data ?? [];
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembers(workspaceId!),
    enabled: isActiveWorkspaceId(workspaceId),
  });
}

export function useInviteWorkspaceMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string;
      role: Exclude<WorkspaceRole, "owner">;
    }) => {
      if (!isActiveWorkspaceId(workspaceId)) {
        throw new Error("Select a workspace first.");
      }
      const supabase = getSupabase();
      const { data, error } = await supabase.rpc("invite_workspace_member", {
        p_workspace_id: workspaceId,
        p_email: email.trim(),
        p_role: role,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Member was added but no data was returned.");
      return row;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useRemoveWorkspaceMember(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      if (!isActiveWorkspaceId(workspaceId)) {
        throw new Error("Select a workspace first.");
      }
      const supabase = getSupabase();
      const { error } = await supabase.rpc("remove_workspace_member", {
        p_workspace_id: workspaceId,
        p_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
