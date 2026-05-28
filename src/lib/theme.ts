export type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "devtask-theme";

export function getStoredThemeMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
}

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyThemeMode(mode: ThemeMode): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveDark(mode));
  root.dataset.theme = mode;
}

export function storeThemeMode(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  applyThemeMode(mode);
}

export function initTheme(): ThemeMode {
  const mode = getStoredThemeMode();
  applyThemeMode(mode);
  return mode;
}

export function watchSystemTheme(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
