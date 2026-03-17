"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { MessageSquare, Shield } from "lucide-react";

type Convo = {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  other?: { display_name: string | null };
  last_message?: { body: string; created_at: string } | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("nl-NL", { weekday: "short" });
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const startProfileId = searchParams.get("start");
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch("/api/zorenta/conversations", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setConversations(d.conversations ?? []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!startProfileId || starting || loading) return;
    let cancelled = false;
    setStarting(true);
    getZorentaAccessToken().then(async (token) => {
      if (!token) {
        setStarting(false);
        return;
      }
      const res = await fetch("/api/zorenta/conversations", {
        method: "POST",
        headers: zorentaHeaders(token),
        body: JSON.stringify({ other_user_id: startProfileId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!cancelled && data.id) {
        router.replace(`/zorenta/messages/${data.id}`);
        return;
      }
      setStarting(false);
    });
    return () => { cancelled = true; };
  }, [startProfileId, router, loading, starting]);

  if (loading || (startProfileId && starting)) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Berichten"
        description="Je gesprekken met zorgverleners en opdrachtgevers."
      />
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5" />
        Veilig berichten via Zorenta. We delen je gegevens niet zonder toestemming.
      </p>
      {conversations.length === 0 ? (
        <ZorentaEmptyState
          icon={MessageSquare}
          title="Stuur je eerste bericht"
          description="Start een gesprek via een sollicitatie of zoek een zorgverlener en neem contact op."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/zorenta/applications">
                <Button variant="outline">Bekijk sollicitaties</Button>
              </Link>
              <Link href="/zorenta/search">
                <Button>Zorgverleners zoeken</Button>
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <Link key={c.id} href={`/zorenta/messages/${c.id}`}>
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50/80">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-900">
                      {c.other?.display_name || "Gebruiker"}
                    </p>
                    {c.last_message?.created_at && (
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatTime(c.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {c.last_message?.body
                      ? (c.last_message.body.length > 60 ? c.last_message.body.slice(0, 60) + "…" : c.last_message.body)
                      : "Geen berichten"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </ZorentaPageContainer>
  );
}
