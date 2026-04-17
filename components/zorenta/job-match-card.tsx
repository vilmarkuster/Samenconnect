"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/zorenta/match-score-badge";
import { JobListingCover } from "@/components/zorenta/job-listing-cover";
import { MatchReasonChips } from "@/components/match/MatchReasonChips";
import { formatJobPrice } from "@/lib/zorenta/job-price";

type JobMatch = {
  job: {
    id: string;
    title: string;
    city?: string | null;
    care_type?: string | null;
    budget_min?: number | null;
    budget_max?: number | null;
    hourly_rate?: number | null;
    status?: string;
    image_urls?: string[] | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

type JobMatchCardProps = {
  match: JobMatch;
};

export function JobMatchCard({ match }: JobMatchCardProps) {
  const { job, score, summary, narrativeSummary } = match;
  const priceLabel = formatJobPrice({
    hourly_rate: job.hourly_rate,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });
  return (
    <Link href={`/jobs/${job.id}`} className="block">
      <Card className="overflow-hidden transition-all hover:shadow-md hover:border-slate-300">
        <JobListingCover
          imageUrls={job.image_urls}
          alt=""
          className="aspect-[16/9] rounded-t-xl border-b border-slate-100"
        />
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900">{job.title}</h3>
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-xs text-slate-500">
              {job.city && <span>{job.city}</span>}
              {job.care_type && <span>· {job.care_type}</span>}
              {priceLabel && <span>· {priceLabel}</span>}
            </div>
          </div>
          <MatchScoreBadge score={score} summary={summary} narrativeSummary={narrativeSummary} className="shrink-0" />
        </CardHeader>
        <CardContent className="pt-0">
          <MatchReasonChips reasons={match.reasons ?? []} max={4} />
        </CardContent>
      </Card>
    </Link>
  );
}
