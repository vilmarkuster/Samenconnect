"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "@/components/zorenta/match-score-badge";
import { JobListingCover } from "@/components/zorenta/job-listing-cover";
import { MapPin, Building2, Euro, Clock } from "lucide-react";

export type ZorentaJobCardJob = {
  id: string;
  title: string;
  description?: string | null;
  city?: string | null;
  care_type?: string | null;
  status: string;
  budget_min?: number | null;
  budget_max?: number | null;
  hourly_rate?: number | null;
  availability?: string | null;
  schedule?: string | null;
  /** Publieke Storage-URLs; optioneel voor backward compatibility */
  image_urls?: string[] | null;
};

type ZorentaJobCardProps = {
  job: ZorentaJobCardJob;
  match?: { score: number; summary?: string; narrativeSummary?: string } | null;
  applicationsCount?: number;
};

export function ZorentaJobCard({
  job,
  match,
  applicationsCount,
}: ZorentaJobCardProps) {
  const budgetLabel =
    job.hourly_rate != null
      ? `€${job.hourly_rate}/uur`
      : job.budget_min != null || job.budget_max != null
        ? `€${job.budget_min ?? "—"} – €${job.budget_max ?? "—"}`
        : null;

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <JobListingCover
          imageUrls={job.image_urls}
          alt=""
          className="aspect-[16/9] rounded-t-xl border-b border-slate-100"
        />
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base font-semibold leading-tight text-slate-900 line-clamp-2">
              {job.title}
            </CardTitle>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {match && (
                <MatchScoreBadge
                  score={match.score}
                  summary={match.summary}
                  narrativeSummary={match.narrativeSummary}
                />
              )}
              <Badge
                variant={job.status === "open" ? "default" : "secondary"}
                className="text-xs"
              >
                {job.status === "open" ? "Open" : job.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {job.description && (
            <p className="line-clamp-2 text-sm text-slate-600">
              {job.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            {job.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {job.city}
              </span>
            )}
            {job.care_type && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {job.care_type}
              </span>
            )}
            {(job.availability || job.schedule) && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {job.availability || job.schedule}
              </span>
            )}
            {budgetLabel && (
              <span className="flex items-center gap-1">
                <Euro className="h-3.5 w-3.5 shrink-0" />
                {budgetLabel}
              </span>
            )}
          </div>
          {applicationsCount != null && applicationsCount > 0 && (
            <p className="text-xs text-slate-500">
              {applicationsCount} sollicitant{applicationsCount !== 1 ? "en" : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
