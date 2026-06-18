import { ScopeToggle } from "./ScopeToggle";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { useWorkspaceStore } from "../store/workspace";

export function AppHeader() {
  const { scope, setScope, syncStatus, lastSyncedAt } = useWorkspaceStore();
  const isWorkspace = scope === "workspace";

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
          <SyncStatusBadge status="local" compact />
        )}
      </div>
    </header>
  );
}
