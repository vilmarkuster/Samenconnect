"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
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
  normalizeJobImageUrls,
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
import { HourlyEuroInput } from "@/components/zorenta/hourly-euro-input";
import {
  normalizeHourlyEuroFromDb,
  parseHourlyEuroInputString,
  validateHourlyMinMaxPair,
} from "@/lib/zorenta/hourly-euro-ux";

const SELECT_CLASS =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const CHIP =
  "rounded-full border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition";

function toggleTaxValue(set: React.Dispatch<React.SetStateAction<string[]>>, value: string) {
  set((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]));
}

type Job = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  care_type: string | null;
  care_context?: string | null;
  financiering_regeling?: string[] | null;
  soort_hulp_zorg?: string[] | null;
  zorgniveau?: string[] | null;
  type_inzet?: string[] | null;
  vaardigheden_ervaring?: string[] | null;
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
  image_urls?: string[] | null;
};

export default function JobEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [job, setJob] = useState<Job | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [financieringRegeling, setFinancieringRegeling] = useState<string[]>([]);
  const [soortHulpZorg, setSoortHulpZorg] = useState<string[]>([]);
  const [zorgniveau, setZorgniveau] = useState<string[]>([]);
  const [typeInzet, setTypeInzet] = useState<string[]>([]);
  const [vaardighedenErv, setVaardighedenErv] = useState<string[]>([]);
  const [roleSought, setRoleSought] = useState("");
  const [experienceRequirements, setExperienceRequirements] = useState("");
  const [certificatesRequirements, setCertificatesRequirements] = useState("");
  const [schedule, setSchedule] = useState("");
  const [availability, setAvailability] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMsg, setImageMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch(`/api/zorenta/jobs/${id}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.id) {
            setJob(d);
            setTitle(d.title ?? "");
            setDescription(d.description ?? "");
            setCity(d.city ?? "");
            setRegion(d.region ?? "");
            setCountry(d.country ?? "");
            setFinancieringRegeling(Array.isArray(d.financiering_regeling) ? d.financiering_regeling : []);
            setSoortHulpZorg(Array.isArray(d.soort_hulp_zorg) ? d.soort_hulp_zorg : []);
            setZorgniveau(Array.isArray(d.zorgniveau) ? d.zorgniveau : []);
            setTypeInzet(Array.isArray(d.type_inzet) ? d.type_inzet : []);
            setVaardighedenErv(Array.isArray(d.vaardigheden_ervaring) ? d.vaardigheden_ervaring : []);
            setRoleSought(d.role_sought ?? "");
            setExperienceRequirements(d.experience_requirements ?? "");
            setCertificatesRequirements(d.certificates_requirements ?? "");
            setSchedule(d.schedule ?? "");
            setAvailability(d.availability ?? "");
            setBudgetMin(
              d.budget_min != null && typeof d.budget_min === "number"
                ? String(normalizeHourlyEuroFromDb(d.budget_min) ?? "")
                : ""
            );
            setBudgetMax(
              d.budget_max != null && typeof d.budget_max === "number"
                ? String(normalizeHourlyEuroFromDb(d.budget_max) ?? "")
                : ""
            );
            setHourlyRate(
              d.hourly_rate != null && typeof d.hourly_rate === "number"
                ? String(normalizeHourlyEuroFromDb(d.hourly_rate) ?? "")
                : ""
            );
            setStatus(d.status ?? "open");
            setImageUrls(normalizeJobImageUrls(d.image_urls));
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, [id]);

  function validate(): string | null {
    const t = title.trim();
    if (!t) return "Titel is verplicht.";
    if (t.length > 200) return "Titel mag maximaal 200 tekens zijn.";
    const min = budgetMin ? parseFloat(budgetMin) : null;
    const max = budgetMax ? parseFloat(budgetMax) : null;
    if (min != null && (Number.isNaN(min) || min < 0)) return "Budget min moet een geldig getal zijn.";
    if (max != null && (Number.isNaN(max) || max < 0)) return "Budget max moet een geldig getal zijn.";
    if (min != null && max != null && min > max) return "Budget min mag niet hoger zijn dan max.";
    const rate = hourlyRate ? parseFloat(hourlyRate) : null;
    if (rate != null && (Number.isNaN(rate) || rate < 0)) return "Uurtarief moet een geldig getal zijn.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setError("Niet ingelogd.");
      setSaving(false);
      return;
    }
    const res = await fetch(`/api/zorenta/jobs/${id}`, {
      method: "PUT",
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
        budget_min: (() => {
          const v = validateHourlyMinMaxPair(
            parseHourlyEuroInputString(budgetMin),
            parseHourlyEuroInputString(budgetMax)
          );
          return v.ok ? v.min : null;
        })(),
        budget_max: (() => {
          const v = validateHourlyMinMaxPair(
            parseHourlyEuroInputString(budgetMin),
            parseHourlyEuroInputString(budgetMax)
          );
          return v.ok ? v.max : null;
        })(),
        hourly_rate: (() => {
          const r = parseHourlyEuroInputString(hourlyRate);
          if (r == null) return null;
          const v = validateHourlyMinMaxPair(r, r);
          return v.ok ? v.min : null;
        })(),
        status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Opslaan mislukt.");
      return;
    }
    router.push(`/jobs/${id}`);
  }

  async function handleUploadImages(files: File[]) {
    setImageMsg(null);
    if (files.length === 0) return;
    if (imageUrls.length >= JOB_IMAGE_MAX_COUNT) {
      setImageMsg(`Maximaal ${JOB_IMAGE_MAX_COUNT} afbeeldingen.`);
      return;
    }
    const token = await getZorentaAccessToken();
    if (!token) {
      setImageMsg("Je bent niet ingelogd.");
      return;
    }

    const room = JOB_IMAGE_MAX_COUNT - imageUrls.length;
    const selected = files.slice(0, room);
    if (files.length > room) {
      setImageMsg(`Alleen de eerste ${room} bestand(en) zijn toegevoegd (max. ${JOB_IMAGE_MAX_COUNT}).`);
    }

    for (const file of selected) {
      if (file.size > JOB_IMAGE_MAX_BYTES) {
        setImageMsg("Een bestand is te groot (max. 5 MB per afbeelding).");
        return;
      }
      if (!isAllowedJobImageFile(file)) {
        setImageMsg("Alleen JPG, JPEG, PNG, WebP of GIF zijn toegestaan.");
        return;
      }
    }

    setUploadingImage(true);
    try {
      for (const file of selected) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(`/api/zorenta/jobs/${encodeURIComponent(id)}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setImageMsg(typeof data?.error === "string" ? data.error : "Upload mislukt.");
          return;
        }
        if (data.job?.image_urls) {
          setImageUrls(normalizeJobImageUrls(data.job.image_urls));
        }
      }
    } finally {
      setUploadingImage(false);
    }
  }

  async function removeImageUrl(url: string) {
    setImageMsg(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setImageMsg("Je bent niet ingelogd.");
      return;
    }
    const next = imageUrls.filter((u) => u !== url);
    const res = await fetch(`/api/zorenta/jobs/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ image_urls: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setImageMsg(typeof data?.error === "string" ? data.error : "Verwijderen mislukt.");
      return;
    }
    setImageUrls(normalizeJobImageUrls(data.image_urls));
  }

  if (loading || !job) {
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
    <ZorentaPageContainer maxWidth="narrow" className="space-y-6">
      <ZorentaPageHeader
        title="Opdracht bewerken"
        backHref={`/jobs/${id}`}
        backLabel="Opdracht"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ZorentaFormSection title="Over de opdracht" description="Titel, omschrijving, zorgcontext en gezochte rol">
          <ZorentaFormField label="Titel *" hint="Max. 200 tekens">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Omschrijving" hint="Beschrijf de functie en wat je zoekt">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField
            label="Zorginhoud (matching)"
            hint="Zelfde categorieën als de zorgvraag-intake. Meerdere opties mogelijk."
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
          <ZorentaFormField label="Gezochte rol">
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

        <ZorentaFormSection title="Locatie">
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Stad">
              <CityAutocomplete
                value={city}
                onChange={setCity}
                onLocationPick={(h) => {
                  if (h.province?.trim()) setRegion(h.province.trim());
                }}
                onProvinceGuess={(p) => setRegion(p)}
                placeholder="Bijv. Amsterdam"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Regio">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
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
            <ZorentaFormField label="Land">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Inzet & planning" description="Inzetvorm en aanvullende planning">
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="Inzetvorm / beschikbaarheid">
              <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={SELECT_CLASS}>
                <option value="">Selecteer inzetvorm</option>
                {INZETVORM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
            <ZorentaFormField label="Planning / rooster">
              <Input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="bijv. Dagdienst, nachtdienst"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Vergoeding" description="Uurtarief in hele euro’s (stap €5, min. €10) en status">
          <div className="grid grid-cols-2 gap-4">
            <ZorentaFormField label="Minimum per uur" hint="Optioneel">
              <HourlyEuroInput
                value={budgetMin}
                onChange={setBudgetMin}
                placeholder="Bijv. 25"
                inputClassName="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Maximum per uur" hint="Optioneel">
              <HourlyEuroInput
                value={budgetMax}
                onChange={setBudgetMax}
                placeholder="Bijv. 40"
                inputClassName="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
          <ZorentaFormField label="Vast uurtarief (alternatief)" hint="Optioneel; leeg laten als je min/max gebruikt.">
            <HourlyEuroInput
              value={hourlyRate}
              onChange={setHourlyRate}
              placeholder="Bijv. 35"
              inputClassName="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="open">Open</option>
              <option value="closed">Gesloten</option>
              <option value="filled">Vervuld</option>
            </select>
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Gewenste ervaring & eisen" description="Optioneel; voor matching">
          <ZorentaFormField label="Ervaring">
            <Textarea
              value={experienceRequirements}
              onChange={(e) => setExperienceRequirements(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Certificaten & extra eisen">
            <Textarea
              value={certificatesRequirements}
              onChange={(e) => setCertificatesRequirements(e.target.value)}
              rows={3}
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          title="Afbeeldingen"
          description={`Max. ${JOB_IMAGE_MAX_COUNT} foto’s, elk max. 5 MB.`}
        >
          <div className="space-y-4">
            {imageUrls.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-sm text-slate-600">
                Geen afbeelding toegevoegd. Voeg een cover toe voor een sterkere opdrachtpresentatie.
              </div>
            )}
            {imageUrls.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {imageUrls.map((url) => (
                  <div
                    key={url}
                    className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-red-600 shadow-sm hover:bg-white"
                      onClick={() => void removeImageUrl(url)}
                    >
                      Verwijderen
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageUrls.length < JOB_IMAGE_MAX_COUNT && (
              <ZorentaFormField label="Foto(’s) toevoegen" hint="JPEG, PNG, WebP of GIF">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  disabled={uploadingImage}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-800 hover:file:bg-emerald-100 disabled:opacity-50"
                  onChange={(e) => {
                    const selected = e.target.files ? Array.from(e.target.files) : [];
                    e.target.value = "";
                    if (selected.length > 0) void handleUploadImages(selected);
                  }}
                />
              </ZorentaFormField>
            )}
            {uploadingImage && <p className="text-sm text-slate-500">Uploaden…</p>}
            {imageMsg && (
              <p className="text-sm text-amber-800" role="status">
                {imageMsg}
              </p>
            )}
          </div>
        </ZorentaFormSection>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-6">
          <Button type="submit" disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
          <Link href={`/jobs/${id}`}>
            <Button type="button" variant="outline">
              Annuleren
            </Button>
          </Link>
        </div>
      </form>
    </ZorentaPageContainer>
  );
}
