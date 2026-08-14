import { useMemo } from "react";
import {
  getQueryScopeFromStorage,
  PERSONAL_SCOPE,
  type QueryScope,
} from "../db/dataScope";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";

export function useDataScope(): QueryScope {
  const scope = useWorkspaceStore((s) => s.scope);
  const workspaceId = useWorkspaceStore((s) => s.workspace.id);
  const personalWorkspaceId = useWorkspaceStore((s) => s.personalWorkspaceId);

  return useMemo(() => {
    if (
      scope === "workspace" &&
      workspaceId &&
      workspaceId !== DEFAULT_WORKSPACE.id
    ) {
      return { kind: "workspace", workspaceId } satisfies QueryScope;
    }
    if (scope === "personal") {
      // Once a personal workspace exists for this user, "Personal" always
      // resolves to it — regardless of whether syncing is currently paused
      // (see setPersonalSync) — so toggling sync off never hides tasks that
      // were already promoted to it.
      if (personalWorkspaceId) {
        return {
          kind: "workspace",
          workspaceId: personalWorkspaceId,
        } satisfies QueryScope;
      }
      return PERSONAL_SCOPE;
    }
    return getQueryScopeFromStorage();
  }, [scope, workspaceId, personalWorkspaceId]);
}
