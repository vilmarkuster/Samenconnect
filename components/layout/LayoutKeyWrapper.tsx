"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

/**
 * Keys the layout subtree by pathname so that when navigating between
 * different app sections (e.g. /dashboard vs /dashboard), React
 * unmounts the previous layout and mounts the new one. Fixes the issue
 * where client-side navigation showed the wrong layout (e.g. protected
 * shell instead of zorenta shell) because the previous layout was reused.
 */
export function LayoutKeyWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const segment = pathname?.split("/")[1] ?? "root";
  return <div key={segment}>{children}</div>;
}
