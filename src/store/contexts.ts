import { create } from "zustand";
import { publishCaptureNav } from "../lib/captureDefaults";
import type { ActiveView } from "../types";

interface TaskReturnTo {
  view: ActiveView;
  contextId: string | null;
  groupId: string | null;
}

interface ContextsStore {
  activeView: ActiveView;
  activeContextId: string | null;
  activeGroupId: string | null;
  activeTaskId: string | null;
  taskReturnTo: TaskReturnTo | null;
  setView: (view: ActiveView) => void;
  setContext: (id: string) => void;
  setGroup: (contextId: string, groupId: string) => void;
  openTask: (taskId: string) => void;
  backFromTask: () => void;
  backToContext: () => void;
}

function clearTaskNav() {
  return { activeTaskId: null as string | null, taskReturnTo: null as TaskReturnTo | null };
}

export const useContextsStore = create<ContextsStore>((set, get) => ({
  activeView: "today",
  activeContextId: null,
  activeGroupId: null,
  activeTaskId: null,
  taskReturnTo: null,
  setView: (view) => {
    const next = {
      activeView: view,
      activeContextId: null,
      activeGroupId: null,
      ...clearTaskNav(),
    };
    publishCaptureNav({
      activeView: view,
      activeContextId: null,
      activeGroupId: null,
    });
    set(next);
  },
  setContext: (id) => {
    const next = {
      activeView: "context" as const,
      activeContextId: id,
      activeGroupId: null,
      ...clearTaskNav(),
    };
    publishCaptureNav({
      activeView: "context",
      activeContextId: id,
      activeGroupId: null,
    });
    set(next);
  },
  setGroup: (contextId, groupId) => {
    const next = {
      activeView: "group" as const,
      activeContextId: contextId,
      activeGroupId: groupId,
      ...clearTaskNav(),
    };
    publishCaptureNav({
      activeView: "group",
      activeContextId: contextId,
      activeGroupId: groupId,
    });
    set(next);
  },
  openTask: (taskId) => {
    const state = get();
    const taskReturnTo =
      state.activeView === "task" && state.taskReturnTo
        ? state.taskReturnTo
        : {
            view: state.activeView,
            contextId: state.activeContextId,
            groupId: state.activeGroupId,
          };
    set({
      taskReturnTo,
      activeView: "task",
      activeTaskId: taskId,
    });
  },
  backFromTask: () => {
    const { taskReturnTo } = get();
    if (!taskReturnTo) {
      set({ activeView: "today", ...clearTaskNav() });
      return;
    }
    set({
      activeView: taskReturnTo.view,
      activeContextId: taskReturnTo.contextId,
      activeGroupId: taskReturnTo.groupId,
      ...clearTaskNav(),
    });
  },
  backToContext: () => {
    const { activeContextId } = get();
    if (activeContextId) {
      publishCaptureNav({
        activeView: "context",
        activeContextId,
        activeGroupId: null,
      });
      set({ activeView: "context", activeGroupId: null, ...clearTaskNav() });
    }
  },
}));
