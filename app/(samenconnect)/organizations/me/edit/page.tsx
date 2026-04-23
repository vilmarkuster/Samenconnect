"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { COUNTRIES } from "@/lib/zorenta/countries";

type OrgProfile = {
  id: string;
  name: string;
  org_type: string | null;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

const ORG_TYPES = [
  { value: "home_care", label: "Thuiszorg" },
  { value: "nursing_home", label: "Verpleeghuis" },
  { value: "hospital", label: "Ziekenhuis" },
  { value: "agency", label: "Bureau" },
  { value: "other", label: "Overig" },
];

const selectClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const inputClass =
  "rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100";

export default function OrganizationProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OrgProfile | null | "none">(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getZorentaAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      const [orgRes, meRes] = await Promise.all([
        fetch("/api/zorenta/organizations/me", { headers: zorentaHeaders(token) }),
        fetch("/api/zorenta/me", { headers: zorentaHeaders(token) }),
      ]);
      const orgData = await orgRes.json().catch(() => ({}));
      const meData = await meRes.json().catch(() => ({}));
      if (cancelled) return;
      setEmail(typeof meData?.email === "string" ? meData.email : "");
      if (!orgRes.ok) {
        setProfile("none");
        return;
      }
      const p = orgData.profile as OrgProfile | null;
      setProfile(p ?? "none");
      if (p) {
        setName(p.name ?? "");
        setOrgType(p.org_type ?? "");
        setDescription(p.description ?? "");
        setCity(p.city ?? "");
        setRegion(p.region ?? "");
        setCountry(p.country ?? "");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
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
    if (!name.trim()) {
      setError("Organisatienaam is verplicht.");
      setSaving(false);
      return;
    }
    const body = {
      name: name.trim(),
      org_type: orgType.trim() || null,
      description: description.trim() || null,
      city: city.trim() || null,
      region: region.trim() || null,
      country: country.trim() || null,
    };
    const isUpdate = profile && profile !== "none";
    const res = await fetch("/api/zorenta/organizations/me", {
      method: isUpdate ? "PUT" : "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Opslaan mislukt.");
      return;
    }
    router.push("/dashboard");
  }

  const pageDescription =
    profile === "none"
      ? "Vul naam, type, omschrijving en locatie in om zichtbaar te worden op SamenConnect."
      : "Pas hier de gegevens aan die op jullie organisatieprofiel staan.";

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
    <PageContainer maxWidth="narrow" className="space-y-4 pb-8">
      <div className="space-y-2 [&>div:first-child]:!mb-3 sm:[&>div:first-child]:!mb-4">
        <ZorentaPageHeader
          title={profile === "none" ? "Organisatieprofiel aanmaken" : "Organisatieprofiel bewerken"}
          description={pageDescription}
          backHref="/profile"
          backLabel="Mijn profiel"
        />
        <p className="text-sm leading-snug text-slate-500">
          Zelfde blokken als andere profielen: identiteit, tekst, locatie, account. Opslaan = direct op jullie profiel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <ZorentaFormSection
          title="Identiteit"
          description="Naam en type — zichtbaar op jullie profiel en bij opdrachten."
          contentClassName="space-y-4"
        >
          <ZorentaFormField
            label="Organisatienaam *"
            hint="Zoals jullie extern communiceren; deze naam verschijnt op jullie profiel."
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="bijv. Zorgorganisatie Zon"
              required
              className={inputClass}
            />
          </ZorentaFormField>
          <ZorentaFormField
            label="Type organisatie"
            hint="Past bij jullie primaire werkwijze; helpt anderen jullie te plaatsen."
          >
            <select value={orgType} onChange={(e) => setOrgType(e.target.value)} className={selectClass}>
              <option value="">Selecteer type</option>
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          title="Omschrijving op jullie profiel"
          description="Korte tekst: wie zijn jullie en wat doen jullie (optioneel, wel aanbevolen)."
          contentClassName="space-y-3"
        >
          <ZorentaFormField
            label="Profieltekst"
            hint="Ongeveer 2–5 zinnen; helpt bij vertrouwen en matching."
          >
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={cn("min-h-[6.5rem] resize-y", inputClass)}
              placeholder="Bijv. Regionaal thuiszorgteam, focus op ouderenzorg en revalidatie thuis…"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          title="Locatie & bereik"
          description="Gebruikt bij zoeken, filters en regionale context."
          contentClassName="space-y-0"
        >
          <div className="rounded-lg border border-slate-200/90 bg-slate-50/40 p-3 sm:p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <ZorentaFormField label="Stad" hint="Hoofdvestiging of kerngebied.">
                <CityAutocomplete value={city} onChange={setCity} placeholder="Bijv. Amsterdam" />
              </ZorentaFormField>
              <ZorentaFormField label="Regio (provincie)" hint="Voor provincie- en regiofilters.">
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectClass}>
                  <option value="">Selecteer een provincie</option>
                  {DUTCH_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Land" hint="Meestal Nederland.">
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass}>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </ZorentaFormField>
            </div>
          </div>
        </ZorentaFormSection>

        <ZorentaFormSection title="Account" description="Accountinstellingen voor je login.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="E-mail">
              <Input value={email} readOnly className="rounded-lg border-slate-200 bg-slate-50 text-slate-600" />
            </ZorentaFormField>
            <ZorentaFormField label="Wachtwoord">
              <Link
                href="/settings/security"
                className={cn(
                  buttonVariants({ variant: "outline", size: "md" }),
                  "w-full justify-start border-slate-200 text-slate-700"
                )}
              >
                Wachtwoord wijzigen
              </Link>
            </ZorentaFormField>
          </div>
        </ZorentaFormSection>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="space-y-3 border-t border-slate-200 pt-5">
          <p className="text-xs text-slate-500">Opslaan schrijft direct naar jullie organisatieprofiel.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Opslaan…" : "Opslaan"}
            </Button>
            <a
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuleren
            </a>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
