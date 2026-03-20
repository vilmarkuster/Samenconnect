import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient | null = null;
let serverAnonClient: SupabaseClient | null = null;

/**
 * Supabase client for the app.
 * - In the browser: uses @supabase/ssr createBrowserClient so the session is
 *   stored in cookies (middleware + server can see the same session).
 * - On the server (API routes, RSC): plain anon client without user cookies.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL or anon key is missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  if (typeof window !== "undefined") {
    if (!browserClient) {
      browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return browserClient;
  }

  if (!serverAnonClient) {
    serverAnonClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return serverAnonClient;
}
