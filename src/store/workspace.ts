import { create } from "zustand";
import {
  DEFAULT_WORKSPACE,
  getStoredDataScope,
  storeActiveWorkspaceId,
  storeCaptureWorkspace,
  storeDataScope,
  syncStatusForScope,
  clearStoredActiveWorkspaceId,
} from "../lib/workspace";
import type { CloudSyncStatus, DataScope, WorkspaceSummary } from "../types/workspace";

interface WorkspaceStore {
  scope: DataScope;
  workspace: WorkspaceSummary;
  syncStatus: CloudSyncStatus;
  lastSyncedAt: string | null;
  setScope: (scope: DataScope) => void;
  setWorkspace: (workspace: WorkspaceSummary, userId?: string) => void;
  resetWorkspaceSelection: () => void;
  resetForSignOut: () => void;
  setSyncStatus: (status: CloudSyncStatus) => void;
  setLastSyncedAt: (iso: string | null) => void;
}

const initialScope = getStoredDataScope();

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  scope: initialScope,
  workspace: { ...DEFAULT_WORKSPACE },
  syncStatus: syncStatusForScope(initialScope),
  lastSyncedAt: null,
  setScope: (scope) => {
    storeDataScope(scope);
    const { workspace, syncStatus } = get();
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
          ? "local"
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
    storeCaptureWorkspace(null);
    const { scope } = get();
    set({
      workspace: { ...DEFAULT_WORKSPACE },
      syncStatus: syncStatusForScope(scope, false),
      lastSyncedAt: null,
    });
  },
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
}));

export function isWorkspaceScope(): boolean {
  return useWorkspaceStore.getState().scope === "workspace";
}
