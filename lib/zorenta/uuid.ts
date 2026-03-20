/** Canonical string form for comparing UUIDs from DB vs auth (casing / whitespace). */
export function normalizeUuidString(id: string): string {
  return id.trim().toLowerCase();
}
