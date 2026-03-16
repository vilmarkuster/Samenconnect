"use client";

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type ZorentaInfoCardProps = {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  variant?: "default" | "success" | "muted";
  className?: string;
};

const variantClasses = {
  default:
    "border-slate-200 bg-white text-slate-700",
  success:
    "border-emerald-200 bg-emerald-50/80 text-emerald-800",
  muted:
    "border-slate-100 bg-slate-50/80 text-slate-600",
};

export function ZorentaInfoCard({
  icon: Icon,
  title,
  children,
  variant = "default",
  className,
}: ZorentaInfoCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 shadow-sm",
        variantClasses[variant],
        className
      )}
    >
      {title && (
        <p className="flex items-center gap-2 font-medium">
          {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" />}
          {title}
        </p>
      )}
      <div className={Icon ? "mt-1.5 pl-6 text-sm" : "mt-1 text-sm"}>
        {children}
      </div>
    </div>
  );
}
