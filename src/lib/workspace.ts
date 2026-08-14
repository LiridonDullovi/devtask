import type { CloudSyncStatus, DataScope } from "../types/workspace";

const SCOPE_KEY = "devtask-data-scope";
const ACTIVE_WORKSPACE_PREFIX = "devtask-active-workspace-";
/** Flat keys so the capture window (separate process) knows the active workspace. */
const CAPTURE_WORKSPACE_ID_KEY = "devtask-capture-workspace-id";
const CAPTURE_WORKSPACE_NAME_KEY = "devtask-capture-workspace-name";

const PERSONAL_WORKSPACE_ID_PREFIX = "devtask-personal-workspace-id-";
const PERSONAL_SYNC_ENABLED_PREFIX = "devtask-personal-sync-enabled-";
/**
 * Flat key so the capture window knows which workspace "Personal" scope maps
 * to. Deliberately NOT gated on the sync-enabled flag: once a personal
 * workspace exists, Personal scope always resolves to it (pausing sync only
 * stops the bridges from talking to Supabase, it never hides local rows).
 */
const CAPTURE_PERSONAL_WORKSPACE_ID_KEY =
  "devtask-capture-personal-workspace-id";

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

function personalWorkspaceIdKey(userId: string): string {
  return `${PERSONAL_WORKSPACE_ID_PREFIX}${userId}`;
}

function personalSyncEnabledKey(userId: string): string {
  return `${PERSONAL_SYNC_ENABLED_PREFIX}${userId}`;
}

export function getStoredPersonalWorkspaceId(userId: string): string | null {
  try {
    return localStorage.getItem(personalWorkspaceIdKey(userId));
  } catch {
    return null;
  }
}

export function storePersonalWorkspaceId(userId: string, id: string): void {
  try {
    localStorage.setItem(personalWorkspaceIdKey(userId), id);
  } catch {
    /* ignore */
  }
}

export function getStoredPersonalSyncEnabled(userId: string): boolean {
  try {
    return localStorage.getItem(personalSyncEnabledKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function storePersonalSyncEnabled(
  userId: string,
  enabled: boolean,
): void {
  try {
    localStorage.setItem(personalSyncEnabledKey(userId), enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function clearStoredPersonalWorkspaceState(userId?: string): void {
  try {
    if (userId) {
      localStorage.removeItem(personalWorkspaceIdKey(userId));
      localStorage.removeItem(personalSyncEnabledKey(userId));
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith(PERSONAL_WORKSPACE_ID_PREFIX) ||
        key?.startsWith(PERSONAL_SYNC_ENABLED_PREFIX)
      ) {
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

/** Mirrors the resolved personal-workspace id into a flat key the capture window (separate process) can read. */
export function storeCapturePersonalWorkspaceId(
  personalWorkspaceId: string | null,
): void {
  try {
    if (personalWorkspaceId) {
      localStorage.setItem(
        CAPTURE_PERSONAL_WORKSPACE_ID_KEY,
        personalWorkspaceId,
      );
      return;
    }
    localStorage.removeItem(CAPTURE_PERSONAL_WORKSPACE_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredCapturePersonalWorkspaceId(): string | null {
  try {
    return localStorage.getItem(CAPTURE_PERSONAL_WORKSPACE_ID_KEY);
  } catch {
    return null;
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
  personalSyncEnabled = false,
): CloudSyncStatus {
  if (scope === "personal" && !personalSyncEnabled) return "local";
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
