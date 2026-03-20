import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { jsonResponse } from "@/lib/zorenta/auth";

type ToggleBody = {
  userId?: string;
  jobId?: string;
};

function toSafeSupabaseError(err: unknown) {
  if (!err || typeof err !== "object") return { message: String(err) };
  const e = err as any;
  return {
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
  };
}

export async function POST(req: NextRequest) {
  const token = getAccessTokenFromRequest(req);
  if (!token) return jsonResponse({ error: "Missing Authorization token." }, 401);

  const supabase = getZorentaSupabaseClient(token);
  const body = (await req.json().catch(() => ({}))) as ToggleBody;

  const requestedUserId = typeof body.userId === "string" ? body.userId : null;
  const jobId = typeof body.jobId === "string" ? body.jobId : null;

  if (!jobId) return jsonResponse({ error: "jobId is required." }, 400);

  // Best-effort request log for debugging 500s in the server terminal.
  console.log("[favorites/toggle] request", {
    jobId,
    hasRequestedUserId: !!requestedUserId,
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error("[favorites/toggle] auth failed", toSafeSupabaseError(userError));
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const authUserId = userData.user.id;
  if (requestedUserId && requestedUserId !== authUserId) {
    return jsonResponse({ error: "Forbidden: userId mismatch." }, 403);
  }

  // Check if favorite exists
  const { data: existing, error: existingErr } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", authUserId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingErr) {
    console.error("[favorites/toggle] select existing failed", toSafeSupabaseError(existingErr));
    return jsonResponse(
      { error: existingErr.message ?? "Failed to check favorite." },
      500
    );
  }

  if (existing) {
    // Remove favorite
    const { error: delErr } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", authUserId)
      .eq("job_id", jobId);

    if (delErr) {
      console.error("[favorites/toggle] delete failed", toSafeSupabaseError(delErr));
      return jsonResponse({ error: delErr.message ?? "Failed to remove favorite." }, 500);
    }
    return jsonResponse({ status: "removed" }, 200);
  }

  // Add favorite
  const { data: inserted, error: insErr } = await supabase
    .from("favorites")
    .insert({ user_id: authUserId, job_id: jobId })
    .select("id")
    .single();

  if (insErr) {
    // If two toggles race, we might hit the unique constraint. Treat that as "added".
    if (insErr && (insErr as any).code === "23505") {
      console.warn("[favorites/toggle] unique violation treated as added", toSafeSupabaseError(insErr));
      return jsonResponse({ status: "added", favoriteId: null }, 201);
    }
    console.error("[favorites/toggle] insert failed", toSafeSupabaseError(insErr));
    return jsonResponse({ error: insErr.message ?? "Failed to add favorite." }, 500);
  }

  return jsonResponse({ status: "added", favoriteId: inserted?.id ?? null }, 201);
}

