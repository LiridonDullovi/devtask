import { IconRefresh } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { invalidateScopedData } from "../lib/queryInvalidation";
import { syncWorkspacePull } from "../sync/workspaceSync";
import { getErrorMessage } from "../lib/errors";
import { isSupabaseConfigured } from "../lib/supabase";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";
import { toastError, toastSuccess } from "../store/toast";

export function WorkspaceSyncPanel() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { workspace, setSyncStatus, setLastSyncedAt, lastSyncedAt } =
    useWorkspaceStore();
  const [counts, setCounts] = useState<{
    contexts: number;
    groups: number;
    tasks: number;
    comments: number;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const workspaceId =
    workspace.id !== DEFAULT_WORKSPACE.id ? workspace.id : undefined;

  async function handleSync() {
    if (!workspaceId) {
      toastError("Select a workspace in the header first.");
      return;
    }
    setPending(true);
    setSyncStatus("syncing");
    try {
      const result = await syncWorkspacePull(workspaceId);
      setCounts({
        contexts: result.contexts,
        groups: result.groups,
        tasks: result.tasks,
        comments: result.comments,
      });
      setLastSyncedAt(result.syncedAt);
      setSyncStatus("synced");
      await invalidateScopedData(queryClient, {
        kind: "workspace",
        workspaceId,
      });
      await queryClient.invalidateQueries({
        queryKey: ["task-comments"],
        refetchType: "active",
      });
      toastSuccess(
        `Synced ${result.contexts} contexts, ${result.groups} groups, ${result.tasks} tasks, ${result.comments} comments from cloud.`,
      );
    } catch (error) {
      setSyncStatus("error");
      toastError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (!isSupabaseConfigured) return null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wider text-neutral-400">
          Cloud sync
        </span>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={!isSignedIn || !workspaceId || pending}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1.5 text-[12px] text-neutral-600 hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <IconRefresh
            size={14}
            stroke={1.75}
            className={pending ? "animate-spin" : undefined}
          />
          Sync now
        </button>
      </div>
      <p className="mb-3 text-[12px] leading-relaxed text-neutral-500">
        Pulls team data from Supabase into this device. Changes you make in
        workspace mode are pushed to the cloud automatically.
      </p>
      {counts ? (
        <p className="text-[13px] text-neutral-700 dark:text-neutral-300">
          Cached: {counts.contexts} contexts, {counts.groups} groups,{" "}
          {counts.tasks} tasks, {counts.comments} comments
          {lastSyncedAt ? (
            <span className="block text-[11px] text-neutral-400">
              {new Date(lastSyncedAt).toLocaleString()}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-[12px] text-neutral-400">
          Sync runs automatically when you switch workspace or open workspace
          mode.
        </p>
      )}
    </div>
  );
}
