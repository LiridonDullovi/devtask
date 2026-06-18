import { getSupabase } from "./supabase";

export const WORKSPACE_ASSETS_BUCKET = "workspace-assets";

/** Markdown token prefix for private storage objects (resolved at render time). */
export const DEVTASK_ASSET_PREFIX = "devtask-asset:";

const SIGNED_URL_TTL_SEC = 60 * 60 * 24 * 7;

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export function isDevtaskAssetUrl(src: string | undefined): boolean {
  return Boolean(src?.startsWith(DEVTASK_ASSET_PREFIX));
}

export function devtaskAssetPath(src: string): string {
  return src.slice(DEVTASK_ASSET_PREFIX.length);
}

export function devtaskAssetMarkdown(path: string, alt: string): string {
  return `![${alt}](${DEVTASK_ASSET_PREFIX}${path})`;
}

export async function uploadWorkspaceImage(
  workspaceId: string,
  taskId: string,
  file: File,
): Promise<string> {
  const ext = extensionForMime(file.type);
  const path = `${workspaceId}/${taskId}/${crypto.randomUUID()}.${ext}`;
  const supabase = getSupabase();

  const { error } = await supabase.storage
    .from(WORKSPACE_ASSETS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw error;

  return devtaskAssetMarkdown(path, file.name || "image");
}

export async function getSignedWorkspaceAssetUrl(
  path: string,
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(WORKSPACE_ASSETS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error("Could not resolve image URL.");
  return data.signedUrl;
}
