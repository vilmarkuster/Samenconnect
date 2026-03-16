"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { CaregiverCard } from "@/components/caregiver/CaregiverCard";
import { Search, Briefcase, User, Filter, SlidersHorizontal } from "lucide-react";

type Caregiver = {
  id: string;
  profile_id: string;
  headline: string | null;
  city: string | null;
  region?: string | null;
  skills: string[];
  experience_years?: number | null;
  hourly_rate?: number | null;
  availability?: string | null;
  profile?: { display_name: string | null };
  average_rating?: number | null;
};

type Job = {
  id: string;
  title: string;
  city: string | null;
  care_type: string | null;
  status: string;
};

const CARE_TYPES = ["", "Thuiszorg", "Verpleeghuis", "Gehandicaptenzorg", "Dementiezorg", "Palliatieve zorg", "Kraamzorg", "Overig"];
const AVAILABILITY_OPTIONS = ["", "Fulltime", "Parttime", "Flexibel", "Per diem", "Overig"];
const RATING_OPTIONS = ["", "1", "2", "3", "4", "5"];

export default function SearchPage() {
  const [tab, setTab] = useState<"caregivers" | "jobs">("caregivers");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [careType, setCareType] = useState("");
  const [skills, setSkills] = useState("");
  const [availability, setAvailability] = useState("");
  const [minRating, setMinRating] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [maxHourlyRate, setMaxHourlyRate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [caregiverSort, setCaregiverSort] = useState<"relevance" | "rating" | "experience" | "rate">("relevance");

  const searchCaregivers = useCallback(async () => {
    setLoading(true);
    const token = await getZorentaAccessToken();
    const params = new URLSearchParams();
    params.set("type", "caregivers");
    if (city.trim()) params.set("city", city.trim());
    if (region.trim()) params.set("region", region.trim());
    if (careType.trim()) params.set("care_type", careType.trim());
    if (skills.trim()) params.set("skills", skills.trim().replace(/\s*,\s*/g, ","));
    if (availability) params.set("availability", availability);
    if (minRating) params.set("min_rating", minRating);
    if (minExperience.trim()) params.set("min_experience", minExperience.trim());
    if (maxHourlyRate.trim()) params.set("max_hourly_rate", maxHourlyRate.trim());
    try {
      const res = await fetch(`/api/zorenta/search?${params}`, {
        headers: zorentaHeaders(token),
      });
      const d = await res.json().catch(() => ({}));
      const list = d.caregivers ?? [];
      setCaregivers(list);
    } finally {
      setLoading(false);
    }
  }, [city, region, careType, skills, availability, minRating, minExperience, maxHourlyRate]);

  const sortedCaregivers = [...caregivers].sort((a, b) => {
    if (caregiverSort === "rating") {
      const ra = a.average_rating ?? 0;
      const rb = b.average_rating ?? 0;
      return rb - ra;
    }
    if (caregiverSort === "experience") {
      const ea = a.experience_years ?? 0;
      const eb = b.experience_years ?? 0;
      return eb - ea;
    }
    if (caregiverSort === "rate") {
      const ra = a.hourly_rate ?? 0;
      const rb = b.hourly_rate ?? 0;
      return ra - rb;
    }
    return 0;
  });

  const searchJobs = useCallback(async () => {
    setLoading(true);
    const token = await getZorentaAccessToken();
    const params = new URLSearchParams();
    params.set("type", "jobs");
    if (city.trim()) params.set("city", city.trim());
    if (careType.trim()) params.set("care_type", careType.trim());
    try {
      const res = await fetch(`/api/zorenta/search?${params}`, {
        headers: zorentaHeaders(token),
      });
      const d = await res.json().catch(() => ({}));
      setJobs(d.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, [city, careType]);

  const handleSearch = () => {
    if (tab === "caregivers") searchCaregivers();
    else searchJobs();
  };

  const hasSearchedCaregivers = caregivers.length > 0 || (tab === "caregivers" && (city || region || careType || skills || availability || minRating || minExperience || maxHourlyRate));
  const hasSearchedJobs = jobs.length > 0 || (tab === "jobs" && (city || careType));
  const emptyCaregivers = tab === "caregivers" && !loading && hasSearchedCaregivers && caregivers.length === 0;
  const emptyJobs = tab === "jobs" && !loading && hasSearchedJobs && jobs.length === 0;

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <ZorentaPageHeader
        title="Zorgverleners zoeken"
        description="Zoek op plaats, vaardigheden, beschikbaarheid en tarief."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "caregivers" | "jobs")}>
        <TabsList className="bg-slate-100 p-1">
          <TabsTrigger value="caregivers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Zorgverleners
          </TabsTrigger>
          <TabsTrigger value="jobs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Vacatures
          </TabsTrigger>
        </TabsList>

        {/* Caregiver filters */}
        {tab === "caregivers" && (
          <Card className="mt-4 overflow-hidden border-slate-200">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="flex w-full items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 sm:rounded-t-lg"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </span>
              <span className="text-slate-500">{showFilters ? "Verbergen" : "Tonen"}</span>
            </button>
            {showFilters && (
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Plaats (stad)</label>
                  <Input
                    placeholder="bijv. Amsterdam"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Regio</label>
                  <Input
                    placeholder="bijv. Noord-Holland"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Type zorg / specialisatie</label>
                  <select
                    value={careType}
                    onChange={(e) => setCareType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {CARE_TYPES.map((t) => (
                      <option key={t || "any"} value={t}>{t || "Alle"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Vaardigheden (komma)</label>
                  <Input
                    placeholder="bijv. Dementiezorg, VOG"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Beschikbaarheid</label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <option key={o || "any"} value={o}>{o || "Alle"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Min. rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {RATING_OPTIONS.map((r) => (
                      <option key={r || "any"} value={r}>{r ? `★ ${r}+` : "Alle"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Min. jaren ervaring</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-lg border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Max. uurtarief (€)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="bijv. 35"
                    value={maxHourlyRate}
                    onChange={(e) => setMaxHourlyRate(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-lg border-slate-200 bg-white"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Job filters (simple) */}
        {tab === "jobs" && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input
              placeholder="Plaats (stad)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-40 rounded-lg bg-white"
            />
            <select
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {CARE_TYPES.map((t) => (
                <option key={t || "any"} value={t}>{t || "Type zorg"}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            <Search className="h-4 w-4" />
            {loading ? "Zoeken…" : "Zoeken"}
          </Button>
          {tab === "caregivers" && caregivers.length > 0 && (
            <select
              value={caregiverSort}
              onChange={(e) => setCaregiverSort(e.target.value as typeof caregiverSort)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="relevance">Sorteren: relevantie</option>
              <option value="rating">Sorteren: rating</option>
              <option value="experience">Sorteren: ervaring</option>
              <option value="rate">Sorteren: uurtarief</option>
            </select>
          )}
          {tab === "caregivers" && (
            <Link href="/zorenta/jobs">
              <Button variant="outline" size="sm">
                <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                Vacatures bekijken
              </Button>
            </Link>
          )}
        </div>

        <TabsContent value="caregivers" className="mt-6">
          {emptyCaregivers ? (
            <ZorentaEmptyState
              icon={User}
              title="Geen zorgverleners gevonden"
              description="Pas je filters aan of zoek op een andere plaats."
            />
          ) : !hasSearchedCaregivers && !loading ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-sm text-slate-500">
              Gebruik de filters en klik op Zoeken om zorgverleners te vinden.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCaregivers.map((c) => (
                <CaregiverCard
                  key={c.id}
                  profileId={c.profile_id}
                  name={c.profile?.display_name || "Zorgverlener"}
                  headline={c.headline}
                  experienceYears={c.experience_years}
                  skills={Array.isArray(c.skills) ? c.skills : []}
                  rating={c.average_rating}
                  hourlyRate={c.hourly_rate}
                  location={c.city}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="mt-6">
          {emptyJobs ? (
            <ZorentaEmptyState
              icon={Briefcase}
              title="Geen vacatures gevonden"
              description="Probeer een andere plaats of bekijk alle vacatures."
              action={
                <Link href="/zorenta/jobs">
                  <Button variant="outline">Alle vacatures</Button>
                </Link>
              }
            />
          ) : !hasSearchedJobs && !loading ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center text-sm text-slate-500">
              Voer een zoekopdracht in of bekijk vacatures.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <Link key={job.id} href={`/zorenta/jobs/${job.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{job.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600">
                        {job.city && `${job.city}`}
                        {job.care_type && ` • ${job.care_type}`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ZorentaPageContainer>
  );
}
