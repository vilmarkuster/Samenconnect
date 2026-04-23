"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, AlertCircle } from "lucide-react";

type ReviewRow = {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  job_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null } | null;
  reviewee: { display_name: string | null } | null;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState("");
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
      const params = new URLSearchParams();
      if (rating) params.set("rating", rating);
      params.set("limit", "50");
      fetch(`/api/zorenta/admin/reviews?${params}`, { headers: zorentaHeaders(token) })
        .then(async (res) => {
          const d = await res.json().catch(() => ({}));
          if (cancelled) return;
          if (!res.ok || d.error) {
            setDataError(typeof d.error === "string" ? d.error : `Fout (${res.status})`);
            setReviews([]);
            setTotal(0);
            return;
          }
          setReviews(d.reviews ?? []);
          setTotal(d.total ?? 0);
        })
        .catch(() => {
          if (!cancelled) setDataError("Kon reviews niet laden.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
  }, [rating]);

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reviews</h1>

      {dataError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {dataError}
        </div>
      )}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter op rating</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Alle</option>
            <option value="5">5 sterren</option>
            <option value="4">4 sterren</option>
            <option value="3">3 sterren</option>
            <option value="2">2 sterren</option>
            <option value="1">1 sterren</option>
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
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Rating</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Beoordelaar</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Zorgverlener</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Datum</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-600">Moderatie</th>
                  </tr>
                </thead>
                <tbody>
                  {!dataError && reviews.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                        Geen reviews in dit overzicht.
                      </td>
                    </tr>
                  ) : dataError ? null : (
                    reviews.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {row.rating}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${row.reviewer_id}`} className="text-slate-700 hover:underline">
                            {row.reviewer?.display_name ?? row.reviewer_id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/admin/users/${row.reviewee_id}`} className="text-slate-700 hover:underline">
                            {row.reviewee?.display_name ?? row.reviewee_id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {new Date(row.created_at).toLocaleDateString("nl-NL")}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" disabled className="text-xs">
                            Flag/verwijder (binnenkort)
                          </Button>
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
              {total} review(s)
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-amber-800">
            <AlertCircle className="h-4 w-4" />
            Moderatie (placeholders)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Flag of verwijder review komt later. Alleen leeszicht voor nu.
          </p>
        </CardContent>
      </Card>
    </ZorentaPageContainer>
  );
}
