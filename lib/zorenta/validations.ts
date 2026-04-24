import { z } from "zod";
import { HOURLY_EURO_MIN } from "@/lib/zorenta/hourly-euro-ux";

const imageUrlsField = z
  .array(z.string().max(2048))
  .max(5, "Maximaal 5 afbeeldingen")
  .optional()
  .nullable();

const taxonomyArr = z
  .array(z.string().max(80))
  .max(32)
  .optional()
  .nullable();

export const createJobSchema = z.object({
  title: z.string().min(1, "Titel is verplicht").max(200, "Titel mag maximaal 200 tekens zijn"),
  description: z.string().max(5000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  /** @deprecated use care_context; still accepted for older clients */
  care_type: z.string().max(100).optional().nullable(),
  care_context: z.string().max(100).optional().nullable(),
  /** Shared intake taxonomy (stable value strings) */
  financiering_regeling: taxonomyArr,
  soort_hulp_zorg: taxonomyArr,
  zorgniveau: taxonomyArr,
  type_inzet: taxonomyArr,
  vaardigheden_ervaring: taxonomyArr,
  role_sought: z.string().max(100).optional().nullable(),
  experience_requirements: z.string().max(2000).optional().nullable(),
  certificates_requirements: z.string().max(2000).optional().nullable(),
  budget_min: z.number().int().min(HOURLY_EURO_MIN).max(500).optional().nullable(),
  budget_max: z.number().int().min(HOURLY_EURO_MIN).max(500).optional().nullable(),
  hourly_rate: z.number().int().min(HOURLY_EURO_MIN).max(500).optional().nullable(),
  schedule: z.string().max(500).optional().nullable(),
  availability: z.string().max(200).optional().nullable(),
  image_urls: imageUrlsField,
}).superRefine((val, ctx) => {
  if (
    val.budget_min != null &&
    val.budget_max != null &&
    val.budget_min > val.budget_max
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "budget_min mag niet hoger zijn dan budget_max.",
      path: ["budget_min"],
    });
  }
});

export const applyToJobSchema = z.object({
  job_id: z.string().uuid("Ongeldige job"),
  message: z.string().max(2000).optional().nullable(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
