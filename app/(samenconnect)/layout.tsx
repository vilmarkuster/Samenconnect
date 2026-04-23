import { headers } from "next/headers";
import { ZorentaLayoutClient } from "@/components/zorenta/ZorentaLayoutClient";

type ZorentaLayoutMode = "public" | "app";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/registration-closed"];

function normalizePathname(pathname: string): string {
  const t = pathname.trim();
  if (!t) return "";
  return t.replace(/\/+$/, "") || "/";
}

function resolveMode(pathname: string): ZorentaLayoutMode {
  const p = normalizePathname(pathname);
  return PUBLIC_ROUTES.includes(p) ? "public" : "app";
}

export default async function ZorentaLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const mode = resolveMode(pathname);

  return (
    <ZorentaLayoutClient mode={mode} initialPathname={pathname}>
      {children}
    </ZorentaLayoutClient>
  );
}
