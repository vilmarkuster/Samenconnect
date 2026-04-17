import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { jsonResponse } from "@/lib/zorenta/auth";
import { resolveJobPosterType } from "@/lib/zorenta/resolve-job-poster-type";
import { createJobSchema } from "@/lib/zorenta/validations";
import { normalizeJobImageUrls } from "@/lib/zorenta/job-images";
import { logger } from "@/lib/zorenta/logger";
import {
  labelsForValues,
  primaryCareLabelFromTaxonomy,
  SOORT_HULP_ZORG_OPTIONS,
} from "@/lib/zorenta/intake-taxonomy";

export async function GET(req: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(req);
    const supabase = getZorentaSupabaseClient(token);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const city = searchParams.get("city") || "";
    const careType = searchParams.get("care_type") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
    let q = supabase
      .from("care_jobs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (status) q = q.eq("status", status);
    if (city) q = q.ilike("city", `%${city}%`);
    if (careType) q = q.ilike("care_type", `%${careType}%`);
    const { data, error, count } = await q.range(offset, offset + limit - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ jobs: data ?? [], total: count ?? 0, limit, offset });
  } catch (e) {
    logger.error("Jobs GET failed", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Request failed" }, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await import("@/lib/zorenta/auth").then((m) => m.requireZorentaAuth(req));
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  const posterType = await resolveJobPosterType(supabase, userId, profile.role);
  if (!posterType) {
    return jsonResponse({ error: "Alleen cliënten en organisaties kunnen vacatures plaatsen." }, 403);
  }
  try {
    const body = await req.json().catch(() => ({}));
    const coerced = {
      ...body,
      title: body.title != null ? String(body.title).trim() : "",
      budget_min: body.budget_min != null && body.budget_min !== "" ? Number(body.budget_min) : null,
      budget_max: body.budget_max != null && body.budget_max !== "" ? Number(body.budget_max) : null,
      hourly_rate: body.hourly_rate != null && body.hourly_rate !== "" ? Number(body.hourly_rate) : null,
      image_urls: Array.isArray(body.image_urls) ? body.image_urls : undefined,
    };
    const parsed = createJobSchema.safeParse(coerced);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return jsonResponse({ error: first?.message ?? "Validatiefout." }, 400);
    }
    const {
      title,
      description,
      city,
      region,
      country,
      care_type,
      care_context,
      financiering_regeling,
      soort_hulp_zorg,
      zorgniveau,
      type_inzet,
      vaardigheden_ervaring,
      role_sought,
      experience_requirements,
      certificates_requirements,
      budget_min,
      budget_max,
      hourly_rate,
      schedule,
      availability,
      image_urls,
    } = parsed.data;
    const soortLabels = labelsForValues(SOORT_HULP_ZORG_OPTIONS, soort_hulp_zorg ?? undefined);
    const taxPrimary =
      primaryCareLabelFromTaxonomy(soort_hulp_zorg ?? undefined, zorgniveau ?? undefined) || null;
    const careCtx =
      taxPrimary ||
      (typeof care_context === "string" && care_context.trim()) ||
      (typeof care_type === "string" && care_type.trim()) ||
      (soortLabels[0] ?? null);
    const payload = {
      poster_id: userId,
      poster_type: posterType,
      title,
      description: description?.trim() || null,
      city: city?.trim() || null,
      region: region?.trim() || null,
      country: country?.trim() || null,
      care_type: careCtx,
      care_context: careCtx,
      financiering_regeling: financiering_regeling?.length ? financiering_regeling : null,
      soort_hulp_zorg: soort_hulp_zorg?.length ? soort_hulp_zorg : null,
      zorgniveau: zorgniveau?.length ? zorgniveau : null,
      type_inzet: type_inzet?.length ? type_inzet : null,
      vaardigheden_ervaring: vaardigheden_ervaring?.length ? vaardigheden_ervaring : null,
      role_sought: role_sought?.trim() || null,
      experience_requirements: experience_requirements?.trim() || null,
      certificates_requirements: certificates_requirements?.trim() || null,
      budget_min: budget_min != null && !Number.isNaN(budget_min) ? budget_min : null,
      budget_max: budget_max != null && !Number.isNaN(budget_max) ? budget_max : null,
      hourly_rate: hourly_rate != null && !Number.isNaN(hourly_rate) ? hourly_rate : null,
      schedule: schedule?.trim() || null,
      availability: availability?.trim() || null,
      status: "open",
      image_urls: normalizeJobImageUrls(image_urls ?? []),
    };

    const { data, error } = await supabase.from("care_jobs").insert(payload).select().single();
    if (error) {
      logger.error("Job create DB error", error);
      return jsonResponse({ error: error.message }, 500);
    }
    return jsonResponse(data, 201);
  } catch (e) {
    logger.error("Job create failed", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Aanvraag mislukt." }, 500);
  }
}
