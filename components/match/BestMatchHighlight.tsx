"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type BestMatchHighlightProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Wraps the top/best match card with a subtle highlight (e.g. border + icon).
 */
export function BestMatchHighlight({ children, className }: BestMatchHighlightProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-emerald-200 bg-emerald-50/30 p-px",
        className
      )}
    >
      <div className="absolute -top-2.5 left-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
        <Sparkles className="h-3 w-3" />
        Beste match
      </div>
      <div className="rounded-[10px] bg-white">{children}</div>
    </div>
  );
}
