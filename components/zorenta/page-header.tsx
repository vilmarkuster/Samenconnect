"use client";

import { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function ZorentaPageHeader({
  title,
  description,
  backHref,
  backLabel = "Terug",
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {backHref && (
        <a
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:-ml-1 sm:px-1"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {backLabel}
        </a>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-slate-500 sm:mt-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:mt-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
