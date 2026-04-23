"use client";

import { cn } from "@/lib/utils";
import { normalizeMatchScore } from "@/lib/zorenta/match-score-display";

type MatchScoreBadgeProps = {
  score: number | null | undefined;
  summary?: string;
  narrativeSummary?: string;
  className?: string;
};

export function MatchScoreBadge({ score, summary, narrativeSummary, className }: MatchScoreBadgeProps) {
  const normalized = normalizeMatchScore(score);
  if (normalized === null) {
    return (
      <div className={cn("inline-flex flex-col gap-1", className)}>
        <span className="inline-flex items-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
          Match —
        </span>
      </div>
    );
  }
  const variant = normalized >= 80 ? "strong" : normalized >= 55 ? "medium" : "low";
  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <span
        className={cn(
          "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold",
          variant === "strong" && "bg-emerald-100 text-emerald-800",
          variant === "medium" && "bg-amber-100 text-amber-800",
          variant === "low" && "bg-slate-100 text-slate-600"
        )}
      >
        Match {normalized}%
      </span>
      {narrativeSummary && (
        <span className="max-w-[200px] text-[10px] font-medium text-slate-700 sm:max-w-none">
          {narrativeSummary}
        </span>
      )}
      {!narrativeSummary && summary && (
        <span className="max-w-[200px] truncate text-[10px] text-slate-500 sm:max-w-none">
          {summary}
        </span>
      )}
    </div>
  );
}
