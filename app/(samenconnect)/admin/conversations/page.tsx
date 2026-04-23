"use client";

import { useEffect, useState } from "react";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertCircle } from "lucide-react";

type ConvoRow = {
  id: string;
  job_id: string | null;
  job_title: string | null;
  participant_1: string;
  participant_2: string;
  participant_1_name: string | null;
  participant_2_name: string | null;
  created_at: string;
  message_count: number;
};

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<ConvoRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataError(null);
    getZorentaAccessToken().then((token) => {
      if (!token) {
        if (!cancelled) {
          setDataError("Geen sessie.");
          setLoading(false);
        }
        return;
      }
      fetch("/api/zorenta/admin/conversations?limit=50", { headers: zorentaHeaders(token) })
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (!r.ok || d.error) {
            setDataError(typeof d.error === "string" ? d.error : `Fout (${r.status})`);
            setConversations([]);
            setTotal(0);
            return;
          }
          setConversations(d.conversations ?? []);
          setTotal(d.total ?? 0);
        })
        .catch(() => {
          if (!cancelled) setDataError("Kon gesprekken niet laden.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Gesprekken</h1>
      <p className="text-sm text-slate-500">
        Overzicht van gesprekken en aantal berichten. Geen inhoud van berichten voor privacy.
      </p>

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {dataError}
        </div>
      )}

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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Deelnemer 1</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Deelnemer 2</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Opdracht</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Berichten</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Gestart</th>
                  </tr>
                </thead>
                <tbody>
                  {!dataError && conversations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                        Geen gesprekken in dit overzicht.
                      </td>
                    </tr>
                  ) : dataError ? null : (
                    conversations.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-700">{c.participant_1_name ?? c.participant_1.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-slate-700">{c.participant_2_name ?? c.participant_2.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-slate-600">{c.job_title ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{c.message_count}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(c.created_at).toLocaleDateString("nl-NL")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          {!loading && total > 0 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              {total} gesprek(ken)
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Support / moderatie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Alleen metadata (deelnemers, aantal berichten). Geen toegang tot berichtinhoud. Support-acties (binnenkort) als placeholder.
          </p>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
