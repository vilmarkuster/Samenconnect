"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/activity-feed";
import { QuickActions, type QuickAction } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MessageSquare,
  Bot,
  GitBranch,
  FolderKanban,
  Sparkles
} from "lucide-react";

type GeneratedApp = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export default function DashboardPage() {
  const [apps, setApps] = useState<GeneratedApp[]>([]);

  useEffect(() => {
    fetch("/api/generated-apps")
      .then((r) => r.json())
      .then((d) => setApps(Array.isArray(d.apps) ? d.apps : []))
      .catch(() => setApps([]));
  }, []);

  const quickActions: QuickAction[] = [
    { label: "New chat", href: "/chat", icon: <MessageSquare className="h-4 w-4" /> },
    { label: "Agents", href: "/agents", icon: <Bot className="h-4 w-4" /> },
    { label: "Workflows", href: "/workflows", icon: <GitBranch className="h-4 w-4" /> },
    { label: "Generated Apps", href: "/apps", icon: <FolderKanban className="h-4 w-4" /> }
  ];

  const activityItems: ActivityItem[] = [
    {
      id: "1",
      title: "Welcome to AI App Builder",
      description: "Generate full apps from natural language.",
      time: "Just now",
      icon: <Sparkles className="h-4 w-4" />
    },
    ...(apps.length > 0
      ? [
          {
            id: "2",
            title: `${apps.length} generated app${apps.length > 1 ? "s" : ""}`,
            description: "Open from Generated Apps or the cards below.",
            time: "Recent",
            icon: <FolderKanban className="h-4 w-4" />
          } as ActivityItem
        ]
      : [])
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview and quick access to your AI-generated apps and tools."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Generated Apps"
          value={apps.length}
          subtitle="AI-built applications"
          href="/apps"
          actionLabel="View all"
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          title="AI Chat"
          value="Ready"
          subtitle="Build apps with natural language"
          href="/chat"
          actionLabel="Open chat"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          title="Agents"
          value="—"
          subtitle="Manage AI agents"
          href="/agents"
          actionLabel="View"
          icon={<Bot className="h-4 w-4" />}
        />
        <StatCard
          title="Workflows"
          value="—"
          subtitle="Automation workflows"
          href="/workflows"
          actionLabel="View"
          icon={<GitBranch className="h-4 w-4" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <QuickActions title="Quick actions" actions={quickActions} />
        </div>
        <ActivityFeed
          title="Recent activity"
          items={activityItems}
          emptyMessage="No recent activity."
        />
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Generated Apps</h2>
        {apps.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No generated apps yet</CardTitle>
              <CardDescription>
                Use the AI Chat and say e.g. &quot;Build a CRM&quot; or &quot;Build a booking system&quot; to generate an app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/chat">
                <Button className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Open AI Chat
                </Button>
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
                      <CardDescription className="line-clamp-2">{app.description}</CardDescription>
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
      </section>
    </div>
  );
}
