import type { ActiveView } from "../types";

const CAPTURE_NAV_KEY = "devtask-capture-nav";

export interface CaptureNavState {
  activeView: ActiveView;
  activeContextId: string | null;
  activeGroupId: string | null;
}

const DEFAULT_CAPTURE_NAV: CaptureNavState = {
  activeView: "today",
  activeContextId: null,
  activeGroupId: null,
};

export function readCaptureNav(): CaptureNavState {
  try {
    const raw = localStorage.getItem(CAPTURE_NAV_KEY);
    if (!raw) return { ...DEFAULT_CAPTURE_NAV };
    const parsed = JSON.parse(raw) as Partial<CaptureNavState>;
    return {
      activeView: parsed.activeView ?? DEFAULT_CAPTURE_NAV.activeView,
      activeContextId: parsed.activeContextId ?? null,
      activeGroupId: parsed.activeGroupId ?? null,
    };
  } catch {
    return { ...DEFAULT_CAPTURE_NAV };
  }
}

export function writeCaptureNav(state: CaptureNavState): void {
  try {
    localStorage.setItem(CAPTURE_NAV_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

/** Sync main-window navigation so the capture window picks the right context/group. */
export function publishCaptureNav(state: CaptureNavState): void {
  writeCaptureNav(state);
}
