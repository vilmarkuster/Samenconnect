"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  /** narrow = max-w-2xl, default = max-w-4xl, wide = max-w-6xl */
  maxWidth?: "narrow" | "default" | "wide";
};

const maxWidthClasses = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
};

export function PageContainer({
  children,
  className,
  maxWidth = "default",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}
