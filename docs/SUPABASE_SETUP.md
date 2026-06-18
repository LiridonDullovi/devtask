# Supabase setup — Workspaces & teams (v1)

DevTask uses **local SQLite** for Personal mode. **Workspace mode** will sync team data through Supabase. Personal cloud sync across your own devices is planned for later.

## 1. Create the Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a region close to your users.
3. Save the database password somewhere safe.
4. From **Project Settings → API**, copy:
   - **Project URL**
   - **anon public** key (safe in the desktop app with RLS)

Do **not** put the `service_role` key in the Tauri app.

## 2. Run the schema migration

Open **SQL Editor** in the dashboard and run these migrations **in order**:

1. `supabase/migrations/20260528120000_workspace_schema.sql`
2. `supabase/migrations/20260528130000_fix_workspace_create.sql` — required for creating workspaces from the app
3. `supabase/migrations/20260528140000_workspace_members_invite.sql` — invite/list/remove members by email
4. `supabase/migrations/20260528150000_task_assignee.sql` — task assignee + creator columns
5. `supabase/migrations/20260528160000_task_comments.sql` — task comment threads
6. `supabase/migrations/20260528170000_workspace_storage.sql` — private image bucket for markdown

Or, if you use the Supabase CLI linked to this repo:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

That migration creates:

| Area | Tables |
|------|--------|
| Auth | `profiles` (auto-created on signup) |
| Teams | `workspaces`, `workspace_members` |
| Tasks | `contexts`, `groups`, `group_links`, `tasks`, `task_comments` |
| Storage | `workspace-assets` bucket (images in descriptions & comments) |

All task data is scoped by **`workspace_id`**. RLS ensures only members of a workspace can read/write its rows.

## 3. Auth configuration

Under **Authentication → Providers**, enable what you need (e.g. Email, Google, GitHub).

Under **Authentication → URL configuration**:

- **Site URL**: `http://localhost:1420` (Vite dev)
- **Redirect URLs**: add `http://localhost:1420/**` and, when you add it, your custom scheme (e.g. `devtask://auth/callback`)

For the Tauri desktop app you will use **PKCE** OAuth / magic link — configure redirects before shipping sign-in.

## 4. Environment variables (app)

Create `.env.local` in the project root (gitignored):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See `.env.example` in the repo root.

## 5. Invite members (app)

In **Settings → Team workspace**, with a workspace selected in the header:

1. **Members** — owners/admins can invite by email (user must already exist in **Authentication → Users**).
2. Invited users see the workspace in the header switcher after sign-in.
3. **Sync now** — pull team tasks into the local cache; edits in workspace mode push to Supabase.

## 6. Verify RLS with two test users

1. Create user A and user B in **Authentication → Users** (or sign up via API).
2. As user A (SQL editor “run as” or client with A’s JWT):
   - `insert into workspaces (name) values ('Test Team') returning id;`
   - `insert into workspace_members (workspace_id, user_id, role) values (<id>, auth.uid(), 'owner');`
3. Confirm user B **cannot** select from that workspace’s `tasks` until B is added to `workspace_members`.

## 7. Enable Realtime (team live updates)

The app subscribes to workspace changes when **Workspace** mode is active. In the Supabase dashboard:

1. **Database → Publications** — open `supabase_realtime`.
2. Add tables: `tasks`, `contexts`, `groups`, `group_links`, `task_comments` (if not already listed).

Or run in SQL Editor (skip tables already in the publication):

```sql
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.contexts;
alter publication supabase_realtime add table public.groups;
alter publication supabase_realtime add table public.group_links;
alter publication supabase_realtime add table public.task_comments;
```

When a teammate edits a task, the app debounces a pull into the local SQLite cache and refreshes the UI.

## 8. Task comments & images (app)

- **Comments** — open any workspace task; thread appears below the description. Markdown supported; only the author can edit or delete their comment.
- **Images** — in workspace mode, use the **Image** button in the description or comment editor (JPEG/PNG/GIF/WebP, max 5 MB). Images are stored in the private `workspace-assets` bucket and rendered via signed URLs.

Restart the Tauri app after pulling these changes so SQLite migration 12 runs locally.

### Sync conflicts

Workspace sync uses **last-write-wins** using each row's `updated_at`:

- **Pull / Realtime** merges cloud rows into SQLite without wiping newer local edits.
- **Push** skips uploading stale local rows when cloud is newer; the app applies the cloud version and shows an info toast.
- Remote deletes since the last sync are applied via soft-delete tombstones.

## 9. Generate TypeScript types (after migration)

```bash
npx supabase gen types typescript --project-id <ref> > src/db/supabase.types.ts
```

Or use the Supabase MCP tool `generate_typescript_types` in Cursor.

## 10. Product split (important)

| Mode | Storage | Cloud |
|------|---------|--------|
| **Personal** | SQLite on device | None (export JSON for backup) |
| **Workspace** | SQLite cache + Supabase | Pull on workspace switch; push on every edit |

Local IDs today are strings like `ctx-work`. Cloud rows use **UUID**. The sync layer will map or migrate IDs when uploading — plan that in the next dev phase.

## 11. Next app work (after Supabase is ready)

1. Add `@supabase/supabase-js` and sign-in UI.
2. List workspaces for `auth.uid()` from `workspace_members`.
3. Set active workspace in `useWorkspaceStore`.
4. Implement `src/sync/workspaceSync.ts` — pull/push by `updated_at`.
5. Wire **Connect workspace** in Settings.

## 12. Checklist

- [x] Project created
- [x] Migration applied (local + cloud)
- [ ] Auth providers enabled (Email enabled for sign-in UI)
- [ ] Redirect URLs set for local dev
- [x] `.env.local` filled
- [ ] RLS smoke-tested with two users
- [ ] Security advisor reviewed in Supabase dashboard
- [x] App: `@supabase/supabase-js` + sign-in in Settings
- [x] App: invite members by email (Settings → Members)
- [x] App: workspace task sync (pull on switch + push on write)
- [x] App: task assignee + created_by (workspace tasks)
- [x] App: Realtime pull on teammate edits (enable publication first)
- [x] App: task comments (workspace tasks)
- [x] App: markdown image upload (workspace-assets bucket)
- [x] App: conflict resolution (last-write-wins by updated_at)
