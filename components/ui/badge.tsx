import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-100 text-slate-800 border-slate-200",
  secondary: "bg-slate-100 text-slate-600 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  destructive: "bg-red-50 text-red-700 border-red-200",
  outline: "border-slate-200 text-slate-700 bg-transparent"
};

export function Badge({
  children,
  variant = "default",
  className
}: {
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
