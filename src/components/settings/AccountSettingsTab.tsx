import { IconCloud } from "@tabler/icons-react";
import { useState } from "react";
import { AuthDialog } from "../AuthDialog";
import { PersonalSyncToggle } from "../PersonalSyncToggle";
import { SyncStatusBadge } from "../SyncStatusBadge";
import { WorkspaceAuthPanel } from "../WorkspaceAuthPanel";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspaceStore } from "../../store/workspace";

export function AccountSettingsTab() {
  const { scope, syncStatus, lastSyncedAt } = useWorkspaceStore();
  const { isSignedIn } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
            <IconCloud size={14} stroke={1.75} />
            Account
          </div>
          <SyncStatusBadge status={syncStatus} lastSyncedAt={lastSyncedAt} />
        </div>
        {isSignedIn ? (
          <WorkspaceAuthPanel />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="cursor-pointer rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Sign in
            </button>
            <p className="mt-3 text-[12px] text-neutral-400">
              Google / GitHub sign-in is coming later — email + password only
              for now.
            </p>
          </>
        )}
      </div>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

      {scope === "personal" && isSignedIn && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
          <PersonalSyncToggle />
        </div>
      )}
    </div>
  );
}
