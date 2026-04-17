"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/components/match/MatchBadge";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import { MapPin, Star, User } from "lucide-react";
import { formatDisplayName, formatLabelValue } from "@/lib/zorenta/profile-display";
import {
  logDevNavigatingToCaregiverPublicProfile,
  publicCaregiverProfileRouteSegment,
} from "@/lib/zorenta/caregiver-public-profile-route-id";

export type CaregiverCardProps = {
  /** `public.profiles.id` — messaging and reviews. */
  profileId: string;
  /** Optional marketplace listing id — never wins over `profileId` when linking. */
  caregiverRouteId?: string | null;
  name: string;
  headline?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  rating?: number | null;
  avatarUrl?: string | null;
  hourlyRate?: number | null;
  location?: string | null;
  matchScore?: number | null;
  /** Show "Bekijk profiel" and "Bericht sturen" */
  showActions?: boolean;
};

export function CaregiverCard({
  profileId,
  caregiverRouteId,
  name,
  headline,
  experienceYears,
  skills = [],
  rating,
  avatarUrl,
  hourlyRate,
  location,
  matchScore,
  showActions = true,
}: CaregiverCardProps) {
  const displayName = formatDisplayName(name.trim()) || name.trim();
  const publicProfilePathId = useMemo(() => {
    const segment = publicCaregiverProfileRouteSegment({
      profileId,
      marketplaceListingId: caregiverRouteId ?? null,
    });
    return segment || profileId;
  }, [profileId, caregiverRouteId]);
  useEffect(() => {
    logDevNavigatingToCaregiverPublicProfile(publicProfilePathId, displayName);
  }, [publicProfilePathId, displayName]);
  const initialParts = displayName.split(/\s+/).filter(Boolean);
  const initials =
    initialParts.length === 0
      ? "SC"
      : initialParts.length === 1
        ? initialParts[0].slice(0, 2).toUpperCase()
        : `${initialParts[0][0] ?? ""}${initialParts[initialParts.length - 1][0] ?? ""}`.toUpperCase();
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
      <CardHeader className="flex flex-row gap-4 pb-2">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
          {avatarUrl?.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-slate-700">{initials || <User className="h-7 w-7" />}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">{displayName}</h3>
              {headline && (
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                  {headline}
                </p>
              )}
            </div>
            {matchScore != null && (
              <MatchBadge score={matchScore} className="shrink-0" />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {experienceYears != null && experienceYears > 0 && (
              <span>{experienceYears} jaar ervaring</span>
            )}
            {rating != null && rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {location
                  .split(",")
                  .map((p) => formatLabelValue(p.trim()))
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
            {hourlyRate != null && hourlyRate > 0 && (
              <span>€{hourlyRate}/uur</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 5).map((s) => (
              <span
                key={s}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
              >
                {formatLabelValue(s)}
              </span>
            ))}
          </div>
        )}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/caregivers/${publicProfilePathId}`}>
              <Button variant="outline" size="sm">
                Bekijk profiel
              </Button>
            </Link>
            <StartMessageButton otherUserId={profileId} size="sm" label="Stuur bericht" />
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500"
              disabled
              title="Binnenkort beschikbaar"
            >
              Bewaren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
