import { headers } from "next/headers";
import { ZorentaLayoutClient } from "@/components/zorenta/ZorentaLayoutClient";

type ZorentaLayoutMode = "public" | "app";

const PUBLIC_ROUTES = ["/zorenta", "/zorenta/login", "/zorenta/register", "/zorenta/registration-closed"];

function resolveMode(pathname: string): ZorentaLayoutMode {
  return PUBLIC_ROUTES.includes(pathname) ? "public" : "app";
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
