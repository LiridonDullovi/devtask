import { IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface ToolbarAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  icon?: "plus" | "trash" | "pencil" | "none";
}

interface ViewToolbarProps {
  title: string;
  actions?: ToolbarAction[];
  /** @deprecated use actions */
  actionLabel?: string;
  /** @deprecated use actions */
  onAction?: () => void;
}

function ActionIcon({ icon }: { icon: ToolbarAction["icon"] }) {
  if (icon === "none") return null;
  if (icon === "trash") {
    return <IconTrash size={14} stroke={1.75} />;
  }
  if (icon === "pencil") {
    return <IconPencil size={14} stroke={1.75} />;
  }
  return <IconPlus size={14} stroke={1.75} />;
}

export function ViewToolbar({
  title,
  actions,
  actionLabel,
  onAction,
}: ViewToolbarProps) {
  const resolvedActions =
    actions ??
    (onAction ? [{ label: actionLabel ?? "Add task", onClick: onAction }] : []);

  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5 dark:border-neutral-800">
      <span className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </span>
      {resolvedActions.length > 0 && (
        <div className="flex items-center gap-2">
          {resolvedActions.map((action) => (
            <ToolbarButton key={action.label} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ action }: { action: ToolbarAction }) {
  const isDanger = action.variant === "danger";
  const icon = action.icon ?? (isDanger ? "trash" : "plus");

  return (
    <button
      type="button"
      onClick={action.onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] ${
        isDanger
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      <ActionIcon icon={icon} />
      {action.label}
    </button>
  );
}

export function ViewToolbarTitle({ children }: { children: ReactNode }) {
  return (
    <span className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
      {children}
    </span>
  );
}
