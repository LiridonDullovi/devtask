-- Workspace image attachments (markdown descriptions & comments)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-assets',
  'workspace-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

create policy "workspace_assets_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'workspace-assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "workspace_assets_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workspace-assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );

create policy "workspace_assets_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workspace-assets'
    and public.is_workspace_member((storage.foldername(name))[1]::uuid)
  );
