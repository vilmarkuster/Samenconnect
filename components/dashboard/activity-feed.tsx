import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  title: string;
  description?: string;
  time?: string;
  icon?: ReactNode;
};

export function ActivityFeed({
  title = "Recent activity",
  items,
  emptyMessage = "No recent activity.",
  className
}: {
  title?: string;
  items: ActivityItem[];
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3">
                {item.icon && (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                    {item.icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-slate-500">{item.description}</p>
                  )}
                  {item.time && (
                    <p className="mt-0.5 text-xs text-slate-400">{item.time}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
