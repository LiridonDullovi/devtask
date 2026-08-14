import type { CloudSyncStatus, DataScope } from "../types/workspace";

const SCOPE_KEY = "devtask-data-scope";
const ACTIVE_WORKSPACE_PREFIX = "devtask-active-workspace-";
/** Flat keys so the capture window (separate process) knows the active workspace. */
const CAPTURE_WORKSPACE_ID_KEY = "devtask-capture-workspace-id";
const CAPTURE_WORKSPACE_NAME_KEY = "devtask-capture-workspace-name";

function activeWorkspaceKey(userId: string): string {
  return `${ACTIVE_WORKSPACE_PREFIX}${userId}`;
}

export function getStoredActiveWorkspaceId(userId: string): string | null {
  try {
    return localStorage.getItem(activeWorkspaceKey(userId));
  } catch {
    return null;
  }
}

export function storeActiveWorkspaceId(userId: string, id: string): void {
  try {
    localStorage.setItem(activeWorkspaceKey(userId), id);
  } catch {
    /* ignore */
  }
}

export function clearStoredActiveWorkspaceId(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(activeWorkspaceKey(userId));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(ACTIVE_WORKSPACE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

export function getStoredDataScope(): DataScope {
  try {
    const raw = localStorage.getItem(SCOPE_KEY);
    if (raw === "workspace") return "workspace";
  } catch {
    /* ignore */
  }
  return "personal";
}

export function storeDataScope(scope: DataScope): void {
  try {
    localStorage.setItem(SCOPE_KEY, scope);
  } catch {
    /* ignore */
  }
}

export function storeCaptureWorkspace(
  workspace: { id: string; name: string } | null,
): void {
  try {
    if (workspace && workspace.id !== DEFAULT_WORKSPACE.id) {
      localStorage.setItem(CAPTURE_WORKSPACE_ID_KEY, workspace.id);
      localStorage.setItem(CAPTURE_WORKSPACE_NAME_KEY, workspace.name);
      return;
    }
    localStorage.removeItem(CAPTURE_WORKSPACE_ID_KEY);
    localStorage.removeItem(CAPTURE_WORKSPACE_NAME_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredCaptureWorkspace(): {
  id: string;
  name: string;
} | null {
  try {
    const id = localStorage.getItem(CAPTURE_WORKSPACE_ID_KEY);
    if (!id || id === DEFAULT_WORKSPACE.id) return null;
    return {
      id,
      name: localStorage.getItem(CAPTURE_WORKSPACE_NAME_KEY) ?? "Workspace",
    };
  } catch {
    return null;
  }
}

export function syncStatusForScope(
  scope: DataScope,
  signedIn = false,
): CloudSyncStatus {
  if (scope === "personal") return "local";
  return signedIn ? "idle" : "disconnected";
}

export const SYNC_STATUS_LABELS: Record<CloudSyncStatus, string> = {
  local: "Local only",
  disconnected: "Not connected",
  idle: "Up to date",
  syncing: "Syncing…",
  synced: "Synced",
  error: "Sync error",
};

/** Shown when no workspace is selected or user is signed out. */
export const DEFAULT_WORKSPACE = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Select workspace",
  plan: "free" as const,
};
