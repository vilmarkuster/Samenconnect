"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { useAuth } from "@/lib/auth-context";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { ZorentaPageSkeleton } from "@/components/zorenta/loading-skeleton";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DUTCH_PROVINCES } from "@/lib/zorenta/regions";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { FileText, ChevronRight, ChevronLeft, Save } from "lucide-react";

const STEPS = [
  { key: "who", title: "Voor wie is de zorg?" },
  { key: "type", title: "Type zorg" },
  { key: "frequency", title: "Frequentie" },
  { key: "budget", title: "Budget" },
  { key: "location", title: "Locatie" },
];

const CARE_TYPES = ["Dementiezorg", "Thuiszorg", "Verpleging", "Begeleiding", "Verpleeghuis", "Gehandicaptenzorg", "Palliatieve zorg", "Kraamzorg", "Overig"];
const AGE_GROUPS = ["0-12", "12-18", "18-65", "65+"];
const FREQUENCIES = ["1x per week", "2-3x per week", "Dagelijks", "Flexibel"];
const URGENCY_OPTIONS = ["Laag", "Medium", "Hoog"];

const defaultForm: Record<string, string | string[] | number | null> = {
  who_needs_care: "",
  age_group: "",
  care_type: "",
  care_frequency: "",
  preferred_schedule: "",
  preferred_city: "",
  preferred_region: "",
  preferred_country: "Nederland",
  urgency: "",
  skills_required: [],
  language_preference: "Nederlands",
  budget_min: null,
  budget_max: null,
  notes: "",
};

export default function IntakePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string | string[] | number | null>>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) trackZorentaEvent("intake_started", {});
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/zorenta/login?redirect=/zorenta/intake");
      return;
    }
    if (!isAuthenticated) return;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (d.profile?.role !== "client" && d.profile?.role !== "organization") {
            router.replace("/zorenta/dashboard");
            return;
          }
          setLoading(false);
        });
    });
  }, [authLoading, isAuthenticated, router]);

  const update = (key: string, value: string | string[] | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveDraft = async () => {
    const token = await getZorentaAccessToken();
    if (!token) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...form, status: "draft" };
    if (intakeId) body.id = intakeId;
    const res = await fetch("/api/zorenta/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...zorentaHeaders(token) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (data.id) setIntakeId(data.id);
    setSaving(false);
  };

  const submit = async () => {
    const token = await getZorentaAccessToken();
    if (!token) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...form, status: "completed" };
    if (intakeId) body.id = intakeId;
    const res = await fetch("/api/zorenta/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...zorentaHeaders(token) },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (data.id) {
      trackZorentaEvent("intake_completed", { intake_id: data.id });
      router.push(`/zorenta/intake/results?intake_id=${data.id}`);
    }
  };

  if (authLoading || loading) {
    return (
      <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
        <ZorentaPageSkeleton />
      </PageContainer>
    );
  }

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
      <ZorentaPageHeader
        title="Zorgvraag intake"
        description="Beschrijf je zorgvraag. Wij matchen je met geschikte zorgverleners."
      />

      {/* Progress bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-slate-700">{currentStep.title}</span>
          <span className="text-slate-500">Stap {step + 1} van {STEPS.length}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-emerald-600" />
            {currentStep.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {currentStep.key === "who" && (
            <>
              <ZorentaFormField label="Voor wie is de zorg?" hint="Bijv. mijzelf, mijn moeder">
                <Input
                  placeholder="Bijv. mijzelf, mijn moeder"
                  value={String(form.who_needs_care ?? "")}
                  onChange={(e) => update("who_needs_care", e.target.value)}
                  className="mt-1"
                />
              </ZorentaFormField>
              <ZorentaFormField label="Leeftijdsgroep">
                <select
                  value={String(form.age_group ?? "")}
                  onChange={(e) => update("age_group", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kies…</option>
                  {AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </ZorentaFormField>
            </>
          )}
          {currentStep.key === "type" && (
            <ZorentaFormField label="Type zorg">
              <select
                value={String(form.care_type ?? "")}
                onChange={(e) => update("care_type", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Kies…</option>
                {CARE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </ZorentaFormField>
          )}
          {currentStep.key === "frequency" && (
            <>
              <ZorentaFormField label="Hoe vaak heeft u zorg nodig?">
                <select
                  value={String(form.care_frequency ?? "")}
                  onChange={(e) => update("care_frequency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kies…</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Voorkeur schema" hint="Bijv. ochtend, avond">
                <Input
                  placeholder="Bijv. ochtend, avond"
                  value={String(form.preferred_schedule ?? "")}
                  onChange={(e) => update("preferred_schedule", e.target.value)}
                  className="mt-1"
                />
              </ZorentaFormField>
            </>
          )}
          {currentStep.key === "budget" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <ZorentaFormField label="Budget min (€/uur)">
                <Input
                  type="number"
                  min={0}
                  placeholder="20"
                  value={form.budget_min ?? ""}
                  onChange={(e) =>
                    update("budget_min", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="mt-1"
                />
              </ZorentaFormField>
              <ZorentaFormField label="Budget max (€/uur)">
                <Input
                  type="number"
                  min={0}
                  placeholder="35"
                  value={form.budget_max ?? ""}
                  onChange={(e) =>
                    update("budget_max", e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="mt-1"
                />
              </ZorentaFormField>
            </div>
          )}
          {currentStep.key === "location" && (
            <>
              <ZorentaFormField label="Stad / plaats">
                <div className="mt-1">
                  <CityAutocomplete
                    value={String(form.preferred_city ?? "")}
                    onChange={(v) => update("preferred_city", v)}
                    placeholder="Bijv. Amsterdam"
                  />
                </div>
              </ZorentaFormField>
              <ZorentaFormField label="Regio / provincie">
                <select
                  value={String(form.preferred_region ?? "")}
                  onChange={(e) => update("preferred_region", e.target.value || "")}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Selecteer een provincie</option>
                  {DUTCH_PROVINCES.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Urgentie">
                <select
                  value={String(form.urgency ?? "")}
                  onChange={(e) => update("urgency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Kies…</option>
                  {URGENCY_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </ZorentaFormField>
              <ZorentaFormField label="Opmerkingen (optioneel)">
                <textarea
                  placeholder="Bijzonderheden over de zorgvraag…"
                  value={String(form.notes ?? "")}
                  onChange={(e) => update("notes", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  rows={3}
                />
              </ZorentaFormField>
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-6">
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              Concept opslaan
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  Vorige
                </Button>
              )}
              {!isLast ? (
                <Button onClick={() => setStep(step + 1)} className="gap-1.5">
                  Volgende
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submit} disabled={saving} className="gap-1.5">
                  Afronden en matches bekijken
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">
        <a
          href="/zorenta/dashboard"
          className="font-medium text-slate-600 underline hover:text-slate-900"
        >
          Terug naar dashboard
        </a>
      </p>
    </PageContainer>
  );
}
