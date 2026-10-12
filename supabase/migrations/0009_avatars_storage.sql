-- Nexus migration 0009 — avatar uploads.
-- One public bucket, one fixed file per user ({userId}/avatar.jpg, upserted),
-- 100 KB server-side cap to match the client compressor (lib/avatar.ts).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 102400, array['image/jpeg'::text])
on conflict (id) do update set
  public = true,
  file_size_limit = 102400,
  allowed_mime_types = array['image/jpeg'::text];

drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "Avatar owner insert" on storage.objects;
create policy "Avatar owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
