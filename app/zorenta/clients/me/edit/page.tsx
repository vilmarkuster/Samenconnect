"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";

type ClientProfile = {
  id: string;
  care_needs: string | null;
  preferred_location: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export default function ClientProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null | "none">(null);
  const [careNeeds, setCareNeeds] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
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
      const res = await fetch("/api/zorenta/clients/me", { headers: zorentaHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setProfile("none");
        return;
      }
      const p = data.profile as ClientProfile | null;
      setProfile(p ?? "none");
      if (p) {
        setCareNeeds(p.care_needs ?? "");
        setPreferredLocation(p.preferred_location ?? "");
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
    const body = {
      care_needs: careNeeds.trim() || null,
      preferred_location: preferredLocation.trim() || null,
      city: city.trim() || null,
      region: region.trim() || null,
      country: country.trim() || null,
    };
    const isUpdate = profile && profile !== "none";
    const res = await fetch("/api/zorenta/clients/me", {
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
      <PageContainer maxWidth="narrow" className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="narrow" className="space-y-6">
      <ZorentaPageHeader
        title={profile === "none" ? "Profiel aanmaken" : "Profiel bewerken"}
        description="Zorgbehoefte en locatie helpen zorgverleners om bij je te passen."
        backHref="/zorenta/dashboard"
        backLabel="Dashboard"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ZorentaFormSection
          title="Zorgbehoefte"
          description="Beschrijf wat voor zorg je zoekt"
        >
          <ZorentaFormField label="Zorgbehoefte" hint="Type zorg, frequentie, bijzonderheden">
            <Textarea
              value={careNeeds}
              onChange={(e) => setCareNeeds(e.target.value)}
              rows={3}
              placeholder="Beschrijf de zorg die je zoekt"
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField label="Voorkeurslocatie" hint="bijv. Thuis, specifiek gebied">
            <Input
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="bijv. Thuis, specifiek gebied"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Locatie" description="Waar zoek je zorg?">
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Stad">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Regio">
              <Input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Land">
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
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
        <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-6">
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
