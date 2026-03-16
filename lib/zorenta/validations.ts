import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1, "Titel is verplicht").max(200, "Titel mag maximaal 200 tekens zijn"),
  description: z.string().max(5000).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  care_type: z.string().max(100).optional().nullable(),
  budget_min: z.number().min(0).optional().nullable(),
  budget_max: z.number().min(0).optional().nullable(),
  hourly_rate: z.number().min(0).optional().nullable(),
  schedule: z.string().max(200).optional().nullable(),
  availability: z.string().max(200).optional().nullable(),
});

export const applyToJobSchema = z.object({
  job_id: z.string().uuid("Ongeldige job"),
  message: z.string().max(2000).optional().nullable(),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;
