"use client";

import { useState } from "react";

// Illustrated campus scene (light mode only — dark/custom get the gradient).
// Inline SVG so there's no image asset to fetch, theme, or 404.
function CampusArt() {
  return (
    <svg
      viewBox="0 0 340 170"
      aria-hidden
      className="hero-art h-full w-full"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#eff6ff" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="340" height="170" fill="url(#heroSky)" />
      <circle cx="272" cy="40" r="20" fill="#fbbf24" opacity="0.8" />
      <circle cx="272" cy="40" r="28" fill="#fbbf24" opacity="0.3" />
      <g fill="white" opacity="0.95">
        <ellipse cx="60" cy="38" rx="26" ry="10" />
        <ellipse cx="84" cy="32" rx="18" ry="8" />
        <ellipse cx="170" cy="24" rx="22" ry="8" opacity="0.8" />
      </g>
      <g stroke="var(--color-ink-soft)" strokeWidth="1.6" fill="none" opacity="0.7">
        <path d="M40 30 q6 -6 12 0 M52 30 q6 -6 12 0" />
        <path d="M210 52 q5 -5 10 0 M220 52 q5 -5 10 0" />
      </g>
      {/* main hall */}
      <rect x="118" y="78" width="104" height="60" rx="4" fill="#d97706" opacity="0.55" />
      <rect x="118" y="78" width="104" height="10" rx="4" fill="#92400e" opacity="0.5" />
      {/* dome tower */}
      <rect x="152" y="40" width="36" height="42" rx="3" fill="#d97706" opacity="0.6" />
      <path d="M152 40 q18 -26 36 0" fill="#e11d48" opacity="0.75" />
      <rect x="168" y="6" width="4" height="14" fill="#92400e" opacity="0.7" />
      <circle cx="170" cy="56" r="8" fill="white" opacity="1" />
      <line x1="170" y1="56" x2="170" y2="51" stroke="#57534e" strokeWidth="1.5" />
      <line x1="170" y1="56" x2="174" y2="57" stroke="#57534e" strokeWidth="1.5" />
      {/* windows */}
      {[130, 146, 190, 206].map((x) => (
        <g key={x}>
          <rect x={x} y={96} width={12} height={20} rx={6} fill="white" opacity="0.95" />
          <line x1={x + 6} y1={96} x2={x + 6} y2={116} stroke="#d6d3d1" strokeWidth="1" />
        </g>
      ))}
      <rect x={161} y={116} width={18} height={22} rx={9} fill="#44403c" opacity="0.45" />
      {/* side wings */}
      <rect x="76" y="100" width="42" height="38" rx="4" fill="#059669" opacity="0.45" />
      <polygon points="76,100 97,86 118,100" fill="#047857" opacity="0.5" />
      <rect x="222" y="100" width="42" height="38" rx="4" fill="#059669" opacity="0.45" />
      <polygon points="222,100 243,86 264,100" fill="#047857" opacity="0.5" />
      {/* trees */}
      {[
        { x: 44, s: 1 },
        { x: 292, s: 1.25 },
        { x: 318, s: 0.9 },
      ].map(({ x, s }) => (
        <g key={x} transform={`translate(${x} 0) scale(${s})`}>
          <rect x={-3} y={116} width={6} height={22} rx={3} fill="#78716c" opacity="0.8" />
          <circle cx={0} cy={100} r={17} fill="#10b981" opacity="0.75" />
          <circle cx={-11} cy={108} r={11} fill="#10b981" opacity="0.7" />
          <circle cx={11} cy={108} r={11} fill="#059669" opacity="0.65" />
        </g>
      ))}
      {/* lawn + path */}
      <ellipse cx="170" cy="152" rx="160" ry="16" fill="#10b981" opacity="0.35" />
      <path d="M150 170 L164 138 L176 138 L170 170 Z" fill="white" opacity="0.85" />
    </svg>
  );
}

const HERO_DISMISS_KEY = "nexus-hero-dismissed";

export function WelcomeHero({ name }: { name: string | null }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(HERO_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (dismissed) return null;
  const first = name?.trim().split(/\s+/)[0];

  return (
    <section
      aria-label="Welcome"
      className="relative overflow-hidden rounded-2xl border border-border shadow-card"
      style={{
        background:
          "linear-gradient(100deg, var(--color-card) 30%, color-mix(in srgb, var(--color-brand) 14%, var(--color-card)) 68%, color-mix(in srgb, var(--color-referral) 22%, var(--color-card)))",
      }}
    >
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[46%] sm:block">
        <CampusArt />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, var(--color-card) 0%, transparent 28%), linear-gradient(to top, var(--color-card) 0%, transparent 22%)",
          }}
        />
      </div>
      <div className="relative z-10 p-5 md:p-6">
        <div className="max-w-[62%]">
          <p className="text-[11px] font-bold tracking-[0.14em] text-ink-soft uppercase">
            Welcome to Nexus
          </p>
          <h2 className="mt-1 font-editorial text-[26px] leading-[1.15] font-bold text-ink md:text-[32px]">
            {first ? (
              <>
                Good to see you,
                <br />
                {first}!
              </>
            ) : (
              <>
                One feed for
                <br />
                everything.
              </>
            )}
          </h2>
          <p className="mt-2 text-[13px] font-medium text-ink-soft">
            Connect <span aria-hidden className="mx-1 text-ink-faint">•</span> Share{" "}
            <span aria-hidden className="mx-1 text-ink-faint">•</span> Grow
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            sessionStorage.setItem(HERO_DISMISS_KEY, "1");
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
        aria-label="Dismiss welcome banner"
        className="absolute top-2.5 right-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-ink/10 text-[14px] font-bold text-ink-soft transition-colors hover:bg-ink/20 hover:text-ink"
      >
        ×
      </button>
    </section>
  );
}
