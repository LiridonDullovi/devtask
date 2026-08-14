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

export interface InviteResult {
  user_id: string | null;
  email: string;
  display_name: string | null;
  role: WorkspaceRole;
  created_at: string;
  /** "member" when the invitee already had an account and was added directly,
   *  "pending" when they don't yet — they join automatically once they sign up. */
  status: "member" | "pending";
}

export interface PendingInviteRow {
  id: string;
  email: string;
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
    }): Promise<InviteResult> => {
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
      if (!row) throw new Error("Invite was sent but no data was returned.");
      return row as InviteResult;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] });
      void qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

async function fetchPendingInvites(
  workspaceId: string,
): Promise<PendingInviteRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("list_pending_invites", {
    p_workspace_id: workspaceId,
  });
  if (error) throw error;
  return data ?? [];
}

export function usePendingInvites(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-invites", workspaceId],
    queryFn: () => fetchPendingInvites(workspaceId!),
    enabled: isActiveWorkspaceId(workspaceId),
  });
}

export function useRevokeInvite(workspaceId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.rpc("revoke_workspace_invite", {
        p_invite_id: inviteId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] });
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
