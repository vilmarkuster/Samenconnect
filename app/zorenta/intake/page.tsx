"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { useAuth } from "@/lib/auth-context";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { FileText, ChevronRight, ChevronLeft, Save } from "lucide-react";
import {
  FINANCIERING_REGELING_OPTIONS,
  SOORT_HULP_ZORG_OPTIONS,
  ZORGNIVEAU_OPTIONS,
  TYPE_INZET_OPTIONS,
  VAARDIGHEDEN_ERVARING_OPTIONS,
  TARGET_GROUP_OPTIONS,
  labelsForValues,
  labelForValue,
  mergeIntakeSubmission,
  intakeTaxonomyFromRow,
} from "@/lib/zorenta/intake-taxonomy";

const STEPS = [
  { key: "who", title: "Voor wie is de zorg" },
  { key: "type", title: "Type zorg" },
  { key: "frequency", title: "Frequentie" },
  { key: "budget", title: "Budget" },
  { key: "location", title: "Locatie & urgentie" },
  { key: "summary", title: "Samenvatting" },
];

/** Stepper row only — korte labels op klein scherm; desktop toont volledige titels. */
const STEPPER_ROW_LABELS: { short: string; full: string }[] = [
  { short: "Wie", full: "Voor wie" },
  { short: "Type", full: "Type zorg" },
  { short: "Freq.", full: "Frequentie" },
  { short: "Budget", full: "Budget" },
  { short: "Loc.", full: "Locatie" },
  { short: "Overz.", full: "Samenvatting" },
];

const TARGET_GROUP_LABELS = TARGET_GROUP_OPTIONS.map((o) => o.label);

const AGE_GROUPS = [
  "0–12 jaar",
  "13–17 jaar",
  "18–24 jaar",
  "25–34 jaar",
  "35–44 jaar",
  "45–54 jaar",
  "55–64 jaar",
  "65+ jaar",
];
const FREQUENCIES = ["1x per week", "2-3x per week", "Dagelijks", "Flexibel"];
const URGENCY_OPTIONS = [
  "Spoed (binnen 24 uur)",
  "Binnen enkele dagen",
  "Binnen 1 week",
  "Binnen 1 maand",
  "Flexibel",
] as const;

