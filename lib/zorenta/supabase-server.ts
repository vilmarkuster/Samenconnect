import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase-client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Returns a Supabase client with the user's JWT so RLS applies.
 * Use in API routes: pass the Authorization header (Bearer token) from the client.
 */
export function getZorentaSupabaseClient(accessToken: string | null): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL or anon key is missing.");
  }
  if (accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } }
    });
  }
  return getSupabaseClient();
}

/**
 * Extract Bearer token from NextRequest (Authorization header or body for server-side).
 */
export function getAccessTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
