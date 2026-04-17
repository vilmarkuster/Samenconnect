"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import { CaregiverProfileSections } from "@/components/zorenta/caregiver-profile-sections";
import { buildCaregiverViewModel } from "@/lib/zorenta/caregiver-profile-view-model";
import {
  resolveCaregiverPagePayload,
  type NormalizedCaregiverProfileForDisplay,
} from "@/lib/zorenta/normalize-caregiver-profile-display";
import { MapPin, Star, User, Clock3 } from "lucide-react";
import { formatDisplayName, formatLocationLine } from "@/lib/zorenta/profile-display";
import { getZorentaAccessToken } from "@/lib/zorenta/client";

type Data = {
  profile: { id: string | null; display_name: string | null; avatar_url?: string | null };
  caregiver: NormalizedCaregiverProfileForDisplay;
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
  averageRating: number | null;
  reviewCount: number;
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < full ? "fill-amber-400 text-amber-400" : i === full && hasHalf ? "fill-amber-200 text-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </span>
  );
}

function trimText(s: string | null | undefined): string {
  if (s == null || typeof s !== "string") return "";
  return s.trim();
}

export default function CaregiverProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getZorentaAccessToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      fetch(`/api/zorenta/caregivers/${id}`, { headers })
      .then(async (r) => {
        const d = (await r.json().catch(() => null)) as Record<string, unknown> | null;
        if (cancelled) return;
        if (process.env.NODE_ENV === "development" && d && typeof d === "object") {
          const cg = d.caregiver as Record<string, unknown> | undefined;
          const pc = d.pageCaregiver as Record<string, unknown> | undefined;
          const prof = d.profile as { id?: string | null } | undefined;
          const resolved = resolveCaregiverPagePayload(d);
          // eslint-disable-next-line no-console -- dev-only payload audit
          console.log("[/caregivers/[id] page]", {
            routeId: id,
            httpOk: r.ok,
            source: d.source,
            mode: d.mode,
            linkedCaregiverPayload: Boolean(resolved),
            profileId: prof?.id ?? null,
            caregiverHourlyRate: cg?.hourly_rate,
            caregiverSkills: cg?.skills,
            caregiverCertifications: cg?.certifications,
            pageCaregiverHourlyRate: pc?.hourly_rate,
            pageCaregiverSkills: pc?.skills,
            pageCaregiverCertifications: pc?.certifications,
            hasMarketplaceCard: "marketplaceCard" in d,
          });
        }
        if (!r.ok || !d || typeof d !== "object" || ("error" in d && d.error)) {
          setData(null);
          return;
        }
        const profile = d.profile as Data["profile"] | undefined;
        const caregiver = resolveCaregiverPagePayload(d);
        if (profile && caregiver) {
          setData({
            profile,
            caregiver,
            reviews: (Array.isArray(d.reviews) ? d.reviews : []) as Data["reviews"],
            averageRating: typeof d.averageRating === "number" ? d.averageRating : null,
            reviewCount: typeof d.reviewCount === "number" ? d.reviewCount : 0,
          });
        } else {
          setData(null);
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <PageContainer maxWidth="narrow" className="space-y-6">
        <ZorentaPageSkeleton />
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer maxWidth="narrow" className="space-y-6">
        <ZorentaPageHeader title="Profiel" backHref="/search" backLabel="Zorgverleners zoeken" />
        <ZorentaEmptyState
          icon={User}
          title="Profiel niet gevonden"
          description="Dit openbare profiel is niet beschikbaar of bestaat niet. Ga terug naar het overzicht."
          action={
            <Link href="/search">
              <Button variant="outline">Naar zorgverleners zoeken</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const { profile, caregiver, reviews, averageRating, reviewCount } = data;
  const rawDisplay = profile.display_name?.trim() ?? "";
  const displayName = rawDisplay ? formatDisplayName(rawDisplay) : "Zorgverlener";
  const headline = trimText(caregiver.headline);
  const bioText = trimText(caregiver.bio);
  const locationLine = formatLocationLine(caregiver.city, caregiver.region, caregiver.country);
  const vm = buildCaregiverViewModel(caregiver);
  const hasReviews = reviews.length > 0 && averageRating != null && reviewCount > 0;

  const availabilityHeroBadge =
    vm.availabilityText.length > 0 ? (
      <Badge variant="outline" className="max-w-full gap-1.5 whitespace-normal text-left">
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-3">{vm.availabilityText}</span>
      </Badge>
    ) : vm.hasScheduleSlots ? (
      <Badge variant="outline" className="gap-1.5">
        <Clock3 className="h-3.5 w-3.5" />
        Beschikbaarheid per dag
      </Badge>
    ) : null;

  return (
    <PageContainer maxWidth="narrow" className="space-y-6 pb-10">
      <ZorentaPageHeader title="Profiel" backHref="/search" backLabel="Zoeken" />

      <Card className="overflow-hidden border-slate-200 shadow-sm">
        <CardContent className="bg-gradient-to-r from-[#40ada8]/12 via-[#40ada8]/6 to-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#40ada8] text-white">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 stroke-[1.25]" aria-hidden />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-2xl font-semibold text-slate-900">{displayName}</h2>
                <p className="text-sm font-medium text-[#2d7f7b]">Zorgverlener</p>
                {headline ? <p className="text-sm text-slate-700">{headline}</p> : null}
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {locationLine ? (
                    <Badge variant="outline" className="gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLine}
                    </Badge>
                  ) : null}
                  {hasReviews ? (
                    <Badge variant="outline" className="gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {averageRating!.toFixed(1)}
                    </Badge>
                  ) : null}
                  {availabilityHeroBadge}
                </div>
              </div>
            </div>
            <div className="w-full space-y-2 sm:w-[280px] sm:shrink-0">
              {profile.id ? (
                <>
                  <div className="w-full [&_button]:w-full">
                    <StartMessageButton otherUserId={profile.id} size="lg" label="Stuur bericht" />
                  </div>
                  <p className="text-center text-sm text-slate-600 sm:text-left">
                    Stel vrijblijvend je vraag – meestal snel reactie
                  </p>
                </>
              ) : (
                <p className="text-sm text-slate-600">
                  Berichten zijn mogelijk zodra dit profiel gekoppeld is aan een SamenConnect-account.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <CaregiverProfileSections vm={vm} bioText={bioText} />

      {reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="scroll-mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <h2 id="reviews-heading" className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-slate-900">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                Beoordelingen
              </h2>
              {averageRating != null && reviewCount > 0 && (
                <span className="text-sm font-medium text-slate-700">
                  {averageRating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "beoordeling" : "beoordelingen"}
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
              <ul className="space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StarRating value={r.rating} />
                      <span className="text-xs text-slate-500">
                        {new Date(r.created_at).toLocaleDateString("nl-NL", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    {r.comment ? <p className="mt-2 text-sm text-slate-700">{r.comment}</p> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section aria-labelledby="reviews-heading" className="scroll-mt-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <h2 id="reviews-heading" className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight text-slate-900">
                <Star className="h-4 w-4 text-slate-300" aria-hidden />
                Nog geen reviews
              </h2>
            </CardHeader>
            <CardContent className="space-y-1.5 pb-5 text-sm text-slate-700">
              <p>Profiel actief op SamenConnect</p>
              <p>Direct contact mogelijk</p>
            </CardContent>
          </Card>
        </section>
      )}

      <p className="text-center text-xs text-slate-500">
        Berichten verlopen via SamenConnect. Je gegevens worden niet zonder toestemming gedeeld.
      </p>
    </PageContainer>
  );
}
