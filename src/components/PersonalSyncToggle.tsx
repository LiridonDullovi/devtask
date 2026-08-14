import { useState } from "react";
import { Switch } from "./Switch";
import { useAuth } from "../hooks/useAuth";
import { useEnsurePersonalWorkspace } from "../hooks/useWorkspaces";
import { getErrorMessage } from "../lib/errors";
import { promoteLocalDataToWorkspace } from "../sync/promotePersonalData";
import { syncWorkspacePull } from "../sync/workspaceSync";
import { useWorkspaceStore } from "../store/workspace";
import { toastError, toastSuccess } from "../store/toast";

/** Lets a signed-in user opt their own personal tasks into cross-device cloud sync. */
export function PersonalSyncToggle() {
  const { user } = useAuth();
  const { personalSyncEnabled, setPersonalSync, setLastSyncedAt } =
    useWorkspaceStore();
  const ensurePersonalWorkspace = useEnsurePersonalWorkspace();
  const [pending, setPending] = useState(false);

  async function handleChange(next: boolean) {
    if (!user) return;
    setPending(true);
    try {
      if (next) {
        const ws = await ensurePersonalWorkspace.mutateAsync();
        await promoteLocalDataToWorkspace(ws.id);
        setPersonalSync(user.id, ws.id, true);
        const result = await syncWorkspacePull(ws.id);
        setLastSyncedAt(result.syncedAt);
        toastSuccess("Personal tasks now sync across your devices.");
      } else {
        const { personalWorkspaceId } = useWorkspaceStore.getState();
        setPersonalSync(user.id, personalWorkspaceId, false);
        toastSuccess(
          "Sync paused — your tasks stay on this device until you turn it back on.",
        );
      }
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
          Sync tasks across devices
        </p>
        <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          Keeps your personal tasks in sync between your own machines. Off by
          default — turning it on uploads what's currently on this device.
        </p>
      </div>
      <Switch
        checked={personalSyncEnabled}
        onChange={(v) => void handleChange(v)}
        disabled={pending}
        label="Sync tasks across devices"
      />
    </div>
  );
}
