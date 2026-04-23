import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { jsonResponse } from "@/lib/zorenta/auth";
import {
  devLogCaregiverProfileRawSource,
  selectCaregiverProfileRowByProfileId,
} from "@/lib/zorenta/caregiver-profile-repository";
import { getSupabaseForPublicCaregiverApi } from "@/lib/zorenta/supabase-for-public-caregiver-api";
import {
  normalizeCaregiverProfileRow,
  type NormalizedCaregiverProfileForDisplay,
} from "@/lib/zorenta/normalize-caregiver-profile-display";

type LinkedReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
};

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter(Boolean).map((x) => String(x)) : [];
}

function mapProviderType(providerTypeRaw: unknown) {
  const providerType = String(providerTypeRaw ?? "zzp").trim().toLowerCase();

  if (providerType === "organisatie") {
    return { role: "Organisatie" as const, arrangement: "ZZP" as const, isVolunteer: false };
  }
  if (providerType === "vrijwilliger") {
    return { role: "Vrijwilliger" as const, arrangement: "Vrijwillig" as const, isVolunteer: true };
  }
  if (providerType === "mantelzorger") {
    return { role: "Mantelzorger" as const, arrangement: "Mantelzorg" as const, isVolunteer: false };
  }

  return { role: "ZZP zorgverlener" as const, arrangement: "ZZP" as const, isVolunteer: false };
}

async function fetchReviewsForProfile(
  supabase: SupabaseClient,
  profileId: string
): Promise<
  | { error: string; status: number }
  | { reviews: LinkedReview[]; averageRating: number | null; reviewCount: number }
