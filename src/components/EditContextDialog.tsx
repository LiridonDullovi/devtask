import { useEffect, useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { Dialog } from "./Dialog";
import { MarkdownDescriptionField } from "./MarkdownDescriptionField";
import { PRESET_COLORS } from "../lib/colors";
import { useUpdateContext } from "../hooks/useContexts";
import type { Context } from "../types";
import { toastSuccess } from "../store/toast";

interface EditContextDialogProps {
  open: boolean;
  context: Context | null;
  onClose: () => void;
}

export function EditContextDialog({
  open,
  context,
  onClose,
}: EditContextDialogProps) {
  const updateContext = useUpdateContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PRESET_COLORS[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open || !context) return;
    setName(context.name);
    setColor(context.color);
    setDescription(context.description ?? "");
  }, [open, context?.id, context?.name, context?.color, context?.description]);

  if (!context) return null;

  const currentContext = context;
  const trimmed = name.trim();
  const unchanged =
    trimmed === currentContext.name &&
    color === currentContext.color &&
    description === (currentContext.description ?? "");

  function handleClose() {
    onClose();
  }

  async function handleSave() {
    if (!trimmed) return;

    await updateContext.mutateAsync({
      contextId: currentContext.id,
      name: trimmed,
      color,
      description,
    });
    toastSuccess(`Updated context "${trimmed}".`);
    handleClose();
  }

  return (
    <Dialog open={open} title="Edit context" onClose={handleClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] text-neutral-500">
            Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trimmed && !unchanged) {
                void handleSave();
              }
            }}
            placeholder="e.g. Work"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-600"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12px] text-neutral-500">
            Color
          </label>
          <ColorPicker
            value={color}
            inheritColor={PRESET_COLORS[0]}
            onChange={(c) => setColor(c ?? PRESET_COLORS[0])}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] text-neutral-500">
            Description
          </label>
          <MarkdownDescriptionField
            value={description}
            onChange={setDescription}
            placeholder="What is this context for?"
            rows={4}
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
            disabled={!trimmed || unchanged || updateContext.isPending}
            onClick={() => void handleSave()}
            className="cursor-pointer rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Save
          </button>
        </div>
      </div>
    </Dialog>
  );
}
