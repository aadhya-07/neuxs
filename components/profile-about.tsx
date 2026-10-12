import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { ProfileDTO } from "@/lib/profile";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Shared About panel for /profile and /u/[handle]: identity line, bio, links.
// Bio renders as plain text (whitespace preserved, no HTML) so a crafted
// bio can never spoof links or markup.
export function ProfileAbout({ profile, isOwner }: { profile: ProfileDTO; isOwner: boolean }) {
  const empty = !profile.bio && profile.links.length === 0;
  return (
    <div className="rounded-xl border border-border bg-card p-5 text-[13.5px] text-ink-soft">
      <p>
        <span className="font-semibold text-ink">{profile.fullName ?? `@${profile.handle}`}</span>
        {profile.isVerified ? " · verified student" : ""}
      </p>
      <p className="mt-1">
        Member since {new Date(profile.createdAt).toLocaleDateString()}
        {profile.collegeDomain ? ` · ${profile.collegeDomain}` : ""} · ⭐ {profile.karma} karma
        {profile.isModerator ? " · moderator" : ""}
      </p>
      {profile.bio && <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink">{profile.bio}</p>}
      {profile.links.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {profile.links.map((l, i) => (
            <li key={i}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 font-semibold text-brand hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{l.label}</span>
                <span className="truncate font-normal text-ink-faint">· {hostOf(l.url)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {empty &&
        (isOwner ? (
          <p className="mt-3 text-[12.5px] text-ink-faint">
            Tell people about yourself —{" "}
            <span className="font-semibold text-brand">Edit profile</span> to add a bio and links.
          </p>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-faint">No bio yet.</p>
        ))}
      {isOwner && (
        <p className="mt-3 text-[12.5px] text-ink-faint">
          Public page:{" "}
          <Link href={`/u/${profile.handle}`} className="font-semibold text-brand">
            /u/{profile.handle}
          </Link>
        </p>
      )}
    </div>
  );
}
