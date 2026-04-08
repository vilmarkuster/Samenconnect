"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";

type Props = {
  posterId: string;
  applicationId: string;
  jobId: string;
  introBody: string | null;
  className?: string;
};

/**
 * Legacy sollicitaties zonder gekoppelde conversation: find-or-create via API en optioneel eerste bericht.
 */
export function CaregiverApplicationThreadButton({
  posterId,
  applicationId,
  jobId,
  introBody,
  className,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setLoading(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setLoading(false);
      setError("Log in om een gesprek te openen.");
      return;
    }
    const res = await fetch("/api/zorenta/conversations", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({
        other_user_id: posterId,
        application_id: applicationId,
        job_id: jobId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.id) {
      setLoading(false);
      setError(typeof data?.error === "string" ? data.error : "Gesprek starten is mislukt.");
      return;
    }
    const intro = (introBody ?? "").trim();
    if (data.created === true && intro) {
      await fetch("/api/zorenta/messages", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ conversation_id: data.id, body: intro }),
      });
    }
    setLoading(false);
    router.push(`/zorenta/berichten?conversation=${encodeURIComponent(data.id)}`);
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="sm"
        className={className ?? "bg-[#40ADA8] text-white hover:bg-[#369e9a]"}
        onClick={go}
        disabled={loading}
      >
        {loading ? "…" : "Open gesprek"}
      </Button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
