"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";

type UserRow = {
  id: string;
  display_name: string | null;
  role: string;
  created_at: string;
  plan_slug?: string | null;
  stripe_customer_id?: string | null;
  jobsCount: number;
  applicationsCount: number;
};

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [role, setRole] = useState(searchParams.get("role") || "");
  const [q, setQ] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setRole(searchParams.get("role") || "");
    setQ(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    setDataError(null);
    getZorentaAccessToken()
      .then((token) => {
        if (!token) {
          if (!cancelled) setDataError("No session");
          setLoading(false);
          return null;
        }
        const params = new URLSearchParams();
        if (role) params.set("role", role);
        if (q) params.set("q", q);
        params.set("limit", "50");
        return fetch(`/api/zorenta/admin/users?${params}`, { headers: zorentaHeaders(token) });
      })
      .then((r) => (r === null ? null : r.json()))
      .then((d) => {
        if (cancelled) return;
        if (d?.error) setDataError(d.error);
        else if (d) {
          setUsers(d.users ?? []);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => {
        if (!cancelled) setDataError("Admin data failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, q]);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Gebruikers</h1>
      </div>
      {dataError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {dataError}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Zoek op naam…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Alle rollen</option>
            <option value="caregiver">Zorgverlener</option>
            <option value="client">Opdrachtgever</option>
            <option value="organization">Organisatie</option>
            <option value="admin">Admin</option>
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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Naam</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rol</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Opdrachten</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Sollicitaties</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {u.display_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{u.plan_slug ?? "free"}</td>
                      <td className="px-4 py-3 text-slate-600">{u.jobsCount}</td>
                      <td className="px-4 py-3 text-slate-600">{u.applicationsCount}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${u.id}`}>
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
              {total} gebruiker(s)
            </p>
          )}
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