> {
  const { data: reviews, error: rError } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("reviewee_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (rError) return { error: rError.message, status: 500 };

  const { data: agg } = await supabase.from("reviews").select("rating").eq("reviewee_id", profileId);

  const ratings = (agg ?? []).map((r: { rating: number }) => r.rating).filter((n: number) => n != null);
  const average = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;

  return {
    reviews: (reviews ?? []) as LinkedReview[],
    averageRating: average != null ? Math.round(average * 10) / 10 : null,
    reviewCount: ratings.length,
  };
}

/** Linked caregiver: `caregiver_profiles` row for `profile_id` (GET resolves this before `profiles.role` checks). */
async function fetchLinkedCaregiverData(supabase: SupabaseClient, profileId: string) {
  const { data: caregiver, error: cError } = await selectCaregiverProfileRowByProfileId(supabase, profileId);
  if (cError || !caregiver) return { error: "Caregiver profile not found." as const, status: 404 };
  devLogCaregiverProfileRawSource("fetchLinkedCaregiverData", profileId, caregiver);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("id", profileId)
    .maybeSingle();

  const rev = await fetchReviewsForProfile(supabase, profileId);
  if ("error" in rev) return { error: rev.error, status: rev.status };

  return {
    profileId,
    profile: {
      id: profileId,
      display_name: profile?.display_name ?? null,
      role: profile?.role ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
    caregiver,
    reviews: rev.reviews,
    averageRating: rev.averageRating,
    reviewCount: rev.reviewCount,
  };
}

/** Linked organization: profiles.role = organization; organization_profiles may be hidden by RLS — then fallback to profile + marketplace only */
async function fetchLinkedOrganizationData(supabase: SupabaseClient, profileId: string) {
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("id", profileId)
    .single();
  if (pError || !profile) return { error: "Profile not found." as const, status: 404 };
  if (profile.role !== "organization") return { error: "Organization profile not found." as const, status: 404 };

  const { data: organization } = await supabase
    .from("organization_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();

  const rev = await fetchReviewsForProfile(supabase, profileId);
  if ("error" in rev) return { error: rev.error, status: rev.status };

  return {
    profileId,
    profile,
    organization: organization ?? null,
    reviews: rev.reviews,
    averageRating: rev.averageRating,
    reviewCount: rev.reviewCount,
  };
}

type MarketplaceRow = Record<string, unknown>;

function pageCaregiverFromOrganizationLinked(
  linked: {
    profileId: string;
    profile: { id: string; display_name: string | null; role: string | null; avatar_url?: string | null };
    organization: Record<string, unknown> | null;
    reviews: LinkedReview[];
    averageRating: number | null;
    reviewCount: number;
  },
  marketplaceRow: MarketplaceRow | null
) {
  const org = linked.organization;
  const orgName = org ? String(org.name ?? "") : "";
  const orgDescription = org && org.description != null ? String(org.description) : "";
  const orgCity = org && org.city != null ? String(org.city) : "";
  const city = (orgCity || (marketplaceRow ? String(marketplaceRow.location ?? "") : "")).trim();
  const bioText =
    orgDescription.trim() ||
    (org
      ? ""
      : "Dit aanbod komt van een geregistreerde organisatie op SamenConnect. Aanvullende organisatiegegevens kunnen beperkt zichtbaar zijn.");

  const rate =
    marketplaceRow &&
    (typeof marketplaceRow.prijs === "number"
      ? marketplaceRow.prijs
      : marketplaceRow.prijs == null
        ? null
        : Number(marketplaceRow.prijs));

  return {
    headline: null,
    bio: bioText || null,
    skills: [] as string[],
    city: city || null,
    region: null,
    country: null,
    experience_years: null,
    availability: null,
    certifications: null,
    hourly_rate: rate != null && Number.isFinite(rate as number) ? (rate as number) : null,
  };
}

/** Response shape for `/caregivers/[id]` page (expects `profile` + structured `caregiver`). */
function buildZorentaCaregiverPageResponse(linked: {
  profileId: string;
  profile: { id: string; display_name: string | null; role: string | null; avatar_url?: string | null };
  caregiver: Record<string, unknown>;
  reviews: LinkedReview[];
  averageRating: number | null;
  reviewCount: number;
}) {
  const normalized = normalizeCaregiverProfileRow(linked.caregiver as Record<string, unknown>, {
    includePrivateContact: false,
  })!;

  return {
    profile: { id: linked.profile.id, display_name: linked.profile.display_name, avatar_url: linked.profile.avatar_url ?? null },
    caregiver: normalized,
    reviews: linked.reviews,
    averageRating: linked.averageRating,
    reviewCount: linked.reviewCount,
  };
}

type LinkedPageBase = ReturnType<typeof buildZorentaCaregiverPageResponse>;

/** Zelfde normalized caregiver als /api/zorenta/me; géén marketplace-kaart op `caregiver`. */
function jsonResponseLinkedCaregiverProfile(
  base: LinkedPageBase,
  opts: {
    routeId: string;
    source: "linked-caregiver-profile";
    mode?: string;
  }
) {
  const body: Record<string, unknown> = {
    source: opts.source,
    mode: opts.mode ?? "linked-caregiver",
    profile: base.profile,
    caregiver: base.caregiver,
    pageCaregiver: base.caregiver,
    reviews: base.reviews,
    averageRating: base.averageRating,
    reviewCount: base.reviewCount,
  };
  return jsonResponse(body);
}

function devLogCaregiverGet(
  routeId: string,
  branch: string,
  body: Record<string, unknown> | null,
  linkedFound: boolean
) {
  if (process.env.NODE_ENV !== "development") return;
  const cg = body?.caregiver as Record<string, unknown> | undefined;
  const pc = body?.pageCaregiver as Record<string, unknown> | undefined;
  const prof = body?.profile as { id?: string | null } | undefined;
  // eslint-disable-next-line no-console -- dev-only routing audit
  console.log("[GET /api/zorenta/caregivers/[id]]", {
    routeId,
    branch,
    source: body?.source,
    mode: body?.mode,
    linkedCaregiverFound: linkedFound,
    profileId: prof?.id ?? null,
    caregiverHourlyRate: cg?.hourly_rate,
    caregiverSkills: cg?.skills,
    caregiverCertifications: cg?.certifications,
    pageCaregiverHourlyRate: pc?.hourly_rate,
    pageCaregiverSkills: pc?.skills,
    pageCaregiverCertifications: pc?.certifications,
    hasMarketplaceCard: body != null && "marketplaceCard" in body,
  });
}

function buildDisplayFromMarketplaceAndLinkedOrganization(
  marketplaceRow: MarketplaceRow,
  linked: {
    profileId: string;
    profile: { id: string; display_name: string | null; role: string | null; avatar_url?: string | null };
    organization: Record<string, unknown> | null;
    reviews: LinkedReview[];
    averageRating: number | null;
    reviewCount: number;
  }
) {
  const providerType = marketplaceRow.provider_type ?? "zzp";
  const { role, arrangement, isVolunteer } = mapProviderType(providerType);

  const tags = [
    ...toStringArray(marketplaceRow.zorgtype),
    ...toStringArray(marketplaceRow.specialisaties),
    ...toStringArray(marketplaceRow.vaardigheden),
  ].filter(Boolean);
  const certifications = [...toStringArray(marketplaceRow.certificaten), ...toStringArray(marketplaceRow.registraties)].filter(Boolean);
  const skills = toStringArray(marketplaceRow.vaardigheden);

  const org = linked.organization;
  const orgName = org ? String(org.name ?? "") : "";
  const orgDescription = org && org.description != null ? String(org.description) : "";
  const orgCity = org && org.city != null ? String(org.city) : "";

  const name =
    (orgName || linked.profile.display_name || String(marketplaceRow.name ?? "")).trim() || "Organisatie";
  const city = (orgCity || String(marketplaceRow.location ?? "")).trim();
  const bio =
    orgDescription.trim() ||
    (org
      ? ""
      : "Dit aanbod komt van een geregistreerde organisatie op SamenConnect. Aanvullende organisatiegegevens kunnen beperkt zichtbaar zijn.");

  const rate =
    typeof marketplaceRow.prijs === "number"
      ? (marketplaceRow.prijs as number)
      : marketplaceRow.prijs == null
        ? null
        : Number(marketplaceRow.prijs);

  return {
    mode: "linked-organization" as const,
    caregiver: {
      id: String(marketplaceRow.id),
      linkedProfileId: linked.profileId,
      name,
      role,
      city,
      rate: Number.isFinite(rate as number) ? rate : null,
      isVolunteer,
      tags,
      skills,
      certifications,
      arrangement,
      bio,
    },
    organization: linked.organization,
    reviews: linked.reviews,
    averageRating: linked.averageRating,
    reviewCount: linked.reviewCount,
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: routeId } = await params;
  const supabase = getSupabaseForPublicCaregiverApi(req);

  const returnLinked = (
    branch: string,
    linked: Awaited<ReturnType<typeof fetchLinkedCaregiverData>> & object
  ) => {
    if ("error" in linked) return null;
    const base = buildZorentaCaregiverPageResponse(linked);
    const body: Record<string, unknown> = {
      source: "linked-caregiver-profile",
      mode: "linked-caregiver",
      profile: base.profile,
      caregiver: base.caregiver,
      pageCaregiver: base.caregiver,
      reviews: base.reviews,
      averageRating: base.averageRating,
      reviewCount: base.reviewCount,
    };
    devLogCaregiverGet(routeId, branch, body, true);
    return jsonResponseLinkedCaregiverProfile(base, {
      routeId,
      source: "linked-caregiver-profile",
      mode: "linked-caregiver",
    });
  };

  // —— 1) routeId = profiles.id met caregiver_profiles (geen role-check; lost stale profiles.role op) ——
  const linkedByProfileId = await fetchLinkedCaregiverData(supabase, routeId);
  const r1 = returnLinked("1_caregiver_profiles_by_profile_id", linkedByProfileId);
  if (r1) return r1;

  // —— 2) routeId = caregiver_profiles.id (PK) ——
  const { data: cgRowByPk } = await supabase
    .from("caregiver_profiles")
    .select("profile_id")
    .eq("id", routeId)
    .maybeSingle();
  if (cgRowByPk?.profile_id) {
    const linked = await fetchLinkedCaregiverData(supabase, String(cgRowByPk.profile_id));
    const r2 = returnLinked("2_caregiver_profiles_by_row_pk", linked);
    if (r2) return r2;
  }

  // —— 3) routeId = public.caregivers.id: alleen linked account; geen marketplace-only body ——
  const { data: marketplaceRow } = await supabase.from("caregivers").select("*").eq("id", routeId).maybeSingle();

  if (marketplaceRow) {
    if (!marketplaceRow.profile_id) {
      devLogCaregiverGet(routeId, "3_marketplace_row_no_profile_id", null, false);
      return jsonResponse({ error: "Profile not found." }, 404);
    }

    const pid = String(marketplaceRow.profile_id);
    const { data: linkedProfile, error: lpErr } = await supabase
      .from("profiles")
      .select("id, display_name, role, avatar_url")
      .eq("id", pid)
      .single();

    if (lpErr || !linkedProfile) {
      devLogCaregiverGet(routeId, "3_marketplace_linked_profile_missing", null, false);
      return jsonResponse({ error: "Profile not found." }, 404);
    }

    const linkedTry = await fetchLinkedCaregiverData(supabase, pid);
    if (!("error" in linkedTry)) {
      const r3 = returnLinked("3_marketplace_row_with_caregiver_profiles", linkedTry);
      if (r3) return r3;
    }

    if (linkedProfile.role === "organization") {
      const linked = await fetchLinkedOrganizationData(supabase, pid);
      if ("error" in linked) {
        devLogCaregiverGet(routeId, "3_org_fetch_error", null, false);
        return jsonResponse({ error: linked.error }, linked.status);
      }
      const orgBody: Record<string, unknown> = {
        ...buildDisplayFromMarketplaceAndLinkedOrganization(marketplaceRow, linked),
        profile: { id: linked.profileId, display_name: linked.profile.display_name, avatar_url: linked.profile.avatar_url ?? null },
        pageCaregiver: pageCaregiverFromOrganizationLinked(linked, marketplaceRow),
      };
      devLogCaregiverGet(routeId, "3_marketplace_organization", orgBody, false);
      return jsonResponse(orgBody);
    }

    devLogCaregiverGet(routeId, "3_marketplace_no_caregiver_profile", null, false);
    return jsonResponse({ error: "Profile not found." }, 404);
  }

  // —— 4) Organization: profile UUID als route (zonder marketplace-rij hierboven) ——
  const profileIdResolved = routeId;
  const { data: legacyProfile, error: legPErr } = await supabase
    .from("profiles")
    .select("id, display_name, role, avatar_url")
    .eq("id", profileIdResolved)
    .single();

  if (legPErr || !legacyProfile) {
    devLogCaregiverGet(routeId, "4_no_profile", null, false);
    return jsonResponse({ error: "Profile not found." }, 404);
  }

  const { data: linkedMarketplaceRow } = await supabase
    .from("caregivers")
    .select("*")
    .eq("profile_id", profileIdResolved)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyProfile.role === "organization") {
    const linked = await fetchLinkedOrganizationData(supabase, profileIdResolved);
    if ("error" in linked) {
      devLogCaregiverGet(routeId, "4_org_error", null, false);
      return jsonResponse({ error: linked.error }, linked.status);
    }

    if (linkedMarketplaceRow) {
      const orgBody: Record<string, unknown> = {
        ...buildDisplayFromMarketplaceAndLinkedOrganization(linkedMarketplaceRow, linked),
        profile: { id: linked.profileId, display_name: linked.profile.display_name, avatar_url: linked.profile.avatar_url ?? null },
        pageCaregiver: pageCaregiverFromOrganizationLinked(linked, linkedMarketplaceRow),
      };
      devLogCaregiverGet(routeId, "4_organization_with_marketplace", orgBody, false);
      return jsonResponse(orgBody);
    }

    const org = linked.organization;
    const orgName = org ? String(org.name ?? "") : "";
    const orgDescription = org && org.description != null ? String(org.description) : "";
    const orgCity = org && org.city != null ? String(org.city) : "";

    const name = (orgName || linked.profile.display_name || "").trim() || "Organisatie";
    const city = orgCity.trim();
    const bio =
      orgDescription.trim() ||
      (org
        ? ""
        : "Dit aanbod komt van een geregistreerde organisatie op SamenConnect. Aanvullende organisatiegegevens kunnen beperkt zichtbaar zijn.");

    const orgBody: Record<string, unknown> = {
      mode: "linked-organization",
      caregiver: {
        id: profileIdResolved,
        linkedProfileId: linked.profileId,
        name,
        role: "Organisatie",
        city,
        rate: null,
        isVolunteer: false,
        tags: [],
        skills: [],
        certifications: [],
        arrangement: "ZZP",
        bio,
      },
      organization: linked.organization,
      reviews: linked.reviews,
      averageRating: linked.averageRating,
      reviewCount: linked.reviewCount,
      profile: { id: linked.profileId, display_name: linked.profile.display_name, avatar_url: linked.profile.avatar_url ?? null },
      pageCaregiver: pageCaregiverFromOrganizationLinked(linked, null),
    };
    devLogCaregiverGet(routeId, "4_organization_no_marketplace_row", orgBody, false);
    return jsonResponse(orgBody);
  }

  /**
   * Cliënt / admin: geen marketplace-rij nodig; minimale `marketplaceCard` zodat `/profielen/[id]`
   * (o.a. vanuit berichten) een consistente publieke samenvatting kan tonen.
   */
  if (legacyProfile.role === "client" || legacyProfile.role === "admin") {
    const rev = await fetchReviewsForProfile(supabase, profileIdResolved);
    if ("error" in rev) return jsonResponse({ error: rev.error }, rev.status);
    const isAdmin = legacyProfile.role === "admin";
    const displayName =
      (legacyProfile.display_name ?? "").trim() || (isAdmin ? "Beheerder" : "Opdrachtgever");
    const marketplaceCard: Record<string, unknown> = {
      id: profileIdResolved,
      linkedProfileId: profileIdResolved,
      name: displayName,
      role: isAdmin ? "Beheerder" : "Cliënt",
      city: "",
      rate: null,
      isVolunteer: false,
      tags: ["SamenConnect"],
      skills: [],
      certifications: [],
      arrangement: "ZZP",
      bio: isAdmin
        ? "Platformbeheerder op SamenConnect."
        : "Geregistreerde opdrachtgever op SamenConnect.",
    };
    const body: Record<string, unknown> = {
      mode: "marketplace",
      profile: {
        id: legacyProfile.id,
        display_name: legacyProfile.display_name,
        avatar_url: legacyProfile.avatar_url ?? null,
      },
      marketplaceCard,
      reviews: rev.reviews,
      averageRating: rev.averageRating,
      reviewCount: rev.reviewCount,
    };
    devLogCaregiverGet(routeId, "4_client_admin_summary", body, false);
    return jsonResponse(body);
  }

  devLogCaregiverGet(routeId, "fallback_not_found", null, false);
  return jsonResponse({ error: "Profile not found." }, 404);
}
