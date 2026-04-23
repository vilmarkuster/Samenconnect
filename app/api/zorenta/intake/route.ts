import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { primaryCareLabelFromTaxonomy } from "@/lib/zorenta/intake-taxonomy";
import { resolveJobPosterType } from "@/lib/zorenta/resolve-job-poster-type";

function inferRelationLabel(who: string | null): string | null {
  const raw = (who ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.includes("moeder")) return "moeder";
  if (raw.includes("vader")) return "vader";
  if (raw.includes("dochter")) return "dochter";
  if (raw.includes("zoon")) return "zoon";
  if (raw.includes("kind")) return "kind";
  if (raw.includes("partner")) return "partner";
  return null;
}

function generateJobTitleFromIntake(input: {
  careType: string | null;
  city: string | null;
  relation: string | null;
  frequency: string | null;
}): string {
  const care = (input.careType ?? "").trim();
  const city = (input.city ?? "").trim();
  const relation = (input.relation ?? "").trim();
  const frequency = (input.frequency ?? "").trim();

  const base = care ? care.charAt(0).toUpperCase() + care.slice(1).toLowerCase() : "Zorg";
  if (relation && city) {
    return `${base} voor ${relation} in ${city}`;
  }
  if (frequency && city) {
    const shortFreq = frequency.length > 24 ? "meerdere momenten per week" : frequency.toLowerCase();
    return `${base} gezocht (${shortFreq}) in ${city}`;
  }
  if (city) {
    return `${base} gezocht in ${city}`;
  }
  return `${base} gezocht`;
}

