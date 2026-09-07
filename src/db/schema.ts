// src/db/schema.ts — canonical LOCAL schema (migrations live in src-tauri/src/lib.rs)
// Cloud workspace schema: supabase/migrations/20260528120000_workspace_schema.sql
export const SCHEMA = `
  contexts: id, name, color, description, position, created_at
  groups:   id, context_id, name, description, color, position, created_at, updated_at
  group_links: id, group_id, label, url, kind (url|folder), position
  tasks:    id, title, description, context_id, group_id, parent_id, state, is_today,
            start_date, end_date, position, recurrence (none|daily|weekly),
            archived_at, created_at, updated_at
  app_settings: key, value
`;

export const DEFAULT_CONTEXTS = `
  Demo/sample data is applied via initializeDemoSetup() — not migration seeds.
`;
