"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, EllipsisVertical, Flag, Link2 } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

// Card overflow menu on Radix DropdownMenu (shadcn structure, Nexus skin).
// Universal items only (no permission logic): open, copy link, report
// (report UI lives on the post page).
export function PostMenu({ postId, title }: { postId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — link is still one click away via Open
    }
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        aria-label={`More options for ${title}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors outline-none hover:bg-canvas hover:text-ink focus-visible:ring-[3px] focus-visible:ring-brand/40 data-[state=open]:bg-canvas data-[state=open]:text-ink"
      >
        <EllipsisVertical className="h-4 w-4" />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          sideOffset={6}
          align="end"
          className="z-50 w-44 rounded-2xl border border-border bg-card p-1.5 text-ink shadow-modal"
        >
          <DropdownMenuPrimitive.Item
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft outline-hidden transition-colors select-none",
              "hover:bg-canvas hover:text-ink focus:bg-canvas focus:text-ink",
            )}
            asChild
          >
            <Link href={`/post/${postId}`}>Open post</Link>
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item
            onSelect={(e) => {
              e.preventDefault();
              void copy();
            }}
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft outline-hidden transition-colors select-none",
              "hover:bg-canvas hover:text-ink focus:bg-canvas focus:text-ink",
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-market" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied!" : "Copy link"}
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Separator className="-mx-1 my-1 h-px bg-border" />
          <DropdownMenuPrimitive.Item
            className={cn(
              "relative flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-[13px] font-semibold text-event outline-hidden transition-colors select-none",
              "hover:bg-event-tint focus:bg-event-tint",
            )}
            asChild
          >
            <Link href={`/post/${postId}`} aria-label={`Report ${title}`}>
              <Flag className="h-3.5 w-3.5" /> Report
            </Link>
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
