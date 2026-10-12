-- Nexus migration 0014 — wallpaper sync (explicit Sync button only).
-- Local choice lives on-device; this bucket + column exist solely for the
-- opt-in cross-device copy. One JPG per user ({userId}/wallpaper.jpg),
-- ≤1.5 MB enforced client-side (lib/wallpaper.ts); bucket caps + mime
-- mirror the avatar pattern (0009) so the server rejects anything else.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wallpapers', 'wallpapers', true, 1572864, array['image/jpeg'::text])
on conflict (id) do update set
  public = true,
  file_size_limit = 1572864,
  allowed_mime_types = array['image/jpeg'::text];

drop policy if exists "Wallpaper public read" on storage.objects;
create policy "Wallpaper public read" on storage.objects
  for select to public
  using (bucket_id = 'wallpapers');

drop policy if exists "Wallpaper owner insert" on storage.objects;
create policy "Wallpaper owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wallpapers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Wallpaper owner update" on storage.objects;
create policy "Wallpaper owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'wallpapers'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'wallpapers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Wallpaper owner delete" on storage.objects;
create policy "Wallpaper owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'wallpapers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

alter table profiles
  add column if not exists wallpaper_url text;
