import {
  getStoredCapturePersonalWorkspaceId,
  getStoredCaptureWorkspace,
  getStoredDataScope,
} from "../lib/workspace";

/** Filters local SQLite rows: personal (null workspace_id) vs one workspace cache. */
export type QueryScope =
  | { kind: "personal" }
  | { kind: "workspace"; workspaceId: string };

export const PERSONAL_SCOPE: QueryScope = { kind: "personal" };

/** Read scope from localStorage (capture window + store hydration). */
export function getQueryScopeFromStorage(): QueryScope {
  if (getStoredDataScope() !== "workspace") {
    // Same rule as useDataScope(): once a personal workspace exists, it's
    // always where Personal-scope rows live, sync-paused or not.
    const personalWorkspaceId = getStoredCapturePersonalWorkspaceId();
    if (personalWorkspaceId) {
      return { kind: "workspace", workspaceId: personalWorkspaceId };
    }
    return PERSONAL_SCOPE;
  }
  const workspace = getStoredCaptureWorkspace();
  if (!workspace) return PERSONAL_SCOPE;
  return { kind: "workspace", workspaceId: workspace.id };
}

export function workspaceIdFromScope(scope: QueryScope): string | null {
  return scope.kind === "workspace" ? scope.workspaceId : null;
}

export function scopeQueryKey(
  base: readonly unknown[],
  scope: QueryScope,
): unknown[] {
  return scope.kind === "workspace"
    ? [...base, "workspace", scope.workspaceId]
    : [...base, "personal"];
}
