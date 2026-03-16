import { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  subtitle,
  href,
  actionLabel,
  icon,
  className
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  href?: string;
  actionLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  const content = (
    <Card className={cn("transition-shadow hover:shadow-soft", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {title}
        </span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {actionLabel && href && (
          <Link href={href}>
            <Button variant="ghost" size="sm" className="mt-3 h-8 text-primary-600">
              {actionLabel}
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
  if (href && !actionLabel) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
