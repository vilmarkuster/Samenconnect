import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type QuickAction = {
  label: string;
  href: string;
  description?: string;
  icon?: ReactNode;
};

export function QuickActions({
  title = "Quick actions",
  actions,
  className
}: {
  title?: string;
  actions: QuickAction[];
  className?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {action.icon}
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
