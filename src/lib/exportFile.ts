import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

function downloadInBrowser(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveTextExport(
  content: string,
  defaultFilename: string,
  extension: string,
  label: string,
): Promise<boolean> {
  if (!isTauri()) {
    downloadInBrowser(content, defaultFilename);
    return true;
  }

  const path = await save({
    defaultPath: defaultFilename,
    filters: [{ name: label, extensions: [extension] }],
  });

  if (!path) return false;

  await writeTextFile(path, content);
  return true;
}
