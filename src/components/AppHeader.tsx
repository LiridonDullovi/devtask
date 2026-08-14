import { IconUserCircle } from "@tabler/icons-react";
import { useState } from "react";
import { AuthDialog } from "./AuthDialog";
import { ScopeToggle } from "./ScopeToggle";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useAuth } from "../hooks/useAuth";
import { useContextsStore } from "../store/contexts";
import { useWorkspaceStore } from "../store/workspace";

export function AppHeader() {
  const { scope, setScope, syncStatus, lastSyncedAt } = useWorkspaceStore();
  const { user, isSignedIn } = useAuth();
  const setView = useContextsStore((s) => s.setView);
  const isWorkspace = scope === "workspace";
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex min-w-0 items-center gap-4">
        <span className="shrink-0 text-[13px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          DevTask
        </span>
        <ScopeToggle value={scope} onChange={setScope} />
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {isWorkspace ? (
          <>
            <WorkspaceSwitcher />
            <SyncStatusBadge
              status={syncStatus}
              lastSyncedAt={lastSyncedAt}
              compact
            />
          </>
        ) : (
          <SyncStatusBadge status={syncStatus} compact />
        )}

        <button
          type="button"
          onClick={() =>
            isSignedIn ? setView("settings") : setAuthOpen(true)
          }
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[12px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <IconUserCircle size={14} stroke={1.75} className="text-neutral-400" />
          <span className="max-w-[140px] truncate font-medium">
            {isSignedIn ? user?.email : "Sign in"}
          </span>
        </button>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}
