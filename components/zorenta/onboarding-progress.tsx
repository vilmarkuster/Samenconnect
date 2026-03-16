"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingProgressProps = {
  role: string;
  hasRoleProfile: boolean;
  openJobsCount?: number;
  applicationsCount?: number;
  myJobsCount?: number;
  intakesCount?: number;
  conversationsCount?: number;
  jobMatchesCount?: number;
  recentApplicationsCount?: number;
};

export function OnboardingProgress({
  role,
  hasRoleProfile,
  openJobsCount = 0,
  applicationsCount = 0,
  myJobsCount = 0,
  intakesCount = 0,
  conversationsCount = 0,
  jobMatchesCount = 0,
  recentApplicationsCount = 0,
}: OnboardingProgressProps) {
  const profileEditHref =
    role === "caregiver"
      ? "/zorenta/caregivers/me/edit"
      : role === "client"
        ? "/zorenta/clients/me/edit"
        : "/zorenta/organizations/me/edit";

  const steps =
    role === "caregiver"
      ? [
          { done: hasRoleProfile, label: "Profiel compleet" },
          { done: jobMatchesCount > 0, label: "Beste matches bekeken" },
          { done: applicationsCount > 0, label: "Gesolliciteerd op vacature" },
          { done: conversationsCount > 0, label: "Eerste bericht gestuurd" },
        ]
      : role === "client" || role === "organization"
        ? [
            { done: hasRoleProfile, label: "Profiel compleet" },
            { done: intakesCount > 0, label: "Intake gestart" },
            { done: myJobsCount > 0, label: "Eerste vacature geplaatst" },
            { done: recentApplicationsCount > 0, label: "Eerste match" },
            { done: conversationsCount > 0, label: "Eerste bericht gestuurd" },
          ]
        : [];

  const nextAction =
    role === "caregiver"
      ? !hasRoleProfile
        ? { label: "Vul je profiel in", href: profileEditHref }
        : jobMatchesCount === 0
          ? { label: "Bekijk vacatures", href: "/zorenta/jobs" }
          : applicationsCount === 0
            ? { label: "Solliciteer nu", href: "/zorenta/jobs" }
            : conversationsCount === 0
              ? { label: "Stuur je eerste bericht", href: "/zorenta/applications" }
              : null
      : role === "client" || role === "organization"
        ? !hasRoleProfile
          ? { label: "Vul je zorgprofiel in", href: profileEditHref }
          : intakesCount === 0 && myJobsCount === 0
            ? { label: "Start intake", href: "/zorenta/intake" }
            : myJobsCount === 0
              ? { label: "Plaats je eerste vacature", href: "/zorenta/jobs/new" }
              : conversationsCount === 0
                ? { label: "Bekijk sollicitaties", href: "/zorenta/applications" }
                : null
        : null;

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 100;

  if (steps.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Onboarding</h3>
        <span className="text-xs font-medium text-slate-500">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            {s.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-slate-300" />
            )}
            <span className={s.done ? "text-slate-600" : "text-slate-500"}>{s.label}</span>
          </li>
        ))}
      </ul>
      {nextAction && (
        <div className="mt-4">
          <Link href={nextAction.href}>
            <Button size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {nextAction.label}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
