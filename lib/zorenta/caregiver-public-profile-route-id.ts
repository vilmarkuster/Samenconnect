/**
 * Id selection for `/zorenta/caregivers/[id]`.
 * GET resolves profiles.id (linked caregiver), caregiver_profiles PK, or public.caregivers.id.
 * Prefer linked profile ids over marketplace listing ids so seed/demo marketplace rows never win.
 */

/** Known seed / placeholder marketplace rows — must not override a real linked profile URL. */
export const DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS = new Set([
  "00000000-0000-0000-0000-000000000001",
]);

export function publicCaregiverProfileRouteSegment(input: {
  /** `profiles.id` — preferred when the row is a linked SamenConnect caregiver. */
  profileId?: string | null;
  /** `caregiver_profiles.id` — valid path segment (GET step A). */
  caregiverProfilePk?: string | null;
  /** `public.caregivers.id` — only when no linked profile exists. */
  marketplaceListingId?: string | null;
}): string {
  const pid = input.profileId?.trim();
  if (pid) return pid;

  const cpk = input.caregiverProfilePk?.trim();
  if (cpk) return cpk;

  const mp = input.marketplaceListingId?.trim();
  if (mp && !DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS.has(mp)) return mp;

  return "";
}

export function logDevNavigatingToCaregiverPublicProfile(pathId: string, displayName: string): void {
  if (process.env.NODE_ENV !== "development") return;
  // eslint-disable-next-line no-console -- dev-only navigation audit
  console.log(`navigating to caregiver public profile id=${pathId} name=${displayName}`);
}
