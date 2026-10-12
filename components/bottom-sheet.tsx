"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomSheet({
  title,
  subtitle,
  closeHref = "/",
  children,
}: {
  title: string;
  subtitle?: string;
  closeHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl md:max-w-2xl">
      <div
        className={cn(
          "overflow-hidden rounded-t-[24px] border border-border bg-card shadow-sheet md:rounded-2xl md:shadow-modal",
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border md:hidden" />
        <div className="flex items-start gap-3 border-b border-border px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[18px] text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-soft">{subtitle}</p>}
          </div>
          <Link
            href={closeHref}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-soft hover:text-ink"
          >
            <X className="h-4 w-4" />
          </Link>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-4 md:px-6">{children}</div>
      </div>
    </div>
  );
}
