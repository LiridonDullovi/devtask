/** Compare ISO timestamps for last-write-wins sync. */
export function syncTimeMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** True when `a` is strictly newer than `b`. */
export function isSyncNewer(a: string, b: string): boolean {
  return syncTimeMs(a) > syncTimeMs(b);
}

/** True when `a` is newer than or equal to `b`. */
export function isSyncNewerOrEqual(a: string, b: string): boolean {
  return syncTimeMs(a) >= syncTimeMs(b);
}
