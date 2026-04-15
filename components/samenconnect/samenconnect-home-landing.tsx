import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  HeartPulse,
  LayoutGrid,
  MessageCircle,
  ScanSearch,
  Shield,
  Sparkles,
  Users,
  Building2,
  Eye,
  Ban,
  Clock,
  Layers,
  Scale,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { REGISTRATION_OPEN } from "@/lib/registration-open";

const contactEmail = "info@samenconnect.nl";

const earlyAccessHref = `mailto:${contactEmail}?subject=${encodeURIComponent("Early access — SamenConnect")}`;

const nav = [
  { href: "#waarom", label: "Waarom" },
  { href: "#voor-wie", label: "Voor wie" },
  { href: "#anders", label: "Verschil" },
  { href: "#technologie", label: "Technologie" },
  { href: "#platform", label: "Platform" },
  { href: "#early-access", label: "Early access" },
] as const;

const landingImg = {
  careHome: "/images/landing/care-home.jpg",
  careSmile: "/images/landing/care-smile.jpg",
  nurse: "/images/landing/nurse-portrait.jpg",
  remote: "/images/landing/remote-work.jpg",
} as const;

function LandingImageCap({
  src,
  alt,
  className,
  layout = "cap",
  sizes = "(max-width: 768px) 100vw, 360px",
}: {
  src: string;
  alt: string;
  className?: string;
  /** cap: vaste aspect voor kaarten; panel: vullende hoogte in twee kolommen */
  layout?: "cap" | "panel";
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        layout === "cap"
          ? "relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-200/40"
          : "relative min-h-[220px] w-full shrink-0 overflow-hidden bg-slate-200/40 md:min-h-[260px] lg:min-h-0 lg:h-full lg:min-h-[300px]",
        className
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-center"
        sizes={sizes}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/35 via-slate-900/5 to-transparent"
        aria-hidden
      />
    </div>
  );
}

