"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase-client";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, Sparkles, MapPin, Euro } from "lucide-react";

type SavedProviderRow = { provider_id: string };

type CaregiverRow = {
  id: string;
  name: string;
  location: string;
  provider_type?: string | null;
  profile_id?: string | null;
  prijs?: number | null;
  zorgtype?: string[] | null;
  specialisaties?: string[] | null;
  vaardigheden?: string[] | null;
};

type ProfileRow = { id: string; display_name: string | null; role: string | null };
type CaregiverProfileRow = {
  profile_id: string;
  city: string | null;
  headline: string | null;
  hourly_rate: number | null;
  skills: string[] | null;
};
type OrganizationProfileRow = {
  profile_id: string;
  name: string;
  city: string | null;
};

function buildSavedProviderRows(
  orderedProfileIds: string[],
  profiles: ProfileRow[],
  caregiverProfiles: CaregiverProfileRow[],
  organizationProfiles: OrganizationProfileRow[]
): CaregiverRow[] {
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const cgByProfileId = new Map(caregiverProfiles.map((c) => [c.profile_id, c]));
  const orgByProfileId = new Map(organizationProfiles.map((o) => [o.profile_id, o]));

  const rows: CaregiverRow[] = [];
  for (const id of orderedProfileIds) {
    const prof = profileById.get(id);
    const cg = cgByProfileId.get(id);
    const org = orgByProfileId.get(id);

    if (cg) {
      rows.push({
        id,
        name: (prof?.display_name?.trim() || cg.headline?.trim() || "Zorgverlener") as string,
        location: cg.city?.trim() || "",
        provider_type: "zzp",
        profile_id: id,
        prijs: cg.hourly_rate != null ? Number(cg.hourly_rate) : null,
        zorgtype: null,
        specialisaties: null,
        vaardigheden: Array.isArray(cg.skills) ? cg.skills : null,
      });
      continue;
    }

    if (org) {
      rows.push({
        id,
        name: org.name?.trim() || prof?.display_name?.trim() || "Organisatie",
        location: org.city?.trim() || "",
        provider_type: "organisatie",
        profile_id: id,
        prijs: null,
        zorgtype: null,
        specialisaties: null,
        vaardigheden: null,
      });
      continue;
    }

    if (prof) {
      const isOrg = prof.role === "organization";
      rows.push({
        id,
        name: prof.display_name?.trim() || (isOrg ? "Organisatie" : "Zorgverlener"),
        location: "",
        provider_type: isOrg ? "organisatie" : "zzp",
        profile_id: id,
        prijs: null,
        zorgtype: null,
        specialisaties: null,
        vaardigheden: null,
      });
    }
  }
  return rows;
}

export default function OpgeslagenPage() {
  const [loading, setLoading] = useState(true);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [providers, setProviders] = useState<CaregiverRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = getSupabaseClient();
        const { data: savedRows, error: savedErr } = await supabase
          .from("saved_providers")
          .select("provider_id")
          .order("created_at", { ascending: false });

        if (savedErr) throw savedErr;

        const ids = (savedRows ?? []).map((r: SavedProviderRow) => String(r.provider_id));
        if (ids.length === 0) {
          if (!cancelled) {
            setProviderIds([]);
            setProviders([]);
            setLoading(false);
          }
          return;
        }

        // provider_id matches matches UI: platform profile id (profiles.id), not legacy public.caregivers.
        const [{ data: profRows, error: profErr }, { data: cgRows, error: cgErr }, { data: orgRows, error: orgErr }] =
          await Promise.all([
            supabase.from("profiles").select("id, display_name, role").in("id", ids),
            supabase
              .from("caregiver_profiles")
              .select("profile_id, city, headline, hourly_rate, skills")
              .in("profile_id", ids),
            supabase.from("organization_profiles").select("profile_id, name, city").in("profile_id", ids),
          ]);

        if (profErr) throw profErr;
        if (cgErr) throw cgErr;
        // Other users' organization_profiles are often not readable under RLS; fall back to profiles only.
        const orgSafe = !orgErr && orgRows ? (orgRows as OrganizationProfileRow[]) : [];

        const ordered = buildSavedProviderRows(
          ids,
          (profRows ?? []) as ProfileRow[],
          (cgRows ?? []) as CaregiverProfileRow[],
          orgSafe
        );

        if (!cancelled) {
          setProviderIds(ids);
          setProviders(ordered);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load saved providers.");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSaved = async (providerId: string) => {
    setTogglingId(providerId);
    // optimistic remove
    setProviders((prev) => prev.filter((p) => p.id !== providerId));
    setProviderIds((prev) => prev.filter((id) => id !== providerId));

    try {
      const token = await getZorentaAccessToken();
      const res = await fetch("/api/zorenta/saved-providers/toggle", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ providerId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data?.status !== "added" && data?.status !== "removed")) {
        throw new Error(typeof data?.error === "string" ? data.error : "Toggle failed.");
      }
    } catch {
      // rollback: best effort
      window.location.reload();
    } finally {
      setTogglingId(null);
    }
  };

  const empty = !loading && providers.length === 0;

  if (loading) {
    return (
      <PageContainer maxWidth="wide" className="space-y-6 py-8">
        <ZorentaPageHeader
          title="Opgeslagen"
          description="Je opgeslagen zorgverleners worden geladen…"
          backHref="/matches"
          backLabel="Matches"
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="wide" className="space-y-6 py-8">
      <ZorentaPageHeader
        title="Opgeslagen"
        description="Je opgeslagen zorgverleners."
        backHref="/matches"
        backLabel="Matches"
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {empty ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="font-medium text-slate-800">Nog niets opgeslagen</p>
          <p className="mt-1 text-sm text-slate-500">Gebruik de Opslaan knop op matches om zorgverleners terug te vinden.</p>
          <div className="mt-4">
            <Link href="/matches">
              <Button variant="outline">Naar matches</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((cg) => {
            const providerType = (cg.provider_type ?? "zzp").toLowerCase();
            const roleLabel =
              providerType === "organisatie" ? "Organisatie" : "Zorgverlener";
            const volunteer = providerType === "vrijwilliger";

            return (
              <Card key={cg.id} className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">
                        {cg.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge className="rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">
                          {roleLabel}
                        </Badge>
                        {cg.profile_id ? (
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[11px] text-slate-600">
                            Gekoppeld
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-[11px] text-slate-600">
                            Marketplace
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-slate-200 text-xs"
                      disabled={togglingId === cg.id}
                      onClick={() => toggleSaved(cg.id)}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      {togglingId === cg.id ? "…" : "Opslaan"}
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    {cg.location || "Locatie onbekend"}
                  </div>

                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                    <Euro className="h-4 w-4 text-[#40ADA8]" />
                    {volunteer ? "Vrijwillig / onbetaald" : cg.prijs ? `€${cg.prijs} per uur` : "In overleg"}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/profielen/${cg.id}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Bekijk profiel
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

