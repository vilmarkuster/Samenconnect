"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

type AppRow = {
  id: string;
  job_id: string;
  applicant_id: string;
  status: string;
  message: string | null;
  created_at: string;
  job: { title: string; poster_id: string } | null;
  applicant: { display_name: string | null } | null;
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "50");
      fetch(`/api/zorenta/admin/applications?${params}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && !d.error) {
            setApplications(d.applications ?? []);
            setTotal(d.total ?? 0);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
  }, [status]);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Sollicitaties</h1>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="shortlisted">Shortlist</option>
            <option value="accepted">Geaccepteerd</option>
            <option value="rejected">Afgewezen</option>
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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Opdracht</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Sollicitant</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/jobs/${a.job_id}`} className="font-medium text-slate-900 hover:underline">
                          {a.job?.title ?? a.job_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${a.applicant_id}`} className="text-slate-700 hover:underline">
                          {a.applicant?.display_name ?? a.applicant_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{a.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(a.created_at).toLocaleDateString("nl-NL")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {total} sollicitatie(s)
            </p>
          )}
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
