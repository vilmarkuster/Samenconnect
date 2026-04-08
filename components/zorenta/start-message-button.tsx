"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken } from "@/lib/zorenta/client";
import { createZorentaConversation } from "@/lib/zorenta/create-zorenta-conversation";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type StartMessageButtonProps = {
  otherUserId: string;
  jobId?: string | null;
  /** Draft text for the inbox composer (URL `prefill`); no auto-send. */
  prefill?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "ghost";
  label?: string;
};

export function StartMessageButton({
  otherUserId,
  jobId,
  prefill,
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

      const result = await createZorentaConversation(token, {
        otherUserId,
        jobId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Canonical inbox + thread (DB-backed, ?conversation= survives refresh).
      const q = new URLSearchParams();
      q.set("conversation", result.conversationId);
      if (prefill && prefill.trim()) {
        q.set("prefill", prefill.trim());
      }
      router.push(`/zorenta/berichten?${q.toString()}`);
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
        className={cn(
          "gap-1.5",
          variant === "primary" && "bg-[#40ADA8] text-white hover:bg-[#369e9a]"
        )}
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

