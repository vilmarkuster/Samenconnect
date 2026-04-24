"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, X } from "lucide-react";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { COUNTRIES } from "@/lib/zorenta/countries";
import {
  JOB_IMAGE_MAX_BYTES,
  JOB_IMAGE_MAX_COUNT,
  isAllowedJobImageFile,
} from "@/lib/zorenta/job-images";
import { INZETVORM_OPTIONS, ROLE_SOUGHT_OPTIONS } from "@/lib/zorenta/job-intake-options";
import {
  FINANCIERING_REGELING_OPTIONS,
  SOORT_HULP_ZORG_OPTIONS,
  ZORGNIVEAU_OPTIONS,
  TYPE_INZET_OPTIONS,
  VAARDIGHEDEN_ERVARING_OPTIONS,
} from "@/lib/zorenta/intake-taxonomy";
import { cn } from "@/lib/utils";
import { adminPrefersMainAppSession } from "@/lib/samenconnect/admin-main-app-nav";
import {
  BUDGET_TARIEF_PRESETS,
  activeBudgetPresetIdFromMinMax,
} from "@/lib/zorenta/job-hourly-budget-presets";
import { HourlyEuroInput } from "@/components/zorenta/hourly-euro-input";
import {
  parseHourlyEuroInputString,
  validateHourlyMinMaxPair,
} from "@/lib/zorenta/hourly-euro-ux";

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const CHIP =
  "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition";

const SECTION_CARD = "rounded-2xl border-slate-200/90 shadow-sm shadow-slate-200/40";

