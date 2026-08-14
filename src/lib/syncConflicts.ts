import { toastInfo } from "../store/toast";

let lastConflictToastAt = 0;
const CONFLICT_TOAST_COOLDOWN_MS = 8000;

/** User-visible notice when cloud wins over a local edit. Debounced to avoid spam. */
export function notifySyncConflict(detail?: string): void {
  const now = Date.now();
  if (now - lastConflictToastAt < CONFLICT_TOAST_COOLDOWN_MS) return;
  lastConflictToastAt = now;
  window.dispatchEvent(new CustomEvent("devtask-sync-conflict"));
  toastInfo(
    detail ??
      "A teammate's changes were kept. Your edit was not saved — review and re-apply if needed.",
  );
}
