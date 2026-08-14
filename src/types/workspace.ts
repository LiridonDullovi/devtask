/** Where task data is scoped: private machine vs shared workspace. */
export type DataScope = "personal" | "workspace";

/** Cloud sync lifecycle (UI-ready; backend not wired yet). */
export type CloudSyncStatus =
  | "local"
  | "disconnected"
  | "idle"
  | "syncing"
  | "synced"
  | "error";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspacePlan = "free" | "pro" | "team";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug?: string | null;
  memberCount?: number;
  plan?: WorkspacePlan;
  role?: WorkspaceRole;
  is_personal?: boolean;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}
