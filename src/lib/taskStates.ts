import type { TaskState } from "../types";

export const TASK_COLUMNS: { key: TaskState; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "testing", label: "Testing" },
  { key: "done", label: "Done" },
];

export const STATE_LABELS: Record<TaskState, string> = {
  todo: "To do",
  in_progress: "In progress",
  testing: "Testing",
  done: "Done",
};

export function nextTaskState(current: TaskState): TaskState {
  switch (current) {
    case "todo":
      return "in_progress";
    case "in_progress":
      return "testing";
    case "testing":
      return "done";
    default:
      return "todo";
  }
}

export function taskStateCheckboxClass(state: TaskState): string {
  switch (state) {
    case "done":
      return "border-[#1D9E75] bg-[#1D9E75] after:block after:h-1 after:w-1.5 after:-translate-y-px after:rotate-[-45deg] after:border-b-[1.5px] after:border-l-[1.5px] after:border-white after:content-['']";
    case "in_progress":
      return "border-[#378ADD] bg-[#E6F1FB] dark:border-[#E6F1FB] dark:bg-[#378ADD]";
    case "testing":
      return "border-[#7F77DD] bg-[#EEEDFE] dark:border-[#EEEDFE] dark:bg-[#7F77DD]";
    default:
      return "border-neutral-300 dark:border-neutral-600";
  }
}
