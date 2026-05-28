import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import type { Group } from "../types";
import type { DeleteGroupMode } from "../db/queries";
import { useDeleteGroup } from "../hooks/useGroups";
import { getErrorMessage } from "../lib/errors";
import { toastError, toastSuccess } from "../store/toast";

interface DeleteGroupDialogProps {
  open: boolean;
  group: Group | null;
  taskCount: number;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteGroupDialog({
  open,
  group,
  taskCount,
  onClose,
  onDeleted,
}: DeleteGroupDialogProps) {
  const deleteGroup = useDeleteGroup();
  const [mode, setMode] = useState<DeleteGroupMode>("cascade");
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("cascade");
    setConfirmName("");
  }, [open, group?.id]);

  if (!group) return null;

  const currentGroup = group;

  const nameMatches =
    confirmName.trim().toLowerCase() === currentGroup.name.trim().toLowerCase();

  function handleClose() {
    setConfirmName("");
    onClose();
  }

  async function handleDelete() {
    if (!nameMatches) return;

    try {
      await deleteGroup.mutateAsync({ groupId: currentGroup.id, mode });

      toastSuccess(
        mode === "cascade"
          ? `Deleted "${currentGroup.name}" and its tasks.`
          : `Deleted "${currentGroup.name}" and kept its tasks ungrouped.`,
      );
      onDeleted();
      handleClose();
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} title={`Delete "${group.name}"?`} onClose={handleClose}>
      <div className="space-y-4">
        {taskCount > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
              This group still contains{" "}
              {taskCount === 1 ? "1 task" : `${taskCount} tasks`}.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-amber-800/90 dark:text-amber-400/90">
              Delete those tasks first manually, or pick an option below to
              handle them when removing the group.
            </p>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            This group has no tasks. Only the group and its links will be
            deleted.
          </p>
        )}

        {taskCount > 0 && (
          <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            This action cannot be undone. Choose what happens to the tasks
            listed above.
          </p>
        )}

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <input
              type="radio"
              name="delete-group-mode"
              checked={mode === "cascade"}
              onChange={() => setMode("cascade")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                Delete group and tasks
              </span>
              <span className="mt-0.5 block text-[12px] text-neutral-500">
                Permanently removes the group, its links, and all tasks.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <input
              type="radio"
              name="delete-group-mode"
              checked={mode === "ungroup"}
              onChange={() => setMode("ungroup")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                Delete group only
              </span>
              <span className="mt-0.5 block text-[12px] text-neutral-500">
                Remove the group and links, but keep tasks in the context
                ungrouped.
              </span>
            </span>
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] text-neutral-500">
            Type{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {group.name}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={group.name}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-600"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="cursor-pointer rounded-md px-3 py-2 text-[13px] text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!nameMatches || deleteGroup.isPending}
            onClick={() => void handleDelete()}
            className="cursor-pointer rounded-md bg-[#E24B4A] px-3 py-2 text-[13px] text-white hover:bg-[#c93f3e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete group
          </button>
        </div>
      </div>
    </Dialog>
  );
}
