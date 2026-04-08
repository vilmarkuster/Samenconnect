"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Briefcase, Search } from "lucide-react";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";

type JobRow = {
  id: string;
  poster_id: string;
  poster_type: string;
  title: string;
  city: string | null;
  care_type: string | null;
  status: string;
  created_at: string;
  featured_until: string | null;
  poster: { display_name: string | null } | null;
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [careType, setCareType] = useState("");

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (title) params.set("title", title);
      if (city) params.set("city", city);
      if (careType) params.set("care_type", careType);
      params.set("limit", "50");
      fetch(`/api/zorenta/admin/jobs?${params}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && !d.error) {
            setJobs(d.jobs ?? []);
            setTotal(d.total ?? 0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
  }, [status, title, city, careType]);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Opdrachten</h1>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 min-w-[200px] flex-1">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Titel…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="min-w-[180px]">
            <CityAutocomplete
              value={city}
              onChange={setCity}
              placeholder="Plaats (stad)…"
            />
          </div>
          <div>
            <Input
              placeholder="Type zorg…"
              value={careType}
              onChange={(e) => setCareType(e.target.value)}
              className="min-w-[160px]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Alle statussen</option>
            <option value="open">Open</option>
            <option value="closed">Gesloten</option>
            <option value="filled">Vervuld</option>
          </select>
        </CardContent>
      </Card>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Titel</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Plaats</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Poster</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Uitgelicht</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{j.title}</td>
                      <td className="px-4 py-3 text-slate-600">{j.city ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{j.care_type ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge variant={j.status === "open" ? "default" : "outline"} className="text-xs">
                          {j.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{j.poster?.display_name ?? j.poster_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-600">{j.featured_until ? "Ja" : "—"}</td>
                      <td className="px-4 py-3">
                        <Link href={`/zorenta/admin/jobs/${j.id}`}>
                          <Button variant="ghost" size="sm">Details</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {total} opdracht(en)
            </p>
          )}
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
