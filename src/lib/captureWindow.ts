import { LogicalSize } from "@tauri-apps/api/dpi";
import { emit } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { isSetupComplete } from "../db/queries";
import { publishCaptureNav } from "./captureDefaults";
import { storeCaptureWorkspace } from "./workspace";
import { useContextsStore } from "../store/contexts";
import { useTasksStore } from "../store/tasks";
import { useWorkspaceStore } from "../store/workspace";

const CAPTURE_LABEL = "capture";
const CAPTURE_WIDTH = 560;
const CAPTURE_HEIGHT_MIN = 88;
const CAPTURE_HEIGHT_MAX = 520;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Push current main-window context/group into localStorage for the capture window. */
export function syncCaptureNavForOpen(): void {
  const { activeView, activeContextId, activeGroupId } =
    useContextsStore.getState();
  const { scope, workspace } = useWorkspaceStore.getState();

  publishCaptureNav({ activeView, activeContextId, activeGroupId });
  if (activeContextId) {
    useTasksStore.getState().setLastUsedContextId(activeContextId);
  }

  if (scope === "workspace" && workspace.id) {
    storeCaptureWorkspace(workspace);
  } else {
    storeCaptureWorkspace(null);
  }
}

export async function showCaptureWindow(): Promise<void> {
  if (!isTauri()) return;

  syncCaptureNavForOpen();

  let setup = false;
  try {
    setup = await isSetupComplete();
  } catch (e) {
    console.error("[capture] isSetupComplete failed:", e);
    return;
  }

  if (!setup) {
    try {
      const main = await WebviewWindow.getByLabel("main");
      await main?.show();
      await main?.setFocus();
    } catch (e) {
      console.error("[capture] Could not focus main window:", e);
    }
    return;
  }

  let capture: WebviewWindow | null = null;
  try {
    capture = await WebviewWindow.getByLabel(CAPTURE_LABEL);
  } catch (e) {
    console.error("[capture] getByLabel failed:", e);
    return;
  }

  if (!capture) {
    console.error(`[capture] Window "${CAPTURE_LABEL}" not found. Check tauri.conf.json.`);
    return;
  }

  try {
    await capture.center();
    await capture.show();
    await capture.setFocus();
  } catch (e) {
    console.error("[capture] show/focus failed:", e);
  }
}

export async function setCaptureWindowHeight(contentHeight: number): Promise<void> {
  if (!isTauri()) return;
  try {
    const capture = await WebviewWindow.getByLabel(CAPTURE_LABEL);
    if (!capture) return;
    const height = Math.round(
      Math.min(
        CAPTURE_HEIGHT_MAX,
        Math.max(CAPTURE_HEIGHT_MIN, contentHeight),
      ),
    );
    await capture.setSize(new LogicalSize(CAPTURE_WIDTH, height));
    await capture.center();
  } catch (e) {
    console.error("[capture] setSize failed:", e);
  }
}

export async function hideCaptureWindow(): Promise<void> {
  if (!isTauri()) return;
  try {
    const capture = await WebviewWindow.getByLabel(CAPTURE_LABEL);
    await capture?.hide();
  } catch (e) {
    console.error("[capture] hide failed:", e);
  }
}

export async function emitTaskCreated(): Promise<void> {
  if (!isTauri()) return;
  try {
    await emit("task-created");
  } catch (e) {
    console.error("[capture] emit task-created failed:", e);
  }
}