function PhotoHeroSection({ src }: { src: string }) {
  return (
    <div className="relative">
      <section className="relative min-h-[min(86dvh,780px)] overflow-hidden sm:min-h-[min(88dvh,840px)]">
        <div className="absolute inset-0 z-0">
          <Image
            src={src}
            alt="SamenConnect — zorg en verbinding"
            fill
            priority
            className="object-cover object-center [image-rendering:auto]"
            sizes="100vw"
          />
        </div>
        <div
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_95%_80%_at_50%_20%,transparent_0%,rgba(15,23,42,0.35)_45%,rgba(15,23,42,0.82)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/80 via-slate-950/55 to-slate-950/90"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-[1] bg-gradient-to-t from-[#40ADA8]/16 via-[#40ADA8]/5 to-transparent mix-blend-soft-light"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 z-[1] h-48 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent"
          aria-hidden
        />
        <div className="relative z-[2] mx-auto flex min-h-[min(86dvh,780px)] max-w-6xl flex-col items-center justify-center px-4 py-24 text-center sm:min-h-[min(88dvh,840px)] sm:py-28 md:py-32">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.1] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/95 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.35)] backdrop-blur-md sm:mb-6 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#7fd4cf]" aria-hidden />
            Zorgplatform · Nederland
          </p>
          <h1 className="max-w-[22rem] text-balance text-[1.65rem] font-semibold leading-[1.12] tracking-[-0.02em] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.45)] sm:max-w-3xl sm:text-4xl sm:leading-[1.08] md:text-[2.65rem] md:leading-[1.05]">
            De juiste zorgverbinding —{" "}
            <span className="font-semibold text-[#b8ebe6]">zonder gedoe</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[0.95rem] font-normal leading-[1.65] text-slate-100/95 drop-shadow-[0_2px_16px_rgba(0,0,0,0.35)] sm:mt-7 sm:text-lg sm:leading-relaxed md:max-w-2xl">
            Sneller een passende match, minder gedoe in het traject — en direct
            menselijk contact met wie zorg geeft, zonder eindeloos heen en weer.
          </p>
          <div className="mt-11 flex w-full max-w-md flex-col items-stretch gap-3.5 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <a
                href={earlyAccessHref}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "inline-flex min-h-[3rem] justify-center gap-2 rounded-xl border-0 bg-brand px-8 text-[0.9375rem] font-semibold text-white shadow-[0_12px_40px_-8px_rgba(64,173,168,0.55),0_0_0_1px_rgba(255,255,255,0.12)] transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_18px_48px_-10px_rgba(64,173,168,0.6)] sm:min-w-[15.5rem]"
                )}
              >
                Claim je plek
                <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </a>
            </div>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "min-h-[3rem] justify-center rounded-xl border-white/35 bg-white/[0.08] text-[0.9375rem] font-medium text-white shadow-inner backdrop-blur-sm transition-[background-color,border-color,transform] duration-300 hover:border-white/45 hover:bg-white/[0.14] hover:text-white sm:min-w-[10.5rem]"
              )}
            >
              Inloggen
            </Link>
          </div>
          <p className="mt-4 text-center">
            <a
              href="#platform"
              className="text-sm font-medium text-white/85 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              Bekijk hoe het werkt
            </a>
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/20 pt-8 text-[11px] font-semibold tracking-wide text-white/90 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Direct contact met zorgverleners
            </span>
            <span className="hidden text-white/35 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Geen tussenpersonen
            </span>
            <span className="hidden text-white/35 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Binnen 24u reactie
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-md text-center text-xs font-medium leading-relaxed text-slate-100/95 sm:mt-7 sm:text-sm">
            Beperkte plekken — we selecteren actief en nemen persoonlijk contact op
          </p>
        </div>
      </section>
      <div className="relative z-[3] -mt-10 px-4 pb-2 sm:-mt-12 sm:pb-3 md:-mt-14">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200/55 bg-white/95 shadow-[0_-6px_36px_-10px_rgba(15,23,42,0.12),0_16px_40px_-18px_rgba(15,23,42,0.08)] backdrop-blur-xl backdrop-saturate-150 ring-1 ring-slate-900/[0.04]">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#40ADA8]/35 to-transparent" aria-hidden />
          <div className="px-6 py-7 text-center sm:px-10 sm:py-8 md:text-left">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2d8f8a]">
              In de praktijk
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-800 sm:text-[0.95rem] md:mx-0">
              Het platform draait al in de praktijk: we verfijnen matching en gesprekken
              met echte zorgteams — niet vanuit slides, maar vanuit intake en opdrachten
              die ertoe doen.
            </p>
            <p className="mx-auto mt-4 max-w-xl border-t border-slate-200/70 pt-4 text-xs leading-relaxed text-slate-500 sm:text-sm md:mx-0">
              {REGISTRATION_OPEN
                ? "Account aanmaken is open; early access blijft beschikbaar."
                : "Registratie voor nieuwe accounts is tijdelijk gesloten — bestaande gebruikers loggen hieronder in."}
            </p>
          </div>
        </div>
        <p className="mx-auto mt-5 max-w-2xl px-4 text-center text-sm leading-relaxed text-slate-600 sm:mt-6">
          <span className="font-medium text-slate-800">
            In de praktijk getest met echte zorgteams.
          </span>{" "}
          Een groeiend netwerk van zorgverleners sluit aan.
        </p>
      </div>
    </div>
  );
}

