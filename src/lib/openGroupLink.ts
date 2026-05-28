import { isTauri } from "@tauri-apps/api/core";
import type { GroupLink, GroupLinkKind } from "../types";

export type { GroupLinkKind };

function resolveLinkKind(link: GroupLink): GroupLinkKind {
  if (link.kind === "folder" || link.kind === "url") return link.kind;
  if (
    link.url.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(link.url) ||
    link.url.startsWith("file://")
  ) {
    return "folder";
  }
  return "url";
}

function normalizeFolderPath(url: string): string {
  if (url.startsWith("file://")) {
    try {
      return decodeURIComponent(new URL(url).pathname);
    } catch {
      return url.replace(/^file:\/\//, "");
    }
  }
  return url;
}

export async function openGroupLink(link: GroupLink): Promise<void> {
  const kind = resolveLinkKind(link);

  if (kind === "folder") {
    const path = normalizeFolderPath(link.url);

    if (!isTauri()) {
      console.warn("Folder links require the Tauri desktop app:", path);
      return;
    }

    const { revealItemInDir, openPath } = await import(
      "@tauri-apps/plugin-opener"
    );

    try {
      await revealItemInDir(path);
    } catch {
      await openPath(path);
    }
    return;
  }

  if (!isTauri()) {
    window.open(link.url, "_blank", "noopener,noreferrer");
    return;
  }

  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(link.url);
}

export async function pickFolder(): Promise<string | null> {
  if (!isTauri()) return null;

  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ directory: true, multiple: false });
  if (selected === null) return null;
  return typeof selected === "string" ? selected : null;
}

export function linkKindLabel(kind: GroupLinkKind): string {
  return kind === "folder" ? "Folder" : "Website";
}
