"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";

type CaregiverProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  skills: string[];
  experience_years: number | null;
  availability: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  certifications: string | null;
  hourly_rate: number | null;
};

export default function CaregiverProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CaregiverProfile | null | "none">(null);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [skillsStr, setSkillsStr] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [availability, setAvailability] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [certifications, setCertifications] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
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
        setSkillsStr(Array.isArray(p.skills) ? p.skills.join(", ") : "");
        setExperienceYears(p.experience_years != null ? String(p.experience_years) : "");
        setAvailability(p.availability ?? "");
        setCity(p.city ?? "");
        setRegion(p.region ?? "");
        setCountry(p.country ?? "");
        setCertifications(p.certifications ?? "");
        setHourlyRate(p.hourly_rate != null ? String(p.hourly_rate) : "");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [router]);

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
    const skills = skillsStr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const body = {
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      skills,
      experience_years: experienceYears.trim() ? parseInt(experienceYears, 10) : null,
      availability: availability.trim() || null,
      city: city.trim() || null,
      certifications: certifications.trim() || null,
      hourly_rate: hourlyRate.trim() ? parseFloat(hourlyRate) : null,
      region: region.trim() || null,
      country: country.trim() || null,
    };
    const isUpdate = profile && profile !== "none";
    const url = "/api/zorenta/caregivers/me";
    const res = await fetch(url, {
      method: isUpdate ? "PUT" : "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return;
    }
    router.push("/zorenta/dashboard");
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
        description="Vaardigheden, ervaring en locatie helpen opdrachtgevers je te vinden."
        backHref="/zorenta/dashboard"
        backLabel="Dashboard"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ZorentaFormSection
          title="Algemene info"
          description="Korte omschrijving en ervaring"
        >
          <ZorentaFormField label="Korte omschrijving" hint="Bijv. Ervaren thuiszorgverpleegkundige">
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="bijv. Ervaren thuiszorgverpleegkundige"
              />
            </ZorentaFormField>
          <ZorentaFormField label="Over jou" hint="Korte bio en ervaring">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Over jou en je ervaring"
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Vaardigheden" hint="Komma gescheiden, bijv. Dementiezorg, Medicatiebeheer">
            <Input
              value={skillsStr}
              onChange={(e) => setSkillsStr(e.target.value)}
              placeholder="bijv. Dementiezorg, Medicatiebeheer"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="Jaren ervaring">
              <Input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Beschikbaarheid" hint="Bijv. Fulltime, Parttime">
              <Input
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                placeholder="bijv. Fulltime, Parttime"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
          <ZorentaFormField label="Certificeringen" hint="Bijv. VOG, diploma verpleging">
            <Input
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="bijv. VOG, diploma verpleging"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Locatie" description="Waar ben je beschikbaar?">
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Stad">
              <Input value={city} onChange={(e) => setCity(e.target.value)} className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100" />
            </ZorentaFormField>
            <ZorentaFormField label="Regio">
              <Input value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100" />
            </ZorentaFormField>
            <ZorentaFormField label="Land">
              <Input value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100" />
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Tarief" description="Optioneel uurtarief">
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
          <Link href="/zorenta/dashboard">
            <Button type="button" variant="outline">
              Annuleren
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
