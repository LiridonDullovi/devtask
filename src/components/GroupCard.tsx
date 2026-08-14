import type { Context, GroupWithCount } from "../types";
import { plainTextFromMarkdown } from "../lib/markdown";

interface GroupCardProps {
  group: GroupWithCount;
  context: Context;
  onClick: () => void;
}

export function GroupCard({ group, context, onClick }: GroupCardProps) {
  const color = group.color ?? context.color;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-4 text-left hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-900/80"
    >
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
          {group.name}
        </span>
        <span className="ml-auto rounded-[10px] border border-neutral-200 bg-neutral-50 px-2 py-px text-[11px] text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
          {group.task_count}
        </span>
      </div>
      {group.description && (
        <p className="line-clamp-2 text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
          {plainTextFromMarkdown(group.description, 120)}
        </p>
      )}
    </button>
  );
}
