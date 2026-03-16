/**
 * Zorenta plan types and definitions.
 * Used for UI and future feature gating. No enforcement in current flows.
 */

export type CaregiverPlanSlug = "free" | "featured";
export type ClientOrgPlanSlug = "free" | "pro" | "team";

export type PlanSlug = CaregiverPlanSlug | ClientOrgPlanSlug;

export interface PlanFeature {
  id: string;
  label: string;
  included: boolean;
}

export interface PlanDefinition {
  slug: PlanSlug;
  name: string;
  description: string;
  /** Placeholder price (e.g. "€0", "€19/maand"). Not charged yet. */
  priceLabel: string;
  features: PlanFeature[];
  /** Role this plan applies to */
  role: "caregiver" | "client" | "organization";
  ctaLabel: string;
  highlighted?: boolean;
}

/** Caregiver plans */
export const CAREGIVER_PLANS: PlanDefinition[] = [
  {
    slug: "free",
    name: "Gratis",
    description: "Standaard profiel en zichtbaarheid.",
    priceLabel: "€0",
    role: "caregiver",
    ctaLabel: "Huidige plan",
    features: [
      { id: "profile", label: "Profiel en zoekbaarheid", included: true },
      { id: "applications", label: "Solliciteren op vacatures", included: true },
      { id: "messages", label: "Berichten", included: true },
      { id: "reviews", label: "Reviews ontvangen", included: true },
      { id: "featured", label: "Uitgelicht in zoekresultaten", included: false },
    ],
  },
  {
    slug: "featured",
    name: "Uitgelicht profiel",
    description: "Meer zichtbaarheid bij opdrachtgevers.",
    priceLabel: "Binnenkort",
    role: "caregiver",
    ctaLabel: "Binnenkort beschikbaar",
    highlighted: true,
    features: [
      { id: "profile", label: "Profiel en zoekbaarheid", included: true },
      { id: "applications", label: "Solliciteren op vacatures", included: true },
      { id: "messages", label: "Berichten", included: true },
      { id: "reviews", label: "Reviews ontvangen", included: true },
      { id: "featured", label: "Uitgelicht in zoekresultaten", included: true },
    ],
  },
];

/** Client / Organization plans */
export const CLIENT_ORG_PLANS: PlanDefinition[] = [
  {
    slug: "free",
    name: "Gratis",
    description: "Vacatures plaatsen en matches ontvangen.",
    priceLabel: "€0",
    role: "client",
    ctaLabel: "Huidige plan",
    features: [
      { id: "jobs", label: "Vacatures plaatsen", included: true },
      { id: "intake", label: "Zorgvraag intake", included: true },
      { id: "applications", label: "Sollicitaties bekijken", included: true },
      { id: "messages", label: "Berichten", included: true },
      { id: "unlimited_jobs", label: "Onbeperkt vacatures", included: false },
      { id: "featured_jobs", label: "Uitgelichte vacatures", included: false },
      { id: "priority_support", label: "Prioriteit support", included: false },
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    description: "Voor opdrachtgevers met meer vacatures.",
    priceLabel: "Binnenkort",
    role: "client",
    ctaLabel: "Binnenkort beschikbaar",
    highlighted: true,
    features: [
      { id: "jobs", label: "Vacatures plaatsen", included: true },
      { id: "intake", label: "Zorgvraag intake", included: true },
      { id: "applications", label: "Sollicitaties bekijken", included: true },
      { id: "messages", label: "Berichten", included: true },
      { id: "unlimited_jobs", label: "Onbeperkt vacatures", included: true },
      { id: "featured_jobs", label: "Uitgelichte vacatures", included: true },
      { id: "priority_support", label: "Prioriteit support", included: false },
    ],
  },
  {
    slug: "team",
    name: "Team / Bureau",
    description: "Voor organisaties en wervingsbureaus.",
    priceLabel: "Binnenkort",
    role: "organization",
    ctaLabel: "Binnenkort beschikbaar",
    features: [
      { id: "jobs", label: "Vacatures plaatsen", included: true },
      { id: "intake", label: "Zorgvraag intake", included: true },
      { id: "applications", label: "Sollicitaties bekijken", included: true },
      { id: "messages", label: "Berichten", included: true },
      { id: "unlimited_jobs", label: "Onbeperkt vacatures", included: true },
      { id: "featured_jobs", label: "Uitgelichte vacatures", included: true },
      { id: "priority_support", label: "Prioriteit support", included: true },
    ],
  },
];

export function getPlansForRole(role: "caregiver" | "client" | "organization"): PlanDefinition[] {
  if (role === "caregiver") return CAREGIVER_PLANS;
  return CLIENT_ORG_PLANS;
}

export function getPlanBySlug(slug: PlanSlug): PlanDefinition | undefined {
  return [...CAREGIVER_PLANS, ...CLIENT_ORG_PLANS].find((p) => p.slug === slug);
}

export const DEFAULT_PLAN_SLUG: PlanSlug = "free";
