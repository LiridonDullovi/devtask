export type TaskState = "todo" | "in_progress" | "testing" | "done";

export type TaskRecurrence = "none" | "daily" | "weekly";

export type ActiveView = "today" | "all" | "context" | "group" | "task" | "settings";

export interface Context {
  id: string;
  name: string;
  color: string;
  description: string | null;
  position: number;
  created_at: string;
}

export interface Group {
  id: string;
  context_id: string;
  name: string;
  description: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type GroupLinkKind = "url" | "folder";

export interface GroupLink {
  id: string;
  group_id: string;
  label: string | null;
  url: string;
  kind: GroupLinkKind;
  position: number;
}

export interface GroupWithCount extends Group {
  task_count: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  context_id: string;
  group_id: string | null;
  /** One-level child: set only when this task belongs to another task. */
  parent_id: string | null;
  state: TaskState;
  is_today: 0 | 1;
  start_date: string | null;
  end_date: string | null;
  position: number;
  recurrence: TaskRecurrence;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  /** Workspace tasks only — Supabase auth user id */
  assignee_id?: string | null;
  created_by_id?: string | null;
}

/** Workspace task thread comment (markdown body). */
export interface TaskComment {
  id: string;
  workspace_id: string;
  task_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseExport {
  exported_at: string;
  version: 1;
  contexts: Context[];
  groups: Group[];
  group_links: GroupLink[];
  tasks: Task[];
}
