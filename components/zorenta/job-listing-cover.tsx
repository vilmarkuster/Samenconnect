"use client";

import { useState } from "react";
import { Briefcase, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getFirstJobImageUrl, resolveJobCardImage, type JobCardImageSource } from "@/lib/zorenta/job-images";

type JobListingCoverProps = {
  /** Ruwe `image_urls` van de API (backward compatible). */
  imageUrls?: unknown;
  /** Optioneel volledig job-fragment: resolved via `resolveJobCardImage` (incl. legacy string-velden). */
  job?: JobCardImageSource;
  careType?: string | null;
  /** Extra classes on the outer frame (aspect ratio, rounding). */
  className?: string;
  /** Screen-reader label when an image is shown (alleen als geen `job` meegegeven) */
  alt?: string;
};

function fallbackTheme(careType?: string | null): {
  gradient: string;
  chipLabel: string;
} {
  const t = (careType ?? "").toLowerCase();
  if (t.includes("persoonlijke verzorging") || t.includes("thuiszorg")) {
    return {
      gradient: "from-cyan-200 via-teal-100 to-slate-100",
      chipLabel: "Persoonlijke zorg",
    };
  }
  if (t.includes("begeleiding") || t.includes("dagbesteding")) {
    return {
      gradient: "from-violet-200 via-indigo-100 to-slate-100",
      chipLabel: "Begeleiding",
    };
  }
  if (t.includes("verple")) {
    return {
      gradient: "from-blue-200 via-sky-100 to-slate-100",
      chipLabel: "Verpleegzorg",
    };
  }
  return {
    gradient: "from-slate-300 via-slate-200 to-slate-100",
    chipLabel: "Opdracht",
  };
}

/**
 * Eerste opdrachtafbeelding of rustige placeholder; bij laadfout geen console spam (onError → placeholder).
 */
export function JobListingCover({ imageUrls, job, careType, className, alt = "" }: JobListingCoverProps) {
  const resolved = job ? resolveJobCardImage(job) : null;
  const url = resolved?.src ?? getFirstJobImageUrl(imageUrls);
  const altText = resolved?.alt ?? alt;
  const [failed, setFailed] = useState(false);
  const showImg = Boolean(url) && !failed;
  const theme = fallbackTheme(careType ?? job?.care_type);

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        !showImg && `bg-gradient-to-br ${theme.gradient}`,
        className
      )}
    >
      {showImg ? (
        <img
          src={url!}
          alt={altText}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="relative flex h-full min-h-[6rem] w-full items-center justify-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
          <div className="relative flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <Briefcase className="h-4 w-4 text-[#40ADA8]" aria-hidden />
            <span className="text-xs font-medium text-slate-700">{theme.chipLabel}</span>
            <Sparkles className="h-3.5 w-3.5 text-[#40ADA8]/70" aria-hidden />
          </div>
        </div>
      )}
    </div>
  );
}
