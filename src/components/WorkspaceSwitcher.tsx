import { IconChevronDown, IconPlus, IconUsers } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useCreateWorkspace, useWorkspaces } from "../hooks/useWorkspaces";
import { DEFAULT_WORKSPACE } from "../lib/workspace";
import { getErrorMessage } from "../lib/errors";
import { useWorkspaceStore } from "../store/workspace";
import { toastError, toastSuccess } from "../store/toast";

export function WorkspaceSwitcher() {
  const { user, isSignedIn } = useAuth();
  const userId = user?.id;
  const { workspace, setWorkspace, resetWorkspaceSelection } =
    useWorkspaceStore();
  const { data: workspaces = [], isLoading } = useWorkspaces(userId);
  const createWorkspace = useCreateWorkspace();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setShowCreate(false);
    setNewName("");
  }, [userId]);

  useEffect(() => {
    if (!isSignedIn || !userId || isLoading) return;
    if (workspaces.length === 0 && workspace.id !== DEFAULT_WORKSPACE.id) {
      resetWorkspaceSelection();
    }
  }, [
    isSignedIn,
    userId,
    isLoading,
    workspaces.length,
    workspace.id,
    resetWorkspaceSelection,
  ]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (!isSignedIn) {
    return (
      <span className="text-[12px] text-neutral-400">Sign in to select team</span>
    );
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !userId) return;
    try {
      const created = await createWorkspace.mutateAsync(name);
      setWorkspace(created, userId);
      setNewName("");
      setShowCreate(false);
      setOpen(false);
      toastSuccess(`Workspace "${created.name}" created.`);
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  const active = workspaces.find((w) => w.id === workspace.id);
  const displayName = isLoading
    ? "Loading…"
    : active?.name ??
      (workspaces.length === 0 ? "No workspace" : DEFAULT_WORKSPACE.name);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[220px] cursor-pointer items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[12px] text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <IconUsers size={14} stroke={1.75} className="shrink-0 text-neutral-400" />
        <span className="truncate font-medium">{displayName}</span>
        <IconChevronDown size={12} stroke={1.75} className="shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {workspaces.length === 0 && !showCreate && (
            <p className="px-3 py-2 text-[12px] text-neutral-400">
              No workspaces yet.
            </p>
          )}
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => {
                setWorkspace(ws, userId);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer flex-col px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                ws.id === workspace.id && active
                  ? "bg-neutral-50 dark:bg-neutral-800/60"
                  : ""
              }`}
            >
              <span className="truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                {ws.name}
              </span>
              <span className="text-[11px] capitalize text-neutral-400">
                {ws.role}
              </span>
            </button>
          ))}
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            {showCreate ? (
              <div className="space-y-2 p-2">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                  placeholder="Workspace name"
                  className="w-full rounded border border-neutral-200 px-2 py-1.5 text-[12px] dark:border-neutral-700 dark:bg-neutral-950"
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={!newName.trim() || createWorkspace.isPending}
                    className="flex-1 cursor-pointer rounded bg-neutral-900 px-2 py-1 text-[12px] text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="cursor-pointer px-2 py-1 text-[12px] text-neutral-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-[12px] text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <IconPlus size={14} stroke={1.75} />
                New workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
