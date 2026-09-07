import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog } from "./Dialog";
import { Select } from "./Select";
import { useAuth } from "../hooks/useAuth";
import { useDataScope } from "../hooks/useDataScope";
import { useMoveGroup, useMoveHierarchy, useMoveTask } from "../hooks/useMoveItems";
import { useWorkspaces } from "../hooks/useWorkspaces";
import { useWorkspaceStore } from "../store/workspace";
import { toastError, toastSuccess } from "../store/toast";
import type { Group, Task } from "../types";

const PERSONAL_VALUE = "personal";

function useDestWorkspaceId(destKey: string): string | null {
  const personalWorkspaceId = useWorkspaceStore((s) => s.personalWorkspaceId);
  if (destKey === PERSONAL_VALUE) return personalWorkspaceId;
  return destKey || null;
}

function useCurrentDestKey(): string {
  const dataScope = useDataScope();
  const personalWorkspaceId = useWorkspaceStore((s) => s.personalWorkspaceId);
  if (
    dataScope.kind === "workspace" &&
    dataScope.workspaceId !== personalWorkspaceId
  ) {
    return dataScope.workspaceId;
  }
  return PERSONAL_VALUE;
}

function destLabel(destKey: string, workspaceName: string | undefined): string {
  if (destKey === PERSONAL_VALUE) return "Personal";
  return workspaceName ?? "workspace";
}

interface SharedMoveFieldsProps {
  destKey: string;
  onDestKeyChange: (value: string) => void;
  destOptions: { value: string; label: string }[];
  contextId: string;
  onContextIdChange: (value: string) => void;
  contextOptions: { value: string; label: string; color?: string }[];
  hierarchyLoading: boolean;
  children?: ReactNode;
}

function SharedMoveFields({
  destKey,
  onDestKeyChange,
  destOptions,
  contextId,
  onContextIdChange,
  contextOptions,
  hierarchyLoading,
  children,
}: SharedMoveFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
          Destination
        </label>
        <Select
          value={destKey}
          onChange={onDestKeyChange}
          options={destOptions}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
          Context
        </label>
        {hierarchyLoading ? (
          <p className="text-[13px] text-neutral-400">Loading…</p>
        ) : (
          <Select
            value={contextId}
            onChange={onContextIdChange}
            options={contextOptions}
            placeholder="Select context"
          />
        )}
      </div>
      {children}
    </div>
  );
}

interface MoveTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onMoved: (result: { crossedScope: boolean; moved: boolean }) => void;
}

export function MoveTaskDialog({
  open,
  task,
  onClose,
  onMoved,
}: MoveTaskDialogProps) {
  const { user, isSignedIn } = useAuth();
  const currentKey = useCurrentDestKey();
  const { data: workspaces = [] } = useWorkspaces(user?.id);
  const moveTask = useMoveTask();

  const [destKey, setDestKey] = useState(currentKey);
  const [contextId, setContextId] = useState(task?.context_id ?? "");
  const [groupId, setGroupId] = useState(task?.group_id ?? "");

  const destWorkspaceId = useDestWorkspaceId(destKey);
  const hierarchy = useMoveHierarchy(destWorkspaceId, open);

  useEffect(() => {
    if (!open || !task) return;
    setDestKey(currentKey);
    setContextId(task.context_id);
    setGroupId(task.group_id ?? "");
  }, [open, task?.id, currentKey, task]);

  const destOptions = useMemo(() => {
    const team = workspaces
      .filter((ws) => !ws.is_personal)
      .map((ws) => ({ value: ws.id, label: ws.name }));
    return [{ value: PERSONAL_VALUE, label: "Personal" }, ...team];
  }, [workspaces]);

  const contexts = hierarchy.data?.contexts ?? [];
  const groups = hierarchy.data?.groups ?? [];

  useEffect(() => {
    if (!open || hierarchy.isLoading) return;
    if (contexts.length === 0) {
      setContextId("");
      setGroupId("");
      return;
    }
    if (!contexts.some((ctx) => ctx.id === contextId)) {
      setContextId(contexts[0].id);
      setGroupId("");
    }
  }, [open, hierarchy.isLoading, contexts, contextId]);

  const contextOptions = contexts.map((ctx) => ({
    value: ctx.id,
    label: ctx.name,
    color: ctx.color,
  }));

  const groupOptions = groups
    .filter((g) => g.context_id === contextId)
    .map((g) => ({ value: g.id, label: g.name }));

  useEffect(() => {
    if (!open) return;
    const valid = groups.some(
      (g) => g.context_id === contextId && g.id === groupId,
    );
    if (groupId && !valid) setGroupId("");
  }, [open, groupId, contextId, groups]);

  if (!task) return null;

  const workspaceName = destOptions.find((o) => o.value === destKey)?.label;

  async function handleMove() {
    if (!task || !contextId) return;
    try {
      const result = await moveTask.mutateAsync({
        taskId: task.id,
        dest: {
          workspaceId: destWorkspaceId,
          contextId,
          groupId: groupId || null,
        },
      });
      toastSuccess(
        result.crossedScope
          ? `Moved "${task.title}" to ${destLabel(destKey, workspaceName)}.`
          : `Updated location for "${task.title}".`,
      );
      onMoved(result);
      onClose();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Could not move task.",
      );
    }
  }

  return (
    <Dialog open={open} title="Move task" onClose={onClose}>
      <div className="space-y-4">
        {!isSignedIn && destOptions.length === 1 && (
          <p className="text-[12px] text-neutral-400">
            Sign in to move this task into a workspace.
          </p>
        )}
        <SharedMoveFields
          destKey={destKey}
          onDestKeyChange={setDestKey}
          destOptions={destOptions}
          contextId={contextId}
          onContextIdChange={(id) => {
            setContextId(id);
            setGroupId("");
          }}
          contextOptions={contextOptions}
          hierarchyLoading={hierarchy.isLoading}
        >
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-neutral-400">
              Group
            </label>
            <Select
              value={groupId}
              onChange={setGroupId}
              options={[{ value: "", label: "No group" }, ...groupOptions]}
            />
          </div>
        </SharedMoveFields>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!contextId || moveTask.isPending}
            onClick={() => void handleMove()}
            className="cursor-pointer rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Move
          </button>
        </div>
      </div>
    </Dialog>
  );
}

