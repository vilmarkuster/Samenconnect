import { z } from "zod";

export const applicantTypeValues = [
  "caregiver",
  "client",
  "pgb_holder",
  "organization",
] as const;

export type ApplicantType = (typeof applicantTypeValues)[number];

export const earlyAccessSourceValues = [
  "landing_nav",
  "landing_hero_photo",
  "landing_hero",
  "landing_mid_cta",
  "landing_early_section",
  "landing_footer",
  "landing",
] as const;

export type EarlyAccessSource = (typeof earlyAccessSourceValues)[number];

export const earlyAccessSignupBodySchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Voornaam is verplicht")
    .max(80, "Voornaam mag maximaal 80 tekens zijn"),
  last_name: z
    .string()
    .trim()
    .min(1, "Achternaam is verplicht")
    .max(80, "Achternaam mag maximaal 80 tekens zijn"),
  email: z.string().trim().email("Vul een geldig e-mailadres in").max(254),
  phone: z.preprocess(
    (v) => (v == null || String(v).trim() === "" ? undefined : String(v).trim()),
    z.string().max(40, "Telefoonnummer is te lang").optional()
  ),
  applicant_type: z.enum(applicantTypeValues, {
    message: "Kies een type aanmelder",
  }),
  region: z
    .string()
    .trim()
    .min(2, "Vul je regio of woonplaats in")
    .max(120, "Regio mag maximaal 120 tekens zijn"),
  message: z
    .string()
    .trim()
    .min(10, "Schrijf minstens een paar woorden over wat je zoekt")
    .max(4000, "Toelichting is te lang"),
  consent_privacy: z.coerce
    .boolean()
    .refine((v) => v === true, "Je moet akkoord gaan met de verwerking van je gegevens"),
  source: z.enum(earlyAccessSourceValues).optional().default("landing"),
});

export type EarlyAccessSignupBody = z.infer<typeof earlyAccessSignupBodySchema>;

export function parseEarlyAccessSource(raw: unknown): EarlyAccessSource {
  const s = typeof raw === "string" ? raw.trim() : "landing";
  if ((earlyAccessSourceValues as readonly string[]).includes(s)) {
    return s as EarlyAccessSource;
  }
  return "landing";
}
