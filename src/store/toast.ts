import { create } from "zustand";

export type ToastKind = "error" | "success" | "info";

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 5000;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push(kind, message) {
    const id = crypto.randomUUID();
    set({ toasts: [...get().toasts, { id, kind, message }] });
    window.setTimeout(() => get().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export function toastSuccess(message: string) {
  useToastStore.getState().push("success", message);
}

export function toastError(message: string) {
  useToastStore.getState().push("error", message);
}

export function toastInfo(message: string) {
  useToastStore.getState().push("info", message);
}
