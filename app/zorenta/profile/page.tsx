"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  MapPin,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    role: string | null;
    location?: string | null;
    rating?: number | null;
    completeness?: number | null;
    bio?: string | null;
    experience?: string | null;
    specialties?: string[];
    skills?: string[];
    availability?: string | null;
    daysAvailable?: string[];
    certificates?: string[];
    reviews?: { id: string; author: string; rating: number; text: string }[];
    recentActivity?: { id: string; type: string; title: string; detail: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then(async (d) => {
          if (cancelled) return;

          const role: string | null = d.profile?.role ?? null;
          const profileId: string | null = typeof d.profile?.id === "string" ? d.profile.id : null;

          const splitCommaList = (val: unknown): string[] => {
            if (typeof val !== "string") return [];
            return val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          };

          const formatRelativeTime = (iso: string | null | undefined): string => {
            if (!iso) return "";
            const ts = new Date(iso).getTime();
            if (!Number.isFinite(ts)) return "";
            const diffMs = Date.now() - ts;
            const diffSec = Math.max(0, Math.floor(diffMs / 1000));
            if (diffSec < 60) return `${diffSec} sec geleden`;
            const diffMin = Math.floor(diffSec / 60);
            if (diffMin < 60) return `${diffMin} min geleden`;
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) return `${diffHours} uur geleden`;
            const diffDays = Math.floor(diffHours / 24);
            return diffDays === 1 ? "Gisteren" : `${diffDays} dagen geleden`;
          };

          const caregiver = d.caregiver ?? null;
          const client = d.client ?? null;
          const organization = d.organization ?? null;

          const location =
            caregiver?.city ?? client?.city ?? organization?.city ?? "Nederland";

          const availabilityText =
            caregiver?.availability ?? client?.preferred_location ?? organization?.city ?? null;

          const daysAvailable = splitCommaList(availabilityText);

          const certifications =
            role === "caregiver" ? splitCommaList(caregiver?.certifications) : [];

          const skills =
            role === "caregiver" ? (Array.isArray(caregiver?.skills) ? caregiver.skills : []) : [];

          const bio =
            role === "caregiver"
              ? caregiver?.bio ?? null
              : role === "client"
                ? client?.care_needs ?? null
                : role === "organization"
                  ? organization?.description ?? null
                  : null;

          const experience =
            role === "caregiver" && typeof caregiver?.experience_years === "number"
              ? `${caregiver.experience_years}+ jaar ervaring`
              : null;

          const baseCompletenessParts: Array<boolean> = [];
          if (typeof bio === "string" && bio.trim()) baseCompletenessParts.push(true);
          if (skills.length > 0) baseCompletenessParts.push(true);
          if (role === "caregiver" && availabilityText && typeof availabilityText === "string") baseCompletenessParts.push(true);
          if (location && typeof location === "string" && location.trim()) baseCompletenessParts.push(true);
          if (role === "caregiver" && certifications.length > 0) baseCompletenessParts.push(true);

          const completeness =
            baseCompletenessParts.length === 0
              ? null
              : Math.round((baseCompletenessParts.length / 5) * 100);

          // Start with real core data; reviews/activity are loaded below.
            setProfile({
            name: d.profile?.display_name || "Je profiel",
            email: "—",
            role,
            location,
            rating: null,
            completeness: completeness ?? 75,
            bio: bio ?? "Nog niet ingevuld",
            experience: experience ?? "—",
            specialties: skills,
            skills,
            availability: availabilityText ?? "—",
            daysAvailable,
            certificates: certifications,
            reviews: [],
            recentActivity: [],
          });

          // Reviews (only meaningful for caregivers)
          let computedRating: number | null = null;
          let mappedReviews: { id: string; author: string; rating: number; text: string }[] = [];
          if (role === "caregiver" && profileId) {
            try {
              const reviewsRes = await fetch(
                `/api/zorenta/reviews?reviewee_id=${encodeURIComponent(profileId)}`,
                { headers: zorentaHeaders(token) }
              );
              const reviewsData = await reviewsRes.json().catch(() => ({}));
              computedRating =
                typeof reviewsData?.average === "number" ? reviewsData.average : null;
              mappedReviews = (Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : []).map(
                (r: any) => ({
                  id: String(r.id),
                  author: String(r.reviewer_id ?? "Onbekend"),
                  rating: Number(r.rating ?? 0),
                  text: typeof r.comment === "string" ? r.comment : "",
                })
              );
            } catch {
              // non-fatal
            }
          }

          // Recent activity from notifications (real data)
          let recentActivity: { id: string; type: string; title: string; detail: string }[] = [];
          try {
            const notifRes = await fetch("/api/zorenta/notifications?unread=false", {
              headers: zorentaHeaders(token),
            });
            const notifData = await notifRes.json().catch(() => ({}));
            const notifications = Array.isArray(notifData?.notifications) ? notifData.notifications : [];
            recentActivity = notifications.slice(0, 6).map((n: any) => {
              const nType = String(n.type ?? "");
              const type =
                nType === "new_message"
                  ? "message"
                  : nType === "new_application" || nType.startsWith("application_")
                    ? "application"
                    : nType === "new_review"
                      ? "match"
                      : "application";
              return {
                id: String(n.id),
                type,
                title: typeof n.title === "string" ? n.title : "Melding",
                detail: formatRelativeTime(n.created_at),
              };
            });
          } catch {
            // non-fatal
          }

          if (!cancelled) {
            setProfile((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                rating: computedRating ?? prev.rating,
                reviews: mappedReviews,
                recentActivity,
              };
            });
            setLoading(false);
          }
        });
    });
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

      {!profile ? (
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm text-slate-600">
              We konden nog geen profielgegevens vinden. Stel je profiel in om verder te gaan.
            </p>
            <div className="mt-4">
              <Link href="/zorenta/register">
                <Button className="bg-[#40ada8] text-white hover:bg-[#369e9a]">Profiel opzetten</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-xl border-slate-200 shadow-lg transition hover:shadow-xl">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-[#40ada8]/18 via-[#40ada8]/8 to-slate-50 p-8 sm:p-10">
                <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-[#40ada8] text-3xl font-semibold text-white shadow-lg shadow-[#40ada8]/25 ring-8 ring-white/70">
                      {profile.name
                        .split(" ")
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <h1 className="truncate text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                          {profile.name}
                        </h1>
                        <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#40ada8]">
                          {profile.role === "caregiver"
                            ? "Zorgverlener"
                            : profile.role === "client"
                              ? "ZZP"
                              : profile.role === "organization"
                                ? "Organisatie"
                                : "Vrijwilliger"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200/70">
                          <MapPin className="h-4 w-4 text-[#40ada8]" />
                          {profile.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200/70">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {typeof profile.rating === "number" ? profile.rating.toFixed(1) : "—"} beoordeling
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 shadow-sm ring-1 ring-slate-200/70">
                          <Clock3 className="h-4 w-4 text-[#40ada8]" />
                          {profile.availability}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 xl:min-w-[360px] xl:max-w-[420px]">
                    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-md">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">Profiel compleetheid</span>
                        <span className="font-semibold text-slate-900">{profile.completeness ?? 75}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#40ada8]"
                          style={{ width: `${profile.completeness ?? 75}%` }}
                        />
                      </div>
                      <p className="mt-3 text-xs text-slate-500">
                        Werk je profiel verder bij voor betere zichtbaarheid en meer matches.
                      </p>
                    </div>
                    <Link
                      href={
                        profile.role === "caregiver"
                          ? "/zorenta/caregivers/me/edit"
                          : profile.role === "client"
                            ? "/zorenta/clients/me/edit"
                            : "/zorenta/organizations/me/edit"
                      }
                    >
                      <Button className="w-full bg-[#40ada8] text-white hover:bg-[#369e9a] sm:w-auto">
                        Profiel bewerken
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
            <div className="space-y-6">
              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-[#40ada8]" />
                    Bio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-slate-600">{profile.bio}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Ervaring</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{profile.experience}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Specialties</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {profile.specialties?.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center rounded-full border border-[#40ada8]/15 bg-[#40ada8]/8 px-3.5 py-1.5 text-xs font-medium text-[#2f8f88] shadow-sm transition hover:-translate-y-0.5 hover:border-[#40ada8]/30 hover:bg-[#40ada8]/12 hover:text-[#1f7e78]"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Heart className="h-4 w-4 text-[#40ada8]" />
                    Vaardigheden
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#40ada8]/30 hover:bg-[#40ada8]/8 hover:text-[#1f7e78]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarDays className="h-4 w-4 text-[#40ada8]" />
                    Beschikbaarheid
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">Beschikbaar voor werk</span>
                    <span className="inline-flex h-6 w-11 items-center rounded-full bg-[#40ada8] p-1">
                      <span className="h-4 w-4 rounded-full bg-white" />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.daysAvailable?.map((day) => (
                      <span
                        key={day}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4 text-[#40ada8]" />
                    Certificaten
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.certificates?.map((certificate) => (
                    <div key={certificate} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-900">{certificate}</p>
                      <p className="mt-1 text-xs text-slate-500">Geverifieerd certificaat</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.reviews?.map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                            {review.author
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{review.author}</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3.5 w-3.5 ${
                                    i < review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-slate-200"
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-xs font-medium text-slate-600">{review.rating}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{review.text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-xl border-slate-200 shadow-sm transition hover:shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-4 w-4 text-[#40ada8]" />
                    Recente activiteit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile.recentActivity?.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="mt-0.5 rounded-full bg-[#40ada8]/10 p-2 text-[#40ada8]">
                        {item.type === "message" ? (
                          <MessageSquare className="h-4 w-4" />
                        ) : item.type === "match" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-600">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </ZorentaPageContainer>
  );
}
