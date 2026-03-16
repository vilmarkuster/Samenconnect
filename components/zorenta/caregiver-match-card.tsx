"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MatchScoreBadge } from "@/components/zorenta/match-score-badge";
import { MatchReasonChips } from "@/components/match/MatchReasonChips";

type CaregiverMatch = {
  caregiver: {
    id: string;
    profile_id: string;
    headline?: string | null;
    display_name?: string | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

type CaregiverMatchCardProps = {
  match: CaregiverMatch;
};

export function CaregiverMatchCard({ match }: CaregiverMatchCardProps) {
  const { caregiver, score, summary, narrativeSummary } = match;
  const name = caregiver.display_name ?? "Zorgverlener";
  return (
    <Link href={`/zorenta/caregivers/${caregiver.profile_id}`} className="block">
      <Card className="transition-all hover:shadow-md hover:border-slate-300">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-slate-900">{name}</h3>
            {caregiver.headline && (
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{caregiver.headline}</p>
            )}
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
