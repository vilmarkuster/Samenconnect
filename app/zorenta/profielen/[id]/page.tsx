"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Euro, ArrowLeft, MessageCircle, Bookmark } from "lucide-react";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import {
  isMarketplaceCardCaregiverPayload,
  isNormalizedCaregiverProfilePayload,
} from "@/lib/zorenta/normalize-caregiver-profile-display";

type PageProps = {
  params: { id: string };
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_id: string;
};

type ResolvedCaregiver = {
  id: string;
  linkedProfileId: string | null;
  name: string;
  role: "ZZP zorgverlener" | "Mantelzorger" | "Vrijwilliger" | "Organisatie";
  city: string;
  rate: number | null;
  isVolunteer: boolean;
  tags: string[];
  skills: string[];
  certifications: string[];
  arrangement: "PGB" | "ZZP" | "Mantelzorg" | "Vrijwillig";
  bio: string;
};

type ResolvedCaregiverResponse = {
  mode: "linked-caregiver" | "linked-organization" | "marketplace";
  caregiver: ResolvedCaregiver;
  profile?: { id?: string | null; display_name?: string | null; avatar_url?: string | null } | null;
  /** Present for linked-organization (from public.organization_profiles when readable). */
  organization?: Record<string, unknown> | null;
  reviews?: Review[];
  averageRating?: number | null;
  reviewCount?: number;
};

