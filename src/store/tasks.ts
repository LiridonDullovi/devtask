import { create } from "zustand";

const LAST_CONTEXT_KEY = "devtask-last-context";

function readLastContextId(): string {
  try {
    return localStorage.getItem(LAST_CONTEXT_KEY) ?? "";
  } catch {
    return "";
  }
}

interface TasksStore {
  selectedTaskId: string | null;
  lastUsedContextId: string;
  setSelectedTaskId: (id: string | null) => void;
  setLastUsedContextId: (id: string) => void;
}

export const useTasksStore = create<TasksStore>((set) => ({
  selectedTaskId: null,
  lastUsedContextId: readLastContextId(),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setLastUsedContextId: (id) => {
    try {
      localStorage.setItem(LAST_CONTEXT_KEY, id);
    } catch {
      /* ignore quota / private mode */
    }
    set({ lastUsedContextId: id });
  },
}));
