-- Nexus migration 0004 — open email policy.
-- Any email that completes OTP signup is a verified account: Supabase only
-- creates the auth.user after the one-time code is confirmed, so ownership
-- is proven by the signup itself. Domain allow-listing (if ever re-enabled)
-- lives in app config (NEXT_PUBLIC_ALLOWED_DOMAINS), not the DB.

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
begin
  if v_handle is null or v_handle = '' then
    v_handle := 'student_' || substr(new.id::text, 1, 8);
  end if;
  insert into public.profiles (id, handle, college_domain, is_verified)
  values (new.id, v_handle, nullif(v_domain, ''), true)
  on conflict (id) do update set
    college_domain = excluded.college_domain,
    is_verified = true;
  return new;
end;
$$;

-- Re-verify existing users under the new policy.
update public.profiles set is_verified = true where is_verified = false;

-- Document common public domains for future Edge Function / moderation use.
insert into allowed_domains (domain)
values ('gmail.com'), ('outlook.com'), ('yahoo.com'), ('hotmail.com')
on conflict do nothing;
