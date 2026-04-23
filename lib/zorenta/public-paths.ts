/**
 * Central definition of which SamenConnect app paths are public (no login required).
 * Used by middleware, server layout, and ZorentaLayoutClient — keep in sync.
 */

export function normalizeAppPathname(pathname: string | null | undefined): string {
  if (pathname == null) return "";
  const t = pathname.trim();
  if (!t) return "";
  return t.replace(/\/+$/, "") || "/";
}

/**
 * True when the path may be viewed without authentication.
 * Uses prefix matching for /privacy and /terms so trailing slashes, subpaths, and query-only URLs (pathname) work.
 */
export function isZorentaPublicPathname(pathname: string | null | undefined): boolean {
  if (pathname == null) return false;
  if (!pathname.startsWith("/")) return true;

  const p = normalizeAppPathname(pathname);
  if (!p) return false;

  if (p === "/" || p === "/login" || p === "/register" || p === "/registration-closed") return true;

  if (p.startsWith("/privacy")) return true;
  if (p.startsWith("/terms")) return true;

  return false;
}
