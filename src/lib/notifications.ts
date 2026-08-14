import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getDueTodayTaskCount } from "../db/queries";

export async function showDueTasksReminderIfNeeded(): Promise<void> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === "granted";
  }
  if (!granted) return;

  const count = await getDueTodayTaskCount();
  if (count === 0) return;

  sendNotification({
    title: "DevTask",
    body:
      count === 1
        ? "You have 1 task due today."
        : `You have ${count} tasks due today.`,
  });
}
