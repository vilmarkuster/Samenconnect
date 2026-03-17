import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ZORENTA_PUBLIC = ["/zorenta", "/zorenta/login", "/zorenta/register"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const apiCounts = new Map<string, { count: number; resetAt: number }>();

function isZorentaPublic(pathname: string): boolean {
  if (!pathname.startsWith("/zorenta")) return true;
  // Only treat the three explicit routes as public; all other /zorenta/*
  // paths must go through the authenticated Zorenta shell.
  return ZORENTA_PUBLIC.includes(pathname);
}

function getSupabaseAuthCookieName(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const ref = url.replace(/^https?:\/\//, "").split(".")[0] ?? "";
  return ref ? `sb-${ref}-auth-token` : "";
}

function getClientId(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
}

function checkApiRateLimit(req: NextRequest): NextResponse | null {
  const key = getClientId(req);
  const now = Date.now();
  let entry = apiCounts.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    apiCounts.set(key, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "Te veel verzoeken. Probeer het later opnieuw." }, { status: 429 });
  }
  return null;
}

function nextWithPathname(req: NextRequest, pathname: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/zorenta")) {
    const rateLimited = checkApiRateLimit(req);
    if (rateLimited) return rateLimited;
    return NextResponse.next();
  }

  if (!pathname.startsWith("/zorenta")) return NextResponse.next();

  // For all /zorenta routes (public and authenticated), just attach x-pathname
  // so the Zorenta layout can resolve the correct shell. Authentication and
  // redirects are handled inside the app using Supabase session state.
  return nextWithPathname(req, pathname);
}

export const config = {
  matcher: ["/zorenta", "/zorenta/:path*", "/api/zorenta/:path*"],
};
