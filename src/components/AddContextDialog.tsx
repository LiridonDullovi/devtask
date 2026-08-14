import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import { Dialog } from "./Dialog";
import { PRESET_COLORS } from "../lib/colors";
import { useCreateContext } from "../hooks/useContexts";
import { toastSuccess } from "../store/toast";

interface AddContextDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (contextId: string) => void;
}

export function AddContextDialog({
  open,
  onClose,
  onCreated,
}: AddContextDialogProps) {
  const createContext = useCreateContext();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(PRESET_COLORS[0]);

  function reset() {
    setName("");
    setColor(PRESET_COLORS[0]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || color === null) return;

    const created = await createContext.mutateAsync({
      name: trimmed,
      color,
    });
    toastSuccess(`Created context "${created.name}".`);
    onCreated?.(created.id);
    handleClose();
  }

  return (
    <Dialog open={open} title="New context" onClose={handleClose}>
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
              if (e.key === "Enter") void handleCreate();
            }}
            placeholder="e.g. Side projects"
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
            inheritLabel="Default blue"
            onChange={(c) => setColor(c ?? PRESET_COLORS[0])}
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
            disabled={!name.trim() || createContext.isPending}
            onClick={() => void handleCreate()}
            className="cursor-pointer rounded-md bg-neutral-900 px-3 py-2 text-[13px] text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Create context
          </button>
        </div>
      </div>
    </Dialog>
  );
}
