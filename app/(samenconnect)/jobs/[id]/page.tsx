"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import {
  createZorentaConversation,
  sendZorentaMessage,
  shouldSendBatchMessage,
} from "@/lib/zorenta/create-zorenta-conversation";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaSectionHeader } from "@/components/zorenta/section-header";
import { CaregiverMatchCard } from "@/components/zorenta/caregiver-match-card";
import {
  MapPin,
  Calendar,
  Euro,
  Building2,
  Users,
  Clock,
  Pencil,
  FileText,
  ArrowLeft,
  Briefcase,
  X,
  Maximize2,
} from "lucide-react";
import { normalizeJobImageUrls } from "@/lib/zorenta/job-images";
import { primaryCareLabelFromTaxonomy } from "@/lib/zorenta/intake-taxonomy";
import { formatJobPrice } from "@/lib/zorenta/job-price";
import { cn } from "@/lib/utils";
import { CaregiverApplicationThreadButton } from "@/components/zorenta/caregiver-application-thread-button";
import { buildAiMatchFirstMessage } from "@/lib/zorenta/ai-match-intro-message";
import { hasRenderablePublicCaregiverPagePayload } from "@/lib/zorenta/public-caregiver-page";

type CaregiverMatch = {
  caregiver: {
    id: string;
    profile_id: string;
    headline?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
  };
  score: number;
  reasons: string[];
  summary: string;
  /** AI Match Agent `recommendation` field; used for message prefill only. */
  aiRecommendation?: string;
  /** AI: hoofdreden (zonder concerns); voor gescheiden weergave op de kaart. */
  aiMainReason?: string;
  /** AI: aandachtspunten uit het model. */
  aiConcerns?: string[];
  /**
   * Na hydrate: zelfde criterium als `/caregivers/[id]` (resolveCaregiverPagePayload op API-body).
   * Organisatie/marktplek-200 met alleen kaart-body telt niet als publiek profiel.
   */
  hasPublicProfile?: boolean;
};

type MatchAgentItem = {
  caregiverId?: string;
  caregiverName?: string;
  fitScore?: number;
  reason?: string;
  concerns?: string[];
  recommendation?: string;
};

type MatchAgentPayload = {
  matches?: MatchAgentItem[];
};

type Job = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  care_type: string | null;
  care_context?: string | null;
  soort_hulp_zorg?: string[] | null;
  zorgniveau?: string[] | null;
  role_sought?: string | null;
  experience_requirements?: string | null;
  certificates_requirements?: string | null;
  schedule: string | null;
  availability: string | null;
  budget_min: number | null;
  budget_max: number | null;
  hourly_rate: number | null;
  status: string;
  poster_id: string;
  poster_type: string;
  created_at: string;
  image_urls?: string[] | null;
};

type Me = { profile: { id: string; role: string } };

type HeroOrientation = "unknown" | "landscape" | "portrait" | "square";

type HeroFallbackTheme = {
  gradient: string;
  chip: string;
  headline: string;
};

/** ~5% tolerance: classify as square when nearly equal sides */
function classifyHeroOrientation(naturalWidth: number, naturalHeight: number): HeroOrientation {
  if (naturalWidth <= 0 || naturalHeight <= 0) return "landscape";
  const r = naturalWidth / naturalHeight;
  if (r > 1.05) return "landscape";
  if (r < 1 / 1.05) return "portrait";
  return "square";
}

function getHeroFallbackTheme(careLabel: string | null | undefined): HeroFallbackTheme {
  const text = (careLabel ?? "").toLowerCase();
  if (text.includes("persoonlijke verzorging") || text.includes("thuiszorg")) {
    return {
      gradient: "from-cyan-200 via-teal-100 to-slate-100",
      chip: "bg-cyan-50/90 text-cyan-900 ring-cyan-200/80",
      headline: "Persoonlijke zorgopdracht",
    };
  }
  if (text.includes("begeleiding") || text.includes("dagbesteding")) {
    return {
      gradient: "from-violet-200 via-indigo-100 to-slate-100",
      chip: "bg-violet-50/90 text-violet-900 ring-violet-200/80",
      headline: "Begeleidingsopdracht",
    };
  }
  return {
    gradient: "from-slate-300 via-slate-200 to-slate-100",
    chip: "bg-white/85 text-slate-800 ring-white/70",
    headline: "Zorgopdracht",
  };
}