/** Decorative product frames for hero — not interactive UI */
function HeroProductVisual() {
  return (
    <div className="group relative mx-auto w-full max-w-xl pb-10 sm:max-w-2xl sm:pb-12 lg:mx-0 lg:max-w-none lg:pb-14 xl:max-w-[44rem]">
      <div
        className="pointer-events-none absolute -inset-12 rounded-[2.5rem] bg-gradient-to-br from-brand/30 via-brand/12 to-transparent blur-3xl motion-reduce:blur-2xl"
        aria-hidden
      />
      {/* Primary: matching overview */}
      <div
        className="relative z-10 overflow-hidden rounded-2xl border border-slate-300/95 bg-white shadow-[0_28px_70px_-22px_rgba(15,23,42,0.18),0_0_0_1px_rgba(148,163,184,0.4)] transition-[transform,box-shadow] duration-500 ease-out motion-reduce:transform-none sm:rounded-3xl lg:group-hover:-translate-y-1 lg:group-hover:shadow-[0_32px_80px_-24px_rgba(15,23,42,0.2),0_0_0_1px_rgba(148,163,184,0.45)]"
        aria-hidden
      >
        <div className="flex items-center gap-2 border-b border-slate-200/95 bg-slate-100/95 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          </div>
          <span className="ml-2 text-xs font-semibold tracking-wide text-slate-600">
            SamenConnect · Matches
          </span>
        </div>
        <div className="flex min-h-[280px] sm:min-h-[340px] md:min-h-[380px]">
          <div className="hidden w-[28%] border-r border-slate-200/95 bg-gradient-to-b from-brand-light to-white p-3.5 sm:block sm:p-4">
            <div className="mb-4 h-2 w-14 rounded-full bg-brand/40" />
            <div className="space-y-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-9 rounded-lg sm:h-10",
                    i === 1 ? "bg-brand/22 ring-1 ring-brand/40" : "bg-slate-100"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-3.5 bg-white p-4 sm:space-y-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900">Actieve matches</span>
              <span className="rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-semibold text-brand-dark ring-1 ring-brand/25">
                Live
              </span>
            </div>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-200/95 bg-slate-50/90 p-3.5 shadow-sm sm:gap-4 sm:p-4"
              >
                <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-brand/45 to-brand/18 ring-2 ring-white shadow-sm sm:h-12 sm:w-12" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-2.5 max-w-[72%] rounded-full bg-slate-300/90" />
                  <div className="h-2 max-w-[48%] rounded-full bg-slate-200" />
                </div>
                <div
                  className="shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-sm"
                  style={{
                    background: `linear-gradient(135deg, #40ADA8 0%, ${i === 0 ? "#35948f" : "#2d7f7b"} 100%)`,
                  }}
                >
                  {94 - i * 7}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Secondary: chat — overlaps main panel */}
      <div
        className="absolute -bottom-2 right-0 z-20 w-[min(92vw,17.5rem)] translate-y-1 rounded-xl border border-slate-300/90 bg-white/95 p-3.5 shadow-premium backdrop-blur-[2px] transition-[transform,box-shadow] duration-500 ease-out motion-reduce:transform-none sm:-bottom-3 sm:right-2 sm:w-[19.5rem] sm:translate-y-2 sm:rounded-2xl sm:p-4 lg:group-hover:-translate-y-0.5 lg:group-hover:shadow-premium-hover rotate-[1.5deg] sm:rotate-2"
        aria-hidden
      >
        <div className="mb-2.5 flex items-center gap-2 border-b border-slate-100 pb-2">
          <MessageCircle className="h-4 w-4 shrink-0 text-brand" strokeWidth={2} />
          <span className="truncate text-[11px] font-semibold text-slate-800 sm:text-xs">
            Gesprek · gekoppeld aan opdracht
          </span>
        </div>
        <div className="space-y-2">
          <div className="max-w-[88%] space-y-1.5 rounded-xl rounded-tl-md border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="h-2 w-full max-w-[100%] rounded-full bg-slate-300/85" />
            <div className="h-2 w-[85%] rounded-full bg-slate-200" />
          </div>
          <div className="ml-auto max-w-[82%] space-y-1.5 rounded-xl rounded-tr-md border border-brand/15 bg-brand-light/90 px-3 py-2.5">
            <div className="h-2 w-full rounded-full bg-brand/45" />
            <div className="h-2 w-[70%] rounded-full bg-brand/30" />
          </div>
        </div>
        <div className="mt-2.5 h-8 rounded-lg border border-slate-200/80 bg-slate-50/90" />
      </div>
    </div>
  );
}

type SamenConnectHomeLandingProps = {
  heroBackgroundSrc?: string;
};

