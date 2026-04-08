import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function missingConfigError() {
  return new Error(
    "Supabase URL/anon key missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

/**
 * Server-side Supabase client that reads the user's session from cookies.
 * This is required so `auth.uid()` works in RLS policies.
 */
export function getPlatformSupabaseServerClient(
  req: NextRequest
): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) throw missingConfigError();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      // No cookie writes inside route handlers to keep response wiring simple.
      // For RLS `auth.uid()` enforcement, reading the existing session cookies is sufficient.
      setAll(
        _cookiesToSet: Array<{
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }>
      ) {},
    },
  });
}

export async function getPlatformUserOrNull(
  req: NextRequest
): Promise<User | null> {
  const supabase = getPlatformSupabaseServerClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

