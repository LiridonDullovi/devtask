import type { Context, Group } from "../types";
import type { WorkspaceSummary } from "../types/workspace";
import { normalizeTag } from "./parseCapture";

export type MentionTrigger = "context" | "group" | "workspace";

export interface ActiveMention {
  type: MentionTrigger;
  query: string;
  start: number;
  end: number;
}

export type MentionSuggestionAction = "create-group";

export interface MentionSuggestion {
  id: string;
  label: string;
  tag: string;
  color?: string;
  subtitle?: string;
  action?: MentionSuggestionAction;
  createName?: string;
  disabled?: boolean;
}

export function getActiveMention(
  value: string,
  cursor: number,
): ActiveMention | null {
  const before = value.slice(0, cursor);
  const hashMatch = before.match(/#([\w-]*)$/);
  if (hashMatch) {
    return {
      type: "context",
      query: hashMatch[1],
      start: cursor - hashMatch[0].length,
      end: cursor,
    };
  }

  const atMatch = before.match(/@([\w-]*)$/);
  if (atMatch) {
    return {
      type: "group",
      query: atMatch[1],
      start: cursor - atMatch[0].length,
      end: cursor,
    };
  }

  const dollarMatch = before.match(/\$([\w-]*)$/);
  if (dollarMatch) {
    return {
      type: "workspace",
      query: dollarMatch[1],
      start: cursor - dollarMatch[0].length,
      end: cursor,
    };
  }

  return null;
}

function matchesQuery(label: string, query: string): boolean {
  if (!query) return true;
  const q = normalizeTag(query);
  const nameNorm = normalizeTag(label);
  return (
    nameNorm.includes(q) ||
    label.toLowerCase().includes(query.toLowerCase())
  );
}

export function getContextMentionSuggestions(
  contexts: Context[],
  query: string,
): MentionSuggestion[] {
  return contexts
    .filter((ctx) => matchesQuery(ctx.name, query))
    .slice(0, 8)
    .map((ctx) => ({
      id: ctx.id,
      label: ctx.name,
      tag: normalizeTag(ctx.name),
      color: ctx.color,
    }));
}

export function getGroupMentionSuggestions(
  groups: Group[],
  query: string,
  contextName?: string,
  contextColor?: string,
): MentionSuggestion[] {
  const trimmedQuery = query.trim();

  const matched: MentionSuggestion[] = groups
    .filter((group) => matchesQuery(group.name, query))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((group) => ({
      id: group.id,
      label: group.name,
      tag: normalizeTag(group.name),
      color: group.color ?? contextColor,
    }));

  if (matched.length === 0 && !trimmedQuery) {
    return [
      {
        id: "__hint__",
        label: contextName
          ? `No groups in ${contextName}`
          : "No groups in this context",
        tag: "",
        subtitle: "Type a name after @ to create one",
        disabled: true,
      },
    ];
  }

  const exactMatch = matched.some(
    (item) => normalizeTag(item.label) === normalizeTag(trimmedQuery),
  );
  if (trimmedQuery && !exactMatch) {
    matched.push({
      id: "__create__",
      label: `Create "${trimmedQuery}"`,
      tag: normalizeTag(trimmedQuery),
      action: "create-group",
      createName: trimmedQuery,
      color: contextColor,
      subtitle: contextName,
    });
  }

  return matched.slice(0, 8);
}

export function getWorkspaceMentionSuggestions(
  workspaces: WorkspaceSummary[],
  query: string,
  isSignedIn: boolean,
): MentionSuggestion[] {
  const personal: MentionSuggestion = {
    id: "__personal__",
    label: "Personal",
    tag: "personal",
    subtitle: "Local only on this device",
  };

  const matched = workspaces
    .filter((ws) => matchesQuery(ws.name, query))
    .map((ws) => ({
      id: ws.id,
      label: ws.name,
      tag: normalizeTag(ws.name),
      subtitle: "Team workspace",
    }));

  if (matched.length === 0 && !query.trim()) {
    if (!isSignedIn) {
      return [
        personal,
        {
          id: "__hint__",
          label: "Sign in for team workspaces",
          tag: "",
          subtitle: "Settings → Team workspace",
          disabled: true,
        },
      ];
    }
    if (workspaces.length === 0) {
      return [
        personal,
        {
          id: "__hint__",
          label: "No workspaces yet",
          tag: "",
          subtitle: "Create one in the header menu",
          disabled: true,
        },
      ];
    }
  }

  const items = [personal, ...matched];
  const q = normalizeTag(query);
  if (
    query.trim() &&
    q !== "personal" &&
    !matched.some((m) => normalizeTag(m.label) === q)
  ) {
    items.push({
      id: "__nomatch__",
      label: `No workspace matching "${query.trim()}"`,
      tag: "",
      disabled: true,
    });
  }

  return items.slice(0, 8);
}

export function applyMentionSelection(
  value: string,
  mention: ActiveMention,
  tag: string,
): { nextValue: string; nextCursor: number } {
  const prefix =
    mention.type === "context"
      ? "#"
      : mention.type === "group"
        ? "@"
        : "$";
  const insert = `${prefix}${tag} `;
  const nextValue =
    value.slice(0, mention.start) + insert + value.slice(mention.end);
  return { nextValue, nextCursor: mention.start + insert.length };
}
