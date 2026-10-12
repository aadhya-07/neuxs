-- Nexus migration 0012 — club governance (admin-seeded clubs, manager posting).
-- clubs / club_managers shipped in 0001 with no RLS (open to the anon key);
-- this locks them down and lets managers mutate their club's event posts
-- (author-only policies in 0003 covered just personal posts).

-- Manager check without recursive RLS (policies on club_managers can't
-- query club_managers through RLS).
create or replace function public.is_club_manager(p_user uuid, p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_managers
    where club_id = p_club and user_id = p_user
  );
$$;

create or replace function public.is_moderator(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user and is_moderator
  );
$$;

alter table clubs enable row level security;
alter table club_managers enable row level security;

-- Clubs: readable by all; created/renamed by moderators; managers may
-- update their own club's name.
drop policy if exists "clubs read" on clubs;
create policy "clubs read" on clubs for select using (true);

drop policy if exists "clubs moderator insert" on clubs;
create policy "clubs moderator insert" on clubs for insert
  with check (public.is_moderator(auth.uid()));

drop policy if exists "clubs moderator update" on clubs;
create policy "clubs moderator update" on clubs for update
  using (public.is_moderator(auth.uid()))
  with check (public.is_moderator(auth.uid()));

drop policy if exists "clubs manager update" on clubs;
create policy "clubs manager update" on clubs for update
  using (public.is_club_manager(auth.uid(), id))
  with check (public.is_club_manager(auth.uid(), id));

-- Managers: readable by all (shown on the club page); membership changes
-- by moderators or existing managers of that club.
drop policy if exists "club managers read" on club_managers;
create policy "club managers read" on club_managers for select using (true);

drop policy if exists "club managers admin insert" on club_managers;
create policy "club managers admin insert" on club_managers for insert
  with check (
    public.is_moderator(auth.uid())
    or public.is_club_manager(auth.uid(), club_id)
  );

drop policy if exists "club managers admin delete" on club_managers;
create policy "club managers admin delete" on club_managers for delete
  using (
    public.is_moderator(auth.uid())
    or public.is_club_manager(auth.uid(), club_id)
  );

-- Posts: verified managers may insert club-owned rows (author_id NULL).
-- The table CHECK already forces club rows to type = 'event'.
drop policy if exists "posts verified insert" on posts;
create policy "posts verified insert" on posts for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and is_verified)
    and (
      (author_id = auth.uid() and club_id is null)
      or (author_id is null and club_id is not null
          and public.is_club_manager(auth.uid(), club_id))
    )
  );

-- Managers may change or delete their club's event posts (e.g. close them).
drop policy if exists "posts club manager update" on posts;
create policy "posts club manager update" on posts for update
  using (club_id is not null and public.is_club_manager(auth.uid(), club_id))
  with check (club_id is not null and public.is_club_manager(auth.uid(), club_id));

drop policy if exists "posts club manager delete" on posts;
create policy "posts club manager delete" on posts for delete
  using (club_id is not null and public.is_club_manager(auth.uid(), club_id));
