-- Nexus initial schema — TAD §6 (Postgres 17, Supabase)
-- Run: supabase db push (CLI 2.x). Single-college pilot; multi-college later via colleges table.

-- Extensions
create extension if not exists "pg_trgm";
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type post_type as enum ('lost_found', 'marketplace', 'doubt', 'referral', 'event');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('open', 'claimed', 'sold', 'resolved', 'closed');
exception when duplicate_object then null; end $$;

-- Allow-listed college domains (pilot: any *.ac.in enforced in app + Edge Function)
create table if not exists allowed_domains (
  domain text primary key,
  created_at timestamptz not null default now()
);
insert into allowed_domains (domain) values ('%.ac.in')
on conflict do nothing;

-- Profiles (1:1 with auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text unique not null,
  full_name text,
  avatar_url text,
  college_domain text,
  is_verified boolean not null default false,
  karma int not null default 0,
  is_moderator boolean not null default false,
  created_at timestamptz not null default now()
);

-- Clubs + managers (club posts are events attributable to club, not individual)
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  avatar_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists club_managers (
  club_id uuid not null references clubs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- Posts (single table, all 5 modules; TAD §4)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  type post_type not null,
  author_id uuid references profiles (id) on delete set null,
  club_id uuid references clubs (id) on delete set null,
  title text not null,
  body text not null default '',
  images text[] not null default '{}',
  status post_status not null default 'open',
  price numeric,
  category text,
  lost_or_found text check (lost_or_found in ('lost', 'found')),
  location text,
  starts_at timestamptz,
  deadline_at timestamptz,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  constraint posts_owner_check check (
    (author_id is not null and club_id is null) or
    (author_id is null and club_id is not null)
  ),
  constraint posts_club_event_only check (
    club_id is null or type = 'event'
  )
);

-- FTS: unified search_vector across all modules (PRD §7)
create or replace function posts_search_trigger() returns trigger as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'C');
  return new;
end $$ language plpgsql;

drop trigger if exists posts_search_vector on posts;
create trigger posts_search_vector
  before insert or update of title, body, location, category on posts
  for each row execute function posts_search_trigger();

create index if not exists posts_search_idx on posts using gin (search_vector);
create index if not exists posts_title_trgm on posts using gin (title gin_trgm_ops);
create index if not exists posts_type_status_idx on posts (type, status, created_at desc);

-- Answers + votes (Doubts; anonymity enforced via view/RLS)
create table if not exists answers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  author_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  is_anonymous boolean not null default true,
  score int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  answer_id uuid not null references answers (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (answer_id, voter_id)
);

create or replace function answers_score_trigger() returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update answers set score = score + 1 where id = new.answer_id;
  elsif TG_OP = 'DELETE' then
    update answers set score = score - 1 where id = old.answer_id;
  end if;
  return coalesce(new, old);
end $$ language plpgsql;

drop trigger if exists votes_score on votes;
create trigger votes_score after insert or delete on votes
  for each row execute function answers_score_trigger();

-- Referral applications (poster sees applicants; count via trigger)
create table if not exists applications (
  post_id uuid not null references posts (id) on delete cascade,
  applicant_id uuid not null references profiles (id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (post_id, applicant_id)
);

-- Event RSVPs
create table if not exists rsvps (
  post_id uuid not null references posts (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- Marketplace chat
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references posts (id) on delete cascade,
  buyer_id uuid not null references profiles (id) on delete cascade,
  seller_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages (conversation_id, created_at);

-- Moderation + karma (PRD §7)
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);

create table if not exists karma_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  delta int not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create or replace function karma_apply_trigger() returns trigger as $$
begin
  update profiles set karma = karma + new.delta where id = new.user_id;
  return new;
end $$ language plpgsql;

drop trigger if exists karma_apply on karma_events;
create trigger karma_apply after insert on karma_events
  for each row execute function karma_apply_trigger();

-- Ranked feed view (TAD §6: recency decay + engagement log + type boost + karma)
create or replace view feed_ranked as
select p.*,
  (
    extract(epoch from (now() - p.created_at)) / -3600 * 0.5
    + ln(1 + coalesce((select count(*) from votes v join answers a on a.id = v.answer_id where a.post_id = p.id), 0) * 3
         + coalesce((select count(*) from rsvps r where r.post_id = p.id), 0) * 2
         + coalesce((select count(*) from applications ap where ap.post_id = p.id), 0) * 2
         + coalesce((select count(*) from messages m join conversations c on c.id = m.conversation_id where c.listing_id = p.id), 0))
    + case p.type when 'event' then 5 when 'lost_found' then 3 else 0 end
    + least(coalesce((select karma from profiles where id = p.author_id), 0) * 0.05, 5)
    + case when p.status <> 'open' then -10 else 0 end
  ) as rank
from posts p
order by rank desc;

-- RLS (baseline; tighten with service-role Edge Functions for mutations)
alter table profiles enable row level security;
alter table posts enable row level security;
alter table answers enable row level security;
alter table votes enable row level security;
alter table applications enable row level security;
alter table rsvps enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table reports enable row level security;

drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles for select using (true);

drop policy if exists "posts verified read" on posts;
create policy "posts verified read" on posts for select using (true);

drop policy if exists "posts verified insert" on posts;
create policy "posts verified insert" on posts for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_verified));

-- Storage bucket (create via dashboard or CLI): post-images, public read, 5MB limit.
-- insert into storage.buckets (id, name, public) values ('post-images', 'post-images', true)
-- on conflict (id) do nothing;
