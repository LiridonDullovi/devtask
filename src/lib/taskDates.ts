import type { Task } from "../types";

/** ISO date string (YYYY-MM-DD) → display label */
export function formatTaskDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTaskDateRange(task: Task): string | null {
  if (task.start_date && task.end_date) {
    return `${formatTaskDate(task.start_date)} → ${formatTaskDate(task.end_date)}`;
  }
  if (task.end_date) return `Due ${formatTaskDate(task.end_date)}`;
  if (task.start_date) return `From ${formatTaskDate(task.start_date)}`;
  return null;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.end_date || task.state === "done") return false;
  return task.end_date < todayIsoDate();
}

export function toDateInputValue(iso: string | null): string {
  return iso ?? "";
}

export function parseDateInput(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
