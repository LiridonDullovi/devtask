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

  return useMemo(() => {
    if (
      scope === "workspace" &&
      workspaceId &&
      workspaceId !== DEFAULT_WORKSPACE.id
    ) {
      return { kind: "workspace", workspaceId } satisfies QueryScope;
    }
    if (scope === "personal") {
      return PERSONAL_SCOPE;
    }
    return getQueryScopeFromStorage();
  }, [scope, workspaceId]);
}
