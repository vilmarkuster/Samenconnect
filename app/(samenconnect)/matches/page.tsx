"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Euro,
  Sparkles,
  MessageCircle,
  Bookmark,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";

import { CaregiverProfile } from "@/lib/zorenta/mock-caregivers";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { formatLocation } from "@/lib/zorenta/formatters";
import { ZorentaMessageModal } from "@/components/zorenta/message-modal";
import { StartMessageButton } from "@/components/zorenta/start-message-button";
import { LocationAutocomplete } from "@/components/zorenta/location-autocomplete";
import { estimateDistanceKm } from "@/lib/zorenta/distance";
const ZORGVRAGEN_DRAFT_KEY = "samenconnect_zorgvraag_draft";
const MESSAGES_KEY = "samenconnect_messages";
const SELECTED_CONVERSATION_KEY = "samenconnect_selected_conversation";

type Intake = {
  id: string;
  job_id?: string | null;
  care_type?: string | null;
  care_frequency?: string | null;
  preferred_schedule?: string | null;
  preferred_city?: string | null;
  preferred_region?: string | null;
  skills_required?: string[] | null;
  budget_min?: number | null;
  budget_max?: number | null;
  urgency?: string | null;
};

type ScoredMatch = {
  caregiver: CaregiverProfile;
  score: number;
  reasons: string[];
};

/** `public.saved_providers.provider_id` must be `public.profiles.id` (FK), not legacy `caregivers.id`. */
function savedProviderProfileId(cg: CaregiverProfile): string | null {
  const v = cg.linkedProfileId?.trim();
  return v && v.length > 0 ? v : null;
}

const ZORGTYPE_OPTIONS = [
  "Thuiszorg",
  "Begeleiding",
  "Persoonlijke verzorging",
  "Huishoudelijke hulp",
  "Dagbesteding",
  "Verpleging",
  "Mantelzorgondersteuning",
] as const;

const AVAILABILITY_OPTIONS_ALL = [
  "Overdag",
  "Avond",
  "Weekend",
  "Flexibel",
  "Nacht",
  "Direct beschikbaar",
] as const;
const AVAILABILITY_OPTIONS_UI = [
  "Overdag",
  "Avond",
  "Weekend",
  "Nacht",
  "Direct beschikbaar",
] as const;
type AvailabilityOption = (typeof AVAILABILITY_OPTIONS_ALL)[number];

const SPECIALISATIES_OPTIONS = [
  "Dementie",
  "Palliatieve zorg",
  "Autisme",
  "GGZ / psychiatrie",
  "Gedragsproblematiek",
  "Epilepsie",
  "Diabetes",
  "NAH (niet-aangeboren hersenletsel)",
  "Ouderenzorg",
  "Jeugdzorg",
] as const;

const VAARDIGHEDEN_OPTIONS = [
  "De-escaleren",
  "Weerbaarheid",
  "Omgaan met agressie",
  "Structuur bieden",
  "ADL ondersteuning",
  "Coaching",
  "Signaleren / rapporteren",
] as const;

const EXPERIENCE_FILTER_OPTIONS = [
  "Starter (0–1 jaar)",
  "Ervaren (1–3 jaar)",
  "Senior (3–5 jaar)",
  "Specialist (5+ jaar)",
] as const;
type ExperienceOption = (typeof EXPERIENCE_FILTER_OPTIONS)[number];

const CERTIFICATEN_FILTER_OPTIONS = [
  "VOG",
  "BHV",
  "EHBO",
  "Medicatie bevoegd",
  "Zorgdiploma",
] as const;
const REGISTRATIES_FILTER_OPTIONS = [
  "BIG registratie",
  "AGB-code",
  "SKJ registratie",
  "KIWA keurmerk",
  "HKZ certificering",
] as const;

// The underlying filter state treats both certificates and registrations as one set.
const CERTIFICATIONS_FILTER_OPTIONS = [
  ...CERTIFICATEN_FILTER_OPTIONS,
  ...REGISTRATIES_FILTER_OPTIONS,
] as const;
type CertificationOption = (typeof CERTIFICATIONS_FILTER_OPTIONS)[number];

const TYPE_INZET_FILTER_OPTIONS = [
  "ZZP",
  "Organisatie",
  "Vrijwillig",
  "Mantelzorger",
] as const;
type TypeInzetOption = (typeof TYPE_INZET_FILTER_OPTIONS)[number];

type CaregiverMeta = {
  availability: AvailabilityOption[];
};

// Dynamic availability map (filled after fetching caregivers from Supabase).
let CAREGIVER_META: Record<string, CaregiverMeta> = {};

// "Nieuw" (MVP): use fetch order as deterministic proxy.
let CAREGIVER_NEW_INDEX: Record<string, number> = {};

