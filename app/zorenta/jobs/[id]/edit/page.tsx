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

const CARE_TYPES = [
  "Thuiszorg",
  "Verpleeghuis",
  "Gehandicaptenzorg",
  "Dementiezorg",
  "Palliatieve zorg",
  "Kraamzorg",
  "Overig",
];

const AVAILABILITY_OPTIONS = ["Fulltime", "Parttime", "Flexibel", "Per diem", "Overig"];

type Job = {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  care_type: string | null;
  schedule: string | null;
  availability: string | null;
  budget_min: number | null;
  budget_max: number | null;
  hourly_rate: number | null;
  status: string;
  poster_id: string;
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
  const [careType, setCareType] = useState("");
  const [schedule, setSchedule] = useState("");
  const [availability, setAvailability] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [status, setStatus] = useState("open");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            setCareType(d.care_type ?? "");
            setSchedule(d.schedule ?? "");
            setAvailability(d.availability ?? "");
            setBudgetMin(d.budget_min != null ? String(d.budget_min) : "");
            setBudgetMax(d.budget_max != null ? String(d.budget_max) : "");
            setHourlyRate(d.hourly_rate != null ? String(d.hourly_rate) : "");
            setStatus(d.status ?? "open");
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
        care_type: careType.trim() || null,
        schedule: schedule.trim() || null,
        availability: availability.trim() || null,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        status,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Opslaan mislukt.");
      return;
    }
    router.push(`/zorenta/jobs/${id}`);
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
        title="Vacature bewerken"
        backHref={`/zorenta/jobs/${id}`}
        backLabel="Vacature"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ZorentaFormSection title="Algemene gegevens" description="Titel, omschrijving en type zorg">
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
          <ZorentaFormField label="Type zorg">
            <select
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Selecteer type</option>
              {CARE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
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

        <ZorentaFormSection title="Planning & budget" description="Beschikbaarheid, roster, tarief en status">
          <ZorentaFormField label="Beschikbaarheid" hint="bijv. Fulltime, Parttime">
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="">Selecteer</option>
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </ZorentaFormField>
          <ZorentaFormField label="Roster / planning" hint="bijv. Dagdienst, Nachtdienst">
            <Input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="bijv. Dagdienst, Nachtdienst"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <div className="grid grid-cols-2 gap-4">
            <ZorentaFormField label="Budget min (€)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Budget max (€)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
          </div>
          <ZorentaFormField label="Uurtarief (€)" hint="Optioneel">
            <Input
              type="number"
              step="0.01"
              min={0}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="bijv. 25"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              <option value="open">Open</option>
              <option value="closed">Gesloten</option>
              <option value="filled">Vervuld</option>
            </select>
          </ZorentaFormField>
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
          <Link href={`/zorenta/jobs/${id}`}>
            <Button type="button" variant="outline">
              Annuleren
            </Button>
          </Link>
        </div>
      </form>
    </ZorentaPageContainer>
  );
}
