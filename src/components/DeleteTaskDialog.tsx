import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import type { Task } from "../types";
import { useDeleteTask } from "../hooks/useTasks";
import { toastSuccess } from "../store/toast";

interface DeleteTaskDialogProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTaskDialog({
  open,
  task,
  onClose,
  onDeleted,
}: DeleteTaskDialogProps) {
  const deleteTask = useDeleteTask();
  const [confirmTitle, setConfirmTitle] = useState("");

  useEffect(() => {
    if (!open) return;
    setConfirmTitle("");
  }, [open, task?.id]);

  if (!task) return null;

  const currentTask = task;

  const titleMatches =
    confirmTitle.trim().toLowerCase() === currentTask.title.trim().toLowerCase();

  function handleClose() {
    setConfirmTitle("");
    onClose();
  }

  async function handleDelete() {
    if (!titleMatches) return;

    await deleteTask.mutateAsync(currentTask.id);
    toastSuccess(`Deleted "${currentTask.title}".`);
    onDeleted();
    handleClose();
  }

  return (
    <Dialog open={open} title={`Delete "${task.title}"?`} onClose={handleClose}>
      <div className="space-y-4">
        <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          This permanently removes the task. This action cannot be undone.
        </p>

        <div>
          <label className="mb-1.5 block text-[12px] text-neutral-500">
            Type{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {task.title}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            value={confirmTitle}
            onChange={(e) => setConfirmTitle(e.target.value)}
            placeholder={task.title}
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
            disabled={!titleMatches || deleteTask.isPending}
            onClick={() => void handleDelete()}
            className="cursor-pointer rounded-md bg-[#E24B4A] px-3 py-2 text-[13px] text-white hover:bg-[#c93f3e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete task
          </button>
        </div>
      </div>
    </Dialog>
  );
}
