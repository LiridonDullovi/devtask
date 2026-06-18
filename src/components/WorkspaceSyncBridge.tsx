import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { DEFAULT_WORKSPACE, syncStatusForScope } from "../lib/workspace";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { syncWorkspacePull } from "../sync/workspaceSync";
import { useWorkspaceStore } from "../store/workspace";

/** Keeps sync status in sync with auth + scope; pulls cloud data into SQLite cache. */
export function WorkspaceSyncBridge() {
  const queryClient = useQueryClient();
  const { scope, workspace, setSyncStatus, setLastSyncedAt } =
    useWorkspaceStore();
  const { isSignedIn } = useAuth();
  const workspaceId =
    workspace.id !== DEFAULT_WORKSPACE.id ? workspace.id : null;

  useEffect(() => {
    setSyncStatus(syncStatusForScope(scope, isSignedIn));
  }, [scope, isSignedIn, setSyncStatus]);

  useEffect(() => {
    if (scope !== "workspace" || !workspaceId || !isSignedIn) {
      return;
    }

    let cancelled = false;
    setSyncStatus("syncing");

    void syncWorkspacePull(workspaceId)
      .then((result) => {
        if (cancelled) return;
        setLastSyncedAt(result.syncedAt);
        setSyncStatus("synced");
        void invalidateScopedData(queryClient, {
          kind: "workspace",
          workspaceId,
        });
        void queryClient.invalidateQueries({
          queryKey: ["task-comments"],
          refetchType: "active",
        });
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [
    scope,
    workspaceId,
    isSignedIn,
    setSyncStatus,
    setLastSyncedAt,
    queryClient,
  ]);

  return null;
}
