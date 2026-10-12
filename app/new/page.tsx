"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { BottomSheet } from "@/components/bottom-sheet";
import { ImageUpload } from "@/components/image-upload";
import { createClient } from "@/lib/supabase/client";
import { diagnoseDb, myClubs } from "@/lib/actions";
import { isAllowedEmail } from "@/lib/auth";
import { MODULE_META } from "@/lib/constants";
import type { PostType } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: { key: PostType; label: string; sheet: string }[] = [
  { key: "lost_found", label: "Lost & Found", sheet: "Create Post" },
  { key: "marketplace", label: "Marketplace", sheet: "Create Post" },
  { key: "doubt", label: "Doubt", sheet: "Ask a Doubt" },
  { key: "referral", label: "Referral", sheet: "Offer a Referral" },
  { key: "event", label: "Event", sheet: "Host an Event" },
];

const inputClass =
  "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-ink-faint focus:border-brand";

export default function NewPostPage() {
  const router = useRouter();
  const [type, setType] = useState<PostType>("lost_found");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [lostOrFound, setLostOrFound] = useState("lost");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [deadline, setDeadline] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [anonymous, setAnonymous] = useState(true);
  const [slots, setSlots] = useState("5");
  const [perks, setPerks] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [clubs, setClubs] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [asClub, setAsClub] = useState<string>("");
  const [handle, setHandle] = useState("you");
  const postingAsClub = clubs.some((c) => c.id === asClub);
  const effType: PostType = postingAsClub ? "event" : type;
  const sheetTitle = TYPES.find((t) => t.key === effType)?.sheet ?? "Create Post";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mine = await myClubs();
        if (alive) setClubs(mine);
      } catch {
        if (alive) setClubs([]);
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (alive && user?.email) setHandle(user.email.split("@")[0]);
      } catch {
        /* offline */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Sign in first — redirecting to /login.");
      const userHandle = user.email.split("@")[0].replace(/[^a-z0-9_]/gi, "").toLowerCase() || "student";

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          handle: userHandle,
          college_domain: user.email.split("@")[1] ?? null,
          is_verified: isAllowedEmail(user.email),
        },
        { onConflict: "id" },
      );
      if (profileError) throw new Error(`Profile save failed: ${profileError.message}`);

      let finalBody = body.trim();
      if (effType === "referral" && slots.trim()) finalBody = `Slots: ${slots.trim()}\n\n${finalBody}`;
      if (effType === "event") {
        const extras = [
          perks.trim() ? `Perks: ${perks.trim()}` : "",
          capacity.trim() ? `Capacity: ${capacity.trim()}` : "",
        ].filter(Boolean);
        if (extras.length) finalBody = `${extras.join(" · ")}\n\n${finalBody}`;
      }

      const row: Record<string, unknown> = {
        type: effType,
        author_id: postingAsClub ? null : user.id,
        club_id: postingAsClub ? asClub : null,
        title: title.trim().slice(0, 90),
        body: finalBody,
        images: images.slice(0, 4),
      };
      if (effType === "lost_found") {
        row.lost_or_found = lostOrFound;
        row.location = location.trim() || null;
      }
      if (effType === "marketplace") {
        const p = Number(price);
        if (!Number.isFinite(p) || p <= 0) throw new Error("Price must be greater than 0.");
        row.price = p;
        row.category = category.trim() || null;
      }
      if (effType === "referral") {
        if (!deadline) throw new Error("Referrals need a deadline.");
        row.deadline_at = new Date(deadline).toISOString();
      }
      if (effType === "event") {
        if (!startsAt) throw new Error("Events need a date/time.");
        row.starts_at = new Date(startsAt).toISOString();
        row.location = location.trim() || null;
      }

      const { data: created, error: postError } = await supabase
        .from("posts")
        .insert(row)
        .select("id")
        .single();
      if (postError) throw new Error(postError.message);
      router.push(`/post/${created.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create post.";
      if (msg === "Sign in first — redirecting to /login.") {
        router.push("/login");
      } else if (/schema cache|could not find the table/i.test(msg)) {
        try {
          const d = await diagnoseDb();
          if (!d.configured) {
            setStatus(
              "Database not fully configured (service-role key missing). Add SUPABASE_SERVICE_ROLE_KEY to .env.local and restart pnpm dev.",
            );
          } else if (d.missing.length > 0) {
            setStatus(
              `Database tables are missing (${d.missing.join(", ")}). Run migrations 0001–0013 from supabase/migrations/ in Supabase → SQL Editor, in order, then retry.`,
            );
          } else {
            setStatus(
              "Tables exist but the API schema cache is stale. Run `NOTIFY pgrst, 'reload schema';` in Supabase → SQL Editor, wait a few seconds, and retry.",
            );
          }
        } catch {
          setStatus(msg);
        }
      } else {
        setStatus(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <BottomSheet
        title={sheetTitle}
        subtitle={`Posting as ${postingAsClub ? clubs.find((c) => c.id === asClub)?.name : `@${handle}`} · verified student`}
        closeHref="/"
      >
        {clubs.length > 0 && (
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="postas" className="shrink-0 text-[13px] font-semibold text-ink-soft">
              Posting as
            </label>
            <select
              id="postas"
              value={asClub}
              onChange={(e) => setAsClub(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-[13.5px] font-semibold text-ink outline-none focus:border-brand"
            >
              <option value="">Me (personal)</option>
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (@{c.slug})
                </option>
              ))}
            </select>
          </div>
        )}
        {postingAsClub ? (
          <p className="mb-3 rounded-xl border border-event bg-event-tint px-3.5 py-2.5 text-[13px] font-semibold text-event">
            Posting as {clubs.find((c) => c.id === asClub)?.name} — club posts are always events.
          </p>
        ) : (
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Post type">
            {TYPES.map((t) => {
              const meta = MODULE_META[t.key];
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setType(t.key);
                    setImages([]);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-semibold transition-colors",
                    active ? "text-white" : "border border-border bg-card text-ink-soft",
                  )}
                  style={active ? { background: meta.color } : undefined}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}
        {effType === "doubt" && (
          <div className="mb-3 space-y-3">
            <div className="rounded-xl bg-doubt-tint px-3.5 py-2.5 text-[12.5px] font-medium text-doubt">
              Academic Integrity — ask for understanding, not direct assignment answers. You post
              anonymously; moderators still see verified identity.
            </div>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2.5">
              <span className="text-[13.5px] font-semibold text-ink">Post anonymously</span>
              <button
                type="button"
                role="switch"
                aria-checked={anonymous}
                onClick={() => setAnonymous((v) => !v)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  anonymous ? "bg-doubt" : "bg-border",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                    anonymous ? "left-[22px]" : "left-0.5",
                  )}
                />
              </button>
            </label>
          </div>
        )}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={effType === "doubt" ? "What is your doubt? (e.g. Pset 4 Q3)" : "Post headline"}
              maxLength={90}
              className={cn(inputClass, "font-medium")}
            />
            <p className="mt-1 text-right text-[11px] text-ink-faint">{title.length}/90</p>
          </div>
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              effType === "doubt"
                ? "Describe what you tried, where you're stuck… (LaTeX supported in answers)"
                : effType === "marketplace"
                  ? "Condition, age, handover zone, negotiable?"
                  : "Describe it…"
            }
            rows={4}
            maxLength={2000}
            className={inputClass}
          />
          {(effType === "lost_found" || effType === "event") && (
            <div className="flex gap-2">
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Campus location (e.g. Student Union)"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setLocation("Student Union")}
                className="shrink-0 rounded-xl border border-border bg-canvas px-3 text-[12.5px] font-semibold text-ink-soft"
              >
                Quick fill
              </button>
            </div>
          )}
          {effType === "lost_found" && (
            <div className="flex gap-2">
              {(["lost", "found"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setLostOrFound(v)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2 text-[14px] font-semibold capitalize",
                    lostOrFound === v
                      ? "border-transparent text-white"
                      : "border-border bg-card text-ink-soft",
                  )}
                  style={lostOrFound === v ? { background: "var(--color-lost)" } : undefined}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
          {(effType === "lost_found" || effType === "marketplace" || effType === "event") && (
            <ImageUpload type={effType} value={images} onChange={setImages} />
          )}
          {effType === "marketplace" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price (₹)"
                inputMode="decimal"
                className={inputClass}
              />
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (books, cycles…)"
                className={inputClass}
              />
            </div>
          )}
          {effType === "referral" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                aria-label="Application deadline"
                className={inputClass}
              />
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3.5 py-2">
                <span className="text-[13px] font-semibold text-ink-soft">Slots</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Fewer slots"
                    onClick={() => setSlots((s) => String(Math.max(1, Number(s || 1) - 1)))}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-[16px] font-bold text-ink"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-[14px] font-bold text-ink">{slots}</span>
                  <button
                    type="button"
                    aria-label="More slots"
                    onClick={() => setSlots((s) => String(Math.min(50, Number(s || 1) + 1)))}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-[16px] font-bold text-ink"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}
          {effType === "event" && (
            <div className="space-y-3">
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                aria-label="Event date and time"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={perks}
                  onChange={(e) => setPerks(e.target.value)}
                  placeholder="Perks (dinner, swag…)"
                  className={inputClass}
                />
                <input
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Capacity (e.g. 60)"
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand px-4 py-3 text-[14px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Publishing…" : effType === "event" && postingAsClub ? "Publish Campus Event →" : "Publish →"}
          </button>
        </form>
        {status && <p className="mt-3 text-[13px] text-event">{status}</p>}
      </BottomSheet>
    </AppShell>
  );
}
