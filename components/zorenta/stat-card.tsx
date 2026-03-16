"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LucideIcon, ArrowRight } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  href?: string;
  actionLabel?: string;
  action?: ReactNode;
};

export function ZorentaStatCard({ title, value, subtitle, icon: Icon, href, actionLabel, action }: StatCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {(href && actionLabel) && (
          <Link href={href} className="mt-3 inline-flex min-h-[2.25rem] items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700">
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        )}
        {action && <div className="mt-3">{action}</div>}
      </CardContent>
    </Card>
  );
}
