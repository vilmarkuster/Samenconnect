"use client";

import { cn } from "@/lib/utils";

export function ZorentaPageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-6", className)}>
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-md bg-slate-200" />
        <div className="h-4 w-72 rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-3 h-8 w-32 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-full rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
