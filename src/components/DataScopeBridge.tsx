import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useDataScope } from "../hooks/useDataScope";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { useWorkspaceStore } from "../store/workspace";

/** Refetch SQLite-backed lists when personal/workspace scope or active workspace changes. */
export function DataScopeBridge() {
  const queryClient = useQueryClient();
  const dataScope = useDataScope();
  const scope = useWorkspaceStore((s) => s.scope);
  const workspaceId = useWorkspaceStore((s) => s.workspace.id);
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    const tag =
      dataScope.kind === "workspace"
        ? `workspace:${dataScope.workspaceId}`
        : "personal";
    if (prevRef.current === tag) return;
    prevRef.current = tag;

    void invalidateScopedData(queryClient, dataScope);
  }, [queryClient, dataScope, scope, workspaceId]);

  return null;
}