function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  const empty = value === "—";
  return (
    <div className="flex min-h-[5.75rem] gap-3.5 rounded-xl border border-slate-100/90 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50/90 sm:min-h-[6rem] sm:gap-4 sm:p-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200/50">
        <Icon className="h-5 w-5 text-[#40ADA8]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</p>
        <p
          className={cn(
            "text-[15px] leading-snug",
            empty ? "font-medium text-slate-400" : "font-semibold text-slate-900"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [applying, setApplying] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);
  /** Huidige sollicitatie van de ingelogde zorgverlener op deze vacature (indien aanwezig). */
  const [myApplication, setMyApplication] = useState<{
    id: string;
    message: string | null;
    conversationId: string | null;
  } | null>(null);
  const [aiMatches, setAiMatches] = useState<CaregiverMatch[]>([]);
  const [aiMatchesLoading, setAiMatchesLoading] = useState(false);
  const [aiMatchesError, setAiMatchesError] = useState<string | null>(null);
  const [selectedAiProfileIds, setSelectedAiProfileIds] = useState<Set<string>>(() => new Set());
  const [batchAiLoading, setBatchAiLoading] = useState(false);
  const [batchAiError, setBatchAiError] = useState<string | null>(null);
  const [batchAiSuccess, setBatchAiSuccess] = useState<string | null>(null);
  const batchAiSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isIntakeLinkedJob, setIsIntakeLinkedJob] = useState(false);
  const [loading, setLoading] = useState(true);
  const [caregiverMatches, setCaregiverMatches] = useState<CaregiverMatch[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [heroOrientation, setHeroOrientation] = useState<HeroOrientation>("unknown");
  /** `null` = lightbox closed; number = index in `galleryUrls` */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  /** Fade/scale-in when lightbox opens */
  const [lightboxAnimIn, setLightboxAnimIn] = useState(false);
  const applyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const showCreatedSuccess = searchParams.get("created") === "1";
  useEffect(() => {
    return () => {
      if (batchAiSuccessTimeoutRef.current) {
        clearTimeout(batchAiSuccessTimeoutRef.current);
      }
    };
  }, []);


  const MATCH_AGENT_ID = process.env.NEXT_PUBLIC_MATCH_AGENT_ID;

  function extractJsonObjectFromText(text: string): string | null {
    const trimmed = text.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end < start) return null;
    return trimmed.slice(start, end + 1).trim();
  }

  function parseMatchAgentOutput(raw: string | null | undefined): CaregiverMatch[] {
    if (!raw || typeof raw !== "string") return [];
    const jsonStr = extractJsonObjectFromText(raw) ?? raw;
    try {
      const parsed = JSON.parse(jsonStr) as MatchAgentPayload;
      if (!parsed || !Array.isArray(parsed.matches)) return [];
      return parsed.matches
        .filter((m): m is MatchAgentItem => !!m && typeof m === "object")
        .map((m) => {
          const caregiverId =
            typeof m.caregiverId === "string" && m.caregiverId.trim().length > 0
              ? m.caregiverId.trim()
              : "";
          const fitScore =
            typeof m.fitScore === "number" && Number.isFinite(m.fitScore)
              ? Math.max(0, Math.min(100, Math.round(m.fitScore)))
              : 0;
          const name =
            typeof m.caregiverName === "string" && m.caregiverName.trim().length > 0
              ? m.caregiverName.trim()
              : "Zorgverlener";
          const reason =
            typeof m.reason === "string" && m.reason.trim().length > 0 ? m.reason.trim() : "";
          const concerns =
            Array.isArray(m.concerns) && m.concerns.length > 0
              ? m.concerns.filter(
                  (c): c is string => typeof c === "string" && c.trim().length > 0
                )
              : [];
          const recommendation =
            typeof m.recommendation === "string" && m.recommendation.trim().length > 0
              ? m.recommendation.trim()
              : "";

          const allReasons: string[] = [];
          if (reason) allReasons.push(reason);
          allReasons.push(...concerns);

          return {
            caregiver: {
              id: caregiverId || name,
              profile_id: caregiverId || name,
              display_name: name,
              headline: null,
            },
            score: fitScore,
            reasons: allReasons,
            summary: recommendation || reason || "",
            aiRecommendation: recommendation || undefined,
            aiMainReason: reason || undefined,
            aiConcerns: concerns.length > 0 ? concerns : undefined,
          };
        })
        .filter((m) => m.caregiver.id && Number.isFinite(m.score));
    } catch {
      return [];
    }
  }

  async function hydrateAiMatchAvatars(matches: CaregiverMatch[], token: string | null): Promise<CaregiverMatch[]> {
    if (!matches.length) return matches;
    const headers = token ? zorentaHeaders(token) : {};
    const hydrated = await Promise.all(
      matches.map(async (m) => {
        const routeId = m.caregiver.id?.trim();
        if (!routeId) {
          return { ...m, hasPublicProfile: false };
        }
        try {
          const res = await fetch(`/api/zorenta/caregivers/${encodeURIComponent(routeId)}`, { headers });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              ...m,
              hasPublicProfile: false,
            };
          }
          const linkedProfileId =
            typeof data?.profile?.id === "string" && data.profile.id.trim().length > 0
              ? data.profile.id.trim()
              : null;
          const avatar =
            typeof data?.profile?.avatar_url === "string" ? data.profile.avatar_url : null;
          const payload = data as Record<string, unknown>;
          const publicPageRenderable = hasRenderablePublicCaregiverPagePayload(payload);
          if (!linkedProfileId) {
            return {
              ...m,
              hasPublicProfile: false,
              caregiver: {
                ...m.caregiver,
                ...(avatar ? { avatar_url: avatar } : {}),
              },
            };
          }
          if (!publicPageRenderable) {
            return {
              ...m,
              hasPublicProfile: false,
              caregiver: {
                ...m.caregiver,
                profile_id: linkedProfileId,
                ...(avatar ? { avatar_url: avatar } : {}),
              },
            };
          }
          return {
            ...m,
            hasPublicProfile: true,
            caregiver: {
              ...m.caregiver,
              profile_id: linkedProfileId,
              ...(avatar ? { avatar_url: avatar } : {}),
            },
          };
        } catch {
          return { ...m, hasPublicProfile: false };
        }
      })
    );
    return hydrated;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      const headers = token ? zorentaHeaders(token) : {};
      const [jobRes, meRes, appsRes] = await Promise.all([
        fetch(`/api/zorenta/jobs/${id}`, { headers }),
        fetch("/api/zorenta/me", { headers }),
        fetch("/api/zorenta/applications", { headers }),
      ]);
      const jobData = await jobRes.json().catch(() => ({}));
      const meData = await meRes.json().catch(() => ({}));
      const appsData = await appsRes.json().catch(() => ({}));
      if (!cancelled) {
        if (jobData.id) setJob(jobData);
        if (meData.profile) setMe(meData);
        const applications = appsData.applications ?? [];
        const mine = applications.find((a: { job_id: string }) => a.job_id === id) as
          | {
              id: string;
              message?: string | null;
              conversation_id?: string | null;
            }
          | undefined;
        setAlreadyApplied(Boolean(mine));
        setMyApplication(
          mine
            ? {
                id: mine.id,
                message: mine.message ?? null,
                conversationId:
                  typeof mine.conversation_id === "string" ? mine.conversation_id : null,
              }
            : null
        );
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id || !MATCH_AGENT_ID || !job || !me?.profile) return;
    const isPosterForJob = me.profile.id === job.poster_id;
    if (!isPosterForJob) {
      setAiMatches([]);
      setAiMatchesError(null);
      return;
    }

    let cancelled = false;

    async function loadLatestMatches() {
      setAiMatchesLoading(true);
      setAiMatchesError(null);
      try {
        const token = await getZorentaAccessToken();
        if (!token) {
          if (!cancelled) setAiMatchesLoading(false);
          return;
        }
        const res = await fetch(`/api/agent-match-results?jobId=${encodeURIComponent(id)}`, {
          headers: zorentaHeaders(token),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setAiMatchesError(
              typeof data?.error === "string" && data.error.trim()
                ? data.error
                : "Kon bestaande matchresultaten niet laden."
            );
          }
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          const parsed = parseMatchAgentOutput(
            typeof data?.output === "string" ? data.output : null
          ).slice(0, 3);
          const matches = await hydrateAiMatchAvatars(parsed, token);
          if (cancelled) return;
          setAiMatches(matches);
        }
      } catch {
        if (!cancelled) {
          setAiMatchesError("Kon bestaande matchresultaten niet laden.");
        }
      } finally {
        if (!cancelled) {
          setAiMatchesLoading(false);
        }
      }
    }

    loadLatestMatches();

    return () => {
      cancelled = true;
    };
  }, [id, MATCH_AGENT_ID, job?.id, job?.poster_id, me?.profile?.id]);

  useEffect(() => {
    setHeroImgFailed(false);
    setHeroOrientation("unknown");
  }, [id, job?.image_urls]);

  useEffect(() => {
    let cancelled = false;
    async function detectIntakeLinkedJob() {
      if (!job) {
        setIsIntakeLinkedJob(false);
        return;
      }
      const token = await getZorentaAccessToken();
      if (!token) {
        setIsIntakeLinkedJob(false);
        return;
      }
      const intakeRes = await fetch("/api/zorenta/intake", { headers: zorentaHeaders(token) });
      const intakeData = await intakeRes.json().catch(() => ({}));
      const rows: Array<{ job_id?: string | null }> = Array.isArray(intakeData?.intakes)
        ? intakeData.intakes
        : [];
      const linked = rows.some((row) => typeof row?.job_id === "string" && row.job_id === job.id);
      if (!cancelled) setIsIntakeLinkedJob(linked);
    }
    void detectIntakeLinkedJob();
    return () => {
      cancelled = true;
    };
  }, [job?.id]);

  useEffect(() => {
    if (!job || heroImgFailed) return;
    const url = normalizeJobImageUrls(job.image_urls)[0];
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setHeroOrientation(classifyHeroOrientation(img.naturalWidth, img.naturalHeight));
    };
    img.onerror = () => {
      if (cancelled) return;
      setHeroOrientation("landscape");
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [job, heroImgFailed, id]);

  useEffect(() => {
    if (lightboxIndex === null) {
      setLightboxAnimIn(false);
      return;
    }
    setLightboxAnimIn(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setLightboxAnimIn(true));
    });
    return () => cancelAnimationFrame(id);
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [lightboxIndex]);

  useEffect(() => {
    if (!id || !job || !me?.profile || me.profile.id !== job.poster_id) return;
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch(`/api/zorenta/matching/caregivers-for-job?job_id=${id}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && Array.isArray(d.matches)) {
            const normalized = (d.matches as CaregiverMatch[]).map((m) => ({
              ...m,
              caregiver: {
                ...m.caregiver,
                // Backward/shape-safe: accept both snake_case and camelCase avatar fields.
                avatar_url:
                  typeof m.caregiver?.avatar_url === "string"
                    ? m.caregiver.avatar_url
                    : typeof m.caregiver?.avatarUrl === "string"
                      ? m.caregiver.avatarUrl
                      : null,
              },
            }));
            setCaregiverMatches(normalized);
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [id, job, me?.profile]);

  async function handleRunMatchAgent() {
    if (!id || !MATCH_AGENT_ID) return;
    const token = await getZorentaAccessToken();
    if (!token) {
      setAiMatchesError("Je bent niet ingelogd. Vernieuw de pagina en probeer opnieuw.");
      return;
    }
    setAiMatchesLoading(true);
    setAiMatchesError(null);
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({
          agentId: MATCH_AGENT_ID,
          jobId: id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAiMatchesError(
          typeof data?.error === "string" && data.error.trim()
            ? data.error
            : "Match Agent-run is mislukt."
        );
        return;
      }
      const output =
        typeof data?.output === "string"
          ? data.output
          : typeof data?.result === "string"
            ? data.result
            : null;
      const matches = parseMatchAgentOutput(output).slice(0, 3);
      const hydrated = await hydrateAiMatchAvatars(matches, token);
      setAiMatches(hydrated);
      setSelectedAiProfileIds(new Set());
    } catch {
      setAiMatchesError("Match Agent-run is mislukt.");
    } finally {
      setAiMatchesLoading(false);
    }
  }

  const toggleAiProfileSelected = useCallback((profileId: string, checked: boolean) => {
    setSelectedAiProfileIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(profileId);
      else next.delete(profileId);
      return next;
    });
  }, []);

  async function handleBatchContactSelectedAi() {
    if (selectedAiProfileIds.size === 0) return;
    setBatchAiLoading(true);
    setBatchAiError(null);
    setBatchAiSuccess(null);
    try {
      const token = await getZorentaAccessToken();
      if (!token) {
        setBatchAiError("Je moet ingelogd zijn om berichten te sturen.");
        return;
      }

      const ordered = aiMatches.filter((m) => selectedAiProfileIds.has(m.caregiver.profile_id));
      if (ordered.length === 0) return;

      const meRes = await fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
      const meData = await meRes.json().catch(() => ({}));
      const meId =
        meRes.ok && meData?.profile?.id != null ? String(meData.profile.id) : null;
      if (!meId) {
        setBatchAiError("Profiel kon niet worden geladen.");
        return;
      }

      const failureLines: string[] = [];
      let successCount = 0;
      let firstValidConversationId: string | null = null;
      let firstWhereNewSent: string | null = null;

      for (const m of ordered) {
        const label = m.caregiver.display_name?.trim() || "Zorgverlener";
        const prefill = buildAiMatchFirstMessage({
          caregiverDisplayName: m.caregiver.display_name ?? "Zorgverlener",
          jobTitle: job?.title ?? null,
          jobLocation: job?.city?.trim() || job?.region?.trim() || null,
          match: {
            reasons: m.reasons,
            aiMainReason: m.aiMainReason,
            aiConcerns: m.aiConcerns,
          },
        });

        const convResult = await createZorentaConversation(token, {
          otherUserId: m.caregiver.profile_id,
          jobId: id,
        });
        if (!convResult.ok) {
          failureLines.push(`${label}: ${convResult.error}`);
          continue;
        }

        if (!firstValidConversationId) {
          firstValidConversationId = convResult.conversationId;
        }

        const dup = await shouldSendBatchMessage(token, {
          conversationId: convResult.conversationId,
          currentUserId: meId,
          newBody: prefill,
        });
        if (!dup.ok) {
          failureLines.push(`${label}: ${dup.error}`);
          continue;
        }
        if (!dup.shouldSend) {
          continue;
        }

        const sendResult = await sendZorentaMessage(token, {
          conversationId: convResult.conversationId,
          body: prefill,
        });
        if (!sendResult.ok) {
          failureLines.push(`${label}: ${sendResult.error}`);
          continue;
        }
        successCount += 1;
        if (!firstWhereNewSent) {
          firstWhereNewSent = convResult.conversationId;
        }
      }

      if (failureLines.length > 0) {
        setBatchAiError(failureLines.join("\n"));
      }
      const navConversationId = firstWhereNewSent ?? firstValidConversationId;
      if (navConversationId) {
        router.push(`/berichten?conversation=${encodeURIComponent(navConversationId)}`);
      }
      if (successCount > 0) {
        setBatchAiSuccess(`Berichten verzonden naar ${successCount} kandidaten`);
        if (batchAiSuccessTimeoutRef.current) {
          clearTimeout(batchAiSuccessTimeoutRef.current);
        }
        batchAiSuccessTimeoutRef.current = setTimeout(() => {
          setBatchAiSuccess(null);
          batchAiSuccessTimeoutRef.current = null;
        }, 3500);
      }
      setSelectedAiProfileIds(new Set());
    } catch {
      setBatchAiError("Er ging iets mis bij het starten van de gesprekken.");
    } finally {
      setBatchAiLoading(false);
    }
  }

  async function handleApply() {
    const trimmed = applyMessage.trim();
    if (!trimmed) {
      setApplyError("Voeg eerst een korte motivatie of introductie toe.");
      applyTextareaRef.current?.focus();
      return;
    }
    const token = await getZorentaAccessToken();
    if (!token) {
      setApplyError("Je sessie is verlopen. Log opnieuw in om te solliciteren.");
      return;
    }
    setApplyError(null);
    setApplying(true);
    const res = await fetch("/api/zorenta/applications", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ job_id: id, message: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    setApplying(false);
    if (res.ok) {
      trackZorentaEvent("application_sent", { job_id: id });
      setAlreadyApplied(true);
      setApplicationSent(true);
      setMyApplication({
        id: String(data?.id ?? ""),
        message: typeof data?.message === "string" ? data.message : trimmed,
        conversationId: typeof data?.conversation_id === "string" ? data.conversation_id : null,
      });
      return;
    }
    if (res.status === 409 && typeof data?.application_id === "string") {
      setAlreadyApplied(true);
      setMyApplication({
        id: data.application_id,
        message: applyMessage.trim() || null,
        conversationId: typeof data?.conversation_id === "string" ? data.conversation_id : null,
      });
      setApplyError(
        typeof data?.error === "string" && data.error.trim()
          ? data.error
        : "Je hebt al gereageerd op deze opdracht."
      );
      return;
    }
    setApplyError(
      typeof data?.error === "string" && data.error.trim()
        ? data.error
        : "Versturen is niet gelukt. Probeer het opnieuw."
    );
  }

  if (loading || !job) {
    return <ZorentaPageSkeleton />;
  }

  const isPoster = me?.profile?.id === job.poster_id;
  const roleAllows = me?.profile?.role === "caregiver";
  const statusAllows = job.status === "open";
  const canApply = roleAllows && !isPoster && statusAllows && !alreadyApplied;
  const topCaregiverMatches = caregiverMatches.slice(0, 5);
  const strongCaregiverMatches = topCaregiverMatches.filter((m) => m.score >= 40);

  const postedAt =
    job.created_at
      ? new Date(job.created_at).toLocaleDateString("nl-NL", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })
      : null;

  const galleryUrls = normalizeJobImageUrls(job.image_urls);
  const heroUrl = galleryUrls[0];
  const extraGallery = galleryUrls.slice(1);

  const jobTags: string[] = [];
  if (job.poster_type === "client") jobTags.push("PGB");
  const availabilityLc = (job.availability ?? "").toLowerCase();
  const scheduleLc = (job.schedule ?? "").toLowerCase();
  if (availabilityLc.includes("flexibel")) jobTags.push("flexibel");
  if (
    availabilityLc.includes("fulltime") ||
    availabilityLc.includes("parttime") ||
    scheduleLc.includes("langdurig")
  )
    jobTags.push("langdurig");
  if (jobTags.length === 0) jobTags.push("in overleg");

  const careLabel =
    primaryCareLabelFromTaxonomy(job.soort_hulp_zorg ?? undefined, job.zorgniveau ?? undefined) ||
    (job.care_context || job.care_type || "").trim();
  const careTypeLower = careLabel.toLowerCase();
  const tagPills = [
    ...jobTags.map((t) => ({ key: `tag-${t}`, label: t })),
    ...(careLabel && !jobTags.some((x) => x.toLowerCase() === careTypeLower)
      ? [{ key: "care-type", label: careLabel }]
      : []),
  ];

  const locationLine = [job.city, job.region, job.country].filter(Boolean).join(", ") || "—";
  const priceLabel = formatJobPrice({
    hourly_rate: job.hourly_rate,
    budget_min: job.budget_min,
    budget_max: job.budget_max,
  });

  function scrollToApplyForm() {
    const el = document.getElementById("apply-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Keep existing CTA behavior and focus the textarea after smooth scrolling starts.
    window.setTimeout(() => {
      applyTextareaRef.current?.focus();
    }, 350);
  }

  const hasDescription = Boolean(job.description?.trim());
  const fallbackTheme = getHeroFallbackTheme(careLabel);

  const showHeroImage = Boolean(heroUrl && !heroImgFailed);
  const heroLayout =
    !showHeroImage ? "fallback" : heroOrientation === "unknown" ? "loading" : heroOrientation;
  const isPortraitHero = heroLayout === "portrait" && showHeroImage;

  function handleHeroImageLoad(e: { currentTarget: HTMLImageElement }) {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setHeroOrientation(classifyHeroOrientation(naturalWidth, naturalHeight));
  }

  const titleBelowBlock = (
    <div className="space-y-2 sm:space-y-3 lg:space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "border-0 px-3 py-1 text-xs font-semibold shadow-sm",
            job.status === "open"
              ? "bg-[#40ADA8]/12 text-[#2d7f7b] ring-1 ring-[#40ADA8]/25"
              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
          )}
        >
          {job.status === "open" ? "Open" : job.status}
        </Badge>
        {postedAt ? <span className="text-xs font-medium text-slate-500">Geplaatst {postedAt}</span> : null}
          {isIntakeLinkedJob ? (
            <Badge
              variant="outline"
              className="rounded-full border-[#40ADA8]/35 bg-[#40ADA8]/10 text-[11px] text-[#2f7f7a]"
            >
              Aangemaakt vanuit zorgvraag
            </Badge>
          ) : null}
      </div>
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl">{job.title}</h1>
    </div>
  );

  return (
    <ZorentaPageContainer
      maxWidth="wide"
      className="space-y-5 pb-12 sm:space-y-6 sm:pb-14 lg:space-y-5 lg:pb-12"
    >
      {showCreatedSuccess && (
        <div
          className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-900 shadow-sm"
          role="status"
        >
          {isIntakeLinkedJob
            ? "Opdracht is geplaatst. Zorgverleners kunnen nu reageren."
            : "Opdracht is geplaatst. Zorgverleners kunnen nu reageren."}
        </div>
      )}

      <header className="space-y-3 sm:space-y-4 lg:space-y-3">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar opdrachten
          </Link>
        </div>

        {/* Hero: landscape = brede banner; portrait/square = kaart + titel eronder; unknown = skeleton tot meting */}
        {heroLayout === "loading" ? (
          <div
            className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-200/70 ring-1 ring-slate-200/80 sm:aspect-[2/1]"
            aria-hidden
          />
        ) : null}

        {heroLayout === "fallback" ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-[0_20px_50px_-14px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.08] sm:aspect-[2/1]">
            <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackTheme.gradient)}>
              <div className="flex h-full w-full items-center justify-center">
                <Briefcase className="h-20 w-20 text-white/40" aria-hidden />
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col justify-end p-5 sm:p-6 md:p-8 lg:p-6">
              <div className="mb-2.5 flex flex-wrap items-center gap-2 lg:mb-2">
                <Badge
                  className={cn(
                    "border-0 px-3 py-1 text-xs font-semibold shadow-sm ring-1",
                    fallbackTheme.chip
                  )}
                >
                  {fallbackTheme.headline}
                </Badge>
                <Badge
                  className={cn(
                    "border-0 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
                    job.status === "open"
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "bg-black/30 text-white/90 ring-1 ring-white/20"
                  )}
                >
                  {job.status === "open" ? "Open" : job.status}
                </Badge>
                {postedAt ? (
                  <span className="text-xs font-medium text-white/80">Geplaatst {postedAt}</span>
                ) : null}
              </div>
              <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl">
                {job.title}
              </h1>
            </div>
          </div>
        ) : null}

        {heroLayout === "landscape" && showHeroImage ? (
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-[0_20px_50px_-14px_rgba(15,23,42,0.22)] ring-1 ring-black/[0.08] sm:aspect-[2/1]">
            {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded listing photo */}
            <img
              src={heroUrl}
              alt=""
              className="absolute inset-0 z-0 h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
              onLoad={handleHeroImageLoad}
              onError={() => setHeroImgFailed(true)}
            />
            <button
              type="button"
              className="absolute inset-0 z-[1] cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
              aria-label="Volledige foto bekijken"
              onClick={() => setLightboxIndex(0)}
            />
            <div
              className="pointer-events-none absolute right-4 top-4 z-[4] flex items-center gap-1.5 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-md"
              aria-hidden
            >
              <Maximize2 className="h-3.5 w-3.5 opacity-90" strokeWidth={2.25} />
              <span>Bekijk foto</span>
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/80 via-black/30 to-transparent"
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col justify-end p-5 sm:p-6 md:p-8 lg:p-6">
              <div className="mb-2.5 flex flex-wrap items-center gap-2 lg:mb-2">
                <Badge
                  className={cn(
                    "border-0 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm",
                    job.status === "open"
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "bg-black/30 text-white/90 ring-1 ring-white/20"
                  )}
                >
                  {job.status === "open" ? "Open" : job.status}
                </Badge>
                {postedAt ? (
                  <span className="text-xs font-medium text-white/80">Geplaatst {postedAt}</span>
                ) : null}
              </div>
              <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl">
                {job.title}
              </h1>
            </div>
          </div>
        ) : null}

        {isPortraitHero ? (
          <article className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_18px_44px_-16px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/45">
            <div className="bg-gradient-to-b from-slate-50 via-slate-50/95 to-slate-100/75 px-4 pt-3.5 pb-2.5 sm:px-6 sm:pt-4 sm:pb-3 lg:px-6 lg:pt-3 lg:pb-2.5">
              <div className="relative mx-auto w-full max-w-[min(100%,24rem)] sm:max-w-[min(100%,30rem)]">
                <div className="relative overflow-hidden rounded-xl bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-slate-200/60">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded listing photo */}
                  <img
                    src={heroUrl}
                    alt=""
                    className="relative z-0 block h-auto w-full max-h-[min(78vh,600px)] object-contain object-center"
                    loading="eager"
                    decoding="async"
                    onLoad={handleHeroImageLoad}
                    onError={() => setHeroImgFailed(true)}
                  />
                  <button
                    type="button"
                    className="absolute inset-0 z-[1] cursor-zoom-in rounded-xl bg-gradient-to-t from-black/[0.04] to-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#40ADA8]/45"
                    aria-label="Volledige foto bekijken"
                    onClick={() => setLightboxIndex(0)}
                  />
                  <div
                    className="pointer-events-none absolute right-2.5 top-2.5 z-[4] flex items-center gap-1.5 rounded-full border border-slate-200/85 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm"
                    aria-hidden
                  >
                    <Maximize2 className="h-3.5 w-3.5 opacity-80" strokeWidth={2.25} />
                    <span>Bekijk foto</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100/95 px-5 py-3.5 sm:px-6 sm:py-4 lg:px-6 lg:py-3">
              <div className="space-y-1.5 sm:space-y-2 lg:space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      "border-0 px-3 py-1 text-xs font-semibold shadow-sm",
                      job.status === "open"
                        ? "bg-[#40ADA8]/12 text-[#2d7f7b] ring-1 ring-[#40ADA8]/25"
                        : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
                    )}
                  >
                    {job.status === "open" ? "Open" : job.status}
                  </Badge>
                  {postedAt ? (
                    <span className="text-xs font-medium text-slate-500">Geplaatst {postedAt}</span>
                  ) : null}
                </div>
                <h1 className="text-[1.65rem] font-bold leading-snug tracking-tight text-slate-900 sm:text-3xl">
                  {job.title}
                </h1>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 lg:mt-2.5">
                {tagPills.map(({ key, label }) => (
                  <span
                    key={key}
                    className="rounded-full border border-slate-200/80 bg-slate-50/95 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ) : null}

        {heroLayout === "square" && showHeroImage ? (
          <div className="space-y-3.5 sm:space-y-4 lg:space-y-3">
            <div className="flex justify-center">
              <div className="relative aspect-square w-full max-w-[min(100%,26rem)] overflow-hidden rounded-2xl bg-slate-100/90 shadow-[0_20px_50px_-14px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.08] sm:max-w-[min(100%,30rem)]">
                <div className="flex h-full min-h-0 w-full items-center justify-center p-3 sm:p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded listing photo */}
                  <img
                    src={heroUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain object-center"
                    loading="eager"
                    decoding="async"
                    onLoad={handleHeroImageLoad}
                    onError={() => setHeroImgFailed(true)}
                  />
                </div>
                <button
                  type="button"
                  className="absolute inset-0 z-[1] cursor-zoom-in rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#40ADA8]/50"
                  aria-label="Volledige foto bekijken"
                  onClick={() => setLightboxIndex(0)}
                />
                <div
                  className="pointer-events-none absolute right-3 top-3 z-[4] flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-md backdrop-blur-sm"
                  aria-hidden
                >
                  <Maximize2 className="h-3.5 w-3.5 opacity-80" strokeWidth={2.25} />
                  <span>Bekijk foto</span>
                </div>
              </div>
            </div>
            {titleBelowBlock}
          </div>
        ) : null}

        {extraGallery.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {extraGallery.map((src, thumbIdx) => (
              <button
                key={src}
                type="button"
                className="h-20 w-28 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200/80 shadow-sm transition hover:ring-[#40ADA8]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#40ADA8]/40"
                aria-label={`Foto ${thumbIdx + 2} vergroten`}
                onClick={() => setLightboxIndex(thumbIdx + 1)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}

        {!isPortraitHero ? (
          <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-3 sm:pb-3.5 lg:pb-2.5">
            {tagPills.map(({ key, label }) => (
              <span
                key={key}
                className="rounded-full border border-slate-200/90 bg-slate-50/90 px-3.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <section className="rounded-2xl border border-slate-200/75 bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Building2 className="h-4 w-4 text-[#40ADA8]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Zorgtype</p>
              <p className="truncate text-sm font-medium text-slate-900">{careLabel || "—"}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <MapPin className="h-4 w-4 text-[#40ADA8]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Locatie</p>
              <p className="truncate text-sm font-medium text-slate-900">{locationLine}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Calendar className="h-4 w-4 text-[#40ADA8]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Planning</p>
              <p className="truncate text-sm font-medium text-slate-900">{job.schedule?.trim() || "In overleg"}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <Euro className="h-4 w-4 text-[#40ADA8]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Budget</p>
              <p className="truncate text-sm font-medium text-slate-900">{priceLabel ?? "—"}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="space-y-5 lg:col-span-2 lg:space-y-5">
          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6 md:p-8 lg:p-6">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Over deze opdracht</h3>
            <div className="mt-4 text-[17px] leading-[1.65] text-slate-800 lg:mt-3">
              {hasDescription ? (
                <p className="whitespace-pre-wrap">{job.description}</p>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/90 px-4 py-4 text-[15px] leading-relaxed text-slate-600">
                  Nog geen beschrijving toegevoegd.{" "}
                  <span className="text-slate-700">Neem gerust contact op voor meer informatie over deze opdracht.</span>
                </p>
              )}
            </div>
            {(job.experience_requirements?.trim() || job.certificates_requirements?.trim()) ? (
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-[15px] leading-relaxed text-slate-700">
                {job.experience_requirements?.trim() ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gewenste ervaring</p>
                    <p className="mt-1.5 whitespace-pre-wrap">{job.experience_requirements}</p>
                  </div>
                ) : null}
                {job.certificates_requirements?.trim() ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificaten & eisen</p>
                    <p className="mt-1.5 whitespace-pre-wrap">{job.certificates_requirements}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm shadow-slate-200/40 sm:p-6 lg:p-5">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Praktische informatie</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:mt-4">
              <InfoCell icon={MapPin} label="Locatie" value={locationLine} />
              <InfoCell icon={Building2} label="Zorgcontext" value={careLabel || "—"} />
              <InfoCell icon={Users} label="Gezochte rol" value={job.role_sought?.trim() || "—"} />
              <InfoCell icon={Clock} label="Inzetvorm" value={job.availability?.trim() || "—"} />
              <InfoCell icon={Calendar} label="Planning / rooster" value={job.schedule?.trim() || "—"} />
              <InfoCell icon={Euro} label="Prijs" value={priceLabel ?? "—"} />
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-3 lg:top-[4.25rem]">
            <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_36px_-14px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/70">
              <CardContent className="space-y-5 p-5 sm:p-6 lg:space-y-4 lg:p-5">
                <div className="space-y-1 border-b border-slate-100 pb-4 lg:pb-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Opdracht
                  </p>
                  <p className="text-sm text-slate-600">
                    {job.status === "open"
                      ? "We tonen geschikte matches voor deze opdracht."
                      : `Status: ${job.status}`}
                  </p>
                </div>

                {isPoster ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Je beheert deze opdracht.
                    </p>
                    <Link href={`/jobs/${id}/edit`} className="block">
                      <Button variant="outline" className="h-12 w-full rounded-xl border-slate-200 text-base shadow-sm">
                        <Pencil className="mr-2 h-4 w-4" />
                        Opdracht bewerken
                      </Button>
                    </Link>
                    <Link href="/applications" className="block">
                      <Button className="h-12 w-full rounded-xl bg-[#40ADA8] text-base font-semibold text-white shadow-md hover:bg-[#369e9a]">
                        <FileText className="mr-2 h-4 w-4" />
                        Matches bekijken
                      </Button>
                    </Link>
                  </div>
                ) : !me?.profile ? (
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Je profiel kon niet worden geladen.</p>
                    <p className="text-xs text-slate-500">Rond je registratie af om te kunnen reageren.</p>
                  </div>
                ) : !roleAllows ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Alleen zorgverleners kunnen reageren.</p>
                    <p className="text-xs text-slate-500">Rol: {me?.profile?.role ?? "—"}</p>
                    <Button
                      variant="outline"
                      className="h-12 w-full rounded-xl"
                      onClick={() => router.push("/jobs")}
                    >
                      Bekijk opdrachten
                    </Button>
                  </div>
                ) : !statusAllows ? (
                  <p className="text-sm text-slate-600">Deze opdracht is niet meer open ({job.status}).</p>
                ) : canApply ? (
                  <div className="space-y-3">
                    <Button
                      type="button"
                      className="h-14 w-full rounded-xl bg-gradient-to-b from-[#48b8b3] to-[#40ADA8] text-lg font-semibold tracking-tight text-white shadow-[0_6px_24px_-4px_rgba(64,173,168,0.55)] ring-1 ring-white/25 transition hover:from-[#40ADA8] hover:to-[#369e9a] hover:shadow-[0_10px_28px_-6px_rgba(64,173,168,0.6)]"
                      onClick={scrollToApplyForm}
                    >
                      Reageer op deze opdracht
                    </Button>
                    <p className="text-center text-xs text-slate-500">
                      Je motivatie wordt je sollicitatie én het eerste bericht in het gesprek met de opdrachtgever.
                    </p>
                  </div>
                ) : alreadyApplied ? (
                  <div className="space-y-2">
                    {myApplication?.conversationId ? (
                      <Button
                        size="lg"
                        className="h-14 w-full rounded-xl bg-[#40ADA8] text-base font-semibold text-white hover:bg-[#369e9a]"
                        onClick={() => {
                          const cid = myApplication?.conversationId;
                          if (cid)
                            router.push(`/berichten?conversation=${encodeURIComponent(cid)}`);
                        }}
                      >
                        Open gesprek
                      </Button>
                    ) : myApplication?.id && job.poster_id ? (
                      <CaregiverApplicationThreadButton
                        posterId={job.poster_id}
                        applicationId={myApplication.id}
                        jobId={job.id}
                        introBody={myApplication.message}
                        className="h-14 w-full rounded-xl bg-[#40ADA8] text-base font-semibold text-white hover:bg-[#369e9a]"
                      />
                    ) : null}
                    <Button
                      size="lg"
                      variant={myApplication?.conversationId ? "outline" : undefined}
                      className={
                        myApplication?.conversationId
                          ? "h-12 w-full rounded-xl text-base font-semibold"
                          : "h-14 w-full rounded-xl text-base font-semibold"
                      }
                      onClick={() => router.push("/applications")}
                    >
                      Bekijk matches
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">Je kunt nog niet reageren op deze opdracht.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {isPoster && MATCH_AGENT_ID && (
        <section className="space-y-3 lg:space-y-2.5">
          <ZorentaSectionHeader
            title="AI-matches voor deze opdracht"
            description="Vind snel de best passende zorgverleners op basis van deze opdracht."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full bg-[#40ADA8] px-4 text-xs font-semibold text-white hover:bg-[#369e9a]"
              onClick={handleRunMatchAgent}
              disabled={aiMatchesLoading}
            >
              {aiMatchesLoading ? "Bezig met matchen..." : aiMatches.length > 0 ? "Opnieuw matchen" : "Vind matches"}
            </Button>
            {aiMatches.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-slate-200 px-4 text-xs font-semibold"
                onClick={handleBatchContactSelectedAi}
                disabled={batchAiLoading || selectedAiProfileIds.size === 0}
              >
                {batchAiLoading ? "Bezig met verzenden..." : "Benader geselecteerde kandidaten"}
              </Button>
            ) : null}
            {aiMatches.length === 0 && !aiMatchesLoading && !aiMatchesError ? (
              <p className="text-xs text-slate-500">
                Nog geen AI-matches geladen voor deze opdracht.
              </p>
            ) : null}
          </div>
          {aiMatchesError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {aiMatchesError}
            </div>
          )}
          {batchAiError && (
            <div className="whitespace-pre-wrap rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
              {batchAiError}
            </div>
          )}
          {batchAiSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              {batchAiSuccess}
            </div>
          )}
          {aiMatches.length > 0 && (
            <div className="space-y-3">
              {aiMatches.map((m, index) => (
                <CaregiverMatchCard
                  key={m.caregiver.id}
                  match={m}
                  rank={index + 1}
                  jobId={id}
                  presentationMode="ai"
                  messagePrefill={buildAiMatchFirstMessage({
                    caregiverDisplayName: m.caregiver.display_name ?? "Zorgverlener",
                    jobTitle: job?.title ?? null,
                    jobLocation: job?.city?.trim() || job?.region?.trim() || null,
                    match: {
                      reasons: m.reasons,
                      aiMainReason: m.aiMainReason,
                      aiConcerns: m.aiConcerns,
                    },
                  })}
                  selectionMode
                  selected={selectedAiProfileIds.has(m.caregiver.profile_id)}
                  onSelectionChange={(checked) => toggleAiProfileSelected(m.caregiver.profile_id, checked)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {isPoster && topCaregiverMatches.length > 0 && (
        <section className="space-y-3 lg:space-y-2.5">
          <ZorentaSectionHeader
            title="Beste matches (bestaande logica)"
            description="Zorgverleners die goed bij deze opdracht passen op basis van de huidige matching."
          />
          {strongCaregiverMatches.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Nog geen sterke matches gevonden. Probeer je opdracht iets aan te passen.
            </div>
          ) : null}
          <div className="space-y-3">
            {topCaregiverMatches.map((m, index) => (
              <CaregiverMatchCard key={m.caregiver.id} match={m} rank={index + 1} />
            ))}
          </div>
        </section>
      )}

      {(canApply || applicationSent) && (
        <div id="apply-section" className="scroll-mt-24">
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-md shadow-slate-200/25 ring-1 ring-slate-200/60">
          <CardHeader className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6 lg:py-3.5 lg:px-6">
            <CardTitle className="text-lg font-semibold text-slate-900">Solliciteren</CardTitle>
            <p className="text-sm text-slate-500">
              Stel jezelf kort voor of licht je ervaring toe. Dit wordt opgeslagen als sollicitatie en als eerste bericht
              in jullie gesprek.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-6 sm:px-6 lg:space-y-3.5 lg:px-6 lg:py-5">
            {applicationSent ? (
              <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
                <div>
                  <p className="text-base font-semibold text-emerald-900">Je sollicitatie is verstuurd.</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    De opdrachtgever ontvangt direct jouw bericht.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {myApplication?.conversationId ? (
                    <Button
                      type="button"
                      className="bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                      onClick={() => {
                        const cid = myApplication?.conversationId;
                        if (cid)
                          router.push(`/berichten?conversation=${encodeURIComponent(cid)}`);
                      }}
                    >
                      Open gesprek
                    </Button>
                  ) : myApplication?.id && job.poster_id ? (
                    <CaregiverApplicationThreadButton
                      posterId={job.poster_id}
                      applicationId={myApplication.id}
                      jobId={job.id}
                      introBody={myApplication.message}
                      className="bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                    />
                  ) : (
                    <Button
                      type="button"
                      className="bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                      onClick={() => router.push("/berichten")}
                    >
                      Ga naar berichten
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={() => router.push("/jobs")}>
                    Terug naar opdrachten
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {applyError && (
                  <p
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                    role="alert"
                  >
                    {applyError}
                  </p>
                )}
                <Textarea
                  ref={applyTextareaRef}
                  placeholder="Bijv. Hallo, ik ben verpleegkundige met ervaring in ..."
                  value={applyMessage}
                  onChange={(e) => {
                    setApplyMessage(e.target.value);
                    if (applyError) setApplyError(null);
                  }}
                  rows={4}
                  className="resize-none rounded-xl border-slate-200 text-base focus:border-[#40ADA8] focus:ring-[#40ADA8]/20"
                />
                <Button
                  onClick={handleApply}
                  disabled={applying}
                  className="h-14 w-full rounded-xl bg-[#40ADA8] text-lg font-semibold text-white shadow-lg shadow-[#40ADA8]/20 hover:bg-[#369e9a]"
                >
                  {applying ? "Bezig met versturen..." : "Solliciteer nu"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {lightboxIndex !== null && galleryUrls[lightboxIndex] ? (
        <div
          className={cn(
            "fixed inset-0 z-[100] flex items-center justify-center bg-black p-5 sm:p-10",
            "transition-[opacity] duration-200 ease-out",
            lightboxAnimIn ? "opacity-100" : "opacity-0"
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Volledige opdrachtafbeelding"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-[102] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            aria-label="Sluiten"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <div
            className={cn(
              "relative z-[101] flex w-full max-w-[min(96vw,1280px)] flex-col items-center justify-center",
              "transition-[opacity,transform] duration-200 ease-out",
              lightboxAnimIn ? "translate-y-0 scale-100 opacity-100" : "translate-y-1 scale-[0.98] opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryUrls[lightboxIndex]}
              alt=""
              className="mx-auto block max-h-[min(88vh,920px)] w-auto max-w-full rounded-lg object-contain object-center shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
            />
          </div>
        </div>
      ) : null}
    </ZorentaPageContainer>
  );
}
