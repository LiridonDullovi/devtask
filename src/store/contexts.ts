import { create } from "zustand";
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
  setView: (view) =>
    set({
      activeView: view,
      activeContextId: null,
      activeGroupId: null,
      ...clearTaskNav(),
    }),
  setContext: (id) =>
    set({
      activeView: "context",
      activeContextId: id,
      activeGroupId: null,
      ...clearTaskNav(),
    }),
  setGroup: (contextId, groupId) =>
    set({
      activeView: "group",
      activeContextId: contextId,
      activeGroupId: groupId,
      ...clearTaskNav(),
    }),
  openTask: (taskId) => {
    const state = get();
    set({
      taskReturnTo: {
        view: state.activeView,
        contextId: state.activeContextId,
        groupId: state.activeGroupId,
      },
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
      set({ activeView: "context", activeGroupId: null, ...clearTaskNav() });
    }
  },
}));