function toggleTaxValue(set: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
  set((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
}

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("Nederland");
  const [financieringRegeling, setFinancieringRegeling] = useState<string[]>([]);
  const [soortHulpZorg, setSoortHulpZorg] = useState<string[]>([]);
  const [zorgniveau, setZorgniveau] = useState<string[]>([]);
  const [typeInzet, setTypeInzet] = useState<string[]>([]);
  const [vaardighedenErv, setVaardighedenErv] = useState<string[]>([]);
  const [roleSought, setRoleSought] = useState("");
  const [schedule, setSchedule] = useState("");
  const [availability, setAvailability] = useState("");
  const [experienceRequirements, setExperienceRequirements] = useState("");
  const [certificatesRequirements, setCertificatesRequirements] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [budgetTariefCustom, setBudgetTariefCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvingDescription, setImprovingDescription] = useState(false);
  const [improveDescriptionError, setImproveDescriptionError] = useState<string | null>(null);
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setRoleCheckDone(true);
        return;
      }
      fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
        .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
        .then(({ ok, data: d }) => {
          if (cancelled) return;
          if (!ok || !d?.profile) {
            setRoleCheckDone(true);
            return;
          }
          const role = typeof d.profile.role === "string" ? d.profile.role : "";
          if (role === "caregiver") {
            router.replace("/jobs");
            return;
          }
          if (role === "admin" && !adminPrefersMainAppSession()) {
            router.replace("/admin");
            return;
          }
          if (role === "admin") {
            router.replace("/dashboard");
            return;
          }
          if (role === "client" && !d.client) {
            router.replace("/clients/me/edit");
            return;
          }
          if (role === "organization" && !d.organization) {
            router.replace("/organizations/me/edit");
            return;
          }
          if (role !== "client" && role !== "organization") {
            router.replace("/jobs");
            return;
          }
          setRoleCheckDone(true);
        })
        .catch(() => {
          if (!cancelled) setRoleCheckDone(true);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const urls = pendingImages.map((f) => URL.createObjectURL(f));
    setImagePreviewUrls(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingImages]);

  function validate(): string | null {
    const t = title.trim();
    if (!t) return "Titel is verplicht.";
    if (t.length > 200) return "Titel mag maximaal 200 tekens zijn.";
    const vmin = parseHourlyEuroInputString(budgetMin);
    const vmax = parseHourlyEuroInputString(budgetMax);
    const pair = validateHourlyMinMaxPair(vmin, vmax);
    if (!pair.ok) return pair.message;
    return null;
  }

  function addImageFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(null);
    const next = [...pendingImages];
    for (const file of Array.from(list)) {
      if (next.length >= JOB_IMAGE_MAX_COUNT) {
        setUploadError(`Maximaal ${JOB_IMAGE_MAX_COUNT} afbeeldingen.`);
        break;
      }
      if (file.size > JOB_IMAGE_MAX_BYTES) {
        setUploadError("Elke afbeelding mag maximaal 5 MB zijn.");
        return;
      }
      if (!isAllowedJobImageFile(file)) {
        setUploadError("Alleen JPG, JPEG, PNG, WebP of GIF zijn toegestaan.");
        return;
      }
      next.push(file);
    }
    setPendingImages(next);
  }

  function removePendingImage(index: number) {
    setPendingImages((p) => p.filter((_, i) => i !== index));
    setUploadError(null);
  }

  async function handleImproveDescription() {
    const rawTitle = title.trim();
    const rawDescription = description.trim();
    const rawExperience = experienceRequirements.trim();
    const rawRequirements = certificatesRequirements.trim();
    if (improvingDescription) return;
    if (!rawTitle && !rawDescription && !rawExperience && !rawRequirements) {
      setImproveDescriptionError("Voeg eerst titel, omschrijving, ervaring of eisen toe.");
      return;
    }

    setImproveDescriptionError(null);
    setImprovingDescription(true);
    try {
      const token = await getZorentaAccessToken();
      if (!token) {
        setImproveDescriptionError("Je bent niet ingelogd.");
        return;
      }

      const budgetLabel =
        budgetMin.trim() || budgetMax.trim()
          ? `${budgetMin.trim() || "—"} - ${budgetMax.trim() || "—"}`
          : "";
      const locationLabel = [city.trim(), region.trim(), country.trim()].filter(Boolean).join(", ");

      const res = await fetch("/api/zorenta/jobs/improve-description", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({
          title: rawTitle,
          description: rawDescription,
          experience: rawExperience,
          requirements: rawRequirements,
          careTypes: soortHulpZorg,
          zorgniveau,
          typeInzet,
          location: locationLabel,
          schedule: schedule.trim(),
          budget: budgetLabel,
          roleSought: roleSought.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setImproveDescriptionError(
          typeof data?.error === "string"
            ? data.error
            : "Verbeteren is niet gelukt. Probeer het opnieuw."
        );
        return;
      }

      const nextTitle = typeof data?.title === "string" ? data.title.trim() : "";
      const nextDescription = typeof data?.description === "string" ? data.description.trim() : "";
      const nextExperience = typeof data?.experience === "string" ? data.experience.trim() : "";
      const nextRequirements =
        typeof data?.requirements === "string" ? data.requirements.trim() : "";
      if (!nextTitle && !nextDescription && !nextExperience && !nextRequirements) {
        setImproveDescriptionError("Geen verbeterde tekst ontvangen.");
        return;
      }

      if (nextTitle) setTitle(nextTitle);
      if (nextDescription) setDescription(nextDescription);
      if (nextExperience) setExperienceRequirements(nextExperience);
      if (nextRequirements) setCertificatesRequirements(nextRequirements);
    } catch {
      setImproveDescriptionError("Verbeteren is niet gelukt. Probeer het opnieuw.");
    } finally {
      setImprovingDescription(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setError("Je bent niet ingelogd.");
      setSaving(false);
      return;
    }
    const budgetPair = validateHourlyMinMaxPair(
      parseHourlyEuroInputString(budgetMin),
      parseHourlyEuroInputString(budgetMax)
    );
    const res = await fetch("/api/zorenta/jobs", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        city: city.trim() || null,
        region: region.trim() || null,
        country: country.trim() || null,
        financiering_regeling: financieringRegeling.length ? financieringRegeling : null,
        soort_hulp_zorg: soortHulpZorg.length ? soortHulpZorg : null,
        zorgniveau: zorgniveau.length ? zorgniveau : null,
        type_inzet: typeInzet.length ? typeInzet : null,
        vaardigheden_ervaring: vaardighedenErv.length ? vaardighedenErv : null,
        role_sought: roleSought.trim() || null,
        experience_requirements: experienceRequirements.trim() || null,
        certificates_requirements: certificatesRequirements.trim() || null,
        schedule: schedule.trim() || null,
        availability: availability.trim() || null,
        budget_min: budgetPair.ok ? budgetPair.min : null,
        budget_max: budgetPair.ok ? budgetPair.max : null,
        hourly_rate: null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      setError(data.error || "Opslaan mislukt.");
      return;
    }
    const jobId = data.id as string;
    if (pendingImages.length > 0) {
      for (const file of pendingImages) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch(`/api/zorenta/jobs/${encodeURIComponent(jobId)}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          setSaving(false);
          setError(
            typeof upData?.error === "string"
              ? upData.error
              : "Opdracht is geplaatst, maar een afbeelding kon niet worden geüpload."
          );
          router.push(`/jobs/${jobId}/edit`);
          return;
        }
      }
    }
    setSaving(false);
    trackZorentaEvent("job_created", { job_id: jobId });
    router.push(`/jobs/${jobId}?created=1`);
  }

  if (!roleCheckDone) {
    return (
      <ZorentaPageContainer maxWidth="narrow">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="narrow" className="space-y-8 pb-14 sm:pb-16">
      <ZorentaPageHeader
        title="Nieuwe opdracht"
        description="Stap voor stap: zorgcontext, rol, locatie en inzet. Alleen de titel is verplicht — de rest helpt bij betere matches."
        backHref="/jobs"
        backLabel="Opdrachten"
      />

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-5"
          title="Over de opdracht"
          description="Titel, omschrijving, zorgcontext en gezochte rol — dit voedt de matching."
        >
          <ZorentaFormField label="Titel *" hint="Maximaal 200 tekens. Dit is de eerste regel die zorgverleners zien.">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="Bijv. Verzorgende IG thuis in Amsterdam"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField
            label="Omschrijving"
            hint="Werkzaamheden, voorkeuren, wat iemand mag verwachten. Leeg laten kan ook."
          >
            <div className="space-y-3">
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (improveDescriptionError) setImproveDescriptionError(null);
                }}
                rows={5}
                placeholder="Beschrijf de situatie en wat je zoekt in een zorgverlener."
                className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <p className="text-xs font-medium text-slate-700">
                  Een duidelijke omschrijving geeft betere matches.
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-slate-600">
                  <li>Beschrijf kort de hulpvraag en voor wie de opdracht is.</li>
                  <li>Noem praktische details zoals tijden, voorkeuren en context.</li>
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleImproveDescription()}
                  disabled={
                    improvingDescription ||
                    saving ||
                    (!title.trim() &&
                      !description.trim() &&
                      !experienceRequirements.trim() &&
                      !certificatesRequirements.trim())
                  }
                  className="border-slate-200 text-xs"
                >
                  {improvingDescription ? "Bezig met verbeteren..." : "Verbeter beschrijving"}
                </Button>
                <p className="text-[11px] text-slate-500">
                  AI herschrijft alleen je tekst duidelijker en vult niets aan dat je niet noemde.
                </p>
              </div>
              {improveDescriptionError ? (
                <p className="text-xs text-red-600" role="status">
                  {improveDescriptionError}
                </p>
              ) : null}
            </div>
          </ZorentaFormField>
          <ZorentaFormField
            label="Zorginhoud (matching)"
            hint="Zelfde categorieën als de zorgvraag-intake. Kies wat van toepassing is — meerdere opties mogelijk."
          >
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Financiering / regeling</p>
                <div className="flex flex-wrap gap-2">
                  {FINANCIERING_REGELING_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTaxValue(setFinancieringRegeling, o.value)}
                      className={cn(
                        CHIP,
                        financieringRegeling.includes(o.value)
                          ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Soort hulp / zorg</p>
                <div className="flex flex-wrap gap-2">
                  {SOORT_HULP_ZORG_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTaxValue(setSoortHulpZorg, o.value)}
                      className={cn(
                        CHIP,
                        soortHulpZorg.includes(o.value)
                          ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Zorgniveau</p>
                <div className="flex flex-wrap gap-2">
                  {ZORGNIVEAU_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTaxValue(setZorgniveau, o.value)}
                      className={cn(
                        CHIP,
                        zorgniveau.includes(o.value)
                          ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Type inzet</p>
                <div className="flex flex-wrap gap-2">
                  {TYPE_INZET_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTaxValue(setTypeInzet, o.value)}
                      className={cn(
                        CHIP,
                        typeInzet.includes(o.value)
                          ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Gewenste vaardigheden / ervaring</p>
                <div className="flex flex-wrap gap-2">
                  {VAARDIGHEDEN_ERVARING_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggleTaxValue(setVaardighedenErv, o.value)}
                      className={cn(
                        CHIP,
                        vaardighedenErv.includes(o.value)
                          ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ZorentaFormField>
          <ZorentaFormField label="Gezochte rol" hint="Welk profiel zoek je?">
            <select value={roleSought} onChange={(e) => setRoleSought(e.target.value)} className={SELECT_CLASS}>
              <option value="">Selecteer rol</option>
              {ROLE_SOUGHT_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-5"
          title="Locatie"
          description="Waar is de opdracht? Alles optioneel."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Stad" hint="Begin met typen voor suggesties.">
              <CityAutocomplete value={city} onChange={setCity} placeholder="Bijv. Amsterdam" />
            </ZorentaFormField>
            <ZorentaFormField label="Provincie">
              <select value={region} onChange={(e) => setRegion(e.target.value)} className={SELECT_CLASS}>
                <option value="">Selecteer provincie</option>
                {DUTCH_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
            <ZorentaFormField label="Land">
              <select value={country} onChange={(e) => setCountry(e.target.value)} className={SELECT_CLASS}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-5"
          title="Inzet & planning"
          description="Inzetvorm en aanvullende planning — helpt bij beschikbaarheid en matching."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="Inzetvorm / beschikbaarheid" hint="Primaire vorm van inzet.">
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Selecteer inzetvorm</option>
                {INZETVORM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
            <ZorentaFormField
              label="Planning / rooster"
              hint="Diensten, vaste dagen, nachten — vrije tekst."
            >
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="Bijv. Dagdienst, 2 nachten per week"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-5"
          title="Vergoeding"
          description="Uurtarief of bandbreedte per uur (optioneel). Zelfde als bij de zorgvraag-intake; later aanpasbaar."
        >
          <p className="text-xs text-slate-600">
            Kies een range of stel zelf min en max in (voor een{" "}
            <span className="font-medium text-slate-800">vast uurtarief</span> vul je hetzelfde bedrag bij min en max).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BUDGET_TARIEF_PRESETS.map((preset) => {
              const active =
                activeBudgetPresetIdFromMinMax(
                  budgetMin ? parseFloat(budgetMin) : null,
                  budgetMax ? parseFloat(budgetMax) : null
                ) === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    if (active) {
                      setBudgetMin("");
                      setBudgetMax("");
                      setBudgetTariefCustom(false);
                    } else {
                      setBudgetMin(String(preset.min));
                      setBudgetMax(preset.max == null ? "" : String(preset.max));
                      setBudgetTariefCustom(false);
                    }
                  }}
                  className={cn(
                    CHIP,
                    active
                      ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const minN = parseHourlyEuroInputString(budgetMin);
                const maxN = parseHourlyEuroInputString(budgetMax);
                const presetId = activeBudgetPresetIdFromMinMax(minN, maxN);
                const eigenActive =
                  budgetTariefCustom || (presetId === null && (budgetMin.trim() !== "" || budgetMax.trim() !== ""));
                if (eigenActive && budgetTariefCustom) {
                  setBudgetMin("");
                  setBudgetMax("");
                  setBudgetTariefCustom(false);
                  return;
                }
                setBudgetTariefCustom(true);
              }}
              className={cn(
                CHIP,
                activeBudgetPresetIdFromMinMax(
                  parseHourlyEuroInputString(budgetMin),
                  parseHourlyEuroInputString(budgetMax)
                ) === null &&
                  (budgetTariefCustom || budgetMin.trim() !== "" || budgetMax.trim() !== "")
                  ? "border-[#40ADA8] bg-[#40ADA8] text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              Eigen uurtarief
            </button>
          </div>
          {!(
            activeBudgetPresetIdFromMinMax(
              parseHourlyEuroInputString(budgetMin),
              parseHourlyEuroInputString(budgetMax)
            ) !== null && !budgetTariefCustom
          ) ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ZorentaFormField label="Minimum per uur" hint="Hele euro’s, vanaf €10, stap €5. Optioneel.">
                <HourlyEuroInput
                  value={budgetMin}
                  onChange={(v) => {
                    setBudgetMin(v);
                    setBudgetTariefCustom(true);
                  }}
                  placeholder="Bijv. 25"
                  inputClassName="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                />
              </ZorentaFormField>
              <ZorentaFormField label="Maximum per uur" hint="Hele euro’s, vanaf €10. Optioneel.">
                <HourlyEuroInput
                  value={budgetMax}
                  onChange={(v) => {
                    setBudgetMax(v);
                    setBudgetTariefCustom(true);
                  }}
                  placeholder="Bijv. 40"
                  inputClassName="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                />
              </ZorentaFormField>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Preset geselecteerd. Tik opnieuw op de preset om te wissen, of kies &quot;Eigen uurtarief&quot; om zelf
              min/max in te vullen.
            </p>
          )}
        </ZorentaFormSection>

        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-5"
          title="Gewenste ervaring & eisen"
          description="Optioneel; wordt gebruikt om profielen te vergelijken op ervaring en certificaten."
        >
          <ZorentaFormField
            label="Ervaring"
            hint="Bijv. minimaal X jaar in thuiszorg, of ervaring met dementie."
          >
            <Textarea
              value={experienceRequirements}
              onChange={(e) => setExperienceRequirements(e.target.value)}
              rows={3}
              placeholder="Wat voor ervaring heeft prioriteit?"
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField
            label="Certificaten & extra eisen"
            hint="Bijv. BIG, VIG, rijbewijs, taal."
          >
            <Textarea
              value={certificatesRequirements}
              onChange={(e) => setCertificatesRequirements(e.target.value)}
              rows={3}
              placeholder="Vereiste diploma’s, certificaten of andere harde eisen."
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          className={SECTION_CARD}
          contentClassName="space-y-4"
          title="Foto’s van de opdracht"
          description={`Optioneel, maximaal ${JOB_IMAGE_MAX_COUNT} foto’s (max. 5 MB per bestand). Worden geüpload nadat je de opdracht hebt geplaatst.`}
        >
          <div className="space-y-3">
            <input
              id="job-new-images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(e) => {
                addImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <label
              htmlFor="job-new-images"
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center transition",
                "hover:border-[#40ADA8]/45 hover:bg-slate-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-[#40ADA8]/25"
              )}
            >
              <Camera className="h-9 w-9 text-slate-400" aria-hidden />
              <span className="mt-2 text-sm font-medium text-slate-800">Klik om foto’s te kiezen</span>
              <span className="mt-1 max-w-sm text-xs text-slate-500">
                JPEG, PNG, WebP of GIF. Eerste foto wordt de hoofdfoto op de opdracht.
              </span>
            </label>
            {uploadError && (
              <p className="text-sm text-amber-700" role="status">
                {uploadError}
              </p>
            )}
            {pendingImages.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Voorbeeld ({pendingImages.length})</p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {pendingImages.map((f, i) => (
                    <li
                      key={`${i}-${f.name}-${f.size}`}
                      className="group relative overflow-hidden rounded-xl border border-slate-200/90 bg-slate-100 shadow-sm"
                    >
                      {imagePreviewUrls[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local preview blob
                        <img
                          src={imagePreviewUrls[i]}
                          alt=""
                          className="aspect-[4/3] w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-[4/3] w-full animate-pulse bg-slate-200" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 py-2 pt-8">
                        <p className="truncate text-[11px] font-medium text-white">{f.name}</p>
                      </div>
                      <button
                        type="button"
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-90 backdrop-blur-sm transition hover:bg-black/70"
                        onClick={(e) => {
                          e.preventDefault();
                          removePendingImage(i);
                        }}
                        aria-label={`Verwijder ${f.name}`}
                      >
                        <X className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ZorentaFormSection>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <Card className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#40ADA8]/12 text-[#2d7f7b]">
                <CheckCircle2 className="h-5 w-5" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Afronding — opdracht plaatsen</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  Na publicatie kun je teksten, foto’s en tarieven altijd nog wijzigen.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link href="/jobs">
                <Button type="button" variant="outline" className="rounded-xl border-slate-200 px-6">
                  Annuleren
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={saving}
                size="lg"
                className="min-w-[180px] rounded-xl border-0 bg-[#40ADA8] px-8 text-base font-semibold text-white shadow-md shadow-[#40ADA8]/20 hover:bg-[#369e9a]"
              >
                {saving ? "Bezig met plaatsen…" : "Opdracht plaatsen"}
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </ZorentaPageContainer>
  );
}
