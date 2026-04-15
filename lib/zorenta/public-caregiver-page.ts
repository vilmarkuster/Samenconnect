import { resolveCaregiverPagePayload } from "@/lib/zorenta/normalize-caregiver-profile-display";

/**
 * True when a GET /api/zorenta/caregivers/[id] JSON body can drive `/zorenta/caregivers/[id]`
 * (normalized `caregiver_profiles` shape on caregiver/pageCaregiver).
 *
 * Organisation + marketplace listings return 200 but fail this check — contact flows may still
 * use `profile.id`; public profile links must not be shown in that case (optie A).
 */
export function hasRenderablePublicCaregiverPagePayload(api: Record<string, unknown>): boolean {
  return resolveCaregiverPagePayload(api) != null;
}
