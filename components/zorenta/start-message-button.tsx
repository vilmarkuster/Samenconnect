"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

type StartMessageButtonProps = {
  otherUserId: string;
  jobId?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "ghost";
  label?: string;
};

export function StartMessageButton({
  otherUserId,
  jobId,
  size = "md",
  variant = "primary",
  label = "Stuur bericht",
}: StartMessageButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const token = await getZorentaAccessToken();
      if (!token) {
        setError("Je moet ingelogd zijn om een bericht te sturen.");
        return;
      }

      const body: Record<string, unknown> = { other_user_id: otherUserId };
      if (jobId) body.job_id = jobId;

      const res = await fetch("/api/zorenta/conversations", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.id) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Bericht starten is niet gelukt. Probeer het later opnieuw."
        );
        return;
      }

      router.push(`/zorenta/messages/${data.id}`);
    } catch {
      setError("Er ging iets mis bij het starten van een gesprek.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={handleClick}
        disabled={loading}
        className="gap-1.5"
      >
        <MessageSquare className="h-4 w-4" />
        {loading ? "Bezig…" : label}
      </Button>
      {error && (
        <p className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

