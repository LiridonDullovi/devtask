import { create } from "zustand";
import {
  getStoredThemeMode,
  storeThemeMode,
  type ThemeMode,
  watchSystemTheme,
} from "../lib/theme";

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: getStoredThemeMode(),
  setMode: (mode) => {
    storeThemeMode(mode);
    set({ mode });
  },
}));

export function subscribeToSystemTheme(): () => void {
  return watchSystemTheme(() => {
    const { mode } = useThemeStore.getState();
    if (mode === "system") {
      storeThemeMode("system");
    }
  });
}