function buildAvailabilityText(freq: string | null, urgency: string | null, schedule: string | null): string | null {
  const chunks = [freq?.trim(), schedule?.trim(), urgency?.trim()].filter(
    (v): v is string => Boolean(v && v.length > 0)
  );
  if (chunks.length === 0) return null;
  return chunks.join(" · ");
}

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const { data, error } = await supabase
      .from("care_intakes")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return jsonResponse({ error: "Not found" }, 404);
    return jsonResponse(data);
  }
  const { data, error } = await supabase
    .from("care_intakes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ intakes: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  const posterTypeResolved = await resolveJobPosterType(supabase, userId, profile.role);
  if (!posterTypeResolved) {
    return jsonResponse({ error: "Alleen cliënten en organisaties kunnen een intake invullen." }, 403);
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const careTypeFromTaxonomy = primaryCareLabelFromTaxonomy(
    Array.isArray(body.soort_hulp_zorg)
      ? body.soort_hulp_zorg.filter((x): x is string => typeof x === "string")
      : undefined,
    Array.isArray(body.zorgniveau)
      ? body.zorgniveau.filter((x): x is string => typeof x === "string")
      : undefined
  );
  const careTypePrimary =
    careTypeFromTaxonomy ||
    (body.care_type ? String(body.care_type).trim() : null);

  // Only persist fields guaranteed to exist in schema to prevent runtime errors
  const payload = {
    user_id: userId,
    care_type: careTypePrimary || null,
    care_frequency: body.care_frequency ? String(body.care_frequency).trim() : null,
    preferred_city: body.preferred_city ? String(body.preferred_city).trim() : null,
    budget_min: body.budget_min != null && body.budget_min !== "" ? Number(body.budget_min) : null,
    budget_max: body.budget_max != null && body.budget_max !== "" ? Number(body.budget_max) : null,
    urgency: body.urgency ? String(body.urgency).trim() : null,
    notes: body.notes ? String(body.notes).trim() : null,
    status: body.status === "completed" ? "completed" : "draft",
    updated_at: new Date().toISOString(),
  };
  const id = body.id;
  let intakeRow: Record<string, unknown> | null = null;
  if (id) {
    const { data, error } = await supabase
      .from("care_intakes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    intakeRow = (data ?? null) as Record<string, unknown> | null;
  } else {
    const { data, error } = await supabase.from("care_intakes").insert(payload).select().single();
    if (error) return jsonResponse({ error: error.message }, 500);
    intakeRow = (data ?? null) as Record<string, unknown> | null;
  }
  if (!intakeRow) return jsonResponse({ error: "Intake opslaan mislukt." }, 500);

  const intakeId = String(intakeRow.id ?? "");
  const existingJobId = intakeRow.job_id ? String(intakeRow.job_id) : null;
  const relation = inferRelationLabel(
    body.who_needs_care ? String(body.who_needs_care) : null
  );
  const title = generateJobTitleFromIntake({
    careType:
      typeof intakeRow.care_type === "string"
        ? intakeRow.care_type
        : (payload.care_type as string | null),
    city:
      typeof intakeRow.preferred_city === "string"
        ? intakeRow.preferred_city
        : (payload.preferred_city as string | null),
    relation,
    frequency:
      typeof intakeRow.care_frequency === "string"
        ? intakeRow.care_frequency
        : (payload.care_frequency as string | null),
  });
  const availability = buildAvailabilityText(
    typeof intakeRow.care_frequency === "string"
      ? intakeRow.care_frequency
      : (payload.care_frequency as string | null),
    typeof intakeRow.urgency === "string"
      ? intakeRow.urgency
      : (payload.urgency as string | null),
    body.preferred_schedule ? String(body.preferred_schedule).trim() : null
  );
  const jobPayload = {
    poster_id: userId,
    poster_type: posterTypeResolved,
    title,
    description: typeof intakeRow.notes === "string" ? intakeRow.notes : null,
    city:
      typeof intakeRow.preferred_city === "string"
        ? intakeRow.preferred_city
        : (payload.preferred_city as string | null),
    region: body.preferred_region ? String(body.preferred_region).trim() : null,
    country: body.preferred_country ? String(body.preferred_country).trim() : "Nederland",
    care_type: typeof intakeRow.care_type === "string" ? intakeRow.care_type : null,
    care_context: typeof intakeRow.care_type === "string" ? intakeRow.care_type : null,
    budget_min: intakeRow.budget_min ?? null,
    budget_max: intakeRow.budget_max ?? null,
    schedule: body.preferred_schedule ? String(body.preferred_schedule).trim() : null,
    availability,
    status: "open",
    updated_at: new Date().toISOString(),
  };

  let finalJobId: string | null = existingJobId;
  let syncAction: "created" | "updated" = "updated";
  if (existingJobId) {
    const { data: jobCheck } = await supabase
      .from("care_jobs")
      .select("id, poster_id")
      .eq("id", existingJobId)
      .single();
    if (jobCheck?.id && jobCheck.poster_id === userId) {
      const { error: updateJobError } = await supabase
        .from("care_jobs")
        .update(jobPayload)
        .eq("id", existingJobId);
      if (updateJobError) return jsonResponse({ error: updateJobError.message }, 500);
      finalJobId = existingJobId;
    } else {
      const { data: createdJob, error: createJobError } = await supabase
        .from("care_jobs")
        .insert({ ...jobPayload, created_at: new Date().toISOString() })
        .select("id")
        .single();
      if (createJobError) return jsonResponse({ error: createJobError.message }, 500);
      finalJobId = createdJob?.id ? String(createdJob.id) : null;
      syncAction = "created";
    }
  } else {
    const { data: createdJob, error: createJobError } = await supabase
      .from("care_jobs")
      .insert({ ...jobPayload, created_at: new Date().toISOString() })
      .select("id")
      .single();
    if (createJobError) return jsonResponse({ error: createJobError.message }, 500);
    finalJobId = createdJob?.id ? String(createdJob.id) : null;
    syncAction = "created";
  }

  if (finalJobId && finalJobId !== existingJobId) {
    const { data: updatedIntake, error: linkErr } = await supabase
      .from("care_intakes")
      .update({ job_id: finalJobId, updated_at: new Date().toISOString() })
      .eq("id", intakeId)
      .eq("user_id", userId)
      .select()
      .single();
    if (linkErr) return jsonResponse({ error: linkErr.message }, 500);
    intakeRow = (updatedIntake ?? intakeRow) as Record<string, unknown>;
  }

  const responseStatus = id ? 200 : 201;
  return jsonResponse(
    {
      ...intakeRow,
      job_id: finalJobId,
      job_sync: finalJobId ? { action: syncAction, job_id: finalJobId } : null,
    },
    responseStatus
  );
}
