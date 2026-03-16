/**
 * Feature gating preparation for Zorenta.
 * No enforcement yet – all checks return permissive values.
 * Use these helpers so we can add real gating later without changing call sites.
 */

import type { PlanSlug } from "./plans";

export type FeatureId =
  | "featured_job"
  | "featured_profile"
  | "unlimited_jobs"
  | "advanced_filters"
  | "priority_support"
  | "platform_fee_waived";

/** Returns whether the user's plan allows this feature. For now, no locking. */
export function hasFeature(planSlug: PlanSlug | null | undefined, feature: FeatureId): boolean {
  if (!planSlug || planSlug === "free") {
    // Future: return false for paid-only features
    if (feature === "featured_job" || feature === "featured_profile") return false;
    if (feature === "unlimited_jobs" || feature === "advanced_filters") return true; // allow for now
    if (feature === "priority_support" || feature === "platform_fee_waived") return false;
  }
  // Pro / Team / Featured: allow all for now (placeholder)
  if (planSlug === "pro" || planSlug === "team" || planSlug === "featured") return true;
  return true;
}

/** Whether the user can create a featured job. Not enforced yet. */
export function canUseFeaturedJob(planSlug: PlanSlug | null | undefined): boolean {
  return hasFeature(planSlug, "featured_job");
}

/** Whether the caregiver can have a featured profile. Not enforced yet. */
export function canUseFeaturedProfile(planSlug: PlanSlug | null | undefined): boolean {
  return hasFeature(planSlug, "featured_profile");
}

/** Whether the org/client can post unlimited jobs. Not enforced yet. */
export function canUseUnlimitedPostings(planSlug: PlanSlug | null | undefined): boolean {
  return hasFeature(planSlug, "unlimited_jobs");
}

/** Whether the user gets advanced search filters. Not enforced yet. */
export function canUseAdvancedFilters(planSlug: PlanSlug | null | undefined): boolean {
  return hasFeature(planSlug, "advanced_filters");
}

/** Whether the user gets priority support. Not enforced yet. */
export function canUsePrioritySupport(planSlug: PlanSlug | null | undefined): boolean {
  return hasFeature(planSlug, "priority_support");
}
