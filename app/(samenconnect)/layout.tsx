import { headers } from "next/headers";
import { ZorentaLayoutClient } from "@/components/zorenta/ZorentaLayoutClient";
import { isZorentaPublicPathname } from "@/lib/zorenta/public-paths";

type ZorentaLayoutMode = "public" | "app";

function resolveMode(pathname: string): ZorentaLayoutMode {
  return isZorentaPublicPathname(pathname) ? "public" : "app";
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
