-- Calendar range lookups: events by starts_at, referrals by deadline_at.
create index if not exists posts_event_starts_idx
  on posts (starts_at) where type = 'event';
create index if not exists posts_referral_deadline_idx
  on posts (deadline_at) where type = 'referral';
