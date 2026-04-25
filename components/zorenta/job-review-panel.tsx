"use client";

import { useEffect, useState } from "react";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  jobId: string;
  reviewerProfileId: string;
  /** Profile id of the person you are reviewing */
  revieweeId: string | null;
  /** When false, panel is hidden */
  canReview: boolean;
};

export function JobReviewPanel({ jobId, reviewerProfileId, revieweeId, canReview }: Props) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<{ rating: number; comment: string | null } | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canReview || !revieweeId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const token = await getZorentaAccessToken();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/zorenta/reviews?reviewee_id=${encodeURIComponent(revieweeId)}&job_id=${encodeURIComponent(jobId)}&reviewer_id=${encodeURIComponent(reviewerProfileId)}`,
        { headers: zorentaHeaders(token) }
      );
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setExisting(null);
        setLoading(false);
        return;
      }
      const rows = Array.isArray(data.reviews) ? data.reviews : [];
      const mine = rows[0] as { rating?: number; comment?: string | null } | undefined;
      if (mine && typeof mine.rating === "number") {
        setExisting({ rating: mine.rating, comment: mine.comment ?? null });
        setDone(true);
      } else {
        setExisting(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [canReview, revieweeId, jobId, reviewerProfileId]);

  if (!canReview) return null;

  if (!revieweeId) {
    return (
      <Card className="rounded-2xl border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Er is geen geaccepteerde match om te beoordelen voor deze afgeronde opdracht.
          </p>
        </CardContent>
      </Card>
    );
  }

  async function submit() {
    setSaving(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setError("Log in om een review te plaatsen.");
      setSaving(false);
      return;
    }
    const res = await fetch("/api/zorenta/reviews", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({
        job_id: jobId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Opslaan mislukt.");
      return;
    }
    setDone(true);
    setExisting({ rating, comment: comment.trim() || null });
  }

  if (loading) {
    return (
      <Card className="rounded-2xl border-slate-200">
        <CardContent className="py-6 text-sm text-slate-500">Review laden…</CardContent>
      </Card>
    );
  }

  if (done && existing) {
    return (
      <Card className="rounded-2xl border-emerald-100 bg-emerald-50/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-emerald-900">Jouw review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-emerald-900">
          <p>
            <span className="font-semibold">{existing.rating}</span> van 5 sterren
          </p>
          {existing.comment ? <p className="text-emerald-800">{existing.comment}</p> : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Beoordeel deze samenwerking</CardTitle>
        <p className="text-sm text-slate-500">
          Eén review per opdracht. Alleen zichtbaar na een afgeronde opdracht.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Score (1–5)</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Toelichting (optioneel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
            placeholder="Kort en respectvol…"
          />
        </div>
        <Button
          type="button"
          className="bg-[#40ada8] text-white hover:bg-[#369e9a]"
          disabled={saving}
          onClick={() => void submit()}
        >
          {saving ? "Opslaan…" : "Review plaatsen"}
        </Button>
      </CardContent>
    </Card>
  );
}
