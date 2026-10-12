-- Nexus migration 0005 — capture OAuth profile metadata on signup.
-- Google/GitHub supply full_name + avatar_url in raw_user_meta_data; prefer
-- them over the email-derived handle fallback (policy from 0004 unchanged).

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
begin
  if v_name is null then
    v_name := nullif(new.raw_user_meta_data->>'name', '');
  end if;
  if v_handle is null or v_handle = '' then
    v_handle := 'student_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (id, handle, full_name, avatar_url, college_domain, is_verified)
  values (new.id, v_handle, v_name, v_avatar, nullif(v_domain, ''), true)
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    college_domain = excluded.college_domain,
    is_verified = true;
  return new;
end;
$$;