function computeMatchScore(intake: Intake, caregiver: CaregiverProfile): ScoredMatch {
  const reasons: string[] = [];

  const weights = {
    careType: 35,
    location: 25,
    availability: 20,
    budget: 10,
    providerType: 10,
  } as const;

  let score = 0;

  // --- 1. Zorgtype match (35%) ---
  const intakeCare = intake.care_type?.toLowerCase().trim() ?? "";
  const careTagsLower = caregiver.tags.map((t) => t.toLowerCase());
  if (intakeCare) {
    const exactCareMatch = careTagsLower.includes(intakeCare);
    const partialCareMatch = !exactCareMatch && careTagsLower.some((t) => t.includes(intakeCare));
    if (exactCareMatch) {
      score += weights.careType;
      reasons.push("Sterke match op zorgtype");
    } else if (partialCareMatch) {
      score += Math.round(weights.careType * 0.6);
      reasons.push("Deels passend zorgtype");
    }
  }

  // --- 2. Locatie match (25%) based on estimated distance ---
  const preferredLocation = intake.preferred_city ?? null;
  if (preferredLocation) {
    const dist = estimateDistanceKm(preferredLocation, caregiver.city);
    if (dist === 0) {
      score += weights.location;
      reasons.push(`Beschikbaar in ${formatLocation(caregiver.city)}`);
    } else if (dist <= 5) {
      score += weights.location;
      reasons.push("Binnen 5 km van je locatie");
    } else if (dist <= 10) {
      score += Math.round(weights.location * 0.8);
      reasons.push("Binnen 10 km van je locatie");
    } else if (dist <= 25) {
      score += Math.round(weights.location * 0.6);
      reasons.push("In dezelfde regio");
    } else if (dist <= 50) {
      score += Math.round(weights.location * 0.3);
      reasons.push("Ligt wat verder van je voorkeurslocatie");
    } else {
      score += Math.round(weights.location * 0.1);
      reasons.push("Ligt buiten je directe regio");
    }
  }

  // --- 3. Beschikbaarheid / frequentie (20%) ---
  const meta = CAREGIVER_META[caregiver.id];
  if (meta && intake.care_frequency) {
    const freq = intake.care_frequency.toLowerCase();
    const hasOverdag = meta.availability.includes("Overdag");
    const hasAvond = meta.availability.includes("Avond");
    const hasWeekend = meta.availability.includes("Weekend");
    const hasFlexibel = meta.availability.includes("Flexibel");

    let availabilityScore = 0;
    if (freq.includes("dag") || freq.includes("week")) {
      if (hasOverdag) availabilityScore = weights.availability;
    } else if (freq.includes("avond")) {
      if (hasAvond || hasFlexibel) availabilityScore = weights.availability;
    } else if (freq.includes("weekend")) {
      if (hasWeekend || hasFlexibel) availabilityScore = weights.availability;
    } else if (freq.includes("flex")) {
      if (hasFlexibel || hasOverdag || hasAvond || hasWeekend) {
        availabilityScore = Math.round(weights.availability * 0.8);
      }
    } else {
      if (hasOverdag || hasAvond || hasWeekend || hasFlexibel) {
        availabilityScore = Math.round(weights.availability * 0.6);
      }
    }

    if (availabilityScore > 0) {
      score += availabilityScore;
      reasons.push("Beschikbaarheid sluit aan op je zorgvraag");
    }
  }

  // --- 4. Budget fit (10%) ---
  if (intake.budget_min != null || intake.budget_max != null) {
    const rate = caregiver.rate ?? (caregiver.isVolunteer ? 0 : undefined);
    const min = intake.budget_min ?? 0;
    const max = intake.budget_max ?? 999;
    if (rate == null) {
      // onbekend tarief: neutraal
      score += Math.round(weights.budget * 0.4);
    } else if (rate === 0 && caregiver.isVolunteer) {
      // Vrijwillig
      score += weights.budget;
      reasons.push("Vrijwillige inzet past goed bij je budget");
    } else if (rate >= min && rate <= max) {
      score += weights.budget;
      reasons.push("Tarief past binnen je budget");
    } else if (rate > 0 && (rate < min * 0.8 || rate > max * 1.2)) {
      // duidelijk buiten range: geen budgetscore
    } else {
      score += Math.round(weights.budget * 0.5);
      reasons.push("Tarief ligt in de buurt van je budget");
    }
  }

  // --- 5. Provider type fit (10%) ---
  const engagementPreferences = (intake.skills_required ?? []).map((s) =>
    s.toLowerCase()
  );
  const wantsZZP = engagementPreferences.some((s) => s.includes("zzp"));
  const wantsMantelzorg = engagementPreferences.some((s) => s.includes("mantel"));
  const wantsVrijwillig = engagementPreferences.some((s) => s.includes("vrijwillig"));

  let providerScore = 0;
  if (
    (wantsZZP && caregiver.arrangement === "ZZP") ||
    (wantsMantelzorg && caregiver.arrangement === "Mantelzorg") ||
    (wantsVrijwillig && caregiver.arrangement === "Vrijwillig")
  ) {
    providerScore = weights.providerType;
    reasons.push("Type inzet sluit aan bij je voorkeur");
  } else if (engagementPreferences.length > 0) {
    providerScore = Math.round(weights.providerType * 0.4);
    reasons.push("Type inzet sluit deels aan bij je voorkeur");
  }
  score += providerScore;

  // Clamp 0–100 and round
  const percentage = Math.max(0, Math.min(100, Math.round(score)));

  return {
    caregiver,
    score: percentage,
    reasons,
  };
}

function MatchesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [intakeLoaded, setIntakeLoaded] = useState(false);
  const [caregiversLoaded, setCaregiversLoaded] = useState(false);
  const [caregivers, setCaregivers] = useState<CaregiverProfile[]>([]);
  const [savedProviderIds, setSavedProviderIds] = useState<Set<string>>(() => new Set());
  const [togglingSavedProviderId, setTogglingSavedProviderId] = useState<string | null>(null);
  const [messageTarget, setMessageTarget] = useState<CaregiverProfile | null>(
    null
  );
  const [distanceKm, setDistanceKm] = useState<"any" | "5" | "10" | "25" | "50">(
    "any"
  );
  const [careTypeFilter, setCareTypeFilter] = useState<string[]>([]);
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityOption[]>(
    []
  );
  const [budgetMinFilter, setBudgetMinFilter] = useState<string>("");
  const [budgetMaxFilter, setBudgetMaxFilter] = useState<string>("");
  const [experienceFilter, setExperienceFilter] = useState<ExperienceOption[]>(
    []
  );
  const [certificationsFilter, setCertificationsFilter] = useState<
    CertificationOption[]
  >([]);
  const [typeInzetFilter, setTypeInzetFilter] = useState<TypeInzetOption[]>([]);
  const searchQuery = (searchParams?.get("q") ?? "").trim().toLowerCase();
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [placeFilter, setPlaceFilter] = useState<string>("");
  const [expandedSpecialisaties, setExpandedSpecialisaties] = useState(false);
  const [expandedVaardigheden, setExpandedVaardigheden] = useState(false);
  const [expandedCertificaten, setExpandedCertificaten] = useState(false);
  const [expandedRegistraties, setExpandedRegistraties] = useState(false);
  const [expandedErvaring, setExpandedErvaring] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const cameFromCareRequest =
    searchParams?.get("from") === "zorgvraag" || searchParams?.get("saved") === "1";
  const linkedJobIdFromQuery = searchParams?.get("job_id") ?? null;
  const isAiFinderSource = searchParams?.get("source") === "ai-finder";
  const [aiFinderBannerDismissed, setAiFinderBannerDismissed] = useState(false);
  const showAiFinderBanner = isAiFinderSource && !aiFinderBannerDismissed;

  function dismissAiFinderBanner() {
    setAiFinderBannerDismissed(true);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("source");
    const qs = params.toString();
    const base = pathname || "/matches";
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }

  type SortOption = "best" | "closest" | "lowPrice" | "highPrice" | "rating" | "new";
  const [sortOption, setSortOption] = useState<SortOption>("best");

  // Load intake context from Supabase (canonical source), with optional intake_id query param.
  useEffect(() => {
    let cancelled = false;

    const loadIntakeFromDb = async () => {
      try {
        const token = await getZorentaAccessToken();
        if (!token) {
          if (!cancelled) {
            setIntake(null);
            setIntakeLoaded(true);
          }
          return;
        }

        const meRes = await fetch("/api/zorenta/me", {
          headers: zorentaHeaders(token),
        });
        const meData = await meRes.json().catch(() => ({}));
        const meRole: string | null = meData?.profile?.role ?? null;
        if (!cancelled) setRole(meRole);

        // Only clients/organizations have a zorgvraag intake.
        if (meRole !== "client" && meRole !== "organization") {
          if (!cancelled) {
            setIntake(null);
            setIntakeLoaded(true);
          }
          return;
        }

        const intakeId = searchParams?.get("intake_id");
        let chosen: any | null = null;

        if (intakeId) {
          const res = await fetch(
            `/api/zorenta/intake?id=${encodeURIComponent(intakeId)}`,
            { headers: zorentaHeaders(token) }
          );
          if (res.ok) {
            chosen = await res.json().catch(() => null);
          }
        }

        if (!chosen) {
          const res = await fetch("/api/zorenta/intake", {
            headers: zorentaHeaders(token),
          });
          if (res.ok) {
            const data = await res.json().catch(() => ({}));
            const list: any[] = Array.isArray(data.intakes)
              ? data.intakes
              : [];
            const latestCompleted =
              list.find((i) => i?.status === "completed") ?? null;
            chosen = latestCompleted ?? list[0] ?? null;
          }
        }

        if (!cancelled) {
          if (chosen) {
            const row = chosen as any;
            const mapped: Intake = {
              id: String(row.id),
              job_id: row.job_id ? String(row.job_id) : null,
              care_type: row.care_type ?? null,
              care_frequency: row.care_frequency ?? null,
              preferred_schedule: row.preferred_schedule ?? null,
              preferred_city: row.preferred_city ?? null,
              preferred_region: row.preferred_region ?? null,
              skills_required: Array.isArray(row.skills_required)
                ? row.skills_required
                : [],
              budget_min: row.budget_min ?? null,
              budget_max: row.budget_max ?? null,
              urgency: row.urgency ?? null,
            };
            setIntake(mapped);
          } else {
            setIntake(null);
          }
          setIntakeLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setIntake(null);
          setIntakeLoaded(true);
        }
      }
    };

    loadIntakeFromDb();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (intakeLoaded && caregiversLoaded) {
      setLoading(false);
    }
  }, [intakeLoaded, caregiversLoaded]);

  // Fetch candidate caregivers for matching (Supabase instead of MOCK_CAREGIVERS).
  useEffect(() => {
    let cancelled = false;

    const normalizeAvailability = (
      v: unknown
    ): AvailabilityOption[] => {
      const allowed = new Set(AVAILABILITY_OPTIONS_ALL as readonly string[]);
      const rawList = Array.isArray(v)
        ? v
        : typeof v === "string"
          ? v.split(",")
          : [];

      return (rawList as unknown[]).map((x) => String(x).trim()).filter((x) =>
        allowed.has(x)
      ) as AvailabilityOption[];
    };

      const loadCaregivers = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("caregivers")
          .select(
            "id,name,location,zorgtype,specialisaties,vaardigheden,certificaten,registraties,beschikbaarheid,prijs,provider_type,profile_id,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100);

        if (error) {
          // If fetching fails, keep the page functional (empty results).
          // eslint-disable-next-line no-console
          console.error("Failed to load caregivers:", error.message);
          return;
        }

        const rows = data ?? [];
        const linkedProfileIds = [...new Set(rows.map((r: any) => String(r.profile_id ?? "")).filter(Boolean))];
        const { data: profileRows } = linkedProfileIds.length
          ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", linkedProfileIds)
          : { data: [] };
        const profileById = Object.fromEntries((profileRows ?? []).map((p: any) => [String(p.id), p]));
        const metaById: Record<string, CaregiverMeta> = {};
        const newIndex: Record<string, number> = {};
        const allowedCerts = new Set<string>(
          CERTIFICATIONS_FILTER_OPTIONS as unknown as string[]
        );

        const mapped: CaregiverProfile[] = rows.map((row: any, idx: number) => {
          const id = String(row.id);
          const availability = normalizeAvailability(row.beschikbaarheid);
          metaById[id] = { availability };

          // We fetch ordered by created_at desc (newest first). The "new" sort
          // prefers higher index values, so we invert the index.
          newIndex[id] = rows.length - 1 - idx;

          const providerType = String(row.provider_type ?? "zzp")
            .trim()
            .toLowerCase();
          const prijs = row.prijs;

          const role: CaregiverProfile["role"] =
            providerType === "organisatie"
              ? "Organisatie"
              : providerType === "vrijwilliger"
                ? "Vrijwilliger"
                : providerType === "mantelzorger"
                  ? "Mantelzorger"
                  : "ZZP zorgverlener";

          const isVolunteer = providerType === "vrijwilliger";
          const arrangement: CaregiverProfile["arrangement"] = isVolunteer
            ? "Vrijwillig"
            : providerType === "mantelzorger"
              ? "Mantelzorg"
              : "ZZP";

          const zorgtype = (row.zorgtype ?? []) as string[];
          const specialisaties = (row.specialisaties ?? []) as string[];
          const vaardigheden = (row.vaardigheden ?? []) as string[];

          const tags = [...zorgtype, ...specialisaties, ...vaardigheden]
            .filter(Boolean)
            .map(String);

          const certs = (row.certificaten ?? []) as string[];
          const registraties = (row.registraties ?? []) as string[];
          const certifications = [...certs, ...registraties]
            .filter(Boolean)
            .map(String)
            .filter((c): c is CertificationOption => allowedCerts.has(c));

          return {
            id,
            name: String(
              profileById[String(row.profile_id)]?.display_name ??
              row.name ??
              "Onbekende zorgverlener"
            ),
            role,
            linkedProfileId: row.profile_id ? String(row.profile_id) : null,
            avatarUrl:
              typeof profileById[String(row.profile_id)]?.avatar_url === "string"
                ? String(profileById[String(row.profile_id)]?.avatar_url)
                : null,
            provider_type: providerType,
            city: String(row.location ?? ""),
            rate:
              typeof prijs === "number"
                ? prijs
                : prijs == null
                  ? null
                  : Number(prijs),
            isVolunteer,
            tags,
            skills: vaardigheden.filter(Boolean).map(String),
            certifications,
            arrangement,
            experienceRange: undefined,
            bio: "",
          };
        });

        CAREGIVER_META = metaById;
        CAREGIVER_NEW_INDEX = newIndex;
        if (!cancelled) setCaregivers(mapped);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Caregivers fetch error:", e);
      } finally {
        if (!cancelled) setCaregiversLoaded(true);
      }
    };

    loadCaregivers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load saved providers for the current user so "Opslaan" has persistent state.
  useEffect(() => {
    if (!caregiversLoaded) return;
    let cancelled = false;

    const loadSavedProviders = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: rows, error } = await supabase
          .from("saved_providers")
          .select("provider_id");

        if (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to load saved providers:", error.message);
          return;
        }

        const ids = new Set((rows ?? []).map((r: any) => String(r.provider_id)));
        if (!cancelled) setSavedProviderIds(ids);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Saved providers fetch error:", e);
      }
    };

    loadSavedProviders();
    return () => {
      cancelled = true;
    };
  }, [caregiversLoaded]);

  // Keep a local editable draft of the location
  useEffect(() => {
    if (intake?.preferred_city) {
      setLocationDraft(intake.preferred_city);
    }
  }, [intake?.preferred_city]);

  const scoredMatches = useMemo(() => {
    if (!intake) return [] as ScoredMatch[];
    if (!caregivers.length) return [] as ScoredMatch[];
    return caregivers
      .map((cg) => computeMatchScore(intake, cg))
      .sort((a, b) => b.score - a.score);
  }, [intake, caregivers]);

  const filteredMatches = useMemo(() => {
    let list = scoredMatches;
    // Predicate pipeline keeps the filter system extensible:
    // add future filters by pushing another predicate.
    const predicates: Array<(m: ScoredMatch) => boolean> = [];

    if (distanceKm !== "any") {
      const max = Number(distanceKm);
      predicates.push((m) => {
        const preferred = intake?.preferred_city ?? null;
        const dist = estimateDistanceKm(preferred, m.caregiver.city);
        return dist <= max;
      });
    }

    if (careTypeFilter.length > 0) {
      predicates.push((m) =>
        m.caregiver.tags.some((tag) => careTypeFilter.includes(tag))
      );
    }

    if (availabilityFilter.length > 0) {
      predicates.push((m) => {
        const meta = CAREGIVER_META[m.caregiver.id];
        if (!meta) return true;
        return meta.availability.some((a) => availabilityFilter.includes(a));
      });
    }

    if (budgetMinFilter || budgetMaxFilter) {
      const min = budgetMinFilter ? Number(budgetMinFilter) : 0;
      const max = budgetMaxFilter ? Number(budgetMaxFilter) : 999;
      predicates.push((m) => {
        const rate =
          m.caregiver.rate ?? (m.caregiver.isVolunteer ? 0 : undefined);
        if (rate == null) return true;
        return rate >= min && rate <= max;
      });
    }

    if (experienceFilter.length > 0) {
      predicates.push((m) => {
        const exp = m.caregiver.experienceRange;
        return exp ? experienceFilter.includes(exp) : false;
      });
    }

    if (certificationsFilter.length > 0) {
      predicates.push((m) => {
        const certs = m.caregiver.certifications ?? [];
        return certs.some((c) => certificationsFilter.includes(c));
      });
    }

    if (typeInzetFilter.length > 0) {
      const getInzetType = (cg: CaregiverProfile): TypeInzetOption => {
        if (cg.role === "Organisatie") return "Organisatie";
        if (cg.role === "Mantelzorger") return "Mantelzorger";
        if (cg.role === "Vrijwilliger") return "Vrijwillig";
        return "ZZP";
      };

      predicates.push((m) => {
        const t = getInzetType(m.caregiver);
        return typeInzetFilter.includes(t);
      });
    }

    // Plaats filter (additional city refinement; independent from the top zorgvraag chip).
    if (placeFilter.trim()) {
      const placeNorm = placeFilter.trim().toLowerCase();
      predicates.push((m) => {
        // Region-like options use the distance estimator as an MVP approximation.
        if (placeNorm.startsWith("regio ") || placeNorm === "randstad") {
          const dist = estimateDistanceKm(placeFilter, m.caregiver.city);
          return dist <= 25;
        }
        return m.caregiver.city.trim().toLowerCase() === placeNorm;
      });
    }

    // Future filters (structure-ready)
    // - ervaring
    // - certificaten
    // - talen
    // - beoordelingen
    // Add them by pushing more predicates above.

    if (searchQuery) {
      predicates.push((m) => {
        const q = searchQuery;
        const name = m.caregiver.name.toLowerCase();
        const city = m.caregiver.city.toLowerCase();
        const tags = m.caregiver.tags.map((t) => t.toLowerCase());
        const role = m.caregiver.role.toLowerCase();
        return (
          name.includes(q) ||
          city.includes(q) ||
          role.includes(q) ||
          tags.some((t) => t.includes(q))
        );
      });
    }

    if (predicates.length > 0) {
      list = list.filter((m) => predicates.every((p) => p(m)));
    }

    // Sorting controls (UI only). Match scoring stays untouched.
    const preferred = intake?.preferred_city ?? null;
    const isVolunteerForSort = (cg: CaregiverProfile) =>
      cg.isVolunteer || cg.arrangement === "Vrijwillig";

    const ratingProxy = (m: ScoredMatch) =>
      (m.caregiver.skills?.length ?? 0) * 10 + (m.caregiver.tags?.length ?? 0);

    const getRateForSort = (m: ScoredMatch) => {
      if (isVolunteerForSort(m.caregiver)) return 0;
      if (typeof m.caregiver.rate === "number") return m.caregiver.rate;
      return Number.NaN;
    };

    const getDistanceForSort = (m: ScoredMatch) => {
      if (!preferred) return Number.POSITIVE_INFINITY;
      return estimateDistanceKm(preferred, m.caregiver.city);
    };

    const getNewIndex = (m: ScoredMatch) =>
      CAREGIVER_NEW_INDEX[m.caregiver.id] ?? 0;

    list = [...list].sort((a, b) => {
      if (sortOption === "best") {
        // Primary: match score. Tie-breaker: closer providers first.
        const scoreDiff = b.score - a.score;
        if (scoreDiff !== 0) return scoreDiff;
        return getDistanceForSort(a) - getDistanceForSort(b);
      }

      if (sortOption === "closest") {
        const distDiff = getDistanceForSort(a) - getDistanceForSort(b);
        if (distDiff !== 0) return distDiff;
        return b.score - a.score;
      }

      if (sortOption === "lowPrice") {
        const aRate = getRateForSort(a);
        const bRate = getRateForSort(b);
        const aVal = Number.isNaN(aRate) ? Number.POSITIVE_INFINITY : aRate;
        const bVal = Number.isNaN(bRate) ? Number.POSITIVE_INFINITY : bRate;
        const rateDiff = aVal - bVal;
        if (rateDiff !== 0) return rateDiff;
        return b.score - a.score;
      }

      if (sortOption === "highPrice") {
        const aRate = getRateForSort(a);
        const bRate = getRateForSort(b);
        const aVal = Number.isNaN(aRate) ? Number.NEGATIVE_INFINITY : aRate;
        const bVal = Number.isNaN(bRate) ? Number.NEGATIVE_INFINITY : bRate;
        const rateDiff = bVal - aVal;
        if (rateDiff !== 0) return rateDiff;
        return b.score - a.score;
      }

      if (sortOption === "rating") {
        const ratingDiff = ratingProxy(b) - ratingProxy(a);
        if (ratingDiff !== 0) return ratingDiff;
        return b.score - a.score;
      }

      // "new"
      const newDiff = getNewIndex(b) - getNewIndex(a);
      if (newDiff !== 0) return newDiff;
      return b.score - a.score;
    });

    return list;
  }, [
    scoredMatches,
    distanceKm,
    careTypeFilter,
    availabilityFilter,
    budgetMinFilter,
    budgetMaxFilter,
    searchQuery,
    placeFilter,
    experienceFilter,
    certificationsFilter,
    typeInzetFilter,
    sortOption,
  ]);

  function getVisibleOptions<T extends string>(
    options: readonly T[],
    selected: T[],
    expanded: boolean,
    collapsedNonSelectedCount: number
  ): T[] {
    if (expanded) return [...options];
    const selectedSet = new Set(selected);
    const visible: T[] = [];
    let nonSelectedCount = 0;

    // Keep selected options visible even when collapsed.
    for (const opt of options) {
      if (selectedSet.has(opt)) {
        visible.push(opt);
        continue;
      }
      if (nonSelectedCount < collapsedNonSelectedCount) {
        visible.push(opt);
        nonSelectedCount++;
      }
    }

    return visible;
  }

  const activeFilterCount = useMemo(() => {
    const distanceActive = distanceKm !== "any";
    const zorgtypeActive = careTypeFilter.length > 0;
    const beschikbaarheidActive = availabilityFilter.length > 0;
    const budgetActive = Boolean(budgetMinFilter || budgetMaxFilter);
    const ervaringActive = experienceFilter.length > 0;
    const certificatenActive = certificationsFilter.length > 0;
    const typeInzetActive = typeInzetFilter.length > 0;
    const placeActive = Boolean(placeFilter.trim());
    return (
      (distanceActive ? 1 : 0) +
      (zorgtypeActive ? 1 : 0) +
      (beschikbaarheidActive ? 1 : 0) +
      (budgetActive ? 1 : 0) +
      (typeInzetActive ? 1 : 0) +
      (ervaringActive ? 1 : 0) +
      (certificatenActive ? 1 : 0) +
      (placeActive ? 1 : 0)
    );
  }, [
    distanceKm,
    careTypeFilter,
    availabilityFilter,
    budgetMinFilter,
    budgetMaxFilter,
    experienceFilter,
    certificationsFilter,
    typeInzetFilter,
    placeFilter,
  ]);

  type ActiveFilterChip = {
    key: string;
    label: string;
    onRemove: () => void;
    ariaLabel: string;
  };

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (placeFilter.trim()) {
      chips.push({
        key: `place:${placeFilter}`,
        label: formatLocation(placeFilter),
        onRemove: () => setPlaceFilter(""),
        ariaLabel: `Verwijder plaatsfilter: ${formatLocation(placeFilter)}`,
      });
    }

    if (distanceKm !== "any") {
      chips.push({
        key: `distance:${distanceKm}`,
        label: `Binnen ${distanceKm} km`,
        onRemove: () => setDistanceKm("any"),
        ariaLabel: `Verwijder afstandsfilter: ${distanceKm} km`,
      });
    }

    for (const t of careTypeFilter) {
      chips.push({
        key: `zorgtype:${t}`,
        label: t,
        onRemove: () =>
          setCareTypeFilter((prev) => prev.filter((x) => x !== t)),
        ariaLabel: `Verwijder zorgtypefilter: ${t}`,
      });
    }

    for (const a of availabilityFilter) {
      chips.push({
        key: `beschikbaarheid:${a}`,
        label: a,
        onRemove: () =>
          setAvailabilityFilter((prev) => prev.filter((x) => x !== a)),
        ariaLabel: `Verwijder beschikbaarheidsfilter: ${a}`,
      });
    }

    if (budgetMinFilter || budgetMaxFilter) {
      const label =
        budgetMinFilter && budgetMaxFilter
          ? `€${budgetMinFilter}–€${budgetMaxFilter}/u`
          : budgetMinFilter
            ? `Vanaf €${budgetMinFilter}/u`
            : budgetMaxFilter
              ? `Tot €${budgetMaxFilter}/u`
              : "Budget";

      chips.push({
        key: "budget",
        label,
        onRemove: () => {
          setBudgetMinFilter("");
          setBudgetMaxFilter("");
        },
        ariaLabel: "Verwijder budgetfilter",
      });
    }

    for (const exp of experienceFilter) {
      chips.push({
        key: `ervaring:${exp}`,
        label: exp,
        onRemove: () =>
          setExperienceFilter((prev) => prev.filter((x) => x !== exp)),
        ariaLabel: `Verwijder ervaringsfilter: ${exp}`,
      });
    }

    for (const c of certificationsFilter) {
      chips.push({
        key: `certificaten:${c}`,
        label: c,
        onRemove: () =>
          setCertificationsFilter((prev) => prev.filter((x) => x !== c)),
        ariaLabel: `Verwijder certificatenfilter: ${c}`,
      });
    }

    for (const t of typeInzetFilter) {
      chips.push({
        key: `typeInzet:${t}`,
        label: t,
        onRemove: () =>
          setTypeInzetFilter((prev) => prev.filter((x) => x !== t)),
        ariaLabel: `Verwijder type-inzet filter: ${t}`,
      });
    }

    return chips;
  }, [
    placeFilter,
    distanceKm,
    careTypeFilter,
    availabilityFilter,
    budgetMinFilter,
    budgetMaxFilter,
    experienceFilter,
    certificationsFilter,
    typeInzetFilter,
  ]);

  const bestMatches = filteredMatches.filter(
    (m) => m.caregiver.role !== "Organisatie"
  ).slice(0, 3);
  const alsoInteresting = filteredMatches.filter(
    (m) => m.caregiver.role !== "Organisatie"
  ).slice(3, 6);
  const organisationsNearby = filteredMatches.filter(
    (m) => m.caregiver.role === "Organisatie"
  );
  const topMatch = bestMatches[0] ?? null;

  const zorgverlenersCount = filteredMatches.filter(
    (m) => m.caregiver.role !== "Organisatie"
  ).length;

  async function toggleSavedProvider(providerId: string) {
    const pid = providerId.trim();
    if (!pid) return;
    const currentlySaved = savedProviderIds.has(pid);
    const nextSaved = !currentlySaved;

    // Optimistic update so UI feels instant.
    setSavedProviderIds((prev) => {
      const next = new Set(prev);
      if (nextSaved) next.add(pid);
      else next.delete(pid);
      return next;
    });

    setTogglingSavedProviderId(pid);

    try {
      const token = await getZorentaAccessToken();
      if (!token) throw new Error("Niet ingelogd.");

      const res = await fetch("/api/zorenta/saved-providers/toggle", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ providerId: pid }),
      });

      const data = await res.json().catch(() => ({}));
      const serverStatus = data?.status;
      if (!res.ok || (serverStatus !== "added" && serverStatus !== "removed")) {
        throw new Error(typeof data?.error === "string" ? data.error : "Opslaan mislukt.");
      }

      // Ensure final state matches the server response.
      setSavedProviderIds((prev) => {
        const next = new Set(prev);
        if (serverStatus === "added") next.add(pid);
        else next.delete(pid);
        return next;
      });
    } catch (e) {
      // Roll back optimistic update on failure.
      setSavedProviderIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(pid);
        else next.delete(pid);
        return next;
      });
      // eslint-disable-next-line no-console
      console.error("toggleSavedProvider error:", e);
    } finally {
      setTogglingSavedProviderId(null);
    }
  }

  function applyLocationChange(newCity: string) {
    try {
      const formatted = formatLocation(newCity);
      if (!formatted) {
        setEditingLocation(false);
        return;
      }

      // Update local state (drives match recalculation)
      setIntake((prev) => {
        if (!prev) return prev;
        if (prev.preferred_city === formatted) return prev; // avoid unnecessary updates
        return { ...prev, preferred_city: formatted };
      });

      setLocationDraft(formatted);
      setEditingLocation(false);

      // Persist updated location back to zorgvraag draft so it's used on reload
      if (typeof window !== "undefined") {
        const raw = window.localStorage.getItem(ZORGVRAGEN_DRAFT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { form: Intake };
        const updated = {
          ...parsed,
          form: {
            ...(parsed.form ?? {}),
            preferred_city: formatted,
          },
        };
        window.localStorage.setItem(ZORGVRAGEN_DRAFT_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      // Last resort: do not let location editing crash the page.
      setEditingLocation(false);
    }
  }

  if (loading) {
    return (
      <PageContainer maxWidth="default" className="space-y-8">
        <ZorentaPageSkeleton />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="default" className="space-y-8">
      <ZorentaPageHeader
        title="Beste matches voor jouw zorgvraag"
        description="Op basis van jouw zorgvraag hebben we de best passende zorgverleners en opdrachten geselecteerd."
        backHref="/zorgvraag-nieuw"
        backLabel="Zorgvraag aanpassen"
      />

      {cameFromCareRequest && (
        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardContent className="py-3">
            <p className="text-sm font-semibold text-emerald-800">
              Je zorgvraag is opgeslagen.
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Hieronder zie je matches die op basis van jouw ingevulde gegevens zijn geselecteerd.
            </p>
          </CardContent>
        </Card>
      )}

      {showAiFinderBanner && (
        <Card className="border-[#40ADA8]/25 bg-gradient-to-r from-[#40ADA8]/10 to-white">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#2f7f7a]">AI Opdracht Finder</p>
              <p className="mt-1 text-xs text-slate-600">
                Je matches zijn gerangschikt op basis van je intake en profiel. Gebruik filters om verder te verfijnen.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-[#40ADA8]/40 text-[#2f7f7a]"
              onClick={dismissAiFinderBanner}
            >
              Sluiten
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-[#40ADA8]/25 bg-gradient-to-r from-[#40ADA8]/10 to-white">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              We vonden {zorgverlenersCount} passende matches
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Stuur direct een bericht om sneller reactie te krijgen.
            </p>
          </div>
          {topMatch ? (
            <div className="flex flex-wrap gap-2">
              {(intake?.job_id || linkedJobIdFromQuery) ? (
                <Link href={`/jobs/${encodeURIComponent(intake?.job_id ?? linkedJobIdFromQuery ?? "")}`}>
                  <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs">
                    Bekijk jouw opdracht
                  </Button>
                </Link>
              ) : null}
              {topMatch.caregiver.linkedProfileId ? (
                <StartMessageButton
                  otherUserId={topMatch.caregiver.linkedProfileId}
                  size="sm"
                  variant="primary"
                  label="Bericht beste match"
                  prefill={`Hoi ${topMatch.caregiver.name.split(" ")[0]}, ik zag dat je goed past bij mijn zorgvraag. Heb je ruimte om dit kort af te stemmen?`}
                />
              ) : null}
              <Link href={`/profielen/${topMatch.caregiver.id}`}>
                <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs">
                  Bekijk beste match
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(intake?.job_id || linkedJobIdFromQuery) ? (
                <Link href={`/jobs/${encodeURIComponent(intake?.job_id ?? linkedJobIdFromQuery ?? "")}`}>
                  <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs">
                    Open opdracht
                  </Button>
                </Link>
              ) : null}
              <Link href="/zorgvraag-nieuw">
                <Button variant="outline" size="sm" className="h-8 border-slate-200 text-xs">
                  Zorgvraag verbeteren
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compact intake summary strip */}
      {intake && (
        <Card className="border-slate-200 bg-slate-50/80">
          <CardContent className="flex flex-wrap items-center gap-3 py-4 text-xs sm:text-sm">
            {intake.care_type && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-800 shadow-xs border border-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-[#40ada8]" />
                <span className="font-medium">{intake.care_type}</span>
              </div>
            )}
            {intake.preferred_city && (
              <div className="relative inline-flex">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200 hover:border-[#40ada8]/60 hover:bg-slate-50"
                  onClick={() => {
                    setEditingLocation((prev) => !prev);
                    setLocationDraft(intake.preferred_city || "");
                  }}
                >
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span>{formatLocation(intake.preferred_city)}</span>
                </button>
                {editingLocation && (
                  <div className="absolute left-0 top-full z-30 mt-1 w-64 overflow-visible rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg">
                    <LocationAutocomplete
                      value={locationDraft}
                      onChange={(val) => {
                        setLocationDraft(val);
                        applyLocationChange(val);
                      }}
                      placeholder="Nieuwe locatie..."
                      autoFocus
                      inputClassName="mb-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                    />
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                        onClick={() => setEditingLocation(false)}
                      >
                        Sluiten
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {intake.care_frequency && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>{intake.care_frequency}</span>
              </div>
            )}
            {(intake.budget_min != null || intake.budget_max != null) && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">
                <Euro className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  €{intake.budget_min ?? "—"}–€{intake.budget_max ?? "—"}/u
                </span>
              </div>
            )}
            {intake.urgency && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-slate-700 border border-slate-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{intake.urgency}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter bar (collapsible) */}
      {intake && filtersOpen && (
        <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">
              Filters
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-xs text-slate-500 underline-offset-4 hover:underline"
                onClick={() => {
                  setDistanceKm("any");
                  setCareTypeFilter([]);
                  setAvailabilityFilter([]);
                  setBudgetMinFilter("");
                  setBudgetMaxFilter("");
                  setExperienceFilter([]);
                  setCertificationsFilter([]);
                  setTypeInzetFilter([]);
                  setExpandedSpecialisaties(false);
                  setExpandedVaardigheden(false);
                  setExpandedCertificaten(false);
                  setExpandedRegistraties(false);
                  setExpandedErvaring(false);
                  setAdvancedFiltersOpen(false);
                  setPlaceFilter("");
                }}
              >
                Wis filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
              <button
                type="button"
                className="text-xs text-slate-500 underline-offset-4 hover:underline"
                onClick={() => {
                  setFiltersOpen(false);
                  setAdvancedFiltersOpen(false);
                }}
              >
                Filters sluiten
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {/* Primary filters (always visible) */}
            <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <p className="text-xs font-semibold text-slate-800">Plaats</p>
              <LocationAutocomplete
                value={placeFilter}
                onChange={(val) => setPlaceFilter(val)}
                  placeholder="Zoek op plaats of postcode"
                  inputClassName="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/25"
              />
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <p className="text-xs font-semibold text-slate-800">Afstand</p>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value as typeof distanceKm)}
              >
                <option value="any">Alle afstanden</option>
                <option value="5">Binnen 5 km</option>
                <option value="10">Binnen 10 km</option>
                <option value="25">Binnen 25 km</option>
                <option value="50">Binnen 50 km</option>
              </select>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <p className="text-xs font-semibold text-slate-800">Zorgtype</p>
              <div className="flex flex-wrap gap-1">
                {ZORGTYPE_OPTIONS.map((type) => {
                  const active = careTypeFilter.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setCareTypeFilter((prev) =>
                          prev.includes(type)
                            ? prev.filter((t) => t !== type)
                            : [...prev, type]
                        )
                      }
                      className={[
                        "rounded-full border px-2.5 py-1 text-[11px]",
                        active
                          ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
              <p className="text-xs font-semibold text-slate-800">Beschikbaarheid</p>
              <div className="flex flex-wrap gap-1">
                {AVAILABILITY_OPTIONS_UI.map((opt) => {
                  const active = availabilityFilter.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() =>
                        setAvailabilityFilter((prev) =>
                          prev.includes(opt)
                            ? prev.filter((v) => v !== opt)
                            : [...prev, opt]
                        )
                      }
                      className={[
                        "rounded-full border px-2.5 py-1 text-[11px]",
                        active
                          ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            </div>

            {/* Advanced filters toggle */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="text-xs font-semibold text-slate-800">
                Geavanceerde filters
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 underline-offset-4 hover:underline"
                onClick={() => setAdvancedFiltersOpen((v) => !v)}
              >
                {advancedFiltersOpen ? "Minder filters" : "Meer filters"}
                {advancedFiltersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            {advancedFiltersOpen && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 md:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-800">
                      Specialisaties
                    </p>
                  </div>
                  {(() => {
                    const selected = careTypeFilter as unknown as (typeof SPECIALISATIES_OPTIONS)[number][];
                    const visible = getVisibleOptions(
                      SPECIALISATIES_OPTIONS,
                      selected,
                      expandedSpecialisaties,
                      6
                    );
                    const showToonMeer =
                      !expandedSpecialisaties &&
                      visible.length < SPECIALISATIES_OPTIONS.length;
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((opt) => {
                            const active = careTypeFilter.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setCareTypeFilter((prev) =>
                                    prev.includes(opt)
                                      ? prev.filter((t) => t !== opt)
                                      : [...prev, opt]
                                  )
                                }
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[11px]",
                                  active
                                    ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {showToonMeer ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedSpecialisaties(true)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Toon meer
                            </button>
                          </div>
                        ) : expandedSpecialisaties ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedSpecialisaties(false)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Toon minder
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 md:col-span-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold text-slate-800">
                      Vaardigheden
                    </p>
                  </div>
                  {(() => {
                    const selected = careTypeFilter as unknown as (typeof VAARDIGHEDEN_OPTIONS)[number][];
                    const visible = getVisibleOptions(
                      VAARDIGHEDEN_OPTIONS,
                      selected,
                      expandedVaardigheden,
                      5
                    );
                    const showToonMeer =
                      !expandedVaardigheden &&
                      visible.length < VAARDIGHEDEN_OPTIONS.length;
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((opt) => {
                            const active = careTypeFilter.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setCareTypeFilter((prev) =>
                                    prev.includes(opt)
                                      ? prev.filter((t) => t !== opt)
                                      : [...prev, opt]
                                  )
                                }
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[11px]",
                                  active
                                    ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {showToonMeer ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedVaardigheden(true)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Toon meer
                            </button>
                          </div>
                        ) : expandedVaardigheden ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedVaardigheden(false)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Toon minder
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 mt-3">
                  <p className="text-xs font-semibold text-slate-800">
                    Certificaten
                  </p>
                  {(() => {
                    const visible = getVisibleOptions(
                      CERTIFICATEN_FILTER_OPTIONS,
                      certificationsFilter,
                      expandedCertificaten,
                      4
                    );
                    const showToonMeer =
                      !expandedCertificaten &&
                      visible.length < CERTIFICATEN_FILTER_OPTIONS.length;
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((opt) => {
                            const active = certificationsFilter.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setCertificationsFilter((prev) =>
                                    prev.includes(opt)
                                      ? prev.filter((x) => x !== opt)
                                      : [...prev, opt]
                                  )
                                }
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[11px]",
                                  active
                                    ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {showToonMeer ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedCertificaten(true)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Toon meer
                            </button>
                          </div>
                        ) : expandedCertificaten ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedCertificaten(false)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Toon minder
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3 mt-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                        <BadgeCheck className="h-3.5 w-3.5 text-[#40ada8]" />
                        Registraties
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Professionele registraties
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const visible = getVisibleOptions(
                      REGISTRATIES_FILTER_OPTIONS,
                      certificationsFilter,
                      expandedRegistraties,
                      4
                    );
                    const showToonMeer =
                      !expandedRegistraties &&
                      visible.length < REGISTRATIES_FILTER_OPTIONS.length;
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((opt) => {
                            const active = certificationsFilter.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setCertificationsFilter((prev) =>
                                    prev.includes(opt)
                                      ? prev.filter((x) => x !== opt)
                                      : [...prev, opt]
                                  )
                                }
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[11px]",
                                  active
                                    ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {showToonMeer ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedRegistraties(true)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Toon meer
                            </button>
                          </div>
                        ) : expandedRegistraties ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedRegistraties(false)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Toon minder
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                  <p className="text-xs font-semibold text-slate-800">
                    Ervaring
                  </p>
                  {(() => {
                    const visible = getVisibleOptions(
                      EXPERIENCE_FILTER_OPTIONS,
                      experienceFilter,
                      expandedErvaring,
                      6
                    );
                    const showToonMeer =
                      !expandedErvaring &&
                      visible.length < EXPERIENCE_FILTER_OPTIONS.length;
                    return (
                      <>
                        <div className="flex flex-wrap gap-1">
                          {visible.map((opt) => {
                            const active = experienceFilter.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() =>
                                  setExperienceFilter((prev) =>
                                    prev.includes(opt)
                                      ? prev.filter((x) => x !== opt)
                                      : [...prev, opt]
                                  )
                                }
                                className={[
                                  "rounded-full border px-2.5 py-1 text-[11px]",
                                  active
                                    ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                                ].join(" ")}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        {showToonMeer ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedErvaring(true)}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                              Toon meer
                            </button>
                          </div>
                        ) : expandedErvaring ? (
                          <div className="pt-2">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5 text-xs text-slate-500 underline-offset-4 hover:underline"
                              onClick={() => setExpandedErvaring(false)}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                              Toon minder
                            </button>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                  <p className="text-xs font-semibold text-slate-800">
                    Budget (€/uur)
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      className="w-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                      placeholder="min"
                      value={budgetMinFilter}
                      onChange={(e) => setBudgetMinFilter(e.target.value)}
                    />
                    <span className="text-[11px] text-slate-400">–</span>
                    <input
                      type="number"
                      min={0}
                      className="w-1/2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                      placeholder="max"
                      value={budgetMaxFilter}
                      onChange={(e) => setBudgetMaxFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                  <p className="text-xs font-semibold text-slate-800">
                    Type inzet
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {TYPE_INZET_FILTER_OPTIONS.map((opt) => {
                      const active = typeInzetFilter.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setTypeInzetFilter((prev) =>
                              prev.includes(opt)
                                ? prev.filter((t) => t !== opt)
                                : [...prev, opt]
                            )
                          }
                          className={[
                            "rounded-full border px-2.5 py-1 text-[11px]",
                            active
                                ? "border-[#40ada8] bg-[#40ada8]/15 text-[#0f766e] ring-1 ring-[#40ada8]/25"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* Active filter chips + toggle */}
      {intake && (
        <div className="space-y-2 pt-2">
          {activeFilterChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-700">
                Actieve filters
              </span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#40ADA8]/30 bg-[#40ADA8]/10 px-2.5 py-1 text-[11px] font-medium text-[#1b6a67] hover:bg-[#40ADA8]/15"
                  aria-label={chip.ariaLabel}
                >
                  <span>{chip.label}</span>
                  <span aria-hidden className="text-[#1b6a67]">
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}

          {!filtersOpen && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-slate-200 text-xs"
                  onClick={() => {
                    setFiltersOpen(true);
                    setAdvancedFiltersOpen(false);
                  }}
              >
                Filters aanpassen
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Fallback when we have no intake data at all */}
      {!intake && (
        <Card className="border-dashed border-slate-200 bg-slate-50/50">
          <CardContent className="py-6 text-sm text-slate-600">
            <p className="font-medium text-slate-800">
              Je hebt nog geen zorgvraag ingevuld
            </p>
            <p className="mt-1">
              Vul eerst de zorgvraag intake in. Daarna tonen we hier direct de beste
              matches.
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                className="border-slate-200 text-xs"
                onClick={() => router.push("/zorgvraag-nieuw")}
              >
                Terug naar intake
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections */}
      <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-900">
              {zorgverlenersCount} zorgverleners gevonden
            </p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-slate-700">Sorteer op</p>
              <select
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value as typeof sortOption)
                }
              >
                <option value="best">Beste match</option>
                <option value="closest">Dichtstbij</option>
                <option value="lowPrice">Laagste prijs</option>
                <option value="highPrice">Hoogste prijs</option>
                <option value="rating">Hoogste beoordeling</option>
                <option value="new">Nieuw</option>
              </select>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Beste matches
              </h2>
              {zorgverlenersCount > 0 && (
                <p className="text-xs text-slate-500">
                  Hoogste matchscore op basis van jouw zorgvraag
                </p>
              )}
            </div>
            {filteredMatches.length === 0 ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-sm font-medium text-slate-800">
                  Geen matches gevonden. Probeer je filters te verruimen.
                </p>
                <p className="text-xs text-slate-600">
                  Verruim je filters of bekijk het volledige aanbod.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 text-xs"
                    onClick={() => {
                      setDistanceKm("any");
                      setCareTypeFilter([]);
                      setAvailabilityFilter([]);
                      setBudgetMinFilter("");
                      setBudgetMaxFilter("");
                      setExperienceFilter([]);
                      setCertificationsFilter([]);
                      setTypeInzetFilter([]);
                      setAdvancedFiltersOpen(false);
                      setExpandedSpecialisaties(false);
                      setExpandedVaardigheden(false);
                      setExpandedCertificaten(false);
                      setExpandedRegistraties(false);
                      setExpandedErvaring(false);
                      setPlaceFilter("");
                    }}
                  >
                    Wis filters
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-slate-200 text-xs"
                    onClick={() => router.push("/search?type=caregivers")}
                  >
                    Bekijk alle zorgverleners
                  </Button>
                </div>
              </div>
            ) : bestMatches.length === 0 ? (
              <p className="text-sm text-slate-500">
                Geen zorgverleners matchen direct met je filters. Organisaties
                worden nog wel getoond.
              </p>
            ) : (
              <>
                {zorgverlenersCount > 0 && zorgverlenersCount <= 3 && (
                  <p className="text-xs text-slate-500">
                    Weinig resultaten gevonden. Verruim eventueel Plaats of Afstand.
                  </p>
                )}
                <div className="space-y-4">
              {bestMatches.map((m) => {
                const savePid = savedProviderProfileId(m.caregiver);
                return (
                <MatchCard
                  key={m.caregiver.id}
                  match={m}
                  isSaved={!!savePid && savedProviderIds.has(savePid)}
                  onToggleSaved={() => {
                    if (savePid) void toggleSavedProvider(savePid);
                  }}
                  toggleDisabled={!savePid || togglingSavedProviderId === savePid}
                />
              );
              })}
                </div>
              </>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Ook interessant
              </h2>
              <p className="text-xs text-slate-500">
                Zorgverleners met overlappende zorgtypes of ervaring
              </p>
            </div>
            {alsoInteresting.length === 0 ? (
              <p className="text-sm text-slate-500">
                We hebben nog weinig aanvullende suggesties. Naarmate je meer met het
                platform werkt, worden deze aanbevelingen slimmer.
              </p>
            ) : (
              <div className="space-y-4">
                {alsoInteresting.map((m) => {
                  const savePid = savedProviderProfileId(m.caregiver);
                  return (
                  <MatchCard
                    key={m.caregiver.id}
                    match={m}
                    isSaved={!!savePid && savedProviderIds.has(savePid)}
                    onToggleSaved={() => {
                      if (savePid) void toggleSavedProvider(savePid);
                    }}
                    toggleDisabled={!savePid || togglingSavedProviderId === savePid}
                  />
                );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              Organisaties in de buurt
            </h2>
            {organisationsNearby.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nog geen organisaties gevonden die direct matchen, maar je kunt altijd
                zoeken in het volledige overzicht.
              </p>
            ) : (
              <div className="space-y-4">
                {organisationsNearby.map((m) => {
                  const savePid = savedProviderProfileId(m.caregiver);
                  return (
                  <MatchCard
                    key={m.caregiver.id}
                    match={m}
                    compact
                    isSaved={!!savePid && savedProviderIds.has(savePid)}
                    onToggleSaved={() => {
                      if (savePid) void toggleSavedProvider(savePid);
                    }}
                    toggleDisabled={!savePid || togglingSavedProviderId === savePid}
                  />
                );
                })}
              </div>
            )}
          </section>

          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Nog niet de juiste match?
              </p>
              <p className="text-xs text-slate-600">
                Pas je zorgvraag aan of gebruik de zoekfunctie om zelf gericht
                zorgverleners te vinden.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-center border-slate-200 text-xs"
                  onClick={() => router.push("/zorgvraag-nieuw")}
                >
                  Zorgvraag aanpassen
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center border-slate-200 text-xs"
                  onClick={() => router.push("/search?type=caregivers")}
                >
                  Alle zorgverleners bekijken
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {messageTarget && (
        <ZorentaMessageModal
          recipientName={messageTarget.name}
          recipientId={messageTarget.id}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </PageContainer>
  );
}

function initials(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function MatchCard({
  match,
  compact,
  isSaved,
  onToggleSaved,
  toggleDisabled,
}: {
  match: ScoredMatch;
  compact?: boolean;
  isSaved: boolean;
  onToggleSaved: () => void;
  toggleDisabled?: boolean;
}) {
  const { caregiver, score, reasons } = match;
  const isVolunteer = caregiver.isVolunteer || caregiver.arrangement === "Vrijwillig";

  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <CardContent className={`p-4 ${compact ? "space-y-3" : "space-y-4"}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">
            {caregiver.avatarUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={caregiver.avatarUrl} alt={caregiver.name} className="h-full w-full object-cover" />
            ) : (
              initials(caregiver.name)
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {caregiver.name}
                </p>
                <p className="text-xs text-slate-600">
                  {caregiver.role} · {caregiver.city}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                  {score}% match
                </Badge>
                <Badge variant="outline" className="rounded-full border-slate-200 px-2 py-1 text-[11px]">
                  {caregiver.arrangement}
                </Badge>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <div className="inline-flex items-center gap-1.5">
                {isVolunteer ? (
                  <>
                    <Euro className="h-3.5 w-3.5 text-slate-400" />
                    <span>Vrijwillig</span>
                  </>
                ) : caregiver.rate ? (
                  <>
                    <Euro className="h-3.5 w-3.5 text-slate-400" />
                    <span>€{caregiver.rate} / uur</span>
                  </>
                ) : null}
              </div>
              <div className="inline-flex flex-wrap gap-1">
                {caregiver.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {!compact && (
              <>
                <p className="mt-3 text-xs text-slate-700">{caregiver.bio}</p>

                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Waarom dit past
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {(reasons.length ? reasons : [
                      "Matcht op zorgtype en regio",
                      "Relevante ervaring voor jouw situatie",
                    ]).slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/profielen/${caregiver.id}`} passHref>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-slate-200 text-xs"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Bekijk profiel
                </Button>
              </Link>
              {caregiver.linkedProfileId ? (
                <StartMessageButton
                  otherUserId={caregiver.linkedProfileId}
                  size="sm"
                  variant="primary"
                />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="gap-1.5 border-slate-200 text-xs text-slate-400"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Bericht nog niet beschikbaar
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSaved}
                disabled={toggleDisabled}
                className={`gap-1.5 border-slate-200 text-xs ${
                  isSaved
                    ? "border-[#40ADA8] bg-[#40ADA8] text-white hover:bg-[#369e9a]"
                    : ""
                }`}
              >
                <Bookmark
                  className={`h-3.5 w-3.5 ${
                    isSaved ? "text-white" : "text-slate-600"
                  }`}
                />
                Opslaan
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<ZorentaPageSkeleton />}>
      <MatchesContent />
    </Suspense>
  );
}

