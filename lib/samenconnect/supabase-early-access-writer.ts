import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleClient } from "@/lib/zorenta/supabase-service-role";

export type EarlyAccessDbMode = "service_role" | "anon_server";

export type EarlyAccessDbResult =
  | { kind: "ok"; client: SupabaseClient; mode: EarlyAccessDbMode }
  | { kind: "error"; code: "missing_supabase_url" | "missing_anon_key" };

/**
 * Client voor early_access_signups inserts.
 * - Bij voorkeur service role (productie): insert + optioneel `team_email_sent_at` update.
 * - Zonder service role: anon serverclient (na migratie met insert-policy), alleen insert.
 */
export function getEarlyAccessSignupSupabase(): EarlyAccessDbResult {
  const service = getSupabaseServiceRoleClient();
  if (service) {
    return { kind: "ok", client: service, mode: "service_role" };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url) {
    return { kind: "error", code: "missing_supabase_url" };
  }
  if (!anonKey) {
    return { kind: "error", code: "missing_anon_key" };
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { kind: "ok", client, mode: "anon_server" };
}
