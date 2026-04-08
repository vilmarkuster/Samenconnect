"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/zorenta/profile-display";
import {
  logDevNavigatingToCaregiverPublicProfile,
  publicCaregiverProfileRouteSegment,
} from "@/lib/zorenta/caregiver-public-profile-route-id";

type CaregiverMatch = {
  caregiver: {
    /** Legacy / extra id (e.g. marketplace); navigation uses `profile_id` when set. */
    id: string;
    profile_id: string;
    caregiver_profile_id?: string;
    headline?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  narrativeSummary?: string;
};

type CaregiverMatchCardProps = {
  match: CaregiverMatch;
  rank?: number;
  jobId?: string | null;
  /** Draft for inbox composer (AI / contextual flows); passed as URL prefill. */
  messagePrefill?: string;
  /** When set, show a checkbox for multi-select (e.g. AI matches batch). */
  selectionMode?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
};

function scoreColor(score: number): {
  bar: string;
  track: string;
  text: string;
} {
  if (score >= 70) {
    return {
      bar: "bg-emerald-500",
      track: "bg-emerald-100",
      text: "text-emerald-700",
    };
  }
  if (score >= 40) {
    return {
      bar: "bg-[#40ADA8]",
      track: "bg-[#40ADA8]/20",
      text: "text-[#2d7f7b]",
    };
  }
  return {
    bar: "bg-slate-400",
    track: "bg-slate-200",
    text: "text-slate-600",
  };
}

export function CaregiverMatchCard({
  match,
  rank,
  jobId,
  messagePrefill,
  selectionMode,
  selected,
  onSelectionChange,
}: CaregiverMatchCardProps) {
  const { caregiver, score, summary, narrativeSummary } = match;
  const router = useRouter();
  const rawName = caregiver.display_name?.trim() || "";
  const name = rawName ? formatDisplayName(rawName) : "Zorgverlener";
  const top3 = rank != null && rank <= 3;
  const top1 = rank === 1;
  const visual = scoreColor(score);
  const reasons = (match.reasons ?? []).filter(Boolean).slice(0, 4);

  const publicProfilePathId = useMemo(() => {
    const segment = publicCaregiverProfileRouteSegment({
      profileId: caregiver.profile_id,
      caregiverProfilePk: caregiver.caregiver_profile_id ?? null,
      marketplaceListingId: caregiver.id,
    });
    return segment || caregiver.profile_id;
  }, [caregiver]);

  useEffect(() => {
    logDevNavigatingToCaregiverPublicProfile(publicProfilePathId, name);
  }, [publicProfilePathId, name]);

  const goToProfile = () => router.push(`/zorenta/caregivers/${publicProfilePathId}`);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={goToProfile}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          goToProfile();
        }
      }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#40ADA8]/25",
          top3
            ? "border-[#40ADA8]/45 bg-[#40ADA8]/[0.03] shadow-sm ring-1 ring-[#40ADA8]/15"
            : "border-slate-200"
        )}
      >
      <CardHeader className={cn("pb-2", top1 ? "sm:pb-3.5" : "sm:pb-3")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
              {caregiver.avatar_url?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={caregiver.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                name
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? "")
                  .join("") || "SC"
              )}
            </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              {selectionMode ? (
                <label
                  className="inline-flex cursor-pointer items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 rounded border-slate-300 text-[#40ADA8] focus:ring-[#40ADA8]"
                    checked={selected === true}
                    onChange={(e) => onSelectionChange?.(e.target.checked)}
                    aria-label={`Selecteer ${name}`}
                  />
                </label>
              ) : null}
              {rank != null ? (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-700">
                  #{rank}
                </span>
              ) : null}
              {top1 ? (
                <Badge className="rounded-full bg-[#40ADA8] text-white hover:bg-[#40ADA8]">Beste match</Badge>
              ) : null}
            </div>
            <h3 className={cn("truncate font-semibold text-slate-900", top1 ? "text-base sm:text-lg" : "text-base")}>
              {name}
            </h3>
            {caregiver.headline ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{caregiver.headline}</p>
            ) : null}
          </div>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("text-sm font-semibold", visual.text)}>{Math.round(score)}%</p>
            <p className="text-[11px] text-slate-500">match</p>
          </div>
        </div>
        <div className={cn("mt-3.5 h-2.5 w-full overflow-hidden rounded-full", visual.track)}>
          <div
            className={cn("h-full rounded-full transition-all duration-300", visual.bar)}
            style={{ width: `${Math.max(0, Math.min(100, Math.round(score)))}%` }}
          />
        </div>
        {(narrativeSummary || summary) && (
          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{narrativeSummary || summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3.5 pt-0">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Waarom dit een goede match is
          </p>
          <div className="flex flex-wrap gap-1.5">
            {reasons.length > 0 ? (
              reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700"
                >
                  {reason}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500">Algemene match op profiel en beschikbaarheid.</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1.5" onClick={(e) => e.stopPropagation()}>
          <Link href={`/zorenta/caregivers/${publicProfilePathId}`}>
            <Button type="button" variant="outline" size="sm" className="border-slate-200 text-slate-700">
              Bekijk profiel
            </Button>
          </Link>
          <StartMessageButton
            otherUserId={caregiver.profile_id}
            jobId={jobId}
            prefill={messagePrefill}
            size="sm"
            variant="primary"
            label="Stuur bericht"
          />
        </div>
      </CardContent>
      </Card>
    </div>
  );
}
