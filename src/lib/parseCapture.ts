import type { Context, Group } from "../types";

function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/[\s_-]+/g, "");
}

export { normalizeTag };

function matchContextByHashtag(
  tag: string,
  contexts: Context[],
): Context | undefined {
  const normalized = normalizeTag(tag);
  return contexts.find((ctx) => {
    const nameNorm = normalizeTag(ctx.name);
    const idSuffix = ctx.id.replace(/^ctx-/, "");
    return (
      nameNorm === normalized ||
      normalizeTag(idSuffix) === normalized ||
      ctx.name.toLowerCase() === tag.toLowerCase()
    );
  });
}

function matchGroupByMention(
  tag: string,
  groups: Group[],
  preferredContextId?: string,
): Group | undefined {
  const normalized = normalizeTag(tag);
  const matches = groups.filter((group) => {
    const nameNorm = normalizeTag(group.name);
    return (
      nameNorm === normalized || group.name.toLowerCase() === tag.toLowerCase()
    );
  });

  if (matches.length === 0) return undefined;
  if (preferredContextId) {
    return (
      matches.find((group) => group.context_id === preferredContextId) ??
      matches[0]
    );
  }
  return matches[0];
}

export interface ParsedCaptureInput {
  title: string;
  contextId?: string;
  groupId?: string;
}

export function parseCaptureInput(
  raw: string,
  contexts: Context[],
  groups: Group[] = [],
): ParsedCaptureInput {
  let title = raw.trim();
  let contextId: string | undefined;
  let groupId: string | undefined;

  const hashMatches = [...title.matchAll(/#(\w+)/g)];
  for (const match of hashMatches) {
    const ctx = matchContextByHashtag(match[1], contexts);
    if (ctx) {
      contextId = ctx.id;
      title = title.replace(match[0], "").trim();
      break;
    }
  }

  const mentionMatches = [...title.matchAll(/@([\w-]+)/g)];
  for (const match of mentionMatches) {
    const group = matchGroupByMention(match[1], groups, contextId);
    if (group) {
      groupId = group.id;
      contextId = group.context_id;
      title = title.replace(match[0], "").trim();
      break;
    }
  }

  return { title: title.replace(/\s+/g, " ").trim(), contextId, groupId };
}
