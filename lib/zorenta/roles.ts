export type ZorentaRole = "admin" | "organisatie" | "zorgverlener" | "client";

/**
 * Maps Supabase `profiles.role` values (currently: caregiver|client|organization|admin)
 * into our planned Dutch-facing role names.
 *
 * NOTE: This is a foundation helper only. Role enforcement (RLS/policies) is not
 * implemented yet.
 */
export function mapSupabaseRoleToZorentaRole(role: string | null | undefined): ZorentaRole | null {
  const r = role?.toLowerCase() ?? "";
  if (r === "admin") return "admin";
  if (r === "organization") return "organisatie";
  if (r === "caregiver") return "zorgverlener";
  if (r === "client") return "client";
  return null;
}

