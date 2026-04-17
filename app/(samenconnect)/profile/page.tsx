 "use client";

import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { Briefcase, Clock3, MapPin, Phone, Star, User } from "lucide-react";
import { CaregiverProfileSections } from "@/components/zorenta/caregiver-profile-sections";
import { buildCaregiverViewModel } from "@/lib/zorenta/caregiver-profile-view-model";
import type { AvailabilitySchedule } from "@/lib/zorenta/caregiver-availability-schedule";
import { formatDisplayName, formatLabelValue, formatLocationLine } from "@/lib/zorenta/profile-display";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

type MeResponse = {
  profile?: { id?: string; display_name?: string | null; role?: string | null; avatar_url?: string | null };
  caregiver?: {
    headline?: string | null;
    bio?: string | null;
    skills?: string[] | null;
    care_types?: string[] | null;
    experience_years?: number | null;
    availability?: string | null;
    availability_days?: string[] | null;
    availability_times?: string[] | null;
    availability_schedule?: AvailabilitySchedule | unknown | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    certifications?: string[] | string | null;
    languages?: string[] | null;
    hourly_rate?: number | null;
    min_rate?: number | null;
    travel_distance_km?: number | null;
    has_driver_license?: boolean | null;
    phone?: string | null;
  } | null;
  client?: {
    headline?: string | null;
    care_needs?: string | null;
    care_types?: string[] | null;
    phone?: string | null;
    postcode?: string | null;
    preferred_location?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
    frequency?: string | null;
    hours_per_week?: number | null;
    preferred_days?: string[] | null;
    preferred_times?: string[] | null;
    start_date?: string | null;
    urgency?: string | null;
    extra_notes?: string | null;
  } | null;
  organization?: {
    name?: string | null;
    org_type?: string | null;
    description?: string | null;
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null;
};

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-700">{children}</CardContent>
    </Card>
  );
}

function initials(name: string): string {
  const p = formatDisplayName(name).split(" ").filter(Boolean);
  if (p.length === 0) return "SC";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return `${p[0][0] ?? ""}${p[p.length - 1][0] ?? ""}`.toUpperCase();
}

