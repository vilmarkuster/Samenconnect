"use client";

import { cn } from "@/lib/utils";
import { normalizeMatchScore } from "@/lib/zorenta/match-score-display";

type MatchBadgeProps = {
  /** Score 0–100, or null/undefined when unknown */
  score: number | null | undefined;
  className?: string;
};

/**
 * Match % badge: Green > 70, Orange > 40, Grey <= 40. Unknown scores show a neutral label (not 0%).
 */
export function MatchBadge({ score, className }: MatchBadgeProps) {
  const normalized = normalizeMatchScore(score);
  if (normalized === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500",
          className
        )}
      >
        Match —
      </span>
    );
  }
  const variant =
    normalized > 70 ? "green" : normalized > 40 ? "orange" : "grey";

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
      Match {normalized}%
    </span>
  );
}
