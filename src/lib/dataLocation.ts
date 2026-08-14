import { isTauri } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";

const DB_FILENAME = "devtask.db";

export async function getDatabasePath(): Promise<string | null> {
  if (!isTauri()) return null;
  const dir = await appDataDir();
  return join(dir, DB_FILENAME);
}

export async function getDatabaseDirectory(): Promise<string | null> {
  if (!isTauri()) return null;
  return appDataDir();
}

export async function revealDatabaseInFolder(): Promise<void> {
  const path = await getDatabasePath();
  if (!path) return;

  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
  await revealItemInDir(path);
}
