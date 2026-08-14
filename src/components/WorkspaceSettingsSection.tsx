import { IconCloud, IconLock, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { AuthDialog } from "./AuthDialog";
import { PersonalSyncToggle } from "./PersonalSyncToggle";
import { SyncStatusBadge } from "./SyncStatusBadge";
import { WorkspaceAuthPanel } from "./WorkspaceAuthPanel";
import { WorkspaceMembersPanel } from "./WorkspaceMembersPanel";
import { WorkspaceSyncPanel } from "./WorkspaceSyncPanel";
import { useAuth } from "../hooks/useAuth";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { useWorkspaceStore } from "../store/workspace";

export function WorkspaceSettingsSection() {
  const { scope, workspace, syncStatus, lastSyncedAt, setScope } =
    useWorkspaceStore();
  const { user, isSignedIn } = useAuth();
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useWorkspaces(user?.id);
  const isWorkspace = scope === "workspace";
  const activeWorkspace = workspaces.find((w) => w.id === workspace.id);
  const hasActiveWorkspace =
    isWorkspace && workspace.id !== DEFAULT_WORKSPACE.id;
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <section>
      <h2 className="mb-1 text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
        Team workspace (Supabase)
      </h2>
      <p className="mb-4 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
        {isWorkspace
          ? "Sign in and select a workspace. Tasks sync with Supabase; invite members below."
          : "Personal mode is local-only on this device by default. Sign in below to optionally sync your personal tasks across your own machines, or switch to Workspace in the header for team features."}
      </p>

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
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="cursor-pointer rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Sign in
            </button>
          )}
        </div>
        <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />

        {isWorkspace && isSignedIn && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
              <IconUsers size={14} stroke={1.75} />
              Your workspaces
              {workspacesLoading ? "…" : ` (${workspaces.length})`}
            </div>
            {workspacesLoading ? (
              <p className="text-[13px] text-neutral-400">Loading workspaces…</p>
            ) : workspaces.length === 0 ? (
              <p className="text-[13px] text-neutral-500">
                No workspaces yet — use the header menu to create one.
              </p>
            ) : (
              <ul className="space-y-2">
                {workspaces.map((ws) => (
                  <li
                    key={ws.id}
                    className="flex items-center justify-between text-[13px]"
                  >
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {ws.name}
                    </span>
                    <span className="text-[11px] capitalize text-neutral-400">
                      {ws.role}
                      {ws.id === workspace.id &&
                      workspaces.some((w) => w.id === workspace.id)
                        ? " · active"
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {hasActiveWorkspace && isSignedIn && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
              <IconUsers size={14} stroke={1.75} />
              Members — {activeWorkspace?.name ?? workspace.name}
            </div>
            <WorkspaceMembersPanel />
          </div>
        )}

        {hasActiveWorkspace && isSignedIn && <WorkspaceSyncPanel />}

        {!isWorkspace && isSignedIn && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
            <PersonalSyncToggle />
          </div>
        )}

        {!isWorkspace && (
          <button
            type="button"
            onClick={() => setScope("workspace")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E6F1FB] bg-[#F5FAFF] px-3 py-2 text-[13px] text-[#378ADD] hover:bg-[#E6F1FB] dark:border-[#378ADD]/40 dark:bg-[#378ADD]/10 dark:hover:bg-[#378ADD]/20"
          >
            Switch to workspace mode
          </button>
        )}

        <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <div className="mb-1 flex items-center gap-2 text-[12px] font-medium text-neutral-600 dark:text-neutral-400">
            <IconLock size={14} stroke={1.75} />
            Coming later
          </div>
          <ul className="list-inside list-disc text-[12px] leading-relaxed text-neutral-400">
            <li>Google / GitHub sign-in (email + password only for now)</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
