"use client";

import { cn } from "@/lib/utils";

type MatchScoreBadgeProps = {
  score: number;
  summary?: string;
  narrativeSummary?: string;
  className?: string;
};

export function MatchScoreBadge({ score, summary, narrativeSummary, className }: MatchScoreBadgeProps) {
  const safeScore = Number.isFinite(score) ? Math.round(Math.min(100, Math.max(0, score))) : 0;
  const variant = safeScore >= 80 ? "strong" : safeScore >= 55 ? "medium" : "low";
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
        Match {safeScore}%
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