function editRouteForRole(role: string | null | undefined): { href: string | null; label: string } {
  if (role === "caregiver") return { href: "/caregivers/me/edit", label: "Profiel bewerken" };
  if (role === "client") return { href: "/clients/me/edit", label: "Profiel bewerken" };
  if (role === "organization") return { href: "/organizations/me/edit", label: "Profiel bewerken" };
  return { href: null, label: "Profiel bewerken" };
}

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MeResponse | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getZorentaAccessToken();
      if (!token) {
        if (!cancelled) {
          setError("Je moet ingelogd zijn om je profiel te bekijken.");
          setLoading(false);
        }
        return;
      }
      const res = await fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
      const d = (await res.json().catch(() => null)) as MeResponse | null;
      if (cancelled) return;
      if (!res.ok || !d?.profile) {
        setError("Profielgegevens konden niet worden geladen.");
        setLoading(false);
        return;
      }
      setData(d);
      setLoading(false);

      if (d.profile.role === "caregiver" && d.profile.id) {
        const reviewsRes = await fetch(`/api/zorenta/reviews?reviewee_id=${encodeURIComponent(d.profile.id)}`, {
          headers: zorentaHeaders(token),
        });
        const reviewsData = await reviewsRes.json().catch(() => ({}));
        if (!cancelled && typeof reviewsData?.average === "number") {
          setRating(reviewsData.average);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="narrow" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <ZorentaPageHeader title="Mijn profiel" description="Beheer je SamenConnect-profiel, beschikbaarheid en prestaties." />
      {searchParams.get("saved") === "1" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Profiel opgeslagen.
        </div>
      ) : null}

      {!data || !data.profile ? (
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              {error || "We konden nog geen profielgegevens vinden. Stel je profiel in om verder te gaan."}
            </p>
            <div className="mt-4">
              {REGISTRATION_OPEN ? (
                <Link href="/register">
                  <Button className="bg-[#40ada8] text-white hover:bg-[#369e9a]">Profiel opzetten</Button>
                </Link>
              ) : (
                <div className="space-y-2">
                  <Button type="button" disabled className="bg-slate-200 text-slate-500">
                    Profiel opzetten
                  </Button>
                  <p className="text-xs text-slate-500">Registratie is tijdelijk gesloten. Probeer het later opnieuw.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const rawName = data.profile?.display_name?.trim() ?? "";
          const name = rawName || "Je profiel";
          const displayTitle = rawName ? formatDisplayName(rawName) : "Je profiel";
          const role = data.profile?.role ?? null;
          const caregiver = data.caregiver ?? null;
          const client = data.client ?? null;
          const organization = data.organization ?? null;
          const caregiverVm = role === "caregiver" ? buildCaregiverViewModel(caregiver ?? undefined) : null;
          const location =
            role === "caregiver"
              ? formatLocationLine(caregiver?.city, caregiver?.region, caregiver?.country)
              : role === "client"
                ? formatLocationLine(client?.city, client?.region, client?.country)
                : formatLocationLine(organization?.city, organization?.region, organization?.country);
          const hasLocation = Boolean(location);
          const completenessFields =
            role === "caregiver"
              ? [
                  Boolean(data.profile?.avatar_url?.trim()),
                  Boolean(caregiver?.headline?.trim()),
                  Boolean(caregiver?.bio?.trim()),
                  caregiverVm?.hasVaardigheden ?? false,
                  typeof caregiver?.experience_years === "number" && caregiver.experience_years > 0,
                  caregiverVm?.hasCertificaten ?? false,
                  caregiverVm?.hasBeschikbaarheid ?? false,
                  hasLocation,
                  typeof caregiver?.hourly_rate === "number" && caregiver.hourly_rate > 0,
                ]
              : role === "client"
                ? [
                    Boolean(data.profile?.avatar_url?.trim()),
                    Boolean(client?.headline?.trim()),
                    Boolean(client?.care_needs?.trim()),
                    Boolean(client?.preferred_location?.trim()),
                    hasLocation,
                  ]
                : role === "organization"
                  ? [
                      Boolean(data.profile?.avatar_url?.trim()),
                      Boolean(organization?.name?.trim()),
                      Boolean(organization?.description?.trim()),
                      hasLocation,
                    ]
                  : [Boolean(data.profile?.avatar_url?.trim())];
          const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);
          const roleLabel = role === "caregiver" ? "Zorgverlener" : role === "organization" ? "Organisatie" : role === "client" ? "Cliënt" : "Gebruiker";
          const editRoute = editRouteForRole(role);

          return (
            <div className="space-y-6">
              <Card className="overflow-hidden border-slate-200 shadow-sm">
                <CardContent className="bg-gradient-to-r from-[#40ada8]/12 via-[#40ada8]/6 to-white p-6 sm:p-8">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#40ada8] text-xl font-semibold text-white">
                        {data.profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={data.profile.avatar_url} alt={displayTitle} className="h-full w-full object-cover" />
                        ) : (
                          initials(rawName || name)
                        )}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <h2 className="truncate text-2xl font-semibold text-slate-900">{displayTitle}</h2>
                        <p className="text-sm font-medium text-[#2d7f7b]">{roleLabel}</p>
                        {role === "caregiver" && caregiver?.headline ? <p className="text-sm text-slate-700">{caregiver.headline}</p> : null}
                        {role === "client" && client?.headline ? <p className="text-sm text-slate-700">{client.headline}</p> : null}
                        {role === "organization" && organization?.name?.trim() ? (
                          <p className="text-sm text-slate-700">{formatDisplayName(organization.name)}</p>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {location ? (
                            <Badge variant="outline" className="gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {location}
                            </Badge>
                          ) : null}
                          {typeof rating === "number" ? (
                            <Badge variant="outline" className="gap-1.5">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {rating.toFixed(1)}
                            </Badge>
                          ) : null}
                          {role === "caregiver" && caregiverVm ? (
                            caregiverVm.availabilityText ? (
                              <Badge variant="outline" className="max-w-full gap-1.5 whitespace-normal text-left">
                                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                                <span className="line-clamp-3">{caregiverVm.availabilityText}</span>
                              </Badge>
                            ) : caregiverVm.hasScheduleSlots ? (
                              <Badge variant="outline" className="gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />
                                Beschikbaarheid per dag
                              </Badge>
                            ) : null
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 sm:w-[320px]">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700">Profiel compleetheid</span>
                          <span className="font-semibold text-slate-900">{completeness}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#40ada8]" style={{ width: `${completeness}%` }} />
                        </div>
                      </div>
                      {editRoute.href ? (
                        <Link href={editRoute.href}>
                          <Button className="w-full bg-[#40ada8] text-white hover:bg-[#369e9a]">{editRoute.label}</Button>
                        </Link>
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          Profiel bewerken is voor dit accounttype nog niet beschikbaar.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {role !== "caregiver" ? (
                role === "client" ? (
                  (() => {
                    const prefLoc = client?.preferred_location?.trim();
                    const prefLocDisplay = prefLoc
                      ? prefLoc
                          .split(",")
                          .map((s) => formatLabelValue(s))
                          .filter(Boolean)
                          .join(", ")
                      : null;
                    const hasContact =
                      Boolean(client?.phone?.trim()) ||
                      Boolean(client?.postcode?.trim()) ||
                      hasLocation;
                    return (
                      <div className="space-y-5">
                        {client?.care_needs?.trim() ? (
                          <SectionCard title="Over mij">
                            <p className="whitespace-pre-wrap leading-relaxed">{client.care_needs}</p>
                          </SectionCard>
                        ) : null}
                        {prefLocDisplay ? (
                          <SectionCard title="Voorkeurslocatie">
                            <p className="flex items-start gap-2 text-slate-800">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                              <span>{prefLocDisplay}</span>
                            </p>
                          </SectionCard>
                        ) : null}
                        {hasContact ? (
                          <SectionCard title="Contact">
                            <dl className="grid gap-3 sm:grid-cols-2">
                              {client?.phone?.trim() ? (
                                <div className="flex items-start gap-2">
                                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                  <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Telefoon</dt>
                                    <dd className="mt-0.5">{client.phone}</dd>
                                  </div>
                                </div>
                              ) : null}
                              {client?.postcode?.trim() ? (
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Postcode</dt>
                                  <dd className="mt-0.5">{client.postcode}</dd>
                                </div>
                              ) : null}
                              {location ? (
                                <div className="flex items-start gap-2 sm:col-span-2">
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                  <div>
                                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Stad / regio / land</dt>
                                    <dd className="mt-0.5">{location}</dd>
                                  </div>
                                </div>
                              ) : null}
                            </dl>
                          </SectionCard>
                        ) : null}
                      </div>
                    );
                  })()
                ) : role === "organization" ? (
                  <div className="grid gap-5 lg:grid-cols-2">
                    {organization?.description ? (
                      <Card className="border-slate-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-[#40ada8]" /> Over organisatie</CardTitle>
                        </CardHeader>
                        <CardContent><p className="whitespace-pre-wrap text-sm text-slate-700">{organization.description}</p></CardContent>
                      </Card>
                    ) : null}
                    {organization?.org_type ? (
                      <Card className="border-slate-200">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4 text-[#40ada8]" /> Organisatietype</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-slate-700">{organization.org_type}</CardContent>
                      </Card>
                    ) : null}
                  </div>
                ) : (
                  <Card className="border-slate-200">
                    <CardContent className="p-5 text-sm text-slate-600">
                      Geen specifieke profielweergave beschikbaar voor dit accounttype.
                    </CardContent>
                  </Card>
                )
              ) : (
                (() => {
                  const bioText = caregiver?.bio?.trim() ?? "";
                  const hasContact = Boolean(caregiver?.phone?.trim()) || hasLocation;

                  return (
                    <div className="space-y-5">
                      <CaregiverProfileSections vm={caregiverVm!} bioText={bioText} />

                      {hasContact ? (
                        <SectionCard title="Contact">
                          <dl className="grid gap-3 sm:grid-cols-2">
                            {caregiver?.phone?.trim() ? (
                              <div className="flex items-start gap-2">
                                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Telefoon</dt>
                                  <dd className="mt-0.5">{caregiver.phone}</dd>
                                </div>
                              </div>
                            ) : null}
                            {location ? (
                              <div className="flex items-start gap-2 sm:col-span-2">
                                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                <div>
                                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Locatie</dt>
                                  <dd className="mt-0.5">{location}</dd>
                                </div>
                              </div>
                            ) : null}
                          </dl>
                        </SectionCard>
                      ) : null}
                    </div>
                  );
                })()
              )}
            </div>
          );
        })()
      )}
    </ZorentaPageContainer>
  );
}
