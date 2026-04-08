"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { COUNTRIES } from "@/lib/zorenta/countries";
import { readImageFileAsDataUrl, validateAvatarImageFile } from "@/lib/zorenta/read-image-data-url";
import { formatAcronymAwareLabel, formatLabelValue, formatLanguageLabel, parseStringListFromMixed } from "@/lib/zorenta/profile-display";
import {
  emptyAvailabilitySchedule,
  normalizeAvailabilitySchedule,
  scheduleFromLegacyArrays,
  type AvailabilitySchedule,
} from "@/lib/zorenta/caregiver-availability-schedule";
import { TagChipInput } from "@/components/zorenta/tag-chip-input";
import { AvailabilityScheduleGrid } from "@/components/zorenta/availability-schedule-grid";

type CaregiverProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  phone?: string | null;
  skills: string[];
  care_types?: string[] | null;
  experience_years: number | null;
  availability: string | null;
  availability_days?: string[] | null;
  availability_times?: string[] | null;
  availability_schedule?: unknown;
  city: string | null;
  region: string | null;
  country: string | null;
  certifications: string[] | null;
  travel_distance_km?: number | null;
  has_driver_license?: boolean | null;
  languages?: string[] | null;
  hourly_rate: number | null;
  min_rate?: number | null;
};

const CAREGIVER_CARE_TYPES = [
  "dementie",
  "begeleiding",
  "persoonlijke verzorging",
  "verpleging",
  "huishoudelijke hulp",
] as const;

