import { IconUsers, IconUsersGroup } from "@tabler/icons-react";
import { WorkspaceMembersPanel } from "../WorkspaceMembersPanel";
import { WorkspaceSyncPanel } from "../WorkspaceSyncPanel";
import { useAuth } from "../../hooks/useAuth";
import { useWorkspaces } from "../../hooks/useWorkspaces";
import { DEFAULT_WORKSPACE } from "../../lib/workspace";
import { useWorkspaceStore } from "../../store/workspace";

interface TeamSettingsTabProps {
  onGoToAccount: () => void;
}

export function TeamSettingsTab({ onGoToAccount }: TeamSettingsTabProps) {
  const { scope, workspace, setScope } = useWorkspaceStore();
  const { user, isSignedIn } = useAuth();
  const { data: workspaces = [], isLoading: workspacesLoading } =
    useWorkspaces(user?.id);
  const isWorkspace = scope === "workspace";
  const activeWorkspace = workspaces.find((w) => w.id === workspace.id);
  const hasActiveWorkspace =
    isWorkspace && workspace.id !== DEFAULT_WORKSPACE.id;

  if (!isSignedIn) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-5 text-center dark:border-neutral-800 dark:bg-neutral-900/30">
        <IconUsersGroup
          size={22}
          stroke={1.5}
          className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600"
        />
        <p className="mb-3 text-[13px] text-neutral-500">
          Sign in to create or join a team workspace.
        </p>
        <button
          type="button"
          onClick={onGoToAccount}
          className="cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Go to Account
        </button>
      </div>
    );
  }

  if (!isWorkspace) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-5 text-center dark:border-neutral-800 dark:bg-neutral-900/30">
        <IconUsersGroup
          size={22}
          stroke={1.5}
          className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600"
        />
        <p className="mb-3 text-[13px] text-neutral-500">
          Switch to Workspace mode to see your teams, invite members, and
          collaborate on tasks.
        </p>
        <button
          type="button"
          onClick={() => setScope("workspace")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[#E6F1FB] bg-[#F5FAFF] px-3 py-2 text-[13px] text-[#378ADD] hover:bg-[#E6F1FB] dark:border-[#378ADD]/40 dark:bg-[#378ADD]/10 dark:hover:bg-[#378ADD]/20"
        >
          Switch to workspace mode
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      {hasActiveWorkspace && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/30">
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-400">
            <IconUsers size={14} stroke={1.75} />
            Members — {activeWorkspace?.name ?? workspace.name}
          </div>
          <WorkspaceMembersPanel />
        </div>
      )}

      {hasActiveWorkspace && <WorkspaceSyncPanel />}
    </div>
  );
}
