"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ContentCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Consistent content card for app shell: optional header, padded content.
 */
export function ContentCard({
  title,
  description,
  children,
  className,
}: ContentCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && (
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-slate-500">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={title || description ? "pt-0" : undefined}>
        {children}
      </CardContent>
    </Card>
  );
}
