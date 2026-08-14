import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { DEFAULT_WORKSPACE, syncStatusForScope } from "../lib/workspace";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { getErrorMessage } from "../lib/errors";
import { syncWorkspacePull } from "../sync/workspaceSync";
import { useWorkspaceStore } from "../store/workspace";
import { toastError } from "../store/toast";

const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    async function runPull() {
      try {
        return await syncWorkspacePull(workspaceId!);
      } catch {
        if (cancelled) return null;
        await delay(RETRY_DELAY_MS);
        if (cancelled) return null;
        return await syncWorkspacePull(workspaceId!);
      }
    }

    void runPull()
      .then((result) => {
        if (cancelled || !result) return;
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
      .catch((error) => {
        if (cancelled) return;
        setSyncStatus("error");
        toastError(`Workspace sync failed: ${getErrorMessage(error)}`);
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
