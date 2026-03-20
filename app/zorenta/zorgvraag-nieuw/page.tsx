 "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/zorenta/location-autocomplete";

const ZORGVRAAG_STORAGE_KEY = "zorgvragen";
const ZORGVRAGEN_DRAFT_KEY = "samenconnect_zorgvraag_draft";

type NewZorgvraag = {
  id: string;
  zorgtype: string[];
  locatie: string;
  frequentie: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  beschikbaarheid: string[];
  beschrijving: string;
  createdAt: string;
};

const ZORGTYPE_OPTIONS = [
  "Thuiszorg",
  "Begeleiding",
  "Persoonlijke verzorging",
  "Huishoudelijke hulp",
  "Dagbesteding",
] as const;

const FREQUENTIE_OPTIONS = [
  "Eenmalig",
  "1x per week",
  "2–3x per week",
  "Dagelijks",
  "Flexibel",
] as const;

const BESCHIKBAARHEID_OPTIONS = ["Overdag", "Avond", "Weekend", "Flexibel"] as const;

export default function NieuweZorgvraagPage() {
  const router = useRouter();

  const [zorgtypes, setZorgtypes] = useState<string[]>([]);
  const [locatie, setLocatie] = useState("");
  const [frequentie, setFrequentie] = useState<string>("");
  const [budgetMin, setBudgetMin] = useState<string>("");
  const [budgetMax, setBudgetMax] = useState<string>("");
  const [beschrijving, setBeschrijving] = useState("");
  const [beschikbaarheid, setBeschikbaarheid] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleZorgtype(option: string) {
    setZorgtypes((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option]
    );
  }

  function toggleBeschikbaarheid(option: string) {
    setBeschikbaarheid((prev) =>
      prev.includes(option) ? prev.filter((t) => t !== option) : [...prev, option]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const id = Date.now().toString();
      const createdAt = new Date().toISOString();

      const parsedBudgetMin =
        budgetMin.trim() !== "" ? Number(budgetMin.trim()) || undefined : undefined;
      const parsedBudgetMax =
        budgetMax.trim() !== "" ? Number(budgetMax.trim()) || undefined : undefined;

      const zorgvraag: NewZorgvraag = {
        id,
        zorgtype: zorgtypes,
        locatie,
        frequentie,
        budgetMin: parsedBudgetMin ?? null,
        budgetMax: parsedBudgetMax ?? null,
        beschikbaarheid,
        beschrijving,
        createdAt,
      };

      if (typeof window !== "undefined") {
        // Append to list of zorgvragen
        try {
          const existingRaw = window.localStorage.getItem(ZORGVRAAG_STORAGE_KEY);
          const existing: NewZorgvraag[] = existingRaw ? JSON.parse(existingRaw) : [];
          const updated = [zorgvraag, ...existing];
          window.localStorage.setItem(ZORGVRAAG_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // ignore storage errors, matches will still use draft
        }

        // Also set as current draft for the matches page (Intake-compatible shape)
        try {
          const draftPayload = {
            form: {
              id,
              care_type: zorgtypes[0] ?? "",
              care_frequency: frequentie || null,
              preferred_city: locatie || null,
              preferred_region: null,
              skills_required: null,
              budget_min: parsedBudgetMin ?? null,
              budget_max: parsedBudgetMax ?? null,
              urgency:
                beschikbaarheid.includes("Flexibel") || beschikbaarheid.length === 0
                  ? "Flexibel"
                  : beschikbaarheid.join(", "),
            },
          };
          window.localStorage.setItem(
            ZORGVRAGEN_DRAFT_KEY,
            JSON.stringify(draftPayload)
          );
        } catch {
          // ignore draft errors
        }
      }

      router.push("/zorenta/matches");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer maxWidth="narrow" className="space-y-6 sm:space-y-8">
      <ZorentaPageHeader
        title="Nieuwe zorgvraag plaatsen"
        description="Beschrijf kort jouw zorgvraag. We gebruiken deze informatie om passende zorgverleners voor je te vinden."
        backHref="/zorenta/dashboard"
        backLabel="Terug naar dashboard"
      />

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Zorgtype */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Zorgtype</h2>
              <p className="text-xs text-slate-500">
                Kies het type zorg of ondersteuning waarvoor je een zorgverlener zoekt.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ZORGTYPE_OPTIONS.map((opt) => {
                  const active = zorgtypes.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleZorgtype(opt)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs",
                        active
                          ? "border-[#40ADA8] bg-[#40ADA8]/10 text-[#1b6a67]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Locatie */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Locatie</h2>
              <p className="text-xs text-slate-500">
                Stad of regio waar de zorg plaatsvindt (bijvoorbeeld "Amsterdam" of "Regio
                Utrecht").
              </p>
              <LocationAutocomplete
                value={locatie}
                onChange={setLocatie}
                placeholder="Bijvoorbeeld: Amsterdam"
              />
            </section>

            {/* Frequentie */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Frequentie</h2>
              <p className="text-xs text-slate-500">
                Hoe vaak heb je zorg of ondersteuning nodig?
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {FREQUENTIE_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFrequentie(opt)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs",
                      frequentie === opt
                        ? "border-[#40ADA8] bg-[#40ADA8]/10 text-[#1b6a67]"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </section>

            {/* Budget */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Budget (€/uur)</h2>
              <p className="text-xs text-slate-500">
                Indicatie van het uurtarief. Dit helpt om passende matches te tonen. Dit is later
                nog aan te passen.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#40ADA8] focus:outline-none focus:ring-2 focus:ring-[#40ADA8]/20"
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type="number"
                  min={0}
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#40ADA8] focus:outline-none focus:ring-2 focus:ring-[#40ADA8]/20"
                />
              </div>
            </section>

            {/* Beschrijving */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Beschrijving van de zorgvraag
              </h2>
              <p className="text-xs text-slate-500">
                Beschrijf kort waar je hulp bij nodig hebt. Bijvoorbeeld: ondersteuning bij
                dagelijkse verzorging, begeleiding naar afspraken, of hulp in het huishouden.
              </p>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-[#40ADA8] focus:outline-none focus:ring-2 focus:ring-[#40ADA8]/20"
                placeholder="Beschrijf kort jouw situatie en welke ondersteuning je zoekt."
              />
            </section>

            {/* Beschikbaarheid / flexibiliteit */}
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Flexibiliteit / beschikbaarheid
              </h2>
              <p className="text-xs text-slate-500">
                Wanneer heb je vooral hulp nodig? Je kunt meerdere opties kiezen.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {BESCHIKBAARHEID_OPTIONS.map((opt) => {
                  const active = beschikbaarheid.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleBeschikbaarheid(opt)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs",
                        active
                          ? "border-[#40ADA8] bg-[#40ADA8]/10 text-[#1b6a67]"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Na het plaatsen tonen we je direct zorgverleners die aansluiten bij deze zorgvraag.
              </p>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="gap-1.5 bg-[#40ADA8] text-xs text-white hover:bg-[#369e9a]"
                >
                  {submitting ? "Bezig..." : "Bekijk matches"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

