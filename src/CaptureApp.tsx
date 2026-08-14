import { useEffect } from "react";
import { CaptureBar } from "./components/CaptureBar";
import { useContexts } from "./hooks/useContexts";
import { useSetupStatus } from "./hooks/useSetup";
import { hideCaptureWindow } from "./lib/captureWindow";
import {
  DEFAULT_WORKSPACE,
  getStoredCaptureWorkspace,
  getStoredDataScope,
} from "./lib/workspace";
import { useTasksStore } from "./store/tasks";
import { useWorkspaceStore } from "./store/workspace";

export function CaptureApp() {
  const { data: setupComplete, isLoading } = useSetupStatus();
  const { data: contexts = [] } = useContexts();
  const { lastUsedContextId, setLastUsedContextId } = useTasksStore();

  useEffect(() => {
    const scope = getStoredDataScope();
    const storedWorkspace = getStoredCaptureWorkspace();
    const { setScope, setWorkspace } = useWorkspaceStore.getState();

    if (scope === "workspace" && storedWorkspace) {
      setScope("workspace");
      setWorkspace({
        id: storedWorkspace.id,
        name: storedWorkspace.name,
        plan: "free",
      });
    } else {
      setScope("personal");
      setWorkspace({ ...DEFAULT_WORKSPACE });
    }
  }, []);

  useEffect(() => {
    if (isLoading || setupComplete !== true) return;
    if (contexts.length === 0) return;
    if (!contexts.some((c) => c.id === lastUsedContextId)) {
      setLastUsedContextId(contexts[0].id);
    }
  }, [contexts, isLoading, lastUsedContextId, setLastUsedContextId, setupComplete]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 text-[13px] text-neutral-400 dark:bg-neutral-950">
        Loading…
      </div>
    );
  }

  if (setupComplete !== true || contexts.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 px-4 text-center text-[13px] text-neutral-500 dark:bg-neutral-950">
        Finish setup in the main window first.
      </div>
    );
  }

  return (
    <div className="min-h-0 bg-neutral-50 dark:bg-neutral-950">
      <CaptureBar mode="floating" onDismiss={() => void hideCaptureWindow()} />
    </div>
  );
}
