/**
 * Maps legacy `/zorenta/*` notification targets to current SamenConnect routes.
 * Used when serving notifications so "Bekijken" never points at removed paths.
 */
export function normalizeNotificationLink(link: string | null | undefined): string | null {
  if (link == null) return null;
  const trimmed = link.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  let hash = "";
  let pathAndQuery = trimmed;
  const hashIdx = pathAndQuery.indexOf("#");
  if (hashIdx >= 0) {
    hash = pathAndQuery.slice(hashIdx);
    pathAndQuery = pathAndQuery.slice(0, hashIdx);
  }
  let query = "";
  let pathname = pathAndQuery;
  const qIdx = pathname.indexOf("?");
  if (qIdx >= 0) {
    query = pathname.slice(qIdx);
    pathname = pathname.slice(0, qIdx);
  }
  pathname = pathname.replace(/\/+$/, "") || "/";

  const withQuery = (p: string) => p + query + hash;

  if (pathname === "/zorenta/messages" || pathname === "/messages") {
    return withQuery("/berichten");
  }
  const msgDeep = /^\/messages\/([^/]+)$/.exec(pathname);
  if (msgDeep) {
    return `/berichten?conversation=${encodeURIComponent(msgDeep[1])}${hash}`;
  }
  const zMsgPrefix = "/zorenta/messages/";
  if (pathname.startsWith(zMsgPrefix)) {
    const id = pathname.slice(zMsgPrefix.length);
    if (id && !id.includes("/")) {
      return `/berichten?conversation=${encodeURIComponent(id)}${hash}`;
    }
    return withQuery("/berichten");
  }

  if (pathname === "/zorenta/applications" || pathname === "/zorenta/sollicitaties") {
    return withQuery("/applications");
  }

  if (pathname === "/zorenta/profile" || pathname === "/zorenta/matches") {
    if (pathname === "/zorenta/matches") return withQuery("/matches");
    return withQuery("/profile");
  }

  if (pathname === "/zorenta/jobs") {
    return withQuery("/jobs");
  }

  if (pathname === "/zorenta/notifications") {
    return withQuery("/notifications");
  }

  if (pathname === "/zorenta/dashboard") {
    return withQuery("/dashboard");
  }

  if (pathname.startsWith("/zorenta/")) {
    return withQuery("/dashboard");
  }

  return trimmed;
}
