-- Nexus migration 0007 — realtime publication for chat.
-- postgres_changes subscriptions only fire for tables in supabase_realtime.
-- Without this, chat sends work but live incoming messages never arrive.

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