export function SamenConnectHomeLanding({
  heroBackgroundSrc,
}: SamenConnectHomeLandingProps = {}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f2f5] via-[#f3f4f6] to-[#f0f2f5] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/50 bg-white/[0.88] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:py-4">
          <Link href="/" className="flex items-center gap-2" aria-label="SamenConnect">
            <Image
              src="/samenconnect-icon.png"
              alt=""
              width={32}
              height={32}
              priority
              className="size-8 shrink-0 sm:size-9"
            />
            <span className="text-lg font-semibold leading-none tracking-tight text-slate-900">
              SamenConnect
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 sm:order-none sm:flex sm:w-auto sm:justify-end">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors duration-300 hover:text-brand-dark"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Inloggen
            </Link>
            <a
              href={earlyAccessHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "border-0 bg-brand text-white shadow-md shadow-brand/30 ring-1 ring-brand/25 hover:bg-brand-dark hover:shadow-lg hover:shadow-brand/35"
              )}
            >
              Claim je plek
            </a>
          </div>
        </div>
      </header>

      {heroBackgroundSrc ? (
        <PhotoHeroSection src={heroBackgroundSrc} />
      ) : (
        <section className="relative overflow-x-hidden border-b border-slate-200/45 bg-gradient-to-b from-white via-[#f6faf9] to-[#eef4f3]">
          <div
            className="pointer-events-none absolute -right-16 top-0 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(64,173,168,0.14)_0%,transparent_68%)] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-28 bottom-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle_at_center,rgba(64,173,168,0.1)_0%,transparent_65%)] blur-3xl"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:pb-24 sm:pt-20 md:pt-24 lg:pt-28">
            <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-x-14 lg:gap-y-10">
              <div className="max-w-xl lg:max-w-none">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand-light/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-dark sm:text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
                  Zorgplatform · Nederland
                </p>
                <h1 className="text-[1.8rem] font-bold leading-[1.1] tracking-tight text-slate-950 sm:text-[2.25rem] sm:leading-[1.08] md:text-[2.85rem] md:leading-[1.05]">
                  De juiste zorgverbinding —{" "}
                  <span className="text-brand-dark">zonder gedoe</span>
                  <span className="text-slate-950">.</span>
                </h1>
                <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed md:max-w-[540px]">
                  Sneller een passende match, minder gedoe in het traject — en direct
                  menselijk contact met wie zorg geeft, zonder eindeloos heen en weer.
                  Voor zorgverleners, opdrachtgevers en organisaties die het graag helder
                  en menselijk houden.
                </p>

                <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="flex w-full flex-col gap-2 sm:w-auto">
                    <a
                      href={earlyAccessHref}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "inline-flex w-full justify-center gap-2 border-0 bg-brand text-white shadow-lg shadow-brand/35 ring-1 ring-brand/30 transition-[box-shadow,background-color] duration-300 hover:bg-brand-dark hover:shadow-xl hover:shadow-brand/40 sm:w-auto sm:min-w-[260px]"
                      )}
                    >
                      Claim je plek
                      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                    </a>
                    <p className="mt-2 text-center sm:text-left">
                      <a
                        href="#platform"
                        className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline"
                      >
                        Bekijk hoe het werkt
                      </a>
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600 sm:justify-start sm:text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                        Direct contact met zorgverleners
                      </span>
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Ban className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                        Geen tussenpersonen
                      </span>
                      <span className="text-slate-300" aria-hidden>
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} aria-hidden />
                        Binnen 24u reactie
                      </span>
                    </div>
                    <p className="mt-3 text-center text-xs font-medium leading-snug text-slate-700 sm:max-w-sm sm:text-left sm:text-[13px]">
                      Beperkte plekken — we selecteren actief en nemen persoonlijk contact op
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "lg" }),
                      "w-full justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:w-auto"
                    )}
                  >
                    Inloggen
                  </Link>
                </div>

                <div className="mt-8 space-y-2 border-t border-slate-200/60 pt-8 md:max-w-lg">
                  <p className="text-sm font-medium text-slate-800">
                    Beperkte toegang. We laten je weten wanneer je kunt starten.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {REGISTRATION_OPEN
                      ? "Account aanmaken is open; early access blijft beschikbaar voor wie eerder mee wil."
                      : "Registratie voor nieuwe accounts is tijdelijk gesloten — alleen early access en bestaande gebruikers via inloggen."}
                  </p>
                </div>
              </div>

              <div className="lg:justify-self-end lg:pt-2">
                <HeroProductVisual />
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-center text-sm font-medium leading-relaxed text-slate-600 sm:mt-12 sm:text-base">
              <span className="text-slate-800">
                In de praktijk getest met echte zorgteams
              </span>{" "}
              — een groeiend netwerk van zorgverleners sluit aan. We verfijnen matching en
              gesprekken vanuit intake en opdrachten die ertoe doen.
            </p>
          </div>
        </section>
      )}

      <section
        id="waarom"
        className="relative border-b border-slate-200/45 bg-gradient-to-b from-[#e9edf1] via-[#e6eaef] to-[#e2e7ec] py-20 sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-[#f0f2f5]/90"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-[1.85rem] md:leading-snug">
              Waarom SamenConnect
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg sm:leading-relaxed">
              Minder ruis rond de zorg. Meer tijd voor mensen — minder voor spreadsheets,
              gemiste telefoontjes en losse e-mails die nergens op slaan.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-normal italic leading-relaxed text-slate-500 sm:mt-5 sm:text-[0.95rem]">
              Geen platform bedacht door developers — maar door mensen die weten hoe zorg
              écht werkt.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-7">
            {[
              {
                icon: HeartPulse,
                title: "Zorg zonder gedoe",
                text: "Intake, match en vervolg in één rustige lijn — zodat je energie houdt voor waar het toe doet, ook als zorg thuis speelt.",
                imageSrc: landingImg.careHome,
                imageAlt: "Zorg en rust aan huis",
              },
              {
                icon: MessageCircle,
                title: "Direct contact",
                text: "Gesprekken binnen het platform: minder heen-en-weer, sneller tot de kern — veilig, menselijk en terug te lezen.",
                imageSrc: landingImg.careSmile,
                imageAlt: "Persoonlijk contact",
              },
              {
                icon: Eye,
                title: "Transparantie",
                text: "Duidelijk wie wat doet, waarom iemand past, en wat je redelijkerwijs mag verwachten.",
                imageSrc: landingImg.nurse,
                imageAlt: "Zorgprofessional",
              },
              {
                icon: LayoutGrid,
                title: "Alles op één plek",
                text: "Zorgvraag, profielen, matches en berichten samen — minder zoeken, minder versnippering.",
                imageSrc: landingImg.remote,
                imageAlt: "Rustig werken met overzicht",
              },
            ].map(({ icon: Icon, title, text, imageSrc, imageAlt }) => (
              <div
                key={title}
                className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/65 bg-white/95 shadow-[0_6px_36px_-10px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/[0.035] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_48px_-14px_rgba(15,23,42,0.14)]"
              >
                <LandingImageCap
                  src={imageSrc}
                  alt={imageAlt}
                  className="aspect-[16/9] shrink-0 md:aspect-[5/3]"
                />
                <div className="flex flex-1 flex-col p-8 pt-7">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light/90 text-brand-dark ring-1 ring-brand/20">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="voor-wie"
        className="relative border-b border-slate-200/45 bg-gradient-to-b from-[#f0f2f5] via-white to-white py-20 sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300/35 to-transparent"
          aria-hidden
        />
        <div className="relative z-[1] mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-[1.85rem] md:leading-snug">
              Voor wie is het?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg sm:leading-relaxed">
              Twee kanten van dezelfde realiteit: wie zorg geeft — en wie zorg nodig heeft
              of organiseert. Beide verdienen rust, overzicht en eerlijke afspraken.
            </p>
          </div>
          <div className="mt-12 grid gap-7 sm:mt-14 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-b from-[#f6faf9] to-white shadow-[0_8px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-brand/10 transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_20px_52px_-18px_rgba(64,173,168,0.14)]">
              <LandingImageCap
                src={landingImg.nurse}
                alt="Zorgprofessional"
                className="aspect-[16/9] md:aspect-[2/1]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="flex flex-1 flex-col p-8 sm:p-10 sm:pt-9">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                  Voor professionals
                </p>
                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
                  <Users className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                  Zorgverleners
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Minder tijd kwijt aan zoeken en mailen. Meer grip op passende
                  opdrachten, je profiel en je communicatie — zodat je eerlijker kunt
                  verdienen en rustiger kunt plannen.
                </p>
                <ul className="mt-8 space-y-3.5 text-sm leading-snug text-slate-700">
                  {[
                    "Zicht op opdrachten die écht bij je passen",
                    "Profiel dat je expertise laat zien — geen generieke cv-molen",
                    "Berichten gekoppeld aan context: minder misverstanden",
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/75 bg-gradient-to-b from-slate-50/95 to-white shadow-[0_4px_32px_-10px_rgba(15,23,42,0.08)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_44px_-16px_rgba(15,23,42,0.11)]">
              <LandingImageCap
                src={landingImg.careHome}
                alt="Zorg aan huis"
                className="aspect-[16/9] md:aspect-[2/1]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="flex flex-1 flex-col p-8 sm:p-10 sm:pt-9">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Voor opdracht &amp; organisatie
                </p>
                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-md">
                  <Building2 className="h-6 w-6" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
                  Opdrachtgevers, PGB-houders &amp; organisaties
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                  Minder tussenpersonen, meer zeggenschap: je zorgvraag helder
                  neerzetten, inhoudelijk vergelijken en bewust kiezen — met
                  transparantie over verwachtingen en vervolg, thuis of in teamverband.
                </p>
                <ul className="mt-8 space-y-3.5 text-sm leading-snug text-slate-700">
                  {[
                    "Eén traject: van vraag tot match tot contact",
                    "Minder overhead: minder bellen, minder losse tools",
                    "Vertrouwen door duidelijkheid — geen verborgen stappen",
                  ].map((line) => (
                    <li key={line} className="flex gap-3">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="anders"
        className="relative border-b border-slate-200/45 bg-gradient-to-b from-[#e8ecf1] via-[#e6eaef] to-[#e2e7ee] py-20 sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/40 to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-[1.85rem] md:leading-snug">
              Wat maakt ons anders?
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg sm:leading-relaxed">
              Geen schreeuwerige marktplaats en geen black box zonder uitleg. Wél een
              platform met{" "}
              <strong className="font-semibold text-slate-800">
                eerlijkheid, transparantie en rust
              </strong>{" "}
              — afgestemd op hoe zorg in de praktijk werkt.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-7">
            {[
              {
                icon: MessageCircle,
                title: "Direct contact",
                body: "Geen eindeloze keten van tussenpersonen: jij praat met wie ertoe doet, in de context van de zorgvraag.",
              },
              {
                icon: Eye,
                title: "Transparantie die werkt",
                body: "Heldere keuzes: waarom iemand past, wat er verwacht wordt, en wat de volgende stap is — voor iedereen zichtbaar.",
              },
              {
                icon: Sparkles,
                title: "Minder gedoe",
                body: "Minder losse tools en mailtjes: intake, matching en opvolging horen bij elkaar — niet verspreid over vijf tabbladen.",
              },
              {
                icon: Layers,
                title: "Meer overzicht",
                body: "Eén lijn van vraag naar match naar gesprek. Zo raakt niemand het spoor bijster.",
              },
              {
                icon: Scale,
                title: "Eerlijker werken",
                body: "Ruimte voor professionele afspraken en fatsoenlijke tarieven — respect voor wie zorgt én voor wie zorg nodig heeft.",
              },
              {
                icon: Shield,
                title: "Gebouwd voor zorg",
                body: "Privacy en veiligheid zijn geen bijzaak: geen advertentiemodel op jouw zorgdata.",
              },
            ].map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className={cn(
                  "flex h-full flex-col rounded-3xl border bg-white/92 p-7 transition-all duration-500 ease-out hover:-translate-y-0.5 sm:p-8",
                  index < 2
                    ? "border-slate-200/70 shadow-[0_5px_32px_-10px_rgba(15,23,42,0.09)] ring-1 ring-slate-900/[0.04] hover:shadow-[0_16px_44px_-14px_rgba(15,23,42,0.12)]"
                    : "border-slate-200/80 shadow-[0_2px_22px_-8px_rgba(15,23,42,0.055)] hover:shadow-[0_12px_36px_-12px_rgba(15,23,42,0.09)]"
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light/90 text-brand-dark ring-1 ring-brand/18">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-6 font-semibold tracking-tight text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="technologie"
        className="relative border-b border-slate-200/45 border-t border-brand/25 bg-gradient-to-b from-[#dff3f0] via-[#eaf6f5] to-[#eef1f4] py-20 sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/35 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#f2f4f7]/95"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-[1.85rem] md:leading-snug">
              Slimme technologie die voor je werkt
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg sm:leading-relaxed">
              Technologie is hier geen doel op zich: die ondersteunt intake, matching en
              communicatie — met controles waar het moet, en uitleg waar het helpt.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:mt-14 md:grid-cols-3 md:gap-6 md:pb-1">
            {[
              {
                icon: ScanSearch,
                title: "Slimme matching",
                text: "Context weegt zwaarder dan losse filters: ervaring, beschikbaarheid en zorgvraag wegen mee, zodat voorstellen inhoudelijk kloppen — niet alleen op papier.",
              },
              {
                icon: MessageCircle,
                title: "Intake & directe communicatie",
                text: "Een geleide intake zodat de vraag vanaf het begin klopt, en gesprekken gekoppeld aan die context binnen het platform — minder ruis, minder heen-en-weer per e-mail.",
              },
              {
                icon: Bot,
                title: "AI-ondersteuning (optioneel)",
                text: "Waar het helpt, ondersteunt AI bij structureren of het helder maken van teksten — jij blijft beoordelen en beslissen. Geen black box, geen beloftes die de zorgpraktijk niet houdt.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <div
                key={title}
                className={cn(
                  "flex h-full flex-col rounded-3xl border bg-white/95 p-8 transition-all duration-500 ease-out hover:-translate-y-0.5",
                  index === 1
                    ? "border-brand/28 shadow-[0_14px_48px_-18px_rgba(64,173,168,0.22)] ring-1 ring-brand/18 md:-translate-y-1 md:px-8 md:py-9"
                    : "border-slate-200/85 shadow-[0_3px_28px_-8px_rgba(15,23,42,0.07)] hover:shadow-[0_14px_40px_-14px_rgba(15,23,42,0.1)]"
                )}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light/90 text-brand ring-1 ring-brand/22 shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="relative border-b border-slate-200/45 bg-gradient-to-b from-[#f6f8fa] via-[#f3f5f8] to-[#eef1f5] py-20 sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[#eaf6f4]/80 to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl md:text-[1.85rem] md:leading-snug">
              Zo oogt het platform
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:mt-5 sm:text-lg sm:leading-relaxed">
              Voorbeeldweergave — straks met jouw echte profielen, berichten en intake.
              Rustig, overzichtelijk, gemaakt om mee te werken in de zorgpraktijk.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200/75 bg-white/96 shadow-[0_6px_36px_-12px_rgba(15,23,42,0.1)] ring-1 ring-slate-900/[0.03] transition-shadow duration-500 hover:shadow-[0_12px_44px_-16px_rgba(15,23,42,0.12)] sm:mt-14 md:grid md:min-h-[260px] md:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)] md:items-stretch">
            <LandingImageCap
              src={landingImg.remote}
              alt="Rustig werken met het platform"
              layout="panel"
              className="md:min-h-0"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            <div className="flex flex-col justify-center border-t border-slate-200/65 bg-white/40 px-8 py-9 sm:px-10 sm:py-10 md:border-l md:border-t-0 md:py-12">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-dark">
                Werken op het platform
              </p>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Overzicht thuis of op locatie
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Matching, intake en berichten blijven op één plek — handig wanneer je
                coördineert vanuit huis, op kantoor of onderweg. Minder tabbladen, meer
                rust in het proces.
              </p>
            </div>
          </div>
          <div className="mt-12 grid gap-6 md:mt-14 md:grid-cols-3 md:gap-7">
            {[
              {
                title: "Matching",
                hint: "Overzicht",
                rows: [
                  { label: "Zorgtype & regio", meta: "3 criteria" },
                  { label: "Beschikbaarheid", meta: "Geverifieerd" },
                  { label: "Score & toelichting", meta: "Transparant" },
                ],
              },
              {
                title: "Berichten",
                hint: "In context",
                rows: [
                  { label: "Thread gekoppeld aan opdracht", meta: "Zichtbaar" },
                  { label: "Geen losse e-mailwisseling", meta: "Minder ruis" },
                  { label: "Status: reactie verwacht", meta: "Duidelijk" },
                ],
              },
              {
                title: "Intake",
                hint: "Geleid",
                rows: [
                  { label: "Stap 1 · Zorgvraag", meta: "Compleet" },
                  { label: "Stap 2 · Voorkeuren", meta: "2 open" },
                  { label: "Stap 3 · Review", meta: "Concept" },
                ],
              },
            ].map((card, index) => (
              <div
                key={card.title}
                className={cn(
                  "flex flex-col overflow-hidden rounded-3xl border bg-slate-50/85 transition-all duration-500 ease-out hover:-translate-y-0.5",
                  index === 1
                    ? "border-brand/22 shadow-[0_10px_40px_-12px_rgba(64,173,168,0.16)] ring-1 ring-brand/12 hover:shadow-[0_18px_48px_-16px_rgba(64,173,168,0.18)] md:-translate-y-0.5"
                    : "border-slate-200/80 shadow-[0_3px_26px_-8px_rgba(15,23,42,0.07)] hover:shadow-[0_14px_40px_-14px_rgba(15,23,42,0.1)]"
                )}
              >
                <div className="border-b border-slate-200/80 bg-white px-6 py-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-dark">
                      {card.hint}
                    </p>
                    <span className="rounded-md bg-slate-100/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      Demo
                    </span>
                  </div>
                  <p className="mt-2.5 text-lg font-semibold tracking-tight text-slate-900">
                    {card.title}
                  </p>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-5">
                  {card.rows.map((row, i) => (
                    <div
                      key={row.label}
                      className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                        <span className="text-xs font-semibold text-slate-800">
                          {row.label}
                        </span>
                        <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                          {row.meta}
                        </span>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div
                          className="h-1.5 flex-1 rounded-full bg-slate-100"
                          aria-hidden
                        >
                          <div
                            className="h-1.5 rounded-full bg-brand/85"
                            style={{ width: `${88 - i * 18}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="early-access"
        className="relative overflow-hidden border-t border-slate-800/60 bg-slate-950 py-20 text-white sm:py-24 md:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_70%_0%,rgba(64,173,168,0.18),transparent_58%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(64,173,168,0.1),transparent_48%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white/[0.06] via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-[1.85rem] md:leading-snug">
            {REGISTRATION_OPEN
              ? "Meld je aan en bouw mee"
              : "Early access — eerst toegang, dan live"}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-slate-300/95 sm:text-lg sm:leading-relaxed">
            {REGISTRATION_OPEN
              ? "We breiden het platform gefaseerd uit. Laat weten wie je bent en wat je zoekt — dan nemen we persoonlijk contact op."
              : "Publieke registratie staat tijdelijk uit. Early access is beperkt: je staat op de lijst en we laten weten wanneer je kunt starten."}
          </p>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-400">
            Beperkte toegang. We laten je weten wanneer je kunt starten — geen
            wachtlijst-theater, wél zorgvuldige uitrol.
          </p>
          <div className="mt-11 flex w-full max-w-md flex-col gap-3.5 sm:mx-auto sm:max-w-lg sm:flex-row sm:justify-center">
            <a
              href={earlyAccessHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex w-full justify-center gap-2 rounded-xl border-0 bg-brand text-white shadow-[0_12px_40px_-10px_rgba(64,173,168,0.45)] ring-1 ring-white/15 transition-[box-shadow,background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-[0_16px_44px_-10px_rgba(64,173,168,0.5)] sm:flex-1 sm:max-w-xs"
              )}
            >
              Claim je plek
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </a>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "w-full justify-center rounded-xl border border-white/15 text-slate-100 hover:bg-white/[0.08] hover:text-white sm:flex-1 sm:max-w-[200px]"
              )}
            >
              Inloggen
            </Link>
          </div>
          <p className="mt-5">
            <a
              href="#platform"
              className="text-sm font-medium text-slate-400 underline-offset-4 transition-colors hover:text-slate-200 hover:underline"
            >
              Bekijk hoe het werkt
            </a>
          </p>
          <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-semibold text-slate-300/95 sm:text-xs">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Direct contact met zorgverleners
            </span>
            <span className="hidden text-slate-600 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Geen tussenpersonen
            </span>
            <span className="hidden text-slate-600 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#7fd4cf]" strokeWidth={2} aria-hidden />
              Binnen 24u reactie
            </span>
          </div>
          <p className="mt-6 text-xs font-medium leading-relaxed text-slate-400 sm:mt-7 sm:text-sm">
            Beperkte plekken — we selecteren actief en nemen persoonlijk contact op
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-200/90 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-14 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
            <div className="max-w-sm">
              <Link
                href="/"
                className="mb-4 inline-flex items-center"
                aria-label="SamenConnect"
              >
                <Image
                  src="/samenconnect-logo.png"
                  alt=""
                  width={160}
                  height={114}
                  sizes="160px"
                  className="h-auto w-[160px] object-contain object-left"
                />
              </Link>
              <p className="mt-5 text-sm leading-relaxed text-slate-600">
                Zorg zonder gedoe: transparant, menselijk — met alles wat bij de zorg hoort
                op één rustige plek.
              </p>
              <div className="mt-8 rounded-2xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Contact
                </p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-1 inline-block text-sm font-semibold text-brand-dark underline-offset-4 hover:underline"
                >
                  {contactEmail}
                </a>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-2 gap-12 sm:grid-cols-3 lg:max-w-xl lg:gap-14">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Platform
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>
                    <Link
                      href="/zorenta"
                      className="transition-colors hover:text-brand-dark"
                    >
                      Ontdek SamenConnect
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="transition-colors hover:text-brand-dark"
                    >
                      Inloggen
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Early access
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-600">
                  <li>
                    <a
                      href={earlyAccessHref}
                      className="transition-colors hover:text-brand-dark"
                    >
                      Aanmelden
                    </a>
                  </li>
                </ul>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Juridisch
                </p>
                <ul className="mt-4 space-y-3 text-sm text-slate-500">
                  <li>Privacybeleid (binnenkort)</li>
                  <li>Algemene voorwaarden (binnenkort)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200/60 pt-6 text-center text-xs text-slate-400 sm:mt-12 sm:pt-8">
            © {new Date().getFullYear()} SamenConnect. Alle rechten voorbehouden.
          </div>
        </div>
      </footer>
    </div>
  );
}
