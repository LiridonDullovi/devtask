import { IconSparkles, IconSun } from "@tabler/icons-react";
import { useState } from "react";
import {
  useInitializeDemoSetup,
  useInitializeFreshSetup,
} from "../hooks/useSetup";
import { getErrorMessage } from "../lib/errors";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";
import { toastError } from "../store/toast";

export function SetupWizard() {
  const freshSetup = useInitializeFreshSetup();
  const demoSetup = useInitializeDemoSetup();
  const { setContext } = useContextsStore();
  const { setLastUsedContextId } = useTasksStore();
  const [pending, setPending] = useState<"fresh" | "demo" | null>(null);

  async function handleFresh() {
    setPending("fresh");
    try {
      const context = await freshSetup.mutateAsync();
      setLastUsedContextId(context.id);
      setContext(context.id);
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  }

  async function handleDemo() {
    setPending("demo");
    try {
      await demoSetup.mutateAsync();
      setLastUsedContextId("ctx-work");
      setContext("ctx-work");
    } catch (error) {
      toastError(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  }

  const isBusy = pending !== null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-[22px] font-medium text-neutral-900 dark:text-neutral-100">
            Welcome to DevTask
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500 dark:text-neutral-400">
            Contexts organize tasks by area — work, personal, side projects.
            How would you like to start?
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleFresh()}
            className="flex cursor-pointer flex-col items-start rounded-lg border border-neutral-200 bg-white p-5 text-left hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/60"
          >
            <IconSun
              size={20}
              className="mb-3 text-[#378ADD]"
              stroke={1.75}
            />
            <span className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
              Start fresh
            </span>
            <span className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              One <span className="font-medium">General</span> context to begin.
              Rename it anytime and add more contexts with{" "}
              <span className="font-medium">+</span> in the sidebar.
            </span>
            {pending === "fresh" && (
              <span className="mt-3 text-[12px] text-neutral-400">
                Setting up…
              </span>
            )}
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleDemo()}
            className="flex cursor-pointer flex-col items-start rounded-lg border border-neutral-200 bg-white p-5 text-left hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/60"
          >
            <IconSparkles
              size={20}
              className="mb-3 text-[#7F77DD]"
              stroke={1.75}
            />
            <span className="text-[15px] font-medium text-neutral-900 dark:text-neutral-100">
              Try with sample data
            </span>
            <span className="mt-1.5 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              Work, Personal, and Learning contexts with example tasks, groups,
              and links to explore the app.
            </span>
            {pending === "demo" && (
              <span className="mt-3 text-[12px] text-neutral-400">
                Loading sample data…
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
