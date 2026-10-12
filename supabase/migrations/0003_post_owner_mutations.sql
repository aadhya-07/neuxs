-- Nexus migration 0003 — owner mutations for posts (status transitions).
-- Lets authors move posts through open → claimed/sold/resolved/closed (PRD §6).

drop policy if exists "posts owner update" on posts;
create policy "posts owner update" on posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "posts owner delete" on posts;
create policy "posts owner delete" on posts for delete
  using (auth.uid() = author_id);
