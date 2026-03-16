"use client";

import { cn } from "@/lib/utils";

type MatchReasonChipsProps = {
  reasons: string[];
  max?: number;
  className?: string;
};

/**
 * Displays match explanation as small chips (e.g. "Plaats match", "Vaardigheden match").
 */
export function MatchReasonChips({
  reasons,
  max = 4,
  className,
}: MatchReasonChipsProps) {
  const list = (reasons ?? []).slice(0, max).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {list.map((r) => (
        <span
          key={r}
          className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600"
        >
          {r}
        </span>
      ))}
    </div>
  );
}
