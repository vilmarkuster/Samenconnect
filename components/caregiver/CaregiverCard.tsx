"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/components/match/MatchBadge";
import { MapPin, Star, MessageSquare, User } from "lucide-react";

export type CaregiverCardProps = {
  profileId: string;
  name: string;
  headline?: string | null;
  experienceYears?: number | null;
  skills?: string[];
  rating?: number | null;
  hourlyRate?: number | null;
  location?: string | null;
  matchScore?: number | null;
  /** Show "Bekijk profiel" and "Bericht sturen" */
  showActions?: boolean;
};

export function CaregiverCard({
  profileId,
  name,
  headline,
  experienceYears,
  skills = [],
  rating,
  hourlyRate,
  location,
  matchScore,
  showActions = true,
}: CaregiverCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
      <CardHeader className="flex flex-row gap-4 pb-2">
        {/* Photo placeholder */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
          <User className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">{name}</h3>
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
                {location}
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
                {s}
              </span>
            ))}
          </div>
        )}
        {showActions && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/zorenta/caregivers/${profileId}`}>
              <Button variant="outline" size="sm">
                Bekijk profiel
              </Button>
            </Link>
            <Link href={`/zorenta/messages?start=${profileId}`}>
              <Button size="sm" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Stuur bericht
              </Button>
            </Link>
            <Button variant="ghost" size="sm" className="text-slate-500" disabled title="Binnenkort beschikbaar">
              Bewaren
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
