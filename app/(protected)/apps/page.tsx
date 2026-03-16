"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban } from "lucide-react";

type GeneratedApp = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export default function GeneratedAppsPage() {
  const [apps, setApps] = useState<GeneratedApp[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/generated-apps")
      .then((r) => r.json())
      .then((d) => setApps(Array.isArray(d.apps) ? d.apps : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generated Apps"
        description="Apps created by the AI App Builder. Open any app to view and edit."
      />
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Loading…
          </CardContent>
        </Card>
      ) : apps.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <FolderKanban className="h-5 w-5 text-slate-500" />
              </span>
              <div>
                <CardTitle>No generated apps yet</CardTitle>
                <CardDescription>
                  Use AI Chat and say e.g. &quot;Build a CRM&quot; or &quot;Build a booking system&quot; to generate an app.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link href="/chat">
              <Button>Open AI Chat</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Link key={app.id} href={`/generated-apps/${app.slug}`}>
              <Card className="h-full transition-shadow hover:shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{app.name}</CardTitle>
                  {app.description && (
                    <CardDescription className="line-clamp-2">
                      {app.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" size="sm" className="text-primary-600">
                    Open app →
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