interface MoveGroupDialogProps {
  open: boolean;
  group: Group | null;
  onClose: () => void;
  onMoved: (result: { crossedScope: boolean; moved: boolean }) => void;
}

export function MoveGroupDialog({
  open,
  group,
  onClose,
  onMoved,
}: MoveGroupDialogProps) {
  const { user, isSignedIn } = useAuth();
  const currentKey = useCurrentDestKey();
  const { data: workspaces = [] } = useWorkspaces(user?.id);
  const moveGroup = useMoveGroup();

  const [destKey, setDestKey] = useState(currentKey);
  const [contextId, setContextId] = useState(group?.context_id ?? "");

  const destWorkspaceId = useDestWorkspaceId(destKey);
  const hierarchy = useMoveHierarchy(destWorkspaceId, open);

  useEffect(() => {
    if (!open || !group) return;
    setDestKey(currentKey);
    setContextId(group.context_id);
  }, [open, group?.id, currentKey, group]);

  const destOptions = useMemo(() => {
    const team = workspaces
      .filter((ws) => !ws.is_personal)
      .map((ws) => ({ value: ws.id, label: ws.name }));
    return [{ value: PERSONAL_VALUE, label: "Personal" }, ...team];
  }, [workspaces]);

  const contexts = hierarchy.data?.contexts ?? [];

  useEffect(() => {
    if (!open || hierarchy.isLoading) return;
    if (contexts.length === 0) {
      setContextId("");
      return;
    }
    if (!contexts.some((ctx) => ctx.id === contextId)) {
      setContextId(contexts[0].id);
    }
  }, [open, hierarchy.isLoading, contexts, contextId]);

  const contextOptions = contexts.map((ctx) => ({
    value: ctx.id,
    label: ctx.name,
    color: ctx.color,
  }));

  if (!group) return null;

  const workspaceName = destOptions.find((o) => o.value === destKey)?.label;

  async function handleMove() {
    if (!group || !contextId) return;
    try {
      const result = await moveGroup.mutateAsync({
        groupId: group.id,
        dest: {
          workspaceId: destWorkspaceId,
          contextId,
        },
      });
      toastSuccess(
        result.crossedScope
          ? `Moved "${group.name}" to ${destLabel(destKey, workspaceName)}.`
          : `Updated location for "${group.name}".`,
      );
      onMoved(result);
      onClose();
    } catch (error) {
      toastError(
        error instanceof Error ? error.message : "Could not move group.",
      );
    }
  }

  return (
    <Dialog open={open} title="Move group" onClose={onClose}>
      <div className="space-y-4">
        {!isSignedIn && destOptions.length === 1 && (
          <p className="text-[12px] text-neutral-400">
            Sign in to move this group into a workspace.
          </p>
        )}
        <SharedMoveFields
          destKey={destKey}
          onDestKeyChange={setDestKey}
          destOptions={destOptions}
          contextId={contextId}
          onContextIdChange={setContextId}
          contextOptions={contextOptions}
          hierarchyLoading={hierarchy.isLoading}
        />
        <p className="text-[12px] text-neutral-400">
          All tasks in this group move with it.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!contextId || moveGroup.isPending}
            onClick={() => void handleMove()}
            className="cursor-pointer rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Move
          </button>
        </div>
      </div>
    </Dialog>
  );
}
