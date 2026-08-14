import { create } from "zustand";
import {
  DEFAULT_WORKSPACE,
  clearStoredPersonalWorkspaceState,
  getStoredDataScope,
  storeActiveWorkspaceId,
  storeCapturePersonalWorkspaceId,
  storeCaptureWorkspace,
  storeDataScope,
  storePersonalSyncEnabled,
  storePersonalWorkspaceId,
  syncStatusForScope,
  clearStoredActiveWorkspaceId,
} from "../lib/workspace";
import type { CloudSyncStatus, DataScope, WorkspaceSummary } from "../types/workspace";

interface WorkspaceStore {
  scope: DataScope;
  workspace: WorkspaceSummary;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  personalWorkspaceId: string | null;
  personalSyncEnabled: boolean;
  setScope: (scope: DataScope) => void;
  setWorkspace: (workspace: WorkspaceSummary, userId?: string) => void;
  resetWorkspaceSelection: () => void;
  resetForSignOut: () => void;
  setSyncStatus: (status: CloudSyncStatus) => void;
  setLastSyncedAt: (iso: string | null) => void;
  /** Hydrates personal-sync state after sign-in (does not persist — caller already has it stored). */
  hydratePersonalSync: (workspaceId: string | null, enabled: boolean) => void;
  /** Turns personal cross-device sync on/off and persists the choice for this user. */
  setPersonalSync: (
    userId: string,
    workspaceId: string | null,
    enabled: boolean,
  ) => void;
}

const initialScope = getStoredDataScope();

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  scope: initialScope,
  workspace: { ...DEFAULT_WORKSPACE },
  syncStatus: syncStatusForScope(initialScope),
  lastSyncedAt: null,
  personalWorkspaceId: null,
  personalSyncEnabled: false,
  setScope: (scope) => {
    storeDataScope(scope);
    const { workspace, syncStatus, personalSyncEnabled } = get();
    if (scope === "workspace" && workspace.id !== DEFAULT_WORKSPACE.id) {
      storeCaptureWorkspace(workspace);
    } else {
      storeCaptureWorkspace(null);
    }
    const signedIn =
      syncStatus !== "local" && syncStatus !== "disconnected";
    set({
      scope,
      syncStatus:
        scope === "personal"
          ? personalSyncEnabled
            ? signedIn
              ? syncStatus
              : "disconnected"
            : "local"
          : signedIn
            ? syncStatus
            : "disconnected",
    });
  },
  setWorkspace: (workspace, userId) => {
    if (userId && workspace.id !== DEFAULT_WORKSPACE.id) {
      storeActiveWorkspaceId(userId, workspace.id);
    }
    const { scope } = get();
    if (scope === "workspace" && workspace.id !== DEFAULT_WORKSPACE.id) {
      storeCaptureWorkspace(workspace);
    }
    set({ workspace });
  },
  resetWorkspaceSelection: () => {
    storeCaptureWorkspace(null);
    set({ workspace: { ...DEFAULT_WORKSPACE } });
  },
  resetForSignOut: () => {
    clearStoredActiveWorkspaceId();
    clearStoredPersonalWorkspaceState();
    storeCaptureWorkspace(null);
    storeCapturePersonalWorkspaceId(null);
    const { scope } = get();
    set({
      workspace: { ...DEFAULT_WORKSPACE },
      syncStatus: syncStatusForScope(scope, false),
      lastSyncedAt: null,
      personalWorkspaceId: null,
      personalSyncEnabled: false,
    });
  },
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  hydratePersonalSync: (workspaceId, enabled) => {
    storeCapturePersonalWorkspaceId(workspaceId);
    const { scope, syncStatus } = get();
    const signedIn = syncStatus !== "local" && syncStatus !== "disconnected";
    set({
      personalWorkspaceId: workspaceId,
      personalSyncEnabled: enabled,
      syncStatus:
        scope === "personal"
          ? enabled
            ? signedIn
              ? "idle"
              : "disconnected"
            : "local"
          : syncStatus,
    });
  },
  setPersonalSync: (userId, workspaceId, enabled) => {
    if (workspaceId) storePersonalWorkspaceId(userId, workspaceId);
    storePersonalSyncEnabled(userId, enabled);
    storeCapturePersonalWorkspaceId(workspaceId);
    const { scope, syncStatus } = get();
    const signedIn = syncStatus !== "local" && syncStatus !== "disconnected";
    set({
      personalWorkspaceId: workspaceId,
      personalSyncEnabled: enabled,
      syncStatus:
        scope === "personal"
          ? enabled
            ? signedIn
              ? "idle"
              : "disconnected"
            : "local"
          : syncStatus,
    });
  },
}));

export function isWorkspaceScope(): boolean {
  return useWorkspaceStore.getState().scope === "workspace";
}
