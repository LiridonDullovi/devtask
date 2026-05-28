import type { TaskRecurrence } from "../types";

export const RECURRENCE_OPTIONS: { value: TaskRecurrence; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

export function shiftDateByRecurrence(
  date: string | null,
  recurrence: TaskRecurrence,
): string | null {
  if (!date || recurrence === "none") return date;

  const days = recurrence === "daily" ? 1 : 7;
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().slice(0, 10);
}
