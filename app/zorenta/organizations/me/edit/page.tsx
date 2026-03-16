"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";

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

export default function OrganizationProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<OrgProfile | null | "none">(null);
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
        router.replace("/zorenta/login");
        return;
      }
      const res = await fetch("/api/zorenta/organizations/me", { headers: zorentaHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setProfile("none");
        return;
      }
      const p = data.profile as OrgProfile | null;
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
    router.push("/zorenta/dashboard");
  }

  if (profile === null) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <ZorentaPageHeader
        title={profile === "none" ? "Profiel aanmaken" : "Profiel bewerken"}
        description="Naam, type en locatie van je organisatie."
        backHref="/zorenta/dashboard"
        backLabel="Dashboard"
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organisatiegegevens</CardTitle>
          <CardDescription>Deze gegevens zijn zichtbaar voor zorgverleners en cliënten.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <ZorentaFormField label="Organisatienaam *">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="bijv. Zorgorganisatie Zon"
                required
              />
            </ZorentaFormField>
            <ZorentaFormField label="Type">
              <select
                value={orgType}
                onChange={(e) => setOrgType(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Selecteer type</option>
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </ZorentaFormField>
            <ZorentaFormField label="Omschrijving">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
                placeholder="Korte omschrijving van de organisatie"
              />
            </ZorentaFormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <ZorentaFormField label="Stad">
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </ZorentaFormField>
              <ZorentaFormField label="Regio">
                <Input value={region} onChange={(e) => setRegion(e.target.value)} />
              </ZorentaFormField>
              <ZorentaFormField label="Land">
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </ZorentaFormField>
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
