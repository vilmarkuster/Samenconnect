"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { ZorentaPageContainer } from "@/components/zorenta/page-container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  UserCircle,
  Building2,
  Briefcase,
  FileText,
  MessageSquare,
  Star,
  Bell,
  CreditCard,
  LayoutDashboard,
} from "lucide-react";

type Stats = {
  totalUsers: number;
  caregivers: number;
  clients: number;
  organizations: number;
  totalJobs: number;
  openJobs: number;
  totalApplications: number;
  totalConversations: number;
  totalMessages: number;
  totalReviews: number;
  unreadNotifications: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken()
      .then((token) => {
        if (!token) {
          if (!cancelled) setError("Geen Zorenta-sessie gevonden.");
          setLoading(false);
          return null;
        }
        return fetch("/api/zorenta/admin/dashboard", { headers: zorentaHeaders(token) });
      })
      .then((res) => {
        if (res === null || cancelled) return null;
        return res.json();
      })
      .then((d) => {
        if (cancelled || !d) return;
        if (d.error) {
          setError(typeof d.error === "string" ? d.error : "Kon admin-statistieken niet laden.");
        } else {
          setStats(d);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Kon admin-statistieken niet laden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const s: Stats = stats ?? {
    totalUsers: 0,
    caregivers: 0,
    clients: 0,
    organizations: 0,
    totalJobs: 0,
    openJobs: 0,
    totalApplications: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalReviews: 0,
    unreadNotifications: 0,
  };

  const cards = [
    { title: "Gebruikers", value: s.totalUsers, icon: Users, href: "/zorenta/admin/users" },
    { title: "Zorgverleners", value: s.caregivers, icon: UserCircle, href: "/zorenta/admin/users?role=caregiver" },
    { title: "Opdrachtgevers", value: s.clients, icon: UserCircle, href: "/zorenta/admin/users?role=client" },
    { title: "Organisaties", value: s.organizations, icon: Building2, href: "/zorenta/admin/users?role=organization" },
    { title: "Vacatures", value: s.totalJobs, icon: Briefcase, href: "/zorenta/admin/jobs", subtitle: `${s.openJobs} open` },
    { title: "Sollicitaties", value: s.totalApplications, icon: FileText, href: "/zorenta/admin/applications" },
    {
      title: "Gesprekken",
      value: s.totalConversations,
      icon: MessageSquare,
      href: "/zorenta/admin/conversations",
      subtitle: `${s.totalMessages} berichten`,
    },
    { title: "Reviews", value: s.totalReviews, icon: Star, href: "/zorenta/admin/reviews" },
    { title: "Ongelezen notificaties", value: s.unreadNotifications, icon: Bell, subtitle: "Placeholder" },
  ];

  return (
    <ZorentaPageContainer maxWidth="wide" className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-8 w-8 text-slate-600" />
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Admin dashboard
        </h1>
      </div>
      <p className="text-sm text-slate-600">
        Overzicht van de Zorenta-marktplaats voor interne admins.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ title, value, icon: Icon, href, subtitle }) => (
              <Link key={title} href={href ?? "#"}>
                <Card className="h-full border-slate-200 transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <span className="text-sm font-medium text-slate-500">{title}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-slate-900">{value}</p>
                    {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-slate-500" />
                Facturatie / abonnementen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Bekijk welke gebruikers welk plan hebben en of er Stripe-klanten gekoppeld zijn.
              </p>
              <Link
                href="/zorenta/admin/billing"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Naar facturatie-overzicht
                <span aria-hidden>→</span>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </ZorentaPageContainer>
  );
}
