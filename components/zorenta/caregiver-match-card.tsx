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
import {
  extractPrimaryConcern,
  extractTopReasons,
  normalizeMatchSummary,
} from "@/lib/zorenta/ai-match-card-copy";

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
  aiRecommendation?: string;
  aiMainReason?: string;
  aiConcerns?: string[];
  /** `false` = geen geldige openbare profielroute (na hydrate op jobdetail-AI-matches). */
  hasPublicProfile?: boolean;
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
  /**
   * `ai`: recruitment-style layout for Match Agent results (job detail).
   * `default`: bestaande kaart (o.a. algoritmische matches).
   */
  presentationMode?: "default" | "ai";
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

function AvatarBlock({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-14 w-14 text-sm" : "h-11 w-11 text-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-semibold text-slate-700 ring-1 ring-slate-200/80",
        dim
      )}
    >
      {avatarUrl?.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>
          {name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "ZV"}
        </span>
      )}
    </div>
  );
}

export function CaregiverMatchCard({
  match,
  rank,
  jobId,
  messagePrefill,
  selectionMode,
  selected,
  onSelectionChange,
  presentationMode = "default",
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
    if (presentationMode === "ai" && match.hasPublicProfile !== true) {
      return "";
    }
    if (match.hasPublicProfile === false) return "";
    const segment = publicCaregiverProfileRouteSegment({
      profileId: caregiver.profile_id,
      caregiverProfilePk: caregiver.caregiver_profile_id ?? null,
      marketplaceListingId: caregiver.id,
    });
    return segment || caregiver.profile_id;
  }, [caregiver, match.hasPublicProfile, presentationMode]);

  const canOpenPublicProfile = Boolean(publicProfilePathId?.trim());

  const aiPresentation = useMemo(() => {
    if (presentationMode !== "ai") return null;
    const main = match.aiMainReason ?? null;
    const rec = match.aiRecommendation ?? null;
    const summaryLine = normalizeMatchSummary({
      recommendation: rec,
      mainReason: main,
    });
    const bullets = extractTopReasons({
      summaryLine,
      mainReason: main,
      recommendation: rec,
      positiveReasonsFallback: main ? [main] : undefined,
    });
    const attention =
      extractPrimaryConcern(match.aiConcerns) ?? "Beschikbaarheid en voorkeuren afstemmen.";
    return { summaryLine, bullets, attention };
  }, [presentationMode, match]);

  useEffect(() => {
    if (canOpenPublicProfile) {
      logDevNavigatingToCaregiverPublicProfile(publicProfilePathId, name);
    }
  }, [canOpenPublicProfile, publicProfilePathId, name]);

  const goToProfile = () => {
    if (!canOpenPublicProfile) return;
    router.push(`/zorenta/caregivers/${publicProfilePathId}`);
  };

  if (presentationMode === "ai" && aiPresentation) {
    const { summaryLine, bullets, attention } = aiPresentation;
    const bulletItems =
      bullets.length > 0 ? bullets : ["Passend bij profiel en opdracht."];

    return (
      <Card
        className={cn(
          "border transition-shadow",
          top1
            ? "border-[#40ADA8]/55 bg-gradient-to-b from-white via-white to-[#40ADA8]/[0.05] shadow-md ring-1 ring-[#40ADA8]/20"
            : "border-slate-200/95 bg-white shadow-sm"
        )}
      >
        <CardHeader className="space-y-4 pb-4 pt-5 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            {selectionMode ? (
              <label className="mt-1 inline-flex shrink-0 cursor-pointer items-start pt-0.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-[#40ADA8] focus:ring-[#40ADA8]"
                  checked={selected === true}
                  onChange={(e) => onSelectionChange?.(e.target.checked)}
                  aria-label={`Selecteer ${name}`}
                />
              </label>
            ) : null}
            <AvatarBlock name={name} avatarUrl={caregiver.avatar_url} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {rank != null ? (
                  <span className="inline-flex h-6 min-w-[1.75rem] items-center justify-center rounded-md bg-slate-100 px-2 text-[11px] font-semibold tabular-nums text-slate-700">
                    #{rank}
                  </span>
                ) : null}
                {top1 ? (
                  <Badge className="rounded-md border-0 bg-[#40ADA8] px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-[#40ADA8]">
                    Beste match
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-1.5 truncate text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
                {name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "text-[1.85rem] font-bold tabular-nums leading-none tracking-tight sm:text-[2.25rem]",
                  visual.text
                )}
              >
                {Math.round(score)}%
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Match
              </p>
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <div className={cn("h-2 w-full overflow-hidden rounded-full", visual.track)}>
              <div
                className={cn("h-full rounded-full transition-all duration-500 ease-out", visual.bar)}
                style={{ width: `${Math.max(0, Math.min(100, Math.round(score)))}%` }}
              />
            </div>
            <p className="min-w-0 break-normal text-sm font-medium leading-snug text-slate-800 line-clamp-2">
              {summaryLine}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 border-t border-slate-100/90 bg-slate-50/30 px-4 py-5 sm:px-6">
          <div>
            <p className="mb-2 text-xs font-semibold leading-tight text-slate-600">
              Waarom dit een goede match is
            </p>
            <ul className="min-w-0 space-y-2">
              {bulletItems.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`} className="flex min-w-0 gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#40ADA8]" aria-hidden />
                  <span className="min-w-0 flex-1 break-words leading-snug text-slate-700">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/75">
              Aandachtspunt
            </p>
            <p className="mt-1 min-w-0 break-words text-xs leading-snug text-amber-950/90">{attention}</p>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
            {canOpenPublicProfile ? (
              <Link
                href={`/zorenta/caregivers/${publicProfilePathId}`}
                className="w-full sm:w-auto sm:min-w-[8.5rem]"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                >
                  Bekijk profiel
                </Button>
              </Link>
            ) : (
              <div className="flex w-full min-w-0 flex-col justify-center sm:w-auto sm:min-w-[8.5rem]">
                <Button type="button" variant="outline" size="sm" disabled className="w-full border-slate-200">
                  Bekijk profiel
                </Button>
                <p className="mt-1 text-center text-[11px] text-slate-500 sm:text-left">
                  Profiel nog niet beschikbaar
                </p>
              </div>
            )}
            <div className="w-full sm:w-auto sm:min-w-[10rem] [&_button]:w-full sm:[&_button]:w-auto">
              <StartMessageButton
                otherUserId={caregiver.profile_id}
                jobId={jobId}
                prefill={messagePrefill}
                size="sm"
                variant="primary"
                label="Stuur bericht"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardShell = (
      <Card
        className={cn(
          canOpenPublicProfile &&
            "cursor-pointer transition-all hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-[#40ADA8]/25",
          top3
            ? "border-[#40ADA8]/45 bg-[#40ADA8]/[0.03] shadow-sm ring-1 ring-[#40ADA8]/15"
            : "border-slate-200"
        )}
      >
        <CardHeader className={cn("pb-2", top1 ? "sm:pb-3.5" : "sm:pb-3")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-3">
              <AvatarBlock name={name} avatarUrl={caregiver.avatar_url} size="md" />
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
                    <Badge className="rounded-full bg-[#40ADA8] text-white hover:bg-[#40ADA8]">
                      Beste match
                    </Badge>
                  ) : null}
                </div>
                <h3
                  className={cn(
                    "truncate font-semibold text-slate-900",
                    top1 ? "text-base sm:text-lg" : "text-base"
                  )}
                >
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
            <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {narrativeSummary || summary}
            </p>
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
            {canOpenPublicProfile ? (
              <Link href={`/zorenta/caregivers/${publicProfilePathId}`}>
                <Button type="button" variant="outline" size="sm" className="border-slate-200 text-slate-700">
                  Bekijk profiel
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col gap-0.5">
                <Button type="button" variant="outline" size="sm" disabled className="border-slate-200 text-slate-500">
                  Bekijk profiel
                </Button>
                <span className="text-[11px] text-slate-500">Profiel nog niet beschikbaar</span>
              </div>
            )}
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
  );

  if (!canOpenPublicProfile) {
    return <div>{cardShell}</div>;
  }

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
      {cardShell}
    </div>
  );
}
