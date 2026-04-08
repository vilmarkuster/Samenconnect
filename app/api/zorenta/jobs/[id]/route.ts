import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { jsonResponse } from "@/lib/zorenta/auth";
import { normalizeJobImageUrls } from "@/lib/zorenta/job-images";
import { primaryCareLabelFromTaxonomy } from "@/lib/zorenta/intake-taxonomy";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = getAccessTokenFromRequest(req);
  const supabase = getZorentaSupabaseClient(token);
  const { data, error } = await supabase
    .from("care_jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return jsonResponse({ error: "Job not found." }, 404);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await import("@/lib/zorenta/auth").then((m) => m.requireZorentaAuth(req));
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { id } = await params;
  const { data: job } = await supabase.from("care_jobs").select("poster_id").eq("id", id).single();
  if (!job || job.poster_id !== userId) return jsonResponse({ error: "Forbidden." }, 403);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return jsonResponse({ error: "Titel is verplicht." }, 400);
      if (title.length > 200) return jsonResponse({ error: "Titel mag maximaal 200 tekens zijn." }, 400);
    }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = String(body.title).trim() || null;
    if (body.description !== undefined) updates.description = body.description ? String(body.description).trim() : null;
    if (body.city !== undefined) updates.city = body.city ? String(body.city).trim() : null;
    if (body.region !== undefined) updates.region = body.region ? String(body.region).trim() : null;
    if (body.country !== undefined) updates.country = body.country ? String(body.country).trim() : null;
    if (body.care_type !== undefined) updates.care_type = body.care_type ? String(body.care_type).trim() : null;
    const taxonomyKeys = [
      "financiering_regeling",
      "soort_hulp_zorg",
      "zorgniveau",
      "type_inzet",
      "vaardigheden_ervaring",
    ] as const;
    for (const key of taxonomyKeys) {
      if (body[key] !== undefined) {
        const raw = body[key];
        updates[key] = Array.isArray(raw) ? raw.filter((x: unknown) => typeof x === "string") : null;
      }
    }
    if (body.soort_hulp_zorg !== undefined || body.zorgniveau !== undefined) {
      const { data: existing } = await supabase
        .from("care_jobs")
        .select("soort_hulp_zorg, zorgniveau")
        .eq("id", id)
        .single();
      const mergeSoort =
        updates.soort_hulp_zorg !== undefined
          ? (updates.soort_hulp_zorg as string[] | null)
          : (existing?.soort_hulp_zorg as string[] | null | undefined);
      const mergeZn =
        updates.zorgniveau !== undefined
          ? (updates.zorgniveau as string[] | null)
          : (existing?.zorgniveau as string[] | null | undefined);
      const taxPrimary = primaryCareLabelFromTaxonomy(
        Array.isArray(mergeSoort) && mergeSoort.length ? mergeSoort : undefined,
        Array.isArray(mergeZn) && mergeZn.length ? mergeZn : undefined
      );
      if (taxPrimary && body.care_type === undefined && body.care_context === undefined) {
        updates.care_type = taxPrimary;
        updates.care_context = taxPrimary;
      }
    }
    if (body.care_context !== undefined) {
      const cc = body.care_context ? String(body.care_context).trim() : null;
      updates.care_context = cc;
      if (body.care_type === undefined) updates.care_type = cc;
    }
    if (body.role_sought !== undefined) updates.role_sought = body.role_sought ? String(body.role_sought).trim() : null;
    if (body.experience_requirements !== undefined) {
      updates.experience_requirements = body.experience_requirements
        ? String(body.experience_requirements).trim()
        : null;
    }
    if (body.certificates_requirements !== undefined) {
      updates.certificates_requirements = body.certificates_requirements
        ? String(body.certificates_requirements).trim()
        : null;
    }
    if (body.budget_min !== undefined) updates.budget_min = body.budget_min != null && !Number.isNaN(Number(body.budget_min)) ? Number(body.budget_min) : null;
    if (body.budget_max !== undefined) updates.budget_max = body.budget_max != null && !Number.isNaN(Number(body.budget_max)) ? Number(body.budget_max) : null;
    if (body.hourly_rate !== undefined) updates.hourly_rate = body.hourly_rate != null && !Number.isNaN(Number(body.hourly_rate)) ? Number(body.hourly_rate) : null;
    if (body.schedule !== undefined) updates.schedule = body.schedule ? String(body.schedule).trim() : null;
    if (body.availability !== undefined) updates.availability = body.availability ? String(body.availability).trim() : null;
    if (body.status !== undefined && ["open", "closed", "filled"].includes(body.status)) updates.status = body.status;
    if (body.image_urls !== undefined) {
      const raw = Array.isArray(body.image_urls) ? body.image_urls : [];
      updates.image_urls = normalizeJobImageUrls(raw);
    }
    const { data, error } = await supabase.from("care_jobs").update(updates).eq("id", id).select().single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data);
  } catch (e) {
    return jsonResponse({ error: e instanceof Error ? e.message : "Request failed" }, 500);
  }
}
