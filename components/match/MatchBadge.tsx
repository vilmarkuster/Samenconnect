"use client";

import { cn } from "@/lib/utils";

type MatchBadgeProps = {
  /** Score 0–100 */
  score: number;
  className?: string;
};

/**
 * Match % badge: Green > 70, Orange > 40, Grey <= 40
 */
export function MatchBadge({ score, className }: MatchBadgeProps) {
  const safeScore = Number.isFinite(score)
    ? Math.round(Math.min(100, Math.max(0, score)))
    : 0;
  const variant =
    safeScore > 70 ? "green" : safeScore > 40 ? "orange" : "grey";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold",
        variant === "green" && "bg-emerald-100 text-emerald-800",
        variant === "orange" && "bg-amber-100 text-amber-800",
        variant === "grey" && "bg-slate-100 text-slate-600",
        className
      )}
    >
      Match {safeScore}%
    </span>
  );
}
