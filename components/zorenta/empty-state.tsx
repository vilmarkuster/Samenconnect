"use client";

import { ReactNode } from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function ZorentaEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center sm:py-16",
        className
      )}
    >
      <div className="rounded-full bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <Icon className="h-10 w-10 text-slate-400" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2 [&_a]:inline-flex [&_a]:min-h-[44px] [&_a]:items-center [&_button]:min-h-[44px]">{action}</div>}
    </div>
  );
}
