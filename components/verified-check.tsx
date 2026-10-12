import { Check } from "lucide-react";

export function VerifiedCheck({ label = "Verified" }: { label?: string }) {
  return (
    <span
      title={label}
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand align-middle"
    >
      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
    </span>
  );
}
