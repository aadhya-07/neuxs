-- Nexus migration 0002 — auto-create profiles on signup + self-service policies.
-- TAD §7: "Verify → trigger creates profiles row".

-- Auto-create profile when a new auth.user appears (bypasses RLS as definer).
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
  values (new.id, v_handle, nullif(v_domain, ''), v_domain ilike '%.ac.in')
  on conflict (id) do update set
    college_domain = excluded.college_domain,
    is_verified = excluded.is_verified;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Self-service: let a verified user ensure their own profile row (used by /new).
drop policy if exists "profiles self insert" on profiles;
create policy "profiles self insert" on profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
