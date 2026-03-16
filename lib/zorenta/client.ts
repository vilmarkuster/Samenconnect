import { getSupabaseClient } from "@/lib/supabase-client";

/**
 * Returns the current session's access token for use in Zorenta API calls (Authorization: Bearer).
 * Call from client components only.
 */
export async function getZorentaAccessToken(): Promise<string | null> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token ?? null;
}

export function zorentaHeaders(token: string | null): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
