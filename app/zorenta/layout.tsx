import { headers } from "next/headers";
import { ZorentaLayoutClient } from "@/components/zorenta/ZorentaLayoutClient";

type ZorentaLayoutMode = "public" | "app";

const PUBLIC_ROUTES = ["/zorenta", "/zorenta/login", "/zorenta/register"];

function resolveMode(pathname: string): ZorentaLayoutMode {
  return PUBLIC_ROUTES.includes(pathname) ? "public" : "app";
}

export default async function ZorentaLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const mode = resolveMode(pathname);

  return (
    <>
      <div className="fixed left-4 top-28 z-[9999] rounded-lg bg-blue-700 px-3 py-1 text-sm font-bold text-white shadow-lg">
        ZORENTA SERVER LAYOUT
      </div>
      <ZorentaLayoutClient mode={mode} initialPathname={pathname}>
        {children}
      </ZorentaLayoutClient>
    </>
  );
}