export default function CaregiverProfileEditPage() {
  const router = useRouter();
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<CaregiverProfile | null | "none">(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [careTypes, setCareTypes] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [availability, setAvailability] = useState("");
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>(() =>
    emptyAvailabilitySchedule()
  );
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [certificationTags, setCertificationTags] = useState<string[]>([]);
  const [travelDistanceKm, setTravelDistanceKm] = useState("");
  const [hasDriverLicense, setHasDriverLicense] = useState(false);
  const [languageTags, setLanguageTags] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState("");
  const [minRate, setMinRate] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      if (!token) {
        router.replace("/zorenta/login");
        return;
      }
      const res = await fetch("/api/zorenta/caregivers/me", { headers: zorentaHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setProfile("none");
        return;
      }
      const p = data.profile as CaregiverProfile | null;
      setProfile(p ?? "none");
      if (p) {
        setHeadline(p.headline ?? "");
        setBio(p.bio ?? "");
        setPhone(p.phone ?? "");
        setSkills(parseStringListFromMixed(p.skills));
        setCareTypes(Array.isArray(p.care_types) ? p.care_types.filter(Boolean) : []);
        setExperienceYears(p.experience_years != null ? String(p.experience_years) : "");
        setAvailability(p.availability ?? "");
        if (p.availability_schedule != null) {
          setAvailabilitySchedule(normalizeAvailabilitySchedule(p.availability_schedule));
        } else {
          setAvailabilitySchedule(scheduleFromLegacyArrays(p.availability_days, p.availability_times));
        }
        setCity(p.city ?? "");
        setRegion(p.region ?? "");
        setCountry(p.country ?? "");
        setCertificationTags(parseStringListFromMixed(p.certifications));
        setTravelDistanceKm(p.travel_distance_km != null ? String(p.travel_distance_km) : "");
        setHasDriverLicense(Boolean(p.has_driver_license));
        setLanguageTags(parseStringListFromMixed(p.languages));
        setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : "");
        setMinRate(p.min_rate != null ? String(p.min_rate) : "");
      }
      const meRes = await fetch("/api/zorenta/me", { headers: zorentaHeaders(token) });
      const meData = await meRes.json().catch(() => ({}));
      setDisplayName(typeof meData?.profile?.display_name === "string" ? meData.profile.display_name : "");
      setEmail(typeof meData?.email === "string" ? meData.email : "");
      const av = typeof meData?.profile?.avatar_url === "string" ? meData.profile.avatar_url : "";
      setAvatarUrl(av);
      setAvatarPreview(av || null);
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const invalid = validateAvatarImageFile(f);
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploadingAvatar(true);
    setError(null);
    try {
      const dataUrl = await readImageFileAsDataUrl(f);
      setAvatarUrl(dataUrl);
      setAvatarPreview(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload mislukt.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleRemoveAvatar() {
    setError(null);
    setAvatarUrl("");
    setAvatarPreview(null);
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setError("Not authenticated.");
      setSaving(false);
      return;
    }
    const body = {
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      skills,
      care_types: careTypes,
      experience_years: experienceYears.trim() ? parseInt(experienceYears, 10) : null,
      availability: availability.trim() || null,
      availability_schedule: availabilitySchedule,
      city: city.trim() || null,
      certifications: certificationTags,
      hourly_rate: hourlyRate.trim() ? parseFloat(hourlyRate) : null,
      region: region.trim() || null,
      country: country.trim() || null,
      travel_distance_km: travelDistanceKm.trim() ? parseInt(travelDistanceKm, 10) : null,
      has_driver_license: hasDriverLicense,
      languages: languageTags,
      min_rate: minRate.trim() ? parseFloat(minRate) : null,
    };
    const isUpdate = profile && profile !== "none";
    const url = "/api/zorenta/caregivers/me";
    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSaving(false);
      setError(data.error || "Save failed.");
      return;
    }
    const meUpdateRes = await fetch("/api/zorenta/me", {
      method: "PUT",
      headers: zorentaHeaders(token),
      body: JSON.stringify({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    });
    if (!meUpdateRes.ok) {
      const meErr = await meUpdateRes.json().catch(() => ({}));
      setSaving(false);
      setError(meErr.error || "Profielfoto opslaan mislukt.");
      return;
    }
    setSaving(false);
    router.push("/zorenta/profile?saved=1");
  }

  if (profile === null) {
    return (
      <PageContainer maxWidth="narrow">
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-md bg-slate-200" />
          <div className="h-96 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="narrow" className="space-y-6">
      <ZorentaPageHeader
        title={profile === "none" ? "Profiel aanmaken" : "Profiel bewerken"}
        description="Je profiel toont je identiteit en expertise, los van intakegegevens."
        backHref="/zorenta/profile"
        backLabel="Mijn profiel"
      />
      <form onSubmit={handleSubmit} className="space-y-8">
        <ZorentaFormSection
          title="Profielfoto"
          description="Deze foto is zichtbaar op je profiel en in gesprekken."
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="Profielfoto preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-slate-500">Geen foto</span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <ZorentaFormField label="Upload foto" hint="JPG, PNG of WebP (max 5 MB)">
                <Input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFile}
                  disabled={uploadingAvatar}
                />
              </ZorentaFormField>
              <ZorentaFormField label="Of plak foto-URL" hint="Gebruik een publieke afbeeldingslink.">
                <Input
                  value={avatarUrl}
                  onChange={(e) => {
                    setAvatarUrl(e.target.value);
                    setAvatarPreview(e.target.value.trim() || null);
                  }}
                  placeholder="https://..."
                />
              </ZorentaFormField>
              {avatarPreview || avatarUrl.trim() ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-fit border-slate-200 text-slate-700"
                  onClick={handleRemoveAvatar}
                >
                  Verwijder foto
                </Button>
              ) : null}
            </div>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Profiel" description="Naam, headline en wie je bent als zorgverlener.">
          <ZorentaFormField label="Naam">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Je naam"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Headline" hint="Bijv. Verzorgende IG gespecialiseerd in dementiezorg">
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Bijv. Ervaren thuiszorgverpleegkundige"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Over mij" hint="Wie ben je en hoe help je cliënten?">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Over jou en je ervaring"
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Vaardigheden en type zorg" description="Expertise en ervaring die op je profiel zichtbaar is.">
          <TagChipInput
            label="Vaardigheden"
            hint="Typ een vaardigheid en druk op Enter. Verwijder met het kruisje."
            value={skills}
            onChange={setSkills}
            placeholder="Bijv. dementiezorg"
            formatTag={(t) => formatLabelValue(t)}
          />
          <ZorentaFormField label="Type zorg (meerdere mogelijk)">
            <div className="flex flex-wrap gap-2">
              {CAREGIVER_CARE_TYPES.map((t) => {
                const active = careTypes.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setCareTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {formatLabelValue(t)}
                  </button>
                );
              })}
            </div>
          </ZorentaFormField>
          <ZorentaFormField label="Jaren ervaring">
            <Input
              type="number"
              min={0}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              className="max-w-xs rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Beschikbaarheid" description="Plan wanneer je inzetbaar bent. Aanvullende toelichting kan hieronder.">
          <AvailabilityScheduleGrid value={availabilitySchedule} onChange={setAvailabilitySchedule} />
          <ZorentaFormField label="Toelichting (optioneel)" hint="Bijv. parttime, alleen overdag, of andere afspraken.">
            <Input
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              placeholder="Bijv. Parttime, in overleg"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Basis info" description="Waar werk je vooral?">
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Stad">
              <CityAutocomplete
                value={city}
                onChange={setCity}
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

        <ZorentaFormSection title="Contact" description="Hoe kunnen opdrachtgevers je bereiken?">
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="Telefoon">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06..."
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="E-mail">
              <Input value={email} readOnly className="rounded-lg border-slate-200 bg-slate-50 text-slate-600" />
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Professionele gegevens" description="Certificaten, talen en mobiliteit.">
          <div className="space-y-5">
            <ZorentaFormField label="Reisafstand (km)" hint="Hoe ver wil je maximaal reizen voor werk?">
              <Input
                type="number"
                min={0}
                value={travelDistanceKm}
                onChange={(e) => setTravelDistanceKm(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={hasDriverLicense}
                  onChange={(e) => setHasDriverLicense(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-[#40ada8] focus:ring-[#40ada8]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-slate-900">Rijbewijs</span>
                  <span className="mt-0.5 block text-sm text-slate-600">Ik heb een rijbewijs</span>
                </span>
              </label>
            </div>
            <TagChipInput
              label="Certificeringen en registraties"
              hint="Typ en druk op Enter (bijv. BIG, VOG). Verwijder met het kruisje."
              value={certificationTags}
              onChange={setCertificationTags}
              placeholder="Bijv. BIG"
              formatTag={(t) => formatAcronymAwareLabel(t)}
            />
            <TagChipInput
              label="Talen"
              hint="Typ een taal en druk op Enter."
              value={languageTags}
              onChange={setLanguageTags}
              placeholder="Bijv. Nederlands"
              formatTag={(t) => formatLanguageLabel(t)}
            />
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Tarief" description="Optioneel uurtarief">
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="Uurtarief (€)">
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="bijv. 25"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Minimaal tarief (€)">
              <Input
                type="number"
                step="0.01"
                value={minRate}
                onChange={(e) => setMinRate(e.target.value)}
                placeholder="optioneel"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Opslaan…" : "Opslaan"}
          </Button>
          <a
            href="/zorenta/profile"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50"
          >
            Annuleren
          </a>
        </div>
      </form>
    </PageContainer>
  );
}