function strArr(form: Record<string, unknown>, key: string): string[] {
  const v = form[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function generateCareRequestTitle(form: Record<string, any>, seed = 0): string {
  const merged = mergeIntakeSubmission(form as Record<string, unknown>);
  const soortLabels = labelsForValues(SOORT_HULP_ZORG_OPTIONS, merged.soort_hulp_zorg);
  const niveauLabels = labelsForValues(ZORGNIVEAU_OPTIONS, merged.zorgniveau);
  const zorgTypes = [...soortLabels, ...niveauLabels];

  const rawCare =
    (form.care_type as string) ||
    zorgTypes.slice(0, 2).join(" en ") ||
    "zorg";
  const mainCare = TARGET_GROUP_LABELS.includes(rawCare)
    ? zorgTypes.slice(0, 2).join(" en ") || "zorg"
    : rawCare;

  const city =
    (form.city as string) ||
    (form.preferred_city as string) ||
    "Nederland";

  const age = form.age_group ? ` (${form.age_group})` : "";

  const rawWho = (form.who_needs_care as string) || "";
  let relation = rawWho || "cliënt";
  const lowerWho = rawWho.toLowerCase();
  if (lowerWho.includes("moeder")) relation = "moeder";
  else if (lowerWho.includes("vader")) relation = "vader";
  else if (lowerWho.includes("kind")) relation = "kind";
  else if (lowerWho.includes("zoon")) relation = "zoon";
  else if (lowerWho.includes("dochter")) relation = "dochter";
  else if (lowerWho.includes("vrouw")) relation = "vrouw";
  else if (lowerWho.includes("man")) relation = "man";
  // No generic doelgroep labels like "volwassene", "jongere", etc. as subject
  if (relation.toLowerCase().includes("volwassen") || TARGET_GROUP_LABELS.includes(relation)) {
    relation = "cliënt";
  }

  const freq =
    (form.frequency as string) ||
    (form.care_frequency as string) ||
    "";

  const budgetShort = form.budget_max
    ? `€${form.budget_max}`
    : "";

  const fin0 = merged.financiering_regeling[0];
  const financingShort = fin0 ? labelForValue(FINANCIERING_REGELING_OPTIONS, fin0) ?? "PGB" : "PGB-zorgvraag";

  const variant = seed % 4;

  // 1. Zakelijk / professioneel
  if (variant === 0) {
    return `${financingShort}: ${mainCare} voor ${relation}${age} in ${city}`;
  }

  // 2. Warm / persoonlijk
  if (variant === 1) {
    return `Voor mijn ${relation}${age} in ${city} zoek ik ${mainCare.toLowerCase()}`;
  }

  // 3. Marketplace / platformstijl
  if (variant === 2) {
    const freqPart = freq ? ` · ${freq}` : "";
    const budgetPart = budgetShort ? ` · ${budgetShort}/u` : "";
    return `${mainCare} gezocht in ${city}${freqPart}${budgetPart}`;
  }

  // 4. Kort en krachtig
  return `${mainCare} gezocht voor ${relation}${age} in ${city}`;
}

function generateCareRequestSummary(form: Record<string, any>, seed = 0): string {
  const freq =
    (form.frequency as string) ||
    (form.care_frequency as string) ||
    "flexibel";

  const budget = form.budget_max
    ? `€${form.budget_max}/uur`
    : "nader te bepalen";

  const city =
    (form.city as string) ||
    (form.preferred_city as string) ||
    "Nederland";

  const merged = mergeIntakeSubmission(form as Record<string, unknown>);
  const soortLabels = labelsForValues(SOORT_HULP_ZORG_OPTIONS, merged.soort_hulp_zorg);
  const niveauLabels = labelsForValues(ZORGNIVEAU_OPTIONS, merged.zorgniveau);
  const zorgOmschrijving =
    [...soortLabels, ...niveauLabels].slice(0, 2).join(" en ") || "zorg";

  const engagement =
    labelsForValues(TYPE_INZET_OPTIONS, merged.type_inzet)[0] ||
    "een zorgprofessional (ZZP)";

  const schedule =
    (form.preferred_schedule as string) ||
    "";

  const importantSkills = labelsForValues(VAARDIGHEDEN_ERVARING_OPTIONS, merged.vaardigheden_ervaring).slice(0, 2);

  const age = form.age_group ? ` (${form.age_group})` : "";
  const rawWho = (form.who_needs_care as string) || "";
  let relation = rawWho || "";
  const lowerWho = rawWho.toLowerCase();
  if (lowerWho.includes("moeder")) relation = "mijn moeder";
  else if (lowerWho.includes("vader")) relation = "mijn vader";
  else if (lowerWho.includes("kind")) relation = "mijn kind";
  else if (lowerWho.includes("zoon")) relation = "mijn zoon";
  else if (lowerWho.includes("dochter")) relation = "mijn dochter";
  if (!relation) relation = "mijn cliënt";

  const financing =
    labelsForValues(FINANCIERING_REGELING_OPTIONS, merged.financiering_regeling)[0] || null;

  const line1 = `Voor ${relation}${age} in ${city} zoek ik ondersteuning bij ${zorgOmschrijving}.`;
  const line2 = schedule
    ? `De hulp is nodig ${freq.toLowerCase()} in de ${schedule.toLowerCase()}.`
    : `De hulp is nodig ${freq.toLowerCase()}.`;
  const line3 = financing
    ? `Het gaat om een ${financing.toLowerCase()}-zorgvraag met een richtbudget van ${budget}.`
    : `Het richtbudget ligt rond ${budget}.`;
  const skillsLine =
    importantSkills.length > 0
      ? `Ervaring met ${importantSkills.join(" en ")} is gewenst.`
      : "";

  const variant = seed % 4;

  // 1. Zakelijk / professioneel
  if (variant === 0) {
    return [
      line1.replace("zoek ik", "zoeken wij"),
      line2,
      `De inzet is bedoeld voor ${engagement}.`,
      line3,
      skillsLine,
    ]
      .filter(Boolean)
      .join(" ");
  }

  // 2. Warm / persoonlijk
  if (variant === 1) {
    return [
      line1,
      line2,
      line3,
      skillsLine && skillsLine.replace("Ervaring met", "Belangrijk is dat je ervaring hebt met"),
    ]
      .filter(Boolean)
      .join(" ");
  }

  // 3. Marketplace / platformstijl
  if (variant === 2) {
    return [
      `Zorgopdracht in ${city} voor ${zorgOmschrijving}.`,
      `Frequentie: ${freq.toLowerCase()}${schedule ? ` (${schedule.toLowerCase()})` : ""}.`,
      `Budget: ${budget}.`,
      financing ? `Type regeling: ${financing}.` : "",
      importantSkills.length > 0
        ? `Gewenste vaardigheden: ${importantSkills.join(" en ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // 4. Kort en krachtig
  return [
    `Gezocht: ${zorgOmschrijving} voor ${relation}${age} in ${city}.`,
    `Inzet ${freq.toLowerCase()}${schedule ? `, bij voorkeur in de ${schedule.toLowerCase()}` : ""}.`,
    line3,
  ]
    .filter(Boolean)
    .join(" ");
}

const defaultForm: Record<string, string | string[] | number | null> = {
  who_needs_care: "",
  age_group: "",
  care_type: "",
  care_frequency: "",
  preferred_schedule: "",
  preferred_city: "",
  preferred_region: "",
  preferred_country: "Nederland",
  urgency: "",
  financiering_regeling: [],
  soort_hulp_zorg: [],
  zorgniveau: [],
  type_inzet: [],
  vaardigheden_ervaring: [],
  target_group: [],
  skills_required: [],
  language_preference: "Nederlands",
  budget_min: null,
  budget_max: null,
  notes: "",
   // Optional AI-generated care request fields
  generated_title: "",
  generated_summary: "",
};

const ZORGVRAGEN_DRAFT_KEY = "samenconnect_zorgvraag_draft";

function inferIntakeStepFromDbRow(row: {
  who_needs_care?: unknown;
  care_type?: unknown;
  soort_hulp_zorg?: unknown;
  care_frequency?: unknown;
  preferred_schedule?: unknown;
  budget_min?: unknown;
  budget_max?: unknown;
  preferred_city?: unknown;
}): number {
  const who = typeof row.who_needs_care === "string" ? row.who_needs_care.trim() : "";
  const hasSoort = Array.isArray(row.soort_hulp_zorg) && row.soort_hulp_zorg.length > 0;
  const careType = typeof row.care_type === "string" ? row.care_type.trim() : "";
  const careFreq = typeof row.care_frequency === "string" ? row.care_frequency.trim() : "";
  const preferredSchedule = typeof row.preferred_schedule === "string" ? row.preferred_schedule.trim() : "";
  const city = typeof row.preferred_city === "string" ? row.preferred_city.trim() : "";
  const hasBudgetMin = typeof row.budget_min === "number";
  const hasBudgetMax = typeof row.budget_max === "number";

  if (!who) return 0; // who
  if (!hasSoort && !careType) return 1; // type
  if (!careFreq && !preferredSchedule) return 2; // frequency
  if (!hasBudgetMin && !hasBudgetMax) return 3; // budget
  if (!city) return 4; // location
  return 5; // summary
}

export default function IntakePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string | string[] | number | null>>(defaultForm);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [generationSeed, setGenerationSeed] = useState(0);
  const [hasStoredIntake, setHasStoredIntake] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [dbLatestDraft, setDbLatestDraft] = useState<any | null>(null);
  const [dbDraftLoaded, setDbDraftLoaded] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) trackZorentaEvent("intake_started", {});
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/zorenta/login?redirect=/zorenta/intake");
      return;
    }
    if (!isAuthenticated) return;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      Promise.all([
        fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
          .then((r) => r.json())
          .catch(() => ({})),
        fetch("/api/zorenta/intake", { headers: zorentaHeaders(token) })
          .then((r) => r.json())
          .catch(() => ({})),
      ]).then(([meData, intakeData]) => {
        const meRole: string | null = meData?.profile?.role ?? null;
        setRole(meRole);
        const intakes = Array.isArray(intakeData?.intakes) ? intakeData.intakes : [];
        // Prefer a saved draft; fall back to the latest intake.
        const latest =
          intakes.find((i: any) => i?.status === "draft") ??
          intakes
            .slice()
            .sort((a: any, b: any) => String(b?.updated_at ?? "").localeCompare(String(a?.updated_at ?? "")))[0] ??
          null;
        setDbLatestDraft(latest);
        setDbDraftLoaded(true);
        // Laat de intake altijd laden voor ingelogde gebruikers;
        // gebruik veilige defaults i.p.v. terug te sturen naar het dashboard.
        setLoading(false);
      });
    });
  }, [authLoading, isAuthenticated, router]);

  // Helper to hydrate state from stored draft
  const hydrateFromDraft = (keepBanner: boolean) => {
    if (typeof window === "undefined") return;
    try {
      // HYDRATE debug logs
      // eslint-disable-next-line no-console
      console.log("HYDRATE: starting");
      const raw = window.localStorage.getItem(ZORGVRAGEN_DRAFT_KEY);
      if (!raw) {
        // No local draft. If the DB draft isn't loaded yet, wait.
        if (!dbDraftLoaded) return;

        if (dbLatestDraft) {
          const row = dbLatestDraft as Record<string, unknown>;
          const tax = intakeTaxonomyFromRow(row);
          const nextForm: Record<string, string | string[] | number | null> = {
            ...defaultForm,
            who_needs_care: typeof row.who_needs_care === "string" ? row.who_needs_care : "",
            age_group: typeof row.age_group === "string" ? row.age_group : "",
            care_type: typeof row.care_type === "string" ? row.care_type : "",
            care_frequency: typeof row.care_frequency === "string" ? row.care_frequency : "",
            preferred_schedule:
              typeof row.preferred_schedule === "string" ? row.preferred_schedule : "",
            preferred_city: typeof row.preferred_city === "string" ? row.preferred_city : "",
            preferred_region:
              typeof row.preferred_region === "string" ? row.preferred_region : "",
            preferred_country:
              typeof row.preferred_country === "string" ? row.preferred_country : "Nederland",
            urgency: typeof row.urgency === "string" ? row.urgency : "",
            language_preference:
              typeof row.language_preference === "string" ? row.language_preference : "Nederlands",
            financiering_regeling: tax.financiering_regeling,
            soort_hulp_zorg: tax.soort_hulp_zorg,
            zorgniveau: tax.zorgniveau,
            type_inzet: tax.type_inzet,
            vaardigheden_ervaring: tax.vaardigheden_ervaring,
            target_group: tax.target_group,
            skills_required: Array.isArray(row.skills_required) ? row.skills_required : [],
            budget_min: typeof row.budget_min === "number" ? row.budget_min : null,
            budget_max: typeof row.budget_max === "number" ? row.budget_max : null,
            notes: typeof row.notes === "string" ? row.notes : "",
          };

          setForm((prev) => ({ ...prev, ...nextForm }));
          setStep(inferIntakeStepFromDbRow(row));
          setIntakeId(typeof row.id === "string" ? row.id : null);
          setGeneratedTitle(null);
          setGeneratedSummary(null);
          setIsHydrated(true);
          setHasStoredIntake(keepBanner);
          return;
        }

        // No draft anywhere, mark as hydrated and hide banner.
        setIsHydrated(true);
        setHasStoredIntake(false);
        // eslint-disable-next-line no-console
        console.log("HYDRATE: no draft found");
        return;
      }
      const parsed = JSON.parse(raw) as {
        form: Record<string, string | string[] | number | null>;
        step?: number;
        generatedTitle?: string | null;
        generatedSummary?: string | null;
      };
      // eslint-disable-next-line no-console
      console.log("HYDRATE: restored draft", parsed);
      const mergedTax = mergeIntakeSubmission((parsed.form || {}) as Record<string, unknown>);
      setForm((prev) => ({ ...prev, ...(parsed.form || {}), ...mergedTax }));
      if (typeof parsed.step === "number") {
        setStep(parsed.step);
      }
      if (parsed.generatedTitle !== undefined) {
        setGeneratedTitle(parsed.generatedTitle ?? null);
      }
      if (parsed.generatedSummary !== undefined) {
        setGeneratedSummary(parsed.generatedSummary ?? null);
      }
      setIsHydrated(true);
      // eslint-disable-next-line no-console
      console.log("HYDRATE: finished");
      setHasStoredIntake(keepBanner);
    } catch {
      // ignore parse errors
    }
  };

  // Restore stored intake form from storage or Supabase draft.
  useEffect(() => {
    if (!authLoading && isAuthenticated && dbDraftLoaded && !isHydrated && !loading) {
      hydrateFromDraft(true);
    }
  }, [authLoading, isAuthenticated, dbDraftLoaded, isHydrated, loading]);

  // Persist draft on every relevant change
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isHydrated) {
      // eslint-disable-next-line no-console
      console.log("AUTOSAVE: skipped before hydration");
      return;
    }
    try {
      const payload = {
        form,
        step,
        generatedTitle,
        generatedSummary,
      };
      window.localStorage.setItem(ZORGVRAGEN_DRAFT_KEY, JSON.stringify(payload));
      // Temporary debug log
      // eslint-disable-next-line no-console
      console.log("AUTOSAVE: saved draft", payload);
    } catch {
      // ignore storage errors
    }
  }, [form, step, generatedTitle, generatedSummary, isHydrated]);

  const update = (key: string, value: string | string[] | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isClientLike = role === "client" || role === "organization";

  const saveDraft = async () => {
    const token = await getZorentaAccessToken();
    if (!token || !isClientLike) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...form, status: "draft" };
    if (intakeId) body.id = intakeId;
    const res = await fetch("/api/zorenta/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...zorentaHeaders(token) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.id) setIntakeId(data.id);
    setSaving(false);
  };

  const submit = async () => {
    const token = await getZorentaAccessToken();
    if (!token || !isClientLike) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...form, status: "completed" };
    if (intakeId) body.id = intakeId;
    const res = await fetch("/api/zorenta/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...zorentaHeaders(token) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (data.id) {
      trackZorentaEvent("intake_completed", { intake_id: data.id });
      setIntakeId(data.id);
    }
  };

  if (authLoading || loading) {
    return (
      <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
        <ZorentaPageSkeleton />
      </PageContainer>
    );
  }

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const toggleArr = (key: string, value: string) => {
    const current = strArr(form, key);
    const exists = current.includes(value);
    const next = exists ? current.filter((t) => t !== value) : [...current, value];
    update(key, next);
    if (key === "soort_hulp_zorg" && next.length > 0 && !form.care_type) {
      update("care_type", labelForValue(SOORT_HULP_ZORG_OPTIONS, next[0]) ?? next[0]);
    }
  };

  const previewTitle =
    generatedTitle ??
    generateCareRequestTitle(form, generationSeed);
  const previewSummary =
    generatedSummary ??
    generateCareRequestSummary(form, generationSeed);

  return (
    <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
      <ZorentaPageHeader
        title="Zorgvraag intake"
        description={`Stap ${step + 1}: ${currentStep.title}`}
      />

      {!loading && role === "caregiver" && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs sm:text-sm text-amber-900">
          <div className="mt-0.5">
            <p className="font-medium">
              Deze intake is bedoeld voor cliënten en organisaties.
            </p>
            <p className="mt-0.5 text-amber-900/80">
              Als zorgverlener kun je opdrachten en matches bekijken via je dashboard en de
              opdrachtenpagina. De intake kan niet door zorgverleners worden verstuurd.
            </p>
          </div>
        </div>
      )}

      {hasStoredIntake && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 text-xs sm:text-sm">
          <div>
            <p className="font-medium text-emerald-900">
              Je eerdere zorgvraag staat nog klaar.
            </p>
            <p className="text-emerald-800/80">
              Wil je verdergaan waar je was of opnieuw beginnen?
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-[#40ada8] px-3 text-xs text-white hover:bg-[#369e9a]"
              onClick={() => hydrateFromDraft(false)}
            >
              Verder waar ik was
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-emerald-200 bg-white px-3 text-xs text-emerald-900 hover:bg-emerald-50"
              onClick={() => {
                if (typeof window !== "undefined") {
                  try {
                    window.localStorage.removeItem(ZORGVRAGEN_DRAFT_KEY);
                    // Temporary debug log
                    // eslint-disable-next-line no-console
                    console.log("Cleared zorgvraag draft");
                  } catch {
                    // ignore
                  }
                }
                setForm(defaultForm);
                setStep(0);
                setGeneratedTitle(null);
                setGeneratedSummary(null);
                setIntakeId(null);
                setHasStoredIntake(false);
              }}
            >
              Opnieuw beginnen
            </Button>
          </div>
        </div>
      )}

      {/* Step indicator — mobiel: compacte labels + vaste kolombreedte; desnoods horizontaal scrollen binnen deze kaart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex min-w-0 items-center justify-between gap-2 text-sm">
          <span className="min-w-0 truncate font-medium text-slate-700">{currentStep.title}</span>
          <span className="shrink-0 text-slate-500">
            Stap {step + 1} van {STEPS.length}
          </span>
        </div>
        <div className="min-w-0 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch] md:overflow-visible md:pb-0">
          <ol className="flex w-max max-w-none items-start gap-1.5 sm:gap-2 md:w-full md:max-w-full md:items-center md:justify-between md:gap-3">
            {STEPPER_ROW_LABELS.map((row, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <li
                  key={row.full}
                  aria-current={active ? "step" : undefined}
                  aria-label={`Stap ${index + 1}: ${row.full}`}
                  className="flex w-[2.625rem] shrink-0 flex-col items-center gap-0.5 sm:w-12 md:w-auto md:min-w-0 md:flex-1 md:gap-1"
                >
                  <div
                    className={[
                      "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold transition-colors md:h-7 md:w-7 md:text-xs",
                      done
                        ? "bg-[#40ada8] text-white"
                        : active
                          ? "bg-[#40ada8]/10 text-[#40ada8] ring-2 ring-[#40ada8]/30"
                          : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {index + 1}
                  </div>
                  <p
                    className={[
                      "max-w-full text-center text-[9px] leading-tight sm:text-[10px] md:text-[11px]",
                      active
                        ? "font-medium text-slate-900"
                        : done
                          ? "text-slate-600"
                          : "text-slate-500",
                    ].join(" ")}
                  >
                    <span className="md:hidden">{row.short}</span>
                    <span className="hidden md:inline">{row.full}</span>
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#40ada8]/10 text-[#40ada8]">
              <FileText className="h-4 w-4" />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-slate-900">{currentStep.title}</span>
              <span className="text-xs font-normal text-slate-500">
                Stap {step + 1} van {STEPS.length} · SamenConnect zorgvraag
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-5 pb-6 pt-6 sm:pb-7 sm:pt-7">
          {currentStep.key === "who" && (
            <>
              <ZorentaFormField label="Voor wie is de zorg?" hint="Bijv. mijzelf, mijn moeder">
                <Input
                  placeholder="Bijv. mijzelf, mijn moeder"
                  value={String(form.who_needs_care ?? "")}
                  onChange={(e) => update("who_needs_care", e.target.value)}
                  className="mt-1"
                />
              </ZorentaFormField>
              <ZorentaFormField label="Leeftijdsgroep">
                <select
                  value={String(form.age_group ?? "")}
                  onChange={(e) => update("age_group", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kies…</option>
                  {AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Doelgroep">
                <div className="mt-2 flex flex-wrap gap-2">
                  {TARGET_GROUP_OPTIONS.map((option) => {
                    const selected = strArr(form, "target_group").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("target_group", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>
            </>
          )}
          {currentStep.key === "type" && (
            <>
              <ZorentaFormField label="Financiering / regeling">
                <div className="mt-2 flex flex-wrap gap-2">
                  {FINANCIERING_REGELING_OPTIONS.map((option) => {
                    const selected = strArr(form, "financiering_regeling").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("financiering_regeling", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>

              <ZorentaFormField label="Soort hulp / zorg">
                <div className="mt-2 flex flex-wrap gap-2">
                  {SOORT_HULP_ZORG_OPTIONS.map((option) => {
                    const selected = strArr(form, "soort_hulp_zorg").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("soort_hulp_zorg", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>

              <ZorentaFormField label="Zorgniveau">
                <div className="mt-2 flex flex-wrap gap-2">
                  {ZORGNIVEAU_OPTIONS.map((option) => {
                    const selected = strArr(form, "zorgniveau").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("zorgniveau", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>

              <ZorentaFormField label="Type inzet">
                <div className="mt-2 flex flex-wrap gap-2">
                  {TYPE_INZET_OPTIONS.map((option) => {
                    const selected = strArr(form, "type_inzet").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("type_inzet", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>

              <ZorentaFormField label="Vaardigheden / ervaring">
                <div className="mt-2 flex flex-wrap gap-2">
                  {VAARDIGHEDEN_ERVARING_OPTIONS.map((option) => {
                    const selected = strArr(form, "vaardigheden_ervaring").includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleArr("vaardigheden_ervaring", option.value)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>
            </>
          )}
          {currentStep.key === "frequency" && (
            <>
              <ZorentaFormField label="Hoe vaak heeft u zorg nodig?">
                <select
                  value={String(form.care_frequency ?? "")}
                  onChange={(e) => update("care_frequency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kies…</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Voorkeur schema" hint="Bijv. ochtend, avond">
                <Input
                  placeholder="Bijv. ochtend, avond"
                  value={String(form.preferred_schedule ?? "")}
                  onChange={(e) => update("preferred_schedule", e.target.value)}
                  className="mt-1"
                />
              </ZorentaFormField>
            </>
          )}
          {currentStep.key === "budget" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <ZorentaFormField label="Budget min (€/uur)">
                  <Input
                    type="number"
                    min={0}
                    placeholder="20"
                    value={form.budget_min ?? ""}
                    onChange={(e) =>
                      update("budget_min", e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </ZorentaFormField>
                <ZorentaFormField label="Budget max (€/uur)">
                  <Input
                    type="number"
                    min={0}
                    placeholder="35"
                    value={form.budget_max ?? ""}
                    onChange={(e) =>
                      update("budget_max", e.target.value === "" ? null : Number(e.target.value))
                    }
                    className="mt-1"
                  />
                </ZorentaFormField>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Indicatie van het uurtarief. Dit hangt af van zorgtype, ervaring en urgentie. Later nog aanpasbaar.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "€20–€30", min: 20, max: 30 },
                  { label: "€30–€40", min: 30, max: 40 },
                  { label: "€40–€60", min: 40, max: 60 },
                  { label: "€60+", min: 60, max: null },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      update("budget_min", preset.min);
                      update("budget_max", preset.max);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {currentStep.key === "location" && (
            <>
              <ZorentaFormField label="Stad / plaats">
                <div className="mt-1">
                  <CityAutocomplete
                    value={String(form.preferred_city ?? "")}
                    onChange={(v) => update("preferred_city", v)}
                    placeholder="Bijv. Amsterdam"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Tip: gebruik de plaats waar de zorg wordt geleverd.
                </p>
              </ZorentaFormField>
              <ZorentaFormField label="Regio / provincie">
                <select
                  value={String(form.preferred_region ?? "")}
                  onChange={(e) => update("preferred_region", e.target.value || "")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Selecteer een provincie</option>
                  {DUTCH_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Urgentie">
                <div className="mt-2 flex flex-wrap gap-2">
                  {URGENCY_OPTIONS.map((option) => {
                    const selected = String(form.urgency ?? "") === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => update("urgency", option)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition",
                          selected
                            ? "border-[#40ada8] bg-[#40ada8] text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </ZorentaFormField>
              <ZorentaFormField label="Opmerkingen (optioneel)">
                <textarea
                  placeholder="Bijzonderheden over de zorgvraag…"
                  value={String(form.notes ?? "")}
                  onChange={(e) => update("notes", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  rows={3}
                />
              </ZorentaFormField>
            </>
          )}

          {currentStep.key === "summary" && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <Card className="rounded-xl border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Gegenereerde zorgvraag</h3>
                <p className="text-sm font-semibold text-slate-900">{previewTitle}</p>
                <p className="mt-2 text-sm text-slate-600">{previewSummary}</p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Deze tekst is automatisch opgesteld en kan later nog aangepast worden.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      const nextSeed = generationSeed + 1;
                      setGenerationSeed(nextSeed);
                      setGeneratedTitle(null);
                      setGeneratedSummary(null);
                    }}
                  >
                    Opnieuw genereren
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#40ada8] px-3 text-xs text-white hover:bg-[#369e9a]"
                    onClick={() => {
                      setGeneratedTitle(previewTitle);
                      setGeneratedSummary(previewSummary);
                      update("generated_title", previewTitle);
                      update("generated_summary", previewSummary);
                    }}
                  >
                    Overnemen
                  </Button>
                </div>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-slate-100 p-4 shadow-sm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Zorgopdracht · Preview voor zorgverleners
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">{previewTitle}</h3>

                <div className="mt-3 grid gap-2 text-xs sm:text-sm text-slate-700">
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        📍 Locatie
                      </p>
                      <p className="text-sm text-slate-800">
                        {(form.preferred_city as string) || "Locatie nog niet ingevuld"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        🕒 Frequentie
                      </p>
                      <p className="text-sm text-slate-800">
                        {String(form.care_frequency || "Niet ingevuld")}{" "}
                        {form.preferred_schedule && `· ${form.preferred_schedule}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        💶 Budget
                      </p>
                      <p className="text-sm text-slate-800">
                        {form.budget_min != null || form.budget_max != null
                          ? `€${form.budget_min ?? "?"}–€${form.budget_max ?? "?"} per uur`
                          : "Nog niet ingevuld"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        💼 Type overeenkomst
                      </p>
                      <p className="text-sm text-slate-800">
                        {labelsForValues(TYPE_INZET_OPTIONS, strArr(form, "type_inzet"))[0] ||
                          labelsForValues(FINANCIERING_REGELING_OPTIONS, strArr(form, "financiering_regeling"))[0] ||
                          "Nog niet ingevuld"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Beschrijving
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    {previewSummary}
                  </p>
                </div>
              </Card>

              <Card className="rounded-xl border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">Samenvatting van je zorgvraag</h3>
                <div className="space-y-3 text-xs sm:text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-900">Voor wie is de zorg</p>
                    <p className="mt-1">
                      {String(form.who_needs_care || "Niet ingevuld")}{" "}
                      {form.age_group && `· ${form.age_group}`}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Doelgroep</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {labelsForValues(TARGET_GROUP_OPTIONS, strArr(form, "target_group")).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                      {strArr(form, "target_group").length === 0 && (
                        <span className="text-slate-500">Niet ingevuld</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Financiering / regeling</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {labelsForValues(FINANCIERING_REGELING_OPTIONS, strArr(form, "financiering_regeling")).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Soort hulp / zorg & zorgniveau</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {labelsForValues(SOORT_HULP_ZORG_OPTIONS, strArr(form, "soort_hulp_zorg")).map((t) => (
                        <span
                          key={`s-${t}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                      {labelsForValues(ZORGNIVEAU_OPTIONS, strArr(form, "zorgniveau")).map((t) => (
                        <span
                          key={`z-${t}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Type inzet & vaardigheden</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {labelsForValues(TYPE_INZET_OPTIONS, strArr(form, "type_inzet")).map((t) => (
                        <span
                          key={`ti-${t}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                      {labelsForValues(VAARDIGHEDEN_ERVARING_OPTIONS, strArr(form, "vaardigheden_ervaring")).map((t) => (
                        <span
                          key={`v-${t}`}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Frequentie</p>
                    <p className="mt-1">
                      {String(form.care_frequency || "Niet ingevuld")}{" "}
                      {form.preferred_schedule && `· ${form.preferred_schedule}`}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Budget</p>
                    <p className="mt-1">
                      {form.budget_min != null || form.budget_max != null
                        ? `€${form.budget_min ?? "?"}–€${form.budget_max ?? "?"} per uur`
                        : "Niet ingevuld"}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Locatie & urgentie</p>
                    <p className="mt-1">
                      {(form.preferred_city as string) || "Geen stad ingevuld"}{" "}
                      {form.preferred_region && `· ${form.preferred_region}`}{" "}
                      {form.urgency && `· ${form.urgency}`}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Opmerkingen</p>
                    <p className="mt-1">
                      {String(form.notes || "Geen extra opmerkingen")}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <Button
              variant="outline"
              onClick={saveDraft}
              disabled={saving || !isClientLike}
              className="gap-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Save className="h-4 w-4" />
              Concept opslaan
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="gap-1.5 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Vorige
                </Button>
              )}
              {!isLast ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="gap-1.5 bg-[#40ada8] text-white hover:bg-[#369e9a]"
                >
                  Volgende
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    onClick={async () => {
                      if (!isClientLike) return;
                      // Optional: keep local preview data, but DB intake is canonical
                      if (typeof window !== "undefined") {
                        try {
                          window.sessionStorage.setItem(
                            "samenconnect_intake_form",
                            JSON.stringify(form)
                          );
                          window.sessionStorage.setItem(
                            "samenconnect_generated_title",
                            (generatedTitle ?? previewTitle) || ""
                          );
                          window.sessionStorage.setItem(
                            "samenconnect_generated_summary",
                            (generatedSummary ?? previewSummary) || ""
                          );
                        } catch {
                          // Non-fatal if storage fails
                        }
                      }
                      await submit();
                      const id = intakeId;
                      // Prefer the latest known id from state; matches page will fall back to latest completed intake if missing.
                      if (id) {
                        router.push(`/zorenta/matches?intake_id=${encodeURIComponent(id)}`);
                      } else {
                        router.push("/zorenta/matches");
                      }
                    }}
                    disabled={saving || !isClientLike}
                    className="gap-1.5 bg-[#40ada8] text-white hover:bg-[#369e9a]"
                  >
                    Bekijk matches
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-slate-500">
                    We tonen zorgverleners en opdrachten die passen bij jouw zorgvraag.
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">
        <a
          href="/zorenta/dashboard"
          className="font-medium text-slate-600 underline hover:text-slate-900"
        >
          Terug naar dashboard
        </a>
      </p>
    </PageContainer>
  );
}
