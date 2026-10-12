import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/nexus-logo.png"
      alt="Nexus"
      width={size}
      height={size}
      className={cn("shrink-0 rounded-xl object-cover", className)}
      priority={false}
    />
  );
}
