import { IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import { useToastStore, type ToastKind } from "../store/toast";

const STYLES: Record<
  ToastKind,
  { container: string; icon: typeof IconCheck }
> = {
  error: {
    container:
      "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/80 dark:text-red-200",
    icon: IconX,
  },
  success: {
    container:
      "border-[#1D9E75]/30 bg-[#E1F5EE] text-[#0F6E56] dark:border-[#1D9E75]/30 dark:bg-[#0F6E56]/20 dark:text-[#E1F5EE]",
    icon: IconCheck,
  },
  info: {
    container:
      "border-neutral-200 bg-white text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200",
    icon: IconInfoCircle,
  },
};

export function ToastContainer() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const style = STYLES[toast.kind];
        const Icon = style.icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3 py-2.5 shadow-lg ${style.container}`}
          >
            <Icon size={16} stroke={1.75} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 text-[13px] leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 cursor-pointer rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <IconX size={14} stroke={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
