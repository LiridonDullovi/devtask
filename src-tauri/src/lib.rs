use tauri_plugin_sql::{Migration, MigrationKind};

const MIGRATION_1: &str = "
  CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    notes TEXT,
    context_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'todo',
    is_today INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (context_id) REFERENCES contexts(id)
  );

";

const MIGRATION_2: &str = "
  SELECT 1;
";

const MIGRATION_3: &str = "
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    context_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    position INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (context_id) REFERENCES contexts(id)
  );

  CREATE TABLE IF NOT EXISTS group_links (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    label TEXT,
    url TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  ALTER TABLE tasks ADD COLUMN group_id TEXT REFERENCES groups(id);
  ALTER TABLE tasks RENAME COLUMN notes TO description;
";

const MIGRATION_4: &str = "
  SELECT 1;
";

const MIGRATION_5: &str = "
  ALTER TABLE group_links ADD COLUMN kind TEXT NOT NULL DEFAULT 'url';
";

const MIGRATION_6: &str = "
  ALTER TABLE tasks ADD COLUMN start_date TEXT;
  ALTER TABLE tasks ADD COLUMN end_date TEXT;
";

const MIGRATION_7: &str = "
  ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE tasks ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none';
";

const MIGRATION_8: &str = "
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT INTO app_settings (key, value)
  SELECT 'setup_completed',
    CASE WHEN EXISTS (SELECT 1 FROM contexts LIMIT 1) THEN '1' ELSE '0' END;
";

const MIGRATION_9: &str = "
  ALTER TABLE contexts ADD COLUMN description TEXT;
";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: MIGRATION_1,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_demo_tasks",
            sql: MIGRATION_2,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_groups_and_task_group_id",
            sql: MIGRATION_3,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "seed_demo_groups",
            sql: MIGRATION_4,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_group_link_kind",
            sql: MIGRATION_5,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_task_start_and_end_dates",
            sql: MIGRATION_6,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_task_position_and_recurrence",
            sql: MIGRATION_7,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "add_app_settings_and_setup_flag",
            sql: MIGRATION_8,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "add_context_description",
            sql: MIGRATION_9,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:devtask.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
