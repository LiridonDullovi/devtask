# DevTask

A local-first, keyboard-driven task manager for developers. Built with [Tauri](https://tauri.app) v2, React, and TypeScript.

- **Fully local by default** — SQLite on your machine, no account, no internet required.
- **Instant capture** — a global hotkey (`Cmd/Ctrl+Shift+Space`) drops a task into your list from anywhere, in one line.
- **Context → Group → Task** — a simple three-level hierarchy instead of freeform tags: fixed top-level contexts (e.g. Work, Personal, Learning), optional groups within each, tasks in either.
- **Keyboard-driven throughout** — capture, navigate, and change task state without touching the mouse.
- **Optional cloud sync** — sign in to sync your own tasks across your own devices, or connect a Workspace to collaborate with a team (comments, assignees, realtime updates), backed by your own Supabase project.

## Getting started

Requires [Rust](https://www.rust-lang.org/tools/install), [pnpm](https://pnpm.io), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform.

```bash
pnpm install
pnpm tauri dev
```

That's it for local-only usage — no configuration needed.

## Cloud sync (optional)

Signing in unlocks personal cross-device sync and team Workspaces, both backed by Supabase. Since this is self-hosted per user/team (no shared backend), you'll need your own free Supabase project — see [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for the full setup.

## Building

```bash
pnpm tauri build
```

Produces a native installer for your platform in `src-tauri/target/release/bundle`. See [`.github/workflows/release.yml`](.github/workflows/release.yml) for the CI pipeline that builds installers for macOS, Windows, and Linux.

## Tech stack

React 19, TypeScript, Tailwind CSS, Zustand, TanStack Query, Tauri v2 (Rust), SQLite (`tauri-plugin-sql`), Supabase (auth, Postgres, Realtime, Storage) for optional cloud sync.

## License

[MIT](LICENSE)
