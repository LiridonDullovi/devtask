import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { getErrorMessage } from "../lib/errors";
import { getSupabase } from "../lib/supabase";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";
import { toastError } from "../store/toast";
import { syncWorkspacePull } from "../sync/workspaceSync";

const RETRY_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const REALTIME_TABLES = [
  "tasks",
  "contexts",
  "groups",
  "group_links",
  "task_comments",
] as const;

/** Pulls cloud changes when teammates edit workspace data (requires Realtime enabled). */
export function WorkspaceRealtimeBridge() {
  const queryClient = useQueryClient();
  const { scope, workspace, personalSyncEnabled, personalWorkspaceId, setLastSyncedAt } =
    useWorkspaceStore();
  const { isSignedIn } = useAuth();
  const teamWorkspaceId =
    workspace.id !== DEFAULT_WORKSPACE.id ? workspace.id : null;
  const effectiveWorkspaceId =
    scope === "workspace"
      ? teamWorkspaceId
      : personalSyncEnabled
        ? personalWorkspaceId
        : null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!effectiveWorkspaceId || !isSignedIn) {
      return;
    }
    const workspaceId = effectiveWorkspaceId;

    const supabase = getSupabase();
    let cancelled = false;

    const schedulePull = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void (async () => {
          try {
            let result;
            try {
              result = await syncWorkspacePull(workspaceId!);
            } catch {
              if (cancelled) return;
              await delay(RETRY_DELAY_MS);
              if (cancelled) return;
              result = await syncWorkspacePull(workspaceId!);
            }
            if (cancelled) return;
            setLastSyncedAt(result.syncedAt);
            void invalidateScopedData(queryClient, {
              kind: "workspace",
              workspaceId,
            });
            void queryClient.invalidateQueries({
              queryKey: ["task-comments"],
              refetchType: "active",
            });
          } catch (error) {
            if (cancelled) return;
            toastError(`Live sync failed: ${getErrorMessage(error)}`);
          }
        })();
      }, 500);
    };

    let channel = supabase.channel(`workspace-live:${workspaceId}`);
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `workspace_id=eq.${workspaceId}`,
        },
        schedulePull,
      );
    }
    channel.subscribe();

    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [effectiveWorkspaceId, isSignedIn, queryClient, setLastSyncedAt]);

  return null;
}
