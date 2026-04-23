"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { normalizeNotificationLink } from "@/lib/zorenta/normalize-notification-link";
import { Button } from "@/components/ui/button";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaEmptyState } from "@/components/zorenta/empty-state";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { Bell } from "lucide-react";

type Notif = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch("/api/zorenta/notifications", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setNotifications(d.notifications ?? []);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, []);

  async function markRead(id: string) {
    const token = await getZorentaAccessToken();
    if (!token) return;
    await fetch("/api/zorenta/notifications", {
      method: "PATCH",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    // Optimistically decrement unread bell count in the header.
    window.dispatchEvent(
      new CustomEvent("zorenta:notifications:unreadDelta", { detail: { delta: -1 } })
    );
  }

  if (loading) {
    return (
      <ZorentaPageContainer maxWidth="default" className="space-y-6">
        <ZorentaPageSkeleton />
      </ZorentaPageContainer>
    );
  }

  return (
    <ZorentaPageContainer maxWidth="default" className="space-y-6">
      <ZorentaPageHeader
        title="Notificaties"
        description="Blijf op de hoogte van sollicitaties, berichten en updates."
      />
      {notifications.length === 0 ? (
        <ZorentaEmptyState
          icon={Bell}
          title="Geen notificaties"
          description="Je ontvangt hier meldingen over sollicitaties, berichten en meer."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const actionHref = normalizeNotificationLink(n.link);
            return (
            <div
              key={n.id}
              className={`rounded-xl border bg-white p-4 transition-shadow ${
                n.read_at
                  ? "border-slate-200/80 opacity-75"
                  : "border-slate-200 bg-slate-50/30 shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{n.title || n.type}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {actionHref && (
                    <Link href={actionHref}>
                      <Button variant="outline" size="sm">
                        Bekijken
                      </Button>
                    </Link>
                  )}
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      Als gelezen markeren
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </ZorentaPageContainer>
  );
}
