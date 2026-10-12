-- Nexus migration 0013 — post images bucket + marketplace offers.
-- Bucket mirrors avatars pattern (0009). Offers back Make Offer -> Counter -> Deal flow.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg'::text, 'image/png'::text, 'image/webp'::text];

drop policy if exists "Post images public read" on storage.objects;
create policy "Post images public read" on storage.objects
  for select to public
  using (bucket_id = 'post-images');

drop policy if exists "Post images owner insert" on storage.objects;
create policy "Post images owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-images');

drop policy if exists "Post images owner update" on storage.objects;
create policy "Post images owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-images')
  with check (bucket_id = 'post-images');

drop policy if exists "Post images owner delete" on storage.objects;
create policy "Post images owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-images');

-- Offers: buyer proposes amount + meetup; seller counters/accepts.
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references posts (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  buyer_id uuid not null references profiles (id) on delete cascade,
  amount numeric not null check (amount > 0),
  meetup_when text,
  meetup_where text,
  status text not null default 'offered' check (status in ('offered', 'countered', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now()
);
create index if not exists offers_listing_idx on offers (listing_id, created_at desc);

alter table offers enable row level security;

drop policy if exists "offers participant read" on offers;
create policy "offers participant read" on offers for select
  using (
    exists (
      select 1 from conversations c
      where c.listing_id = offers.listing_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
    or exists (
      select 1 from posts p
      where p.id = offers.listing_id
        and p.author_id = auth.uid()
    )
    or offers.buyer_id = auth.uid()
  );

drop policy if exists "offers buyer insert" on offers;
create policy "offers buyer insert" on offers for insert
  with check (buyer_id = auth.uid());

drop policy if exists "offers participant update" on offers;
create policy "offers participant update" on offers for update
  using (
    buyer_id = auth.uid()
    or exists (
      select 1 from posts p
      where p.id = offers.listing_id
        and p.author_id = auth.uid()
    )
  );
