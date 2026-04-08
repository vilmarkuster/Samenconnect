"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { ZorentaFormSection } from "@/components/zorenta/form-section";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { COUNTRIES } from "@/lib/zorenta/countries";
import { readImageFileAsDataUrl, validateAvatarImageFile } from "@/lib/zorenta/read-image-data-url";

type ClientProfile = {
  id: string;
  headline?: string | null;
  care_needs: string | null;
  preferred_location?: string | null;
  phone?: string | null;
  postcode?: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export default function ClientProfileEditPage() {
  const router = useRouter();
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null | "none">(null);
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [careNeeds, setCareNeeds] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
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
        setHeadline(p.headline ?? "");
        setCareNeeds(p.care_needs ?? "");
        setPreferredLocation(p.preferred_location ?? "");
        setPhone(p.phone ?? "");
        setPostcode(p.postcode ?? "");
        setCity(p.city ?? "");
        setRegion(p.region ?? "");
        setCountry(p.country ?? "");
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
      care_needs: careNeeds.trim() || null,
      preferred_location: preferredLocation.trim() || null,
      phone: phone.trim() || null,
      postcode: postcode.trim() || null,
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
        description="Je profiel laat zien wie je bent. Intake en matching blijven apart."
        backHref="/zorenta/profile"
        backLabel="Mijn profiel"
      />
      <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
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

        <ZorentaFormSection title="Profiel" description="Wie je bent en wat je zoekt in een korte, duidelijke intro.">
          <ZorentaFormField label="Naam">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Je naam"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
          <ZorentaFormField
            label="Headline"
            hint="Bijv. Zoekt thuiszorg voor moeder met dementie"
          >
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Bijv. Zoekt thuiszorg voor moeder met dementie"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Over mij" description="Een korte context over jouw situatie.">
          <ZorentaFormField label="Korte omschrijving">
            <Textarea
              value={careNeeds}
              onChange={(e) => setCareNeeds(e.target.value)}
              rows={4}
              placeholder="Vertel kort wat belangrijk is om over jou en je situatie te weten."
              className="resize-none rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection
          title="Voorkeurslocatie"
          description="Optioneel: waar je voorkeur naar uitgaat voor zorg (bijv. buurt of regio)."
        >
          <ZorentaFormField label="Voorkeurslocatie (optioneel)">
            <Input
              value={preferredLocation}
              onChange={(e) => setPreferredLocation(e.target.value)}
              placeholder="Bijv. Amsterdam-Noord of omgeving Utrecht"
              className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
            />
          </ZorentaFormField>
        </ZorentaFormSection>

        <ZorentaFormSection title="Contact" description="Contactgegevens voor snelle afstemming.">
          <div className="grid gap-4 sm:grid-cols-3">
            <ZorentaFormField label="Telefoon">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06..."
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
            <ZorentaFormField label="Postcode (optioneel)">
              <Input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                placeholder="Bijv. 1234 AB"
                className="rounded-lg border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
            </ZorentaFormField>
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

        <ZorentaFormSection title="Account" description="Accountinstellingen voor je login.">
          <div className="grid gap-4 sm:grid-cols-2">
            <ZorentaFormField label="E-mail">
              <Input value={email} readOnly className="rounded-lg border-slate-200 bg-slate-50 text-slate-600" />
            </ZorentaFormField>
            <ZorentaFormField label="Wachtwoord">
              <Button type="button" variant="outline" className="w-full justify-start border-slate-200 text-slate-700">
                Wachtwoord wijzigen (binnenkort)
              </Button>
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
