"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import {
  MapPin,
  Euro,
  Star,
  User,
  Briefcase,
  Clock,
  Award,
  Shield,
} from "lucide-react";

type Data = {
  profile: { id: string; display_name: string | null };
  caregiver: {
    headline: string | null;
    bio: string | null;
    skills: string[];
    city: string | null;
    region: string | null;
    country: string | null;
    experience_years: number | null;
    availability: string | null;
    certifications: string | null;
    hourly_rate: number | null;
  };
  reviews: { id: string; rating: number; comment: string | null; created_at: string }[];
  averageRating: number | null;
  reviewCount: number;
};

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-0.5">
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

export default function CaregiverProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/zorenta/caregivers/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d.profile ? d : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
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
        <ZorentaPageHeader title="Profiel" backHref="/zorenta/search" backLabel="Zorgverleners zoeken" />
        <ZorentaEmptyState
          icon={User}
          title="Profiel niet gevonden"
          description="Deze zorgverlener bestaat niet of het profiel is niet meer beschikbaar."
          action={
            <Link href="/zorenta/search">
              <Button variant="outline">Zoek zorgverleners</Button>
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const { profile, caregiver, reviews, averageRating, reviewCount } = data;
  const locationParts = [caregiver.city, caregiver.region, caregiver.country].filter(Boolean);
  const hasEnoughProfile = !!(caregiver.bio && caregiver.skills?.length);

  return (
    <PageContainer maxWidth="narrow" className="space-y-6">
      <ZorentaPageHeader
        title={profile.display_name || "Zorgverlener"}
        backHref="/zorenta/search"
        backLabel="Zoeken"
      />

      {/* Hero */}
      <Card className="overflow-hidden border-slate-200">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
              <User className="h-10 w-10" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {profile.display_name || "Zorgverlener"}
              </h1>
              {caregiver.headline && (
                <p className="mt-1 text-slate-600">{caregiver.headline}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {averageRating != null && reviewCount > 0 && (
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <StarRating value={averageRating} />
                    <span>{averageRating.toFixed(1)}</span>
                    <span className="text-slate-500">({reviewCount} {reviewCount === 1 ? "beoordeling" : "beoordelingen"})</span>
                  </span>
                )}
                {hasEnoughProfile && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Shield className="h-3 w-3" />
                    Volledig profiel
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <StartMessageButton otherUserId={profile.id} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews – prominent for discovery */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Reviews
          </CardTitle>
          {averageRating != null && reviewCount > 0 && (
            <span className="text-sm font-medium text-slate-700">
              {averageRating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? "beoordeling" : "beoordelingen"}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
              <Star className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">Nog geen reviews</p>
              <p className="mt-1 text-xs text-slate-500">Reviews verschijnen na afgeronde opdrachten.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                >
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
                  {r.comment && (
                    <p className="mt-2 text-sm text-slate-700">{r.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Over */}
      {caregiver.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-slate-500" />
              Over
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{caregiver.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Locatie & beschikbaarheid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-slate-500" />
            Locatie & beschikbaarheid
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {locationParts.length > 0 && (
            <p className="text-sm text-slate-700">
              {locationParts.join(", ")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {caregiver.experience_years != null && caregiver.experience_years > 0 && (
              <Badge variant="outline" className="gap-1">
                <Briefcase className="h-3 w-3" />
                {caregiver.experience_years} jaar ervaring
              </Badge>
            )}
            {caregiver.availability && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {caregiver.availability}
              </Badge>
            )}
            {!locationParts.length && !caregiver.availability && caregiver.experience_years == null && (
              <p className="text-sm text-slate-500">Geen gegevens.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Vaardigheden */}
      {caregiver.skills?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vaardigheden</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(caregiver.skills as string[]).map((s) => (
                <span
                  key={s}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
                >
                  {s}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarief */}
      {caregiver.hourly_rate != null && caregiver.hourly_rate > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Euro className="h-4 w-4 text-slate-500" />
              Tarief
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-900">€{caregiver.hourly_rate} per uur</p>
          </CardContent>
        </Card>
      )}

      {/* Certificeringen */}
      {caregiver.certifications && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-slate-500" />
              Certificeringen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700">{caregiver.certifications}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-slate-500">
        Veilig berichten via Zorenta. We delen je gegevens niet zonder toestemming.
      </p>
    </PageContainer>
  );
}
