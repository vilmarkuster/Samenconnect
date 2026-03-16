"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  FileText,
  MessageSquare,
  Star,
  ChevronRight,
  HelpCircle,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

export function ZorentaLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-br from-emerald-50/90 via-white to-slate-50/50 px-4 py-20 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-medium text-emerald-800 shadow-sm">
            <Sparkles className="h-4 w-4" />
            Zorg die bij je past
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
            Vind de juiste zorgverlener
            <br />
            <span className="text-emerald-600">of je volgende opdracht</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Zorenta verbindt zorgverleners, cliënten en organisaties. Snel, betrouwbaar en veilig.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/zorenta/register?role=client">
              <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                Zorg vinden
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/zorenta/register?role=caregiver">
              <Button size="lg" variant="outline" className="gap-2 border-slate-300">
                Zorgverlener worden
              </Button>
            </Link>
            <Link href="/zorenta/register?role=client">
              <Button size="lg" variant="outline" className="gap-2 border-slate-300">
                Zorgvraag plaatsen
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Gratis account · Geen creditcard nodig
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-b border-slate-100 bg-slate-50/50 px-4 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" />
            Veilig berichten
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            Privacy-vriendelijk
          </span>
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Reviews op profielen
          </span>
        </div>
      </section>

      {/* Value proposition */}
      <section className="border-b border-slate-200/80 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold text-slate-900 md:text-3xl">
            Waarom Zorenta?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Een veilig platform voor matching tussen zorgvraag en aanbod in Nederland.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Users, title: "Slimme matching", text: "Op basis van zorgtype, locatie, vaardigheden en beschikbaarheid vind je de beste match." },
              { icon: FileText, title: "Geleide intake", text: "Stel je zorgvraag stap voor stap samen. Wij koppelen je aan geschikte zorgverleners." },
              { icon: MessageSquare, title: "Veilig contact", text: "Berichten en afspraken binnen het platform. Alles op één plek." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold text-slate-900 md:text-3xl">
            Zo werkt het
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: 1, title: "Registreer", text: "Kies je rol: cliënt, zorgverlener of organisatie. Vul je profiel in." },
              { step: 2, title: "Match of vraag", text: "Zoek vacatures of doorloop de intake. Wij tonen de beste matches." },
              { step: 3, title: "Contact", text: "Solliciteer of nodig uit. Communiceer veilig via het platform." },
            ].map(({ step, title, text }) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-500 bg-white text-lg font-semibold text-emerald-600">
                  {step}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For clients */}
      <section className="border-b border-slate-200/80 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="order-2 md:order-1 rounded-xl border border-slate-200/80 bg-slate-50/50 p-8 text-center">
              <FileText className="mx-auto h-16 w-16 text-slate-300" />
              <p className="mt-4 text-sm text-slate-500">Cliënten en PGB-houders vinden zorg</p>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Voor cliënten en organisaties
              </h2>
              <p className="mt-4 text-slate-600">
                Beschrijf je zorgvraag via de intake of plaats een vacature. Bekijk aanbevolen zorgverleners en neem contact op.
              </p>
              <ul className="mt-6 space-y-3">
                {["Geleide intake of direct vacature plaatsen", "Top matches op basis van je vraag", "Veilig berichten en afspraken"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/zorenta/register?role=client" className="mt-6 inline-block">
                <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Zorgvraag plaatsen
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* For caregivers */}
      <section className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Voor zorgverleners
              </h2>
              <p className="mt-4 text-slate-600">
                Maak een profiel, voeg je vaardigheden en beschikbaarheid toe. Ontvang vacatures die bij je passen en reageer direct.
              </p>
              <ul className="mt-6 space-y-3">
                {["Profiel met skills en ervaring", "Matched vacatures op je dashboard", "Eén plek voor sollicitaties en berichten"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/zorenta/register?role=caregiver" className="mt-6 inline-block">
                <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  Zorgverlener worden
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center">
              <Users className="mx-auto h-16 w-16 text-slate-300" />
              <p className="mt-4 text-sm text-slate-500">Zorgverleners vinden passend werk</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="border-b border-slate-200/80 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-semibold text-slate-900 md:text-3xl">
            Vertrouwen en veiligheid
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Wij nemen privacy en veiligheid serieus.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            {[
              { icon: Shield, label: "Veilige gegevens" },
              { icon: MessageSquare, label: "Berichten in het platform" },
              { icon: Star, label: "Reviews en beoordelingen" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                <Icon className="h-5 w-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            Berichten worden binnen Zorenta bewaard. Deel geen betaalgegevens of persoonsgegevens buiten het platform.
          </p>
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="border-b border-slate-200/80 bg-slate-50/50 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold text-slate-900">Wat anderen zeggen</h2>
          <p className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-slate-600">
            Binnenkort vind je hier ervaringen van zorgverleners en cliënten.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-slate-200/80 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <HelpCircle className="h-5 w-5" />
            Veelgestelde vragen
          </h2>
          <dl className="mt-8 space-y-6">
            {[
              { q: "Voor wie is Zorenta?", a: "Voor zorgverleners die opdrachten zoeken, cliënten en PGB-houders die zorg nodig hebben, en organisaties die zorg inkopen." },
              { q: "Hoe werkt de matching?", a: "Op basis van je profiel of intake (zorgtype, locatie, vaardigheden, beschikbaarheid en budget) tonen we passende matches met een score." },
              { q: "Is Zorenta gratis?", a: "Registreren en een profiel aanmaken is gratis. Voor bepaalde diensten kunnen in de toekomst kosten gelden." },
            ].map(({ q, a }) => (
              <div key={q}>
                <dt className="font-medium text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Klaar om te beginnen?</h2>
          <p className="mt-2 text-slate-600">Registreer gratis en vind zorg of zorgopdrachten.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/zorenta/register?role=client">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                Zorg vinden
              </Button>
            </Link>
            <Link href="/zorenta/register?role=caregiver">
              <Button size="lg" variant="outline">
                Zorgverlener worden
              </Button>
            </Link>
            <Link href="/zorenta/login">
              <Button size="lg" variant="ghost">Inloggen</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 px-4 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <Link href="/zorenta" className="flex items-center gap-2 font-semibold text-slate-900">
            <Heart className="h-5 w-5 text-emerald-500" />
            Zorenta
          </Link>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
            <Link href="/zorenta" className="hover:text-slate-900">Home</Link>
            <Link href="/zorenta/login" className="hover:text-slate-900">Inloggen</Link>
            <Link href="/zorenta/register" className="hover:text-slate-900">Registreren</Link>
            <Link href="/zorenta/register?role=client" className="hover:text-slate-900">Zorgvraag</Link>
          </nav>
        </div>
        <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-slate-500">
          © Zorenta. Privacy-vriendelijk en veilig communiceren.
        </p>
      </footer>
    </div>
  );
}
