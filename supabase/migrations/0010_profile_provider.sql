-- Nexus migration 0010 — store the OAuth provider on profiles so public pages
-- can show "via Google / via GitHub" (auth.users is not publicly readable).

alter table profiles
  add column if not exists provider text
    check (provider in ('google', 'github', 'email'));

-- Backfill from existing auth users where the provider is a known value.
-- NOTE: the Postgres column is raw_app_meta_data (the API exposes it as app_metadata).
update public.profiles p
set provider = u.raw_app_meta_data->>'provider'
from auth.users u
where u.id = p.id
  and p.provider is null
  and u.raw_app_meta_data->>'provider' in ('google', 'github', 'email');

-- Capture the provider for all future signups (extends migration 0005).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := coalesce(new.email, '');
  v_domain text := split_part(v_email, '@', 2);
  v_handle text := lower(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9_]', '', 'g'));
  v_name text := nullif(new.raw_user_meta_data->>'full_name', '');
  v_avatar text := nullif(new.raw_user_meta_data->>'avatar_url', '');
  v_provider text := nullif(new.raw_app_meta_data->>'provider', '');
begin
  if v_name is null then
    v_name := nullif(new.raw_user_meta_data->>'name', '');
  end if;
  if v_handle is null or v_handle = '' then
    v_handle := 'student_' || substr(new.id::text, 1, 8);
  end if;
  if v_provider not in ('google', 'github', 'email') then
    v_provider := null;
  end if;
  insert into public.profiles (id, handle, full_name, avatar_url, college_domain, is_verified, provider)
  values (new.id, v_handle, v_name, v_avatar, nullif(v_domain, ''), true, v_provider)
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    college_domain = excluded.college_domain,
    is_verified = true,
    provider = coalesce(excluded.provider, public.profiles.provider);
  return new;
end;
$$;
