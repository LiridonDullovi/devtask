import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { register } from "@tauri-apps/plugin-global-shortcut";
import { archiveOldDoneTasks } from "./db/queries";
import { CommandPalette } from "./components/CommandPalette";
import { SetupWizard } from "./components/SetupWizard";
import { Sidebar } from "./components/Sidebar";
import { useContexts } from "./hooks/useContexts";
import { useSetupStatus } from "./hooks/useSetup";
import {
  useCycleTaskState,
  useToggleTaskToday,
} from "./hooks/useTasks";
import { showCaptureWindow } from "./lib/captureWindow";
import { getErrorMessage } from "./lib/errors";
import { showDueTasksReminderIfNeeded } from "./lib/notifications";
import { useContextsStore } from "./store/contexts";
import { useTasksStore } from "./store/tasks";
import { toastError } from "./store/toast";
import { AllTasks } from "./views/AllTasks";
import { ContextView } from "./views/ContextView";
import { GroupView } from "./views/GroupView";
import { SettingsView } from "./views/SettingsView";
import { TaskView } from "./views/TaskView";
import { Today } from "./views/Today";

function App() {
  const queryClient = useQueryClient();
  const {
    activeView,
    activeTaskId,
    setView,
    setContext,
    backFromTask,
    backToContext,
    openTask,
  } = useContextsStore();
  const {
    selectedTaskId,
    setSelectedTaskId,
    setLastUsedContextId,
  } = useTasksStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const cycleState = useCycleTaskState();
  const toggleToday = useToggleTaskToday();
  const { data: contexts = [] } = useContexts();
  const { data: setupComplete, isLoading: setupLoading } = useSetupStatus();

  const openCapture = () => void showCaptureWindow();
  const taskIdForShortcuts = activeView === "task" ? activeTaskId : selectedTaskId;
  const showMainApp = setupComplete === true;

  useEffect(() => {
    if (!showMainApp || contexts.length === 0) return;
    const { lastUsedContextId } = useTasksStore.getState();
    if (!contexts.some((c) => c.id === lastUsedContextId)) {
      setLastUsedContextId(contexts[0].id);
    }
  }, [contexts, setLastUsedContextId, showMainApp]);

  useEffect(() => {
    if (!showMainApp) return;
    void archiveOldDoneTasks().catch((error) => {
      toastError(getErrorMessage(error));
    });
    void showDueTasksReminderIfNeeded().catch(console.error);
  }, [showMainApp]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("task-created", () => {
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [queryClient]);

  useEffect(() => {
    const SHORTCUT = "CommandOrControl+Shift+Space";
    let registered = false;
    void (async () => {
      try {
        await register(SHORTCUT, (event) => {
          if (event.state === "Pressed") {
            void showCaptureWindow().catch(console.error);
          }
        });
        registered = true;
      } catch (e) {
        console.error("Failed to register global shortcut:", e);
      }
    })();
    return () => {
      if (registered) {
        void import("@tauri-apps/plugin-global-shortcut")
          .then(({ unregister }) => unregister(SHORTCUT))
          .catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const num = Number(e.key);
      if (num >= 1 && num <= 9) {
        const ctx = contexts[num - 1];
        if (ctx) {
          setContext(ctx.id);
          setLastUsedContextId(ctx.id);
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "t":
          setView("today");
          break;
        case "a":
          setView("all");
          break;
        case "n":
          e.preventDefault();
          openCapture();
          break;
        case "enter":
          if (selectedTaskId && activeView !== "task") {
            e.preventDefault();
            openTask(selectedTaskId);
          }
          break;
        case " ":
          if (taskIdForShortcuts) {
            e.preventDefault();
            cycleState.mutate(taskIdForShortcuts);
          }
          break;
        case "m":
          if (taskIdForShortcuts) {
            e.preventDefault();
            toggleToday.mutate(taskIdForShortcuts);
          }
          break;
        case "escape":
          if (activeView === "task") {
            backFromTask();
          } else if (activeView === "group") {
            backToContext();
          } else {
            setSelectedTaskId(null);
          }
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeView,
    backFromTask,
    backToContext,
    cycleState,
    openCapture,
    openTask,
    selectedTaskId,
    setContext,
    setLastUsedContextId,
    setSelectedTaskId,
    setView,
    taskIdForShortcuts,
    toggleToday,
    contexts,
  ]);

  if (setupLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-[13px] text-neutral-400 dark:bg-neutral-950">
        Loading…
      </div>
    );
  }

  if (!showMainApp) {
    return <SetupWizard />;
  }

  return (
    <div className="flex h-screen overflow-hidden border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {activeView === "today" && <Today onAddTask={openCapture} />}
        {activeView === "all" && <AllTasks onAddTask={openCapture} />}
        {activeView === "context" && <ContextView onAddTask={openCapture} />}
        {activeView === "group" && <GroupView onAddTask={openCapture} />}
        {activeView === "settings" && <SettingsView />}
        {activeView === "task" && <TaskView />}
      </main>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}

export default App;
