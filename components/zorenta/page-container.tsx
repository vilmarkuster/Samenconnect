"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ZorentaPageContainerProps = {
  children: ReactNode;
  className?: string;
  /** max-w-2xl = narrow (forms, detail), max-w-4xl = default, max-w-6xl = wide */
  maxWidth?: "narrow" | "default" | "wide";
};

const maxWidthClasses = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
};

export function ZorentaPageContainer({
  children,
  className,
  maxWidth = "default",
}: ZorentaPageContainerProps) {
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
