import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { getSupabase } from "../lib/supabase";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";
import { syncWorkspacePull } from "../sync/workspaceSync";

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
  const { scope, workspace, setLastSyncedAt } = useWorkspaceStore();
  const { isSignedIn } = useAuth();
  const workspaceId =
    workspace.id !== DEFAULT_WORKSPACE.id ? workspace.id : null;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (scope !== "workspace" || !workspaceId || !isSignedIn) {
      return;
    }

    const supabase = getSupabase();

    const schedulePull = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void syncWorkspacePull(workspaceId)
          .then((result) => {
            setLastSyncedAt(result.syncedAt);
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
            /* initial pull in WorkspaceSyncBridge handles errors */
          });
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
      clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [scope, workspaceId, isSignedIn, queryClient, setLastSyncedAt]);

  return null;
}
