import Database from "@tauri-apps/plugin-sql";

export async function seedDemoData(database: Database): Promise<void> {
  await database.execute(
    `INSERT OR IGNORE INTO contexts (id, name, color, position, created_at) VALUES
      ('ctx-work',     'Work',     '#378ADD', 0, datetime('now')),
      ('ctx-personal', 'Personal', '#1D9E75', 1, datetime('now')),
      ('ctx-learning', 'Learning', '#7F77DD', 2, datetime('now'))`,
  );

  await database.execute(
    `INSERT OR IGNORE INTO groups (id, context_id, name, description, color, position, created_at, updated_at) VALUES
      ('grp-devtask', 'ctx-work',     'DevTask App', 'Local-first task manager for developers', NULL, 0, datetime('now'), datetime('now')),
      ('grp-api',     'ctx-work',     'API Platform', 'Backend services and integrations', NULL, 1, datetime('now'), datetime('now')),
      ('grp-home',    'ctx-personal', 'Home & Life',  'Personal errands and home projects', NULL, 0, datetime('now'), datetime('now')),
      ('grp-rust',    'ctx-learning', 'Rust Study',   'Learning Rust and systems programming', NULL, 0, datetime('now'), datetime('now'))`,
  );

  await database.execute(
    `INSERT OR IGNORE INTO group_links (id, group_id, label, url, kind, position) VALUES
      ('link-devtask-repo', 'grp-devtask', 'Repo',    'https://github.com/example/devtask', 0, 'url'),
      ('link-devtask-docs', 'grp-devtask', 'Docs',    'https://v2.tauri.app',               1, 'url'),
      ('link-api-staging',  'grp-api',     'Staging', 'https://staging.example.com',        0, 'url'),
      ('link-rust-book',    'grp-rust',    'Book',    'https://doc.rust-lang.org/book/',    0, 'url')`,
  );

  await database.execute(
    `INSERT OR IGNORE INTO tasks (
       id, title, description, context_id, group_id, state, is_today,
       start_date, end_date, position, recurrence, archived_at, created_at, updated_at
     ) VALUES
      ('seed-1',  'Fix auth redirect bug on dashboard',      NULL, 'ctx-work',     'grp-devtask', 'in_progress', 1, NULL, NULL, 0, 'none', NULL, datetime('now'), datetime('now')),
      ('seed-2',  'Research Tauri v2 SQLite plugin docs',    NULL, 'ctx-learning', 'grp-devtask', 'todo',        1, NULL, NULL, 0, 'none', NULL, datetime('now'), datetime('now')),
      ('seed-3',  'Reply to client about staging env',       NULL, 'ctx-work',     'grp-api',     'todo',        1, NULL, NULL, 0, 'none', NULL, datetime('now'), datetime('now')),
      ('seed-4',  'Set up Tauri project scaffold',           NULL, 'ctx-learning', 'grp-devtask', 'done',        1, NULL, NULL, 0, 'none', NULL, datetime('now'), datetime('now')),
      ('seed-5',  'Write API integration tests',           NULL, 'ctx-work',     'grp-api',     'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-1 day'), datetime('now', '-1 day')),
      ('seed-6',  'Review PR for billing module',          NULL, 'ctx-work',     'grp-api',     'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-2 days'), datetime('now', '-2 days')),
      ('seed-7',  'Update dependency audit report',        NULL, 'ctx-work',     'grp-api',     'done',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-3 days'), datetime('now', '-3 days')),
      ('seed-8',  'Plan weekend hike route',               NULL, 'ctx-personal', 'grp-home',    'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-1 day'), datetime('now', '-1 day')),
      ('seed-9',  'Book dentist appointment',              NULL, 'ctx-personal', 'grp-home',    'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-2 days'), datetime('now', '-2 days')),
      ('seed-10', 'Organize home office cables',           NULL, 'ctx-personal', 'grp-home',    'done',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-4 days'), datetime('now', '-4 days')),
      ('seed-11', 'Read Rust ownership chapter',           NULL, 'ctx-learning', 'grp-rust',    'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-1 day'), datetime('now', '-1 day')),
      ('seed-12', 'Try TanStack Query devtools',           NULL, 'ctx-learning', 'grp-rust',    'todo',        0, NULL, NULL, 0, 'none', NULL, datetime('now', '-2 days'), datetime('now', '-2 days'))`,
  );
}
