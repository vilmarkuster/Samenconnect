import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";
import { jsonResponse } from "@/lib/zorenta/auth";

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
  supabase: ReturnType<typeof getSupabaseClient>,
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

/** Linked caregiver: profiles.role = caregiver + caregiver_profiles row */
async function fetchLinkedCaregiverData(supabase: ReturnType<typeof getSupabaseClient>, profileId: string) {
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", profileId)
    .single();
  if (pError || !profile) return { error: "Profile not found." as const, status: 404 };
  if (profile.role !== "caregiver") return { error: "Caregiver profile not found." as const, status: 404 };

  const { data: caregiver, error: cError } = await supabase
    .from("caregiver_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .single();
  if (cError || !caregiver) return { error: "Caregiver profile not found." as const, status: 404 };

  const rev = await fetchReviewsForProfile(supabase, profileId);
  if ("error" in rev) return { error: rev.error, status: rev.status };

  return {
    profileId,
    profile,
    caregiver,
    reviews: rev.reviews,
    averageRating: rev.averageRating,
    reviewCount: rev.reviewCount,
  };
}

/** Linked organization: profiles.role = organization; organization_profiles may be hidden by RLS — then fallback to profile + marketplace only */
async function fetchLinkedOrganizationData(supabase: ReturnType<typeof getSupabaseClient>, profileId: string) {
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, display_name, role")
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

function buildDisplayFromMarketplaceAndLinkedCaregiver(
  marketplaceRow: MarketplaceRow,
  linked: {
    profileId: string;
    profile: { id: string; display_name: string | null; role: string | null };
    caregiver: Record<string, unknown>;
    reviews: LinkedReview[];
    averageRating: number | null;
    reviewCount: number;
  }
) {
  const providerType = marketplaceRow.provider_type ?? "zzp";
  const { role, arrangement, isVolunteer } = mapProviderType(providerType);

  const tags =
    [...toStringArray(marketplaceRow.zorgtype), ...toStringArray(marketplaceRow.specialisaties), ...toStringArray(marketplaceRow.vaardigheden)].filter(
      Boolean
    );
  const certifications = [...toStringArray(marketplaceRow.certificaten), ...toStringArray(marketplaceRow.registraties)].filter(Boolean);

  const skills = toStringArray(linked.caregiver.skills);
  const bio = String(linked.caregiver.bio ?? "");

  const rate =
    typeof marketplaceRow.prijs === "number"
      ? (marketplaceRow.prijs as number)
      : marketplaceRow.prijs == null
        ? null
        : Number(marketplaceRow.prijs);

  return {
    mode: "linked-caregiver" as const,
    caregiver: {
      id: String(marketplaceRow.id),
      linkedProfileId: linked.profileId,
      name: String(linked.profile.display_name ?? marketplaceRow.name ?? ""),
      role,
      city: String(linked.caregiver.city ?? marketplaceRow.location ?? ""),
      rate: Number.isFinite(rate as number) ? rate : null,
      isVolunteer,
      tags: tags.length ? tags : skills,
      skills,
      certifications,
      arrangement,
      bio,
    },
    reviews: linked.reviews,
    averageRating: linked.averageRating,
    reviewCount: linked.reviewCount,
  };
}

function buildDisplayFromMarketplaceAndLinkedOrganization(
  marketplaceRow: MarketplaceRow,
  linked: {
    profileId: string;
    profile: { id: string; display_name: string | null; role: string | null };
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
  const supabase = getSupabaseClient();

  // 1) If `id` matches a marketplace caregiver row, resolve as linked or marketplace-only.
  const { data: marketplaceRow } = await supabase
    .from("caregivers")
    .select("*")
    .eq("id", routeId)
    .maybeSingle();

  if (marketplaceRow) {
    const providerType = marketplaceRow.provider_type ?? "zzp";
    const { role, arrangement, isVolunteer } = mapProviderType(providerType);

    if (marketplaceRow.profile_id) {
      const pid = String(marketplaceRow.profile_id);
      const { data: linkedProfile, error: lpErr } = await supabase
        .from("profiles")
        .select("id, display_name, role")
        .eq("id", pid)
        .single();

      if (lpErr || !linkedProfile) {
        return jsonResponse({ error: "Profile not found." }, 404);
      }

      if (linkedProfile.role === "caregiver") {
        const linked = await fetchLinkedCaregiverData(supabase, pid);
        if ("error" in linked) return jsonResponse({ error: linked.error }, linked.status);
        return jsonResponse(buildDisplayFromMarketplaceAndLinkedCaregiver(marketplaceRow, linked));
      }

      if (linkedProfile.role === "organization") {
        const linked = await fetchLinkedOrganizationData(supabase, pid);
        if ("error" in linked) return jsonResponse({ error: linked.error }, linked.status);
        return jsonResponse(buildDisplayFromMarketplaceAndLinkedOrganization(marketplaceRow, linked));
      }

      return jsonResponse({ error: "Linked profile is not a caregiver or organization account." }, 404);
    }

    // Marketplace-only
    const tags = [
      ...toStringArray(marketplaceRow.zorgtype),
      ...toStringArray(marketplaceRow.specialisaties),
      ...toStringArray(marketplaceRow.vaardigheden),
    ].filter(Boolean);
    const skills = toStringArray(marketplaceRow.vaardigheden);
    const certifications = [...toStringArray(marketplaceRow.certificaten), ...toStringArray(marketplaceRow.registraties)].filter(Boolean);

    const rate =
      typeof marketplaceRow.prijs === "number"
        ? (marketplaceRow.prijs as number)
        : marketplaceRow.prijs == null
          ? null
          : Number(marketplaceRow.prijs);

    return jsonResponse({
      mode: "marketplace",
      caregiver: {
        id: String(marketplaceRow.id),
        linkedProfileId: null,
        name: String(marketplaceRow.name ?? ""),
        role,
        city: String(marketplaceRow.location ?? ""),
        rate: Number.isFinite(rate as number) ? rate : null,
        isVolunteer,
        tags,
        skills,
        certifications,
        arrangement,
        bio:
          "Dit is een marketplace-profiel. Het is nog niet gekoppeld aan een SamenConnect-account, waardoor volledige SamenConnect-profielinformatie (zoals beoordelingen) nog niet beschikbaar is.",
      },
      reviews: [],
      averageRating: null,
      reviewCount: 0,
    });
  }

  // 2) Legacy / fallback: treat `id` as a real `public.profiles.id`.
  const { data: legacyProfile, error: legPErr } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .eq("id", routeId)
    .single();

  if (legPErr || !legacyProfile) {
    return jsonResponse({ error: "Profile not found." }, 404);
  }

  const { data: linkedMarketplaceRow } = await supabase
    .from("caregivers")
    .select("*")
    .eq("profile_id", routeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyProfile.role === "caregiver") {
    const linked = await fetchLinkedCaregiverData(supabase, routeId);
    if ("error" in linked) return jsonResponse({ error: linked.error }, linked.status);

    const providerType = linkedMarketplaceRow?.provider_type ?? "zzp";
    const { role, arrangement, isVolunteer } = mapProviderType(providerType);

    const tags = linkedMarketplaceRow
      ? [
          ...toStringArray(linkedMarketplaceRow.zorgtype),
          ...toStringArray(linkedMarketplaceRow.specialisaties),
          ...toStringArray(linkedMarketplaceRow.vaardigheden),
        ].filter(Boolean)
      : toStringArray(linked.caregiver.skills);

    const certifications = linkedMarketplaceRow
      ? [...toStringArray(linkedMarketplaceRow.certificaten), ...toStringArray(linkedMarketplaceRow.registraties)].filter(Boolean)
      : [];

    const rate =
      linkedMarketplaceRow?.prijs == null
        ? null
        : typeof linkedMarketplaceRow.prijs === "number"
          ? (linkedMarketplaceRow.prijs as number)
          : Number(linkedMarketplaceRow.prijs);

    const skills = toStringArray(linked.caregiver.skills);
    const bio = String(linked.caregiver.bio ?? "");

    return jsonResponse({
      mode: "linked-caregiver",
      caregiver: {
        id: linkedMarketplaceRow ? String(linkedMarketplaceRow.id) : routeId,
        linkedProfileId: linked.profileId,
        name: String(linked.profile.display_name ?? ""),
        role,
        city: String(linked.caregiver.city ?? linkedMarketplaceRow?.location ?? ""),
        rate: rate != null && Number.isFinite(rate) ? rate : null,
        isVolunteer,
        tags,
        skills,
        certifications,
        arrangement,
        bio,
      },
      reviews: linked.reviews,
      averageRating: linked.averageRating,
      reviewCount: linked.reviewCount,
    });
  }

  if (legacyProfile.role === "organization") {
    const linked = await fetchLinkedOrganizationData(supabase, routeId);
    if ("error" in linked) return jsonResponse({ error: linked.error }, linked.status);

    if (linkedMarketplaceRow) {
      return jsonResponse(buildDisplayFromMarketplaceAndLinkedOrganization(linkedMarketplaceRow, linked));
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

    return jsonResponse({
      mode: "linked-organization",
      caregiver: {
        id: routeId,
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
    });
  }

  return jsonResponse({ error: "Profile not found." }, 404);
}
