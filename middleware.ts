import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

const ZORENTA_PUBLIC = [
  "/zorenta",
  "/zorenta/login",
  "/zorenta/register",
  "/zorenta/registration-closed",
];
const ZORENTA_PROTECTED = [
  "/zorenta/dashboard",
  "/zorenta/matches",
  "/zorenta/profile",
  "/zorenta/messages",
  "/zorenta/berichten",
  "/zorenta/notifications",
  "/zorenta/reviews",
  "/zorenta/search",
  "/zorenta/applications",
  "/zorenta/jobs",
  "/zorenta/intake",
];
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const apiCounts = new Map<string, { count: number; resetAt: number }>();

function isZorentaPublic(pathname: string): boolean {
  if (!pathname.startsWith("/zorenta")) return true;
  return ZORENTA_PUBLIC.includes(pathname);
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

function isZorentaProtected(pathname: string): boolean {
  if (!pathname.startsWith("/zorenta")) return false;
  if (ZORENTA_PROTECTED.includes(pathname)) return true;
  return ZORENTA_PROTECTED.some((p) => pathname.startsWith(p + "/"));
}

/** Avoid open redirects: only same-origin paths under /zorenta */
function safeZorentaNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/zorenta/dashboard";
  if (!next.startsWith("/zorenta")) return "/zorenta/dashboard";
  return next;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Ingelogde gebruikers: legacy `/dashboard` → SamenConnect (geen App Builder als default)
  if (pathname === "/dashboard") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
      let dashboardResponse = NextResponse.next();
      const supabaseDashboard = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              dashboardResponse.cookies.set(
                name,
                value,
                options as Parameters<typeof dashboardResponse.cookies.set>[2]
              );
            });
          },
        },
      });
      const {
        data: { user: dashboardUser },
      } = await supabaseDashboard.auth.getUser();
      if (dashboardUser) {
        return NextResponse.redirect(new URL("/zorenta/dashboard", req.url));
      }
      return dashboardResponse;
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/zorenta")) {
    const rateLimited = checkApiRateLimit(req);
    if (rateLimited) return rateLimited;
    return NextResponse.next();
  }

  const signupPath = pathname.replace(/\/$/, "") || "/";
  if (!REGISTRATION_OPEN && signupPath === "/signup") {
    const login = new URL("/login", req.url);
    login.searchParams.set("signup", "closed");
    return NextResponse.redirect(login);
  }

  if (!pathname.startsWith("/zorenta")) return NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // No Supabase config: keep previous behavior (do not block on missing cookie name)
  if (!supabaseUrl || !supabaseAnonKey) {
    if (isZorentaProtected(pathname) && !isZorentaPublic(pathname)) {
      const loginUrl = new URL("/zorenta/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const registerPath = pathname.replace(/\/$/, "") || "/";
  if (!REGISTRATION_OPEN && registerPath === "/zorenta/register" && !user) {
    return NextResponse.redirect(new URL("/zorenta/registration-closed", req.url));
  }

  // Logged in but on login → send to intended destination (no loop: login is public)
  if (pathname === "/zorenta/login" && user) {
    const dest = safeZorentaNext(req.nextUrl.searchParams.get("next"));
    return NextResponse.redirect(new URL(dest, req.url));
  }

  if (isZorentaProtected(pathname) && !isZorentaPublic(pathname) && !user) {
    const loginUrl = new URL("/zorenta/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard", "/signup", "/registration-closed", "/zorenta", "/zorenta/:path*", "/api/zorenta/:path*"],
};
