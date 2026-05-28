import { useEffect, useState } from "react";
import { Dialog } from "./Dialog";
import { Select } from "./Select";
import type { Context } from "../types";
import type { DeleteContextMode } from "../db/queries";
import { useContextDeleteSummary, useDeleteContext } from "../hooks/useContexts";
import { getErrorMessage } from "../lib/errors";
import { toastError, toastSuccess } from "../store/toast";

interface DeleteContextDialogProps {
  open: boolean;
  context: Context | null;
  otherContexts: Context[];
  onClose: () => void;
  onDeleted: () => void;
}

function formatTaskCount(count: number): string {
  return count === 1 ? "1 task" : `${count} tasks`;
}

export function DeleteContextDialog({
  open,
  context,
  otherContexts,
  onClose,
  onDeleted,
}: DeleteContextDialogProps) {
  const deleteContext = useDeleteContext();
  const { data: summary, isLoading: summaryLoading } = useContextDeleteSummary(
    context?.id ?? null,
    open,
  );
  const [mode, setMode] = useState<DeleteContextMode>("cascade");
  const [reassignTo, setReassignTo] = useState("");
  const [confirmName, setConfirmName] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode("cascade");
    setConfirmName("");
    setReassignTo(otherContexts[0]?.id ?? "");
  }, [open, context?.id, otherContexts]);

  if (!context) return null;

  const ctx = context;
  const reassignTarget = otherContexts.find((c) => c.id === reassignTo);
  const hasContent =
    !!summary &&
    (summary.groups.length > 0 || summary.totalTaskCount > 0);

  const nameMatches =
    confirmName.trim().toLowerCase() === ctx.name.trim().toLowerCase();
  const canDelete =
    nameMatches &&
    (mode === "cascade" || (mode === "reassign" && reassignTo !== ""));

  function handleClose() {
    setConfirmName("");
    onClose();
  }

  async function handleDelete() {
    if (!canDelete) return;

    try {
      await deleteContext.mutateAsync({
        contextId: ctx.id,
        mode,
        reassignToContextId: mode === "reassign" ? reassignTo : undefined,
      });

      toastSuccess(
        mode === "cascade"
          ? `Deleted "${ctx.name}" and all its groups and tasks.`
          : `Deleted "${ctx.name}" and moved its data elsewhere.`,
      );
      onDeleted();
      handleClose();
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} title={`Delete "${ctx.name}"?`} onClose={handleClose}>
      <div className="space-y-4">
        {summaryLoading ? (
          <p className="text-[13px] text-neutral-400">Checking contents…</p>
        ) : hasContent && summary ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-[13px] font-medium text-amber-900 dark:text-amber-200">
              This context still contains:
            </p>
            <ul className="mt-2 space-y-1 text-[12px] text-amber-800 dark:text-amber-300/90">
              {summary.groups.map((group) => (
                <li key={group.id}>
                  Group <span className="font-medium">{group.name}</span>
                  {group.task_count > 0 && (
                    <span className="text-amber-700/80 dark:text-amber-400/80">
                      {" "}
                      — {formatTaskCount(group.task_count)}
                    </span>
                  )}
                </li>
              ))}
              {summary.ungroupedTaskCount > 0 && (
                <li>{formatTaskCount(summary.ungroupedTaskCount)} ungrouped</li>
              )}
            </ul>
            <p className="mt-2 text-[12px] leading-relaxed text-amber-800/90 dark:text-amber-400/90">
              Delete these first manually, or pick an option below to handle
              them when removing the context.
            </p>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            This context is empty. Only the context itself will be deleted.
          </p>
        )}

        {hasContent && (
          <p className="text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            This action cannot be undone. Choose what happens to the groups and
            tasks listed above.
          </p>
        )}

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <input
              type="radio"
              name="delete-mode"
              checked={mode === "cascade"}
              onChange={() => setMode("cascade")}
              className="mt-0.5"
            />
            <span>
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                Delete context, groups, and tasks
              </span>
              <span className="mt-0.5 block text-[12px] text-neutral-500">
                Permanently removes everything in this context.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-neutral-200 p-3 dark:border-neutral-700">
            <input
              type="radio"
              name="delete-mode"
              checked={mode === "reassign"}
              onChange={() => setMode("reassign")}
              className="mt-0.5"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">
                Delete context only
              </span>
              <span className="mt-0.5 block text-[12px] text-neutral-500">
                Move groups and tasks to another context, then delete this
                one.
              </span>
              {mode === "reassign" && (
                <div className="mt-3">
                  <Select
                    value={reassignTo}
                    onChange={setReassignTo}
                    options={otherContexts.map((ctx) => ({
                      value: ctx.id,
                      label: ctx.name,
                      color: ctx.color,
                    }))}
                    placeholder="Move to…"
                  />
                  {reassignTarget && hasContent && (
                    <p className="mt-2 text-[11px] text-neutral-400">
                      Everything listed above will move to {reassignTarget.name}.
                    </p>
                  )}
                </div>
              )}
            </span>
          </label>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] text-neutral-500">
            Type{" "}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {ctx.name}
            </span>{" "}
            to confirm
          </label>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={ctx.name}
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
            disabled={!canDelete || deleteContext.isPending}
            onClick={() => void handleDelete()}
            className="cursor-pointer rounded-md bg-[#E24B4A] px-3 py-2 text-[13px] text-white hover:bg-[#c93f3e] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete context
          </button>
        </div>
      </div>
    </Dialog>
  );
}
