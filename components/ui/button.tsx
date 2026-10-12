import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Nexus skin: soft-rounded pills, brand/module tokens.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-all duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:opacity-90",
        soft: "bg-canvas text-ink hover:bg-border/60",
        ghost: "text-ink-soft hover:bg-canvas hover:text-ink",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export function Button({
  variant,
  href,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    href?: string;
    children: React.ReactNode;
  }) {
  const cls = cn(buttonVariants({ variant }), className);
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
