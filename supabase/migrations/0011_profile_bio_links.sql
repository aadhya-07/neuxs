-- Nexus migration 0011 — editable bio + freeform links on profiles.
-- links is a JSON array of {"label": "...", "url": "https://..."} objects,
-- validated in the updateProfile Server Action (max 6, label <= 30 chars).

alter table profiles
  add column if not exists bio text
    check (char_length(bio) <= 1000);

alter table profiles
  add column if not exists links jsonb not null default '[]';
