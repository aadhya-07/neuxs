-- Nexus migration 0006 — RLS for engagement tables.
-- 0001 created answers/votes/applications/rsvps/conversations/messages/reports/
-- karma_events with RLS ON but no policies (default-deny). This opens the
-- pilot-safe paths. All owner checks use auth.uid() = profiles.id.

-- Answers (doubts): readable by all, writable by any signed-in user.
drop policy if exists "answers read" on answers;
create policy "answers read" on answers for select using (true);

drop policy if exists "answers insert own" on answers;
create policy "answers insert own" on answers for insert
  with check (auth.uid() = author_id);

-- Votes: readable by all; users may only vote/unvote as themselves.
drop policy if exists "votes read" on votes;
create policy "votes read" on votes for select using (true);

drop policy if exists "votes insert own" on votes;
create policy "votes insert own" on votes for insert
  with check (auth.uid() = voter_id);

drop policy if exists "votes delete own" on votes;
create policy "votes delete own" on votes for delete
  using (auth.uid() = voter_id);

-- Applications (referrals): applicants see their own, posters see all on
-- their posts (needed for the applicant list + count).
drop policy if exists "applications read" on applications;
create policy "applications read" on applications for select using (
  auth.uid() = applicant_id
  or exists (
    select 1 from posts
    where posts.id = applications.post_id and posts.author_id = auth.uid()
  )
);

drop policy if exists "applications insert own" on applications;
create policy "applications insert own" on applications for insert
  with check (auth.uid() = applicant_id);

-- RSVPs: readable by all (counts are public), writable by self.
drop policy if exists "rsvps read" on rsvps;
create policy "rsvps read" on rsvps for select using (true);

drop policy if exists "rsvps insert own" on rsvps;
create policy "rsvps insert own" on rsvps for insert
  with check (auth.uid() = user_id);

drop policy if exists "rsvps delete own" on rsvps;
create policy "rsvps delete own" on rsvps for delete
  using (auth.uid() = user_id);

-- Conversations: only buyer/seller see them; buyer initiates.
drop policy if exists "conversations participant read" on conversations;
create policy "conversations participant read" on conversations for select using (
  auth.uid() = buyer_id or auth.uid() = seller_id
);

drop policy if exists "conversations buyer insert" on conversations;
create policy "conversations buyer insert" on conversations for insert
  with check (auth.uid() = buyer_id);

-- Messages: only participants of the conversation, sending as self.
drop policy if exists "messages participant read" on messages;
create policy "messages participant read" on messages for select using (
  exists (
    select 1 from conversations c
    where c.id = messages.conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  )
);

drop policy if exists "messages participant insert" on messages;
create policy "messages participant insert" on messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Reports: anyone signed in can file (as self); reporters see their own,
-- moderators see all and may close them.
drop policy if exists "reports insert own" on reports;
create policy "reports insert own" on reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports read own or moderator" on reports;
create policy "reports read own or moderator" on reports for select using (
  auth.uid() = reporter_id
  or exists (select 1 from profiles where id = auth.uid() and is_moderator)
);

drop policy if exists "reports moderator update" on reports;
create policy "reports moderator update" on reports for update
  using (exists (select 1 from profiles where id = auth.uid() and is_moderator))
  with check (exists (select 1 from profiles where id = auth.uid() and is_moderator));

-- Moderators may delete any post (takedown path for upheld reports).
drop policy if exists "posts moderator delete" on posts;
create policy "posts moderator delete" on posts for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_moderator));

-- Karma: users earn their own rows (resolve awards, capped), moderators may
-- adjust anyone (e.g. −20 for upheld reports). One resolve-award per post per
-- user makes resolve-farming impossible.
drop policy if exists "karma insert own or moderator" on karma_events;
create policy "karma insert own or moderator" on karma_events for insert
  with check (
    (auth.uid() = user_id and delta >= 1 and delta <= 15)
    or exists (select 1 from profiles where id = auth.uid() and is_moderator)
  );

drop index if exists karma_resolve_once;
create unique index karma_resolve_once on karma_events (ref_id, user_id)
  where reason = 'resolved_post';
