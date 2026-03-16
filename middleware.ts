import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ZORENTA_PUBLIC = ["/zorenta", "/zorenta/login", "/zorenta/register"];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const apiCounts = new Map<string, { count: number; resetAt: number }>();

function isZorentaPublic(pathname: string): boolean {
  if (!pathname.startsWith("/zorenta")) return true;
  return ZORENTA_PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));
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

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname.startsWith("/api/zorenta")) {
    const rateLimited = checkApiRateLimit(req);
    if (rateLimited) return rateLimited;
    return NextResponse.next();
  }

  if (!pathname.startsWith("/zorenta")) return NextResponse.next();
  if (isZorentaPublic(pathname)) return NextResponse.next();

  const cookieName = getSupabaseAuthCookieName();
  if (cookieName && req.cookies.get(cookieName)?.value) return NextResponse.next();

  const login = new URL("/zorenta/login", req.url);
  login.searchParams.set("redirect", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/zorenta", "/zorenta/:path*", "/api/zorenta/:path*"],
};
