"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CityAutocomplete } from "@/components/zorenta/forms/city-autocomplete";
import { cn } from "@/lib/utils";
import type { ApplicantType, EarlyAccessSource } from "@/lib/samenconnect/early-access-signup-schema";
import { SamenConnectMarketingHeader } from "@/components/samenconnect/samenconnect-marketing-header";
import { earlyAccessUrl } from "@/lib/samenconnect/marketing-paths";

const nav = [
  { href: "/#waarom", label: "Waarom" },
  { href: "/#voor-wie", label: "Voor wie" },
  { href: "/#anders", label: "Verschil" },
  { href: "/#technologie", label: "Technologie" },
  { href: "/#platform", label: "Platform" },
  { href: "/#early-access", label: "Early access" },
] as const;

const navMobile = [
  { href: "/#waarom", label: "Waarom" },
  { href: "/#voor-wie", label: "Voor wie" },
  { href: "/#anders", label: "Aanpak" },
  { href: "/#platform", label: "Platform" },
  { href: "/#early-access", label: "Early access" },
] as const;

const applicantOptions: { value: ApplicantType; label: string }[] = [
  { value: "caregiver", label: "Zorgverlener" },
  { value: "client", label: "Opdrachtgever" },
  { value: "pgb_holder", label: "PGB-houder" },
  { value: "organization", label: "Organisatie" },
];

type FieldErrors = Partial<Record<string, string[]>>;

export function EarlyAccessSignupShell({ initialSource }: { initialSource: EarlyAccessSource }) {
  const claimHref = useMemo(() => earlyAccessUrl("landing_nav"), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f2f5] via-[#f3f4f6] to-[#f0f2f5] text-slate-900">
      <SamenConnectMarketingHeader
        navItems={nav}
        mobileMenuNavItems={navMobile}
        earlyAccessHref={claimHref}
      />
      <main className="mx-auto max-w-lg px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-brand-dark"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Terug naar home
        </Link>
        <EarlyAccessSignupForm initialSource={initialSource} />
      </main>
    </div>
  );
}

function EarlyAccessSignupForm({ initialSource }: { initialSource: EarlyAccessSource }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [applicantType, setApplicantType] = useState<ApplicantType | "">("");
  const [region, setRegion] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/samenconnect/early-access-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          phone: phone.trim() || undefined,
          applicant_type: applicantType || undefined,
          region,
          message,
          consent_privacy: consent,
          source: initialSource,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        code?: string;
        fields?: FieldErrors;
      };
      if (!res.ok) {
        const parts = [data.error, data.hint].filter(
          (s): s is string => typeof s === "string" && s.length > 0
        );
        setError(
          parts.length > 0
            ? parts.join(" — ")
            : `Er ging iets mis (${res.status}). Probeer het opnieuw.`
        );
        if (data.fields) setFieldErrors(data.fields);
        return;
      }
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white/95 px-6 py-10 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.04]">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Bedankt, je aanvraag is ontvangen
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
          We nemen persoonlijk contact op zodra we een passende volgende stap zien. Geen
          haast, geen automatische spam — even rustig de juiste match met jouw situatie.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "mt-8 inline-flex w-full justify-center sm:w-auto"
          )}
        >
          Terug naar de homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 px-5 py-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.04] sm:px-8 sm:py-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-dark">
        Early access
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
        Claim je plek
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
        Vul het formulier in. We lezen elke aanvraag zelf en reageren met een menselijk
        vervolg — geen wachtlijst-theater.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {error ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="ea-first" className="block text-sm font-medium text-slate-800">
              Voornaam <span className="text-red-600">*</span>
            </label>
            <Input
              id="ea-first"
              name="first_name"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1.5"
              aria-invalid={!!fieldErrors.first_name}
            />
            {fieldErrors.first_name?.[0] ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.first_name[0]}</p>
            ) : null}
          </div>
          <div>
            <label htmlFor="ea-last" className="block text-sm font-medium text-slate-800">
              Achternaam <span className="text-red-600">*</span>
            </label>
            <Input
              id="ea-last"
              name="last_name"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1.5"
              aria-invalid={!!fieldErrors.last_name}
            />
            {fieldErrors.last_name?.[0] ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.last_name[0]}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="ea-email" className="block text-sm font-medium text-slate-800">
            E-mailadres <span className="text-red-600">*</span>
          </label>
          <Input
            id="ea-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5"
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email?.[0] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ea-phone" className="block text-sm font-medium text-slate-800">
            Telefoonnummer{" "}
            <span className="font-normal text-slate-500">(aanbevolen, optioneel)</span>
          </label>
          <Input
            id="ea-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5"
            aria-invalid={!!fieldErrors.phone}
          />
          {fieldErrors.phone?.[0] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.phone[0]}</p>
          ) : null}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-slate-800">
            Type aanmelder <span className="text-red-600">*</span>
          </legend>
          <div className="mt-3 space-y-2.5">
            {applicantOptions.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 transition-colors has-[:checked]:border-brand/40 has-[:checked]:bg-brand-light/25"
              >
                <input
                  type="radio"
                  name="applicant_type"
                  value={opt.value}
                  checked={applicantType === opt.value}
                  onChange={() => setApplicantType(opt.value)}
                  className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-brand focus:ring-brand"
                />
                <span className="text-sm text-slate-800">{opt.label}</span>
              </label>
            ))}
          </div>
          {fieldErrors.applicant_type?.[0] ? (
            <p className="mt-2 text-xs text-red-600">{fieldErrors.applicant_type[0]}</p>
          ) : null}
        </fieldset>

        <div>
          <label htmlFor="ea-region" className="block text-sm font-medium text-slate-800">
            Regio / woonplaats <span className="text-red-600">*</span>
          </label>
          <div className="mt-1.5">
            <CityAutocomplete
              id="ea-region"
              name="region"
              value={region}
              onChange={setRegion}
              placeholder="Typ minimaal 2 letters (bijv. Utrecht, Randstad)"
              aria-invalid={!!fieldErrors.region}
            />
          </div>
          {fieldErrors.region?.[0] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.region[0]}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ea-message" className="block text-sm font-medium text-slate-800">
            Korte toelichting — waar ben je naar op zoek? <span className="text-red-600">*</span>
          </label>
          <Textarea
            id="ea-message"
            name="message"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1.5 min-h-[140px]"
            placeholder="Bijv. wat voor zorg, welke regio, en wat je hoopt te bereiken met SamenConnect."
            aria-invalid={!!fieldErrors.message}
          />
          {fieldErrors.message?.[0] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.message[0]}</p>
          ) : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-slate-700">
            <input
              type="checkbox"
              name="consent_privacy"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <span>
              Ik ga akkoord met het opslaan en verwerken van mijn gegevens voor deze early
              access-aanvraag, zoals beschreven in het privacybeleid (wordt gedeeld bij
              start). <span className="text-red-600">*</span>
            </span>
          </label>
          {fieldErrors.consent_privacy?.[0] ? (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.consent_privacy[0]}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full border-0 bg-brand text-white shadow-md shadow-brand/30 ring-1 ring-brand/25 hover:bg-brand-dark disabled:pointer-events-none disabled:opacity-60 sm:max-w-xs"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Verzenden…
            </>
          ) : (
            "Verstuur aanvraag"
          )}
        </button>
      </form>
    </div>
  );
}
