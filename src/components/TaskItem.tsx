import type { Context, Group, Task } from "../types";
import { groupBadgeStyle, groupDisplayColor } from "../lib/colors";
import { formatTaskDateRange, isTaskOverdue } from "../lib/taskDates";
import { taskStateCheckboxClass } from "../lib/taskStates";

interface TaskItemProps {
  task: Task;
  context?: Context;
  group?: Group;
  assigneeLabel?: string;
  parentTitle?: string | null;
  childProgress?: { done: number; total: number } | null;
  showStateBadge?: boolean;
  selected: boolean;
  onSelect: () => void;
  onCycleState: () => void;
}

export function TaskItem({
  task,
  context,
  group,
  assigneeLabel,
  parentTitle,
  childProgress,
  showStateBadge = true,
  selected,
  onSelect,
  onCycleState,
}: TaskItemProps) {
  const isDone = task.state === "done";
  const isInProgress = task.state === "in_progress";
  const isTesting = task.state === "testing";
  const overdue = isTaskOverdue(task);
  const dateLabel = formatTaskDateRange(task);
  const contextName = context?.name.toLowerCase() ?? "work";
  const contextColor = context?.color ?? "#378ADD";
  const groupColor = group
    ? groupDisplayColor(group.color, context?.color ?? "#378ADD")
    : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
        if (e.key === " ") {
          e.preventDefault();
          onCycleState();
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 ${
        selected
          ? "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
          : "border-transparent hover:border-neutral-200 hover:bg-neutral-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
      }`}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onCycleState();
        }}
        aria-label={`Mark "${task.title}" ${isDone ? "not done" : isTesting ? "done" : isInProgress ? "testing" : "in progress"}`}
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${taskStateCheckboxClass(task.state)}`}
      />

      <div className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13px] ${
            isDone
              ? "text-neutral-400 line-through dark:text-neutral-500"
              : "text-neutral-900 dark:text-neutral-100"
          }`}
        >
          {task.title}
        </span>
        {parentTitle && (
          <span className="mt-0.5 block truncate text-[11px] text-neutral-400">
            ↳ {parentTitle}
          </span>
        )}
        {dateLabel && (
          <span
            className={`mt-0.5 block truncate text-[11px] ${
              overdue
                ? "text-[#BA7517] dark:text-[#EF9F27]"
                : "text-neutral-400"
            }`}
          >
            {dateLabel}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {childProgress && childProgress.total > 0 && (
          <span
            className="tabular-nums rounded-[10px] bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
            title={`${childProgress.done} of ${childProgress.total} subtasks done`}
          >
            {childProgress.done}/{childProgress.total}
          </span>
        )}
        {assigneeLabel && (
          <span
            className="max-w-[6rem] truncate rounded-[10px] bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            title={`Assigned to ${assigneeLabel}`}
          >
            {assigneeLabel}
          </span>
        )}
        {group && groupColor && (
          <span
            className="max-w-[7rem] truncate rounded-[10px] px-2 py-0.5 text-[11px]"
            style={groupBadgeStyle(groupColor)}
            title={group.name}
          >
            {group.name}
          </span>
        )}
        <span
          className="rounded-[10px] px-2 py-0.5 text-[11px]"
          style={groupBadgeStyle(contextColor)}
        >
          {contextName}
        </span>
      </div>

      {showStateBadge && isInProgress && (
        <span className="shrink-0 rounded-[10px] bg-[#E6F1FB] px-[7px] py-0.5 text-[10px] text-[#185FA5]">
          in progress
        </span>
      )}

      {showStateBadge && isTesting && (
        <span className="shrink-0 rounded-[10px] bg-[#EEEDFE] px-[7px] py-0.5 text-[10px] text-[#534AB7]">
          testing
        </span>
      )}
    </div>
  );
}