function initials(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isOrganisation(cg: ResolvedCaregiver) {
  return cg.role === "Organisatie";
}

export default function CaregiverProfilePage({ params }: PageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedCaregiverResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/zorenta/caregivers/${params.id}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(typeof d?.error === "string" ? d.error : "Profiel niet gevonden.");
        }
        return res.json();
      })
      .then((d: Record<string, unknown>) => {
        if (cancelled) return;
        const profile = d.profile as {
          id?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
        } | null;
        let caregiverUi: ResolvedCaregiver;

        const mc = d.marketplaceCard;
        if (mc && typeof mc === "object" && "tags" in mc && Array.isArray((mc as { tags: unknown }).tags)) {
          caregiverUi = mc as ResolvedCaregiver;
        } else if (isMarketplaceCardCaregiverPayload(d.caregiver)) {
          caregiverUi = d.caregiver as ResolvedCaregiver;
        } else if (d.pageCaregiver && isNormalizedCaregiverProfilePayload(d.pageCaregiver)) {
          const pc = d.pageCaregiver;
          caregiverUi = {
            id: String(params.id),
            linkedProfileId: profile?.id ?? null,
            name: profile?.display_name?.trim() || "Zorgverlener",
            role: "ZZP zorgverlener",
            city: pc.city ?? "",
            rate: pc.hourly_rate,
            isVolunteer: false,
            tags: [...pc.care_types, ...pc.skills],
            skills: pc.skills,
            certifications: pc.certifications,
            arrangement: "ZZP",
            bio: pc.bio ?? "",
          };
        } else {
          setError("Profiel niet gevonden.");
          setLoading(false);
          return;
        }

        setResolved({
          mode: d.mode as ResolvedCaregiverResponse["mode"],
          caregiver: caregiverUi,
          profile,
          organization: (d.organization ?? null) as ResolvedCaregiverResponse["organization"],
          reviews: d.reviews as Review[] | undefined,
          averageRating: d.averageRating as number | null | undefined,
          reviewCount: d.reviewCount as number | undefined,
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Profiel niet gevonden.");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const caregiver = useMemo(() => resolved?.caregiver ?? null, [resolved]);

  if (!loading && (!resolved || error)) {
    return (
      <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
        <ZorentaPageHeader
          title="Profiel niet gevonden"
          description="Dit profiel bestaat niet (meer) of is niet beschikbaar."
          backHref="/zorenta/matches"
          backLabel="Terug naar matches"
        />
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="py-6 text-sm text-slate-600">
            <p>We konden dit profiel niet vinden. Ga terug naar de matches en kies een andere zorgverlener of organisatie.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (loading || !resolved || !caregiver) {
    return (
      <PageContainer maxWidth="default">
        <ZorentaPageSkeleton className="space-y-6 sm:space-y-8" />
      </PageContainer>
    );
  }

  const volunteer = caregiver.isVolunteer || caregiver.arrangement === "Vrijwillig";
  const isLinkedOrg = resolved.mode === "linked-organization";
  const isLinkedCaregiver = resolved.mode === "linked-caregiver";
  const isLinked =
    (isLinkedCaregiver || isLinkedOrg) && !!caregiver.linkedProfileId;

  return (
    <>
      <PageContainer maxWidth="default" className="space-y-6 sm:space-y-8">
        <ZorentaPageHeader
          title={caregiver.name}
          description={
            isLinkedOrg || isOrganisation(caregiver)
              ? "Organisatie / aanbieder op SamenConnect"
              : "Profiel van zorgverlener op SamenConnect"
          }
          backHref="/zorenta/matches"
          backLabel="Terug naar matches"
        />

        {/* Premium profile header */}
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-md">
          <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xl font-semibold text-emerald-700 sm:h-20 sm:w-20 sm:text-2xl">
                {resolved.profile?.avatar_url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolved.profile.avatar_url} alt={caregiver.name} className="h-full w-full object-cover" />
                ) : (
                  initials(caregiver.name)
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                    {caregiver.name}
                  </h1>
                  <Badge className="rounded-full bg-[#40ada8]/10 text-[11px] font-semibold text-[#40ada8]">
                    {isLinkedOrg ? "Organisatie" : caregiver.role}
                  </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-600 sm:text-sm">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>{caregiver.city}</span>
                </p>
                <p className="flex items-center gap-1.5 text-xs text-slate-700 sm:text-sm">
                  <Euro className="h-3.5 w-3.5 text-slate-400" />
                  {volunteer ? (
                    <span>Vrijwillig / onbetaald</span>
                  ) : caregiver.rate ? (
                    <span>Indicatie: €{caregiver.rate} per uur</span>
                  ) : (
                    <span>Tarief in overleg</span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                    Beschikbaar in overleg
                  </span>
                  {!isOrganisation(caregiver) && (
                    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                      Werkt via {caregiver.arrangement}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col items-stretch justify-center gap-2 sm:items-end">
              {isLinked ? (
                <StartMessageButton
                  otherUserId={caregiver.linkedProfileId!}
                  size="sm"
                  variant="primary"
                  label="Stuur bericht"
                />
              ) : (
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-[#40ada8] text-xs text-white hover:bg-[#369e9a]"
                    disabled
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Bericht nog niet beschikbaar
                  </Button>
                  <p className="text-[11px] text-slate-500">
                    Dit marketplace-aanbod is nog niet gekoppeld aan een SamenConnect-account.
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-slate-200 text-xs"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Opslaan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 border-slate-200 text-xs text-slate-600"
                  onClick={() => router.push("/zorenta/matches")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Terug naar matches
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
          {/* Left: main profile content */}
          <div className="space-y-6">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-5 p-5">
                {/* Over deze zorgverlener / organisatie */}
                <section className="space-y-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isLinkedOrg || isOrganisation(caregiver)
                      ? "Over deze organisatie"
                      : "Over deze zorgverlener"}
                  </h2>
                  <p className="text-sm text-slate-700">{caregiver.bio}</p>
                  <p className="text-xs text-slate-500">
                    {isLinkedOrg || isOrganisation(caregiver) ? (
                      <>
                        Deze organisatie is actief in de regio {caregiver.city || "…"} en omgeving en
                        kan de zorgvraag in overleg afstemmen op jouw situatie.
                      </>
                    ) : (
                      <>
                        Deze zorgverlener is actief in de regio {caregiver.city} en omgeving en kan de
                        zorgvraag in overleg afstemmen op jouw situatie.
                      </>
                    )}
                  </p>
                </section>

                {/* Zorgtypes & diensten */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isLinkedOrg || isOrganisation(caregiver)
                      ? "Zorgtypes & aanbod"
                      : "Zorgtypes & diensten"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {caregiver.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Vaardigheden & ervaring */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {isLinkedOrg || isOrganisation(caregiver)
                      ? "Specialisaties & aanbod"
                      : "Vaardigheden & ervaring"}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {caregiver.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Beschikbaarheid */}
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Beschikbaarheid
                  </h3>
                  <p className="text-sm text-slate-700">
                    Beschikbaarheid kan in overleg afgestemd worden. Geef in je bericht aan voor
                    welke dagen en tijden je zorg zoekt (bijvoorbeeld overdag, avond, weekend of
                    flexibel).
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-700">
                      Overdag
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-700">
                      Avond in overleg
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 text-[11px] text-slate-700">
                      Weekend in overleg
                    </span>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Beoordelingen
                  </h3>
                  {isLinkedCaregiver || isLinkedOrg ? (
                    <div className="space-y-2 text-sm text-slate-700">
                      <p>
                        Gemiddeld{" "}
                        <span className="font-semibold">
                          {resolved.averageRating != null ? `${resolved.averageRating} / 5` : "Nog geen rating"}
                        </span>{" "}
                        ({resolved.reviewCount ?? 0} beoordelingen)
                      </p>
                      <div className="space-y-2">
                        {(resolved.reviews ?? []).slice(0, 3).map((r) => (
                          <div key={r.id} className="rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold text-slate-900">{r.rating} / 5</p>
                            <p className="mt-1 text-sm text-slate-700">{r.comment ? r.comment : "—"}</p>
                          </div>
                        ))}
                        {(resolved.reviews ?? []).length === 0 && (
                          <p className="text-sm text-slate-500">Nog geen beoordelingen.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Beoordelingen worden getoond zodra dit profiel gekoppeld is aan een SamenConnect account.
                    </p>
                  )}
                </section>
              </CardContent>
            </Card>
          </div>

          {/* Right: practical info / trust / CTAs */}
          <div className="space-y-4">
            <Card className="rounded-2xl border-slate-200 bg-slate-50 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-sm font-semibold text-slate-900">Praktische informatie</h2>
                <div className="space-y-1.5 text-sm text-slate-700">
                  {resolved.organization &&
                    typeof resolved.organization.org_type === "string" &&
                    resolved.organization.org_type.trim() !== "" && (
                      <p>
                        <span className="font-medium">Type aanbieder: </span>
                        {String(resolved.organization.org_type)}
                      </p>
                    )}
                  {!isLinkedOrg && !isOrganisation(caregiver) && (
                    <p>
                      <span className="font-medium">Type inzet: </span>
                      {caregiver.arrangement}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Regio: </span>
                    {caregiver.city} en omgeving
                  </p>
                  <p>
                    <span className="font-medium">Tariefindicatie: </span>
                    {volunteer
                      ? "Vrijwillig / onbetaald"
                      : caregiver.rate
                        ? `€${caregiver.rate} per uur`
                        : "In overleg"}
                  </p>
                  <p>
                    <span className="font-medium">Samenwerking: </span>
                    In overleg mogelijk met PGB, particuliere inzet of via organisatie.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardContent className="space-y-3 p-5">
                <h2 className="text-sm font-semibold text-slate-900">Betrouwbaarheid</h2>
                <div className="space-y-1.5 text-sm text-slate-700">
                  <p>
                    <span className="font-medium">
                      {isLinkedOrg || isOrganisation(caregiver) ? "Aanbod: " : "Vaardigheden: "}
                    </span>
                    {(isLinkedOrg || isOrganisation(caregiver)
                      ? caregiver.tags.slice(0, 3)
                      : caregiver.skills.slice(0, 3)
                    ).join(", ") || "Zorg en begeleiding"}
                    .
                  </p>
                  <p>
                    <span className="font-medium">Certificaten: </span>
                    {caregiver.certifications.length
                      ? caregiver.certifications.slice(0, 5).join(", ")
                      : "Informatie niet beschikbaar."}
                  </p>
                  <p>
                    <span className="font-medium">Beoordelingen: </span>
                    {isLinked
                      ? resolved.averageRating != null
                        ? `${resolved.averageRating} / 5`
                        : "Nog geen beoordelingen"
                      : "Nog niet gekoppeld aan een SamenConnect account."}
                  </p>
                </div>
                {isLinked ? (
                  <StartMessageButton
                    otherUserId={caregiver.linkedProfileId!}
                    size="sm"
                    variant="primary"
                    label="Stuur een bericht"
                  />
                ) : (
                  <Button
                    size="sm"
                    className="mt-1 w-full justify-center gap-1.5 bg-[#40ada8] text-xs text-white hover:bg-[#369e9a]"
                    disabled
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Bericht niet beschikbaar
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

