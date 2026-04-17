import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { latestMarketplaceCaregiverIdByProfileId } from "@/lib/zorenta/marketplace-caregiver-id";
import { DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS } from "@/lib/zorenta/caregiver-public-profile-route-id";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, job_id, application_id, participant_1, participant_2, created_at, updated_at")
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) return jsonResponse({ error: error.message }, 500);
  const convIds = (convos ?? []).map((c) => c.id);
  let lastMessages: Record<string, { body: string; created_at: string }> = {};
  let unreadCounts: Record<string, number> = {};
  if (convIds.length > 0) {
    // Latest message per conversation (global desc order). Use a high limit so we are not
    // truncated by PostgREST default max rows when many conversations exist.
    const { data: msgs } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false })
      .limit(10_000);
    const seen = new Set<string>();
    (msgs ?? []).forEach((m: { conversation_id: string; body: string; created_at: string }) => {
      if (!seen.has(m.conversation_id)) {
        seen.add(m.conversation_id);
        lastMessages[m.conversation_id] = { body: m.body, created_at: m.created_at };
      }
    });

    /**
     * unread_count (authoritative, per conversation):
     *   COUNT(*) WHERE conversation_id IN convIds AND sender_id <> current user AND read_at IS NULL
     * (incoming only; own messages never count as unread).
     */
    const { data: unreadRows } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, read_at")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("read_at", null);

    (unreadRows ?? []).forEach((m: { id: string; conversation_id: string; sender_id: string | null }) => {
      unreadCounts[m.conversation_id] = (unreadCounts[m.conversation_id] ?? 0) + 1;
    });
  }
  const appIds = [...new Set((convos ?? []).map((c) => c.application_id).filter(Boolean))] as string[];
  let applicationMap: Record<string, { id: string; status: string; job_id: string }> = {};
  if (appIds.length > 0) {
    const { data: appRows } = await supabase
      .from("job_applications")
      .select("id, status, job_id")
      .in("id", appIds);
    applicationMap = Object.fromEntries(
      (appRows ?? []).map((a: { id: string; status: string; job_id: string }) => [a.id, a])
    );
  }
  const jobIds = [...new Set((convos ?? []).map((c) => c.job_id).filter(Boolean))] as string[];
  const jobs = jobIds.length
    ? await supabase.from("care_jobs").select("id, title").in("id", jobIds)
    : { data: [] };
  const jobMap = Object.fromEntries((jobs.data ?? []).map((j) => [j.id, j]));
  const ids = [...new Set((convos ?? []).flatMap((c) => [c.participant_1, c.participant_2]).filter((id) => id !== userId))];
  const profiles = ids.length
    ? await supabase.from("profiles").select("id, display_name, role, avatar_url").in("id", ids)
    : { data: [] };
  const profileRows = profiles.data ?? [];
  const profileMap = Object.fromEntries(profileRows.map((p) => [p.id, p]));

  /**
   * Profile navigation for `/caregivers/[id]` (aligned with hasRenderablePublicCaregiverPagePayload):
   * - If `caregiver_profiles` exists → URL uses `profiles.id`; page renders.
   * - Else only a marketplace listing → no public profile page (org/kaart-API ≠ renderbare caregiver-pagina).
   *   `caregiver_route_id` may still be set for debugging; links use `has_renderable_caregiver_profile`.
   */
  const marketplaceByProfile =
    ids.length > 0 ? await latestMarketplaceCaregiverIdByProfileId(supabase, ids) : new Map<string, string>();
  const { data: cpRows } =
    ids.length > 0
      ? await supabase.from("caregiver_profiles").select("id, profile_id").in("profile_id", ids)
      : { data: [] };
  const caregiverProfilePkByProfileId = Object.fromEntries(
    (cpRows ?? []).map((r: { id: string; profile_id: string }) => [r.profile_id, r.id])
  );

  type RouteSource = "marketplace" | "caregiver_profile";

  function resolvePublicCaregiverPageRoute(p: {
    id: string;
    role: string | null;
  }): {
    caregiver_route_id: string | null;
    caregiver_route_source: RouteSource | null;
    has_renderable_caregiver_profile: boolean;
  } {
    const cp = caregiverProfilePkByProfileId[p.id] ?? null;
    const mpRaw = marketplaceByProfile.get(p.id) ?? null;
    const mp =
      mpRaw && !DISALLOWED_PUBLIC_CAREGIVER_ROUTE_IDS.has(mpRaw) ? mpRaw : null;

    /** Linked `caregiver_profiles`: use `profiles.id` in the URL (GET /caregivers/[id] step B). */
    if (cp) {
      return {
        caregiver_route_id: p.id,
        caregiver_route_source: "caregiver_profile",
        has_renderable_caregiver_profile: true,
      };
    }
    if (mp) {
      return {
        caregiver_route_id: mp,
        caregiver_route_source: "marketplace",
        has_renderable_caregiver_profile: false,
      };
    }
    /**
     * No caregiver_profiles and no usable marketplace row — cannot safely link (avoid 404).
     */
    return {
      caregiver_route_id: null,
      caregiver_route_source: null,
      has_renderable_caregiver_profile: false,
    };
  }

  const list = (convos ?? []).map((c) => ({
    ...c,
    other: (() => {
      const oid = c.participant_1 === userId ? c.participant_2 : c.participant_1;
      const p = profileMap[oid];
      if (!p) return null;
      const route = resolvePublicCaregiverPageRoute({ id: p.id, role: p.role });
      return {
        ...p,
        caregiver_route_id: route.caregiver_route_id,
        caregiver_route_source: route.caregiver_route_source,
        has_renderable_caregiver_profile: route.has_renderable_caregiver_profile,
      };
    })(),
    job: c.job_id ? (jobMap[c.job_id] ?? null) : null,
    application: c.application_id ? (applicationMap[c.application_id] ?? null) : null,
    unread_count: unreadCounts[c.id] ?? 0,
    last_message: lastMessages[c.id] ?? null,
  })).sort((a, b) => {
    const aIso = a.last_message?.created_at ?? a.updated_at ?? "";
    const bIso = b.last_message?.created_at ?? b.updated_at ?? "";
    const aTs = Date.parse(aIso);
    const bTs = Date.parse(bIso);
    return (Number.isFinite(bTs) ? bTs : 0) - (Number.isFinite(aTs) ? aTs : 0);
  });
  return jsonResponse({ conversations: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId } = auth;
  const body = await req.json().catch(() => ({}));
  const otherId = body.other_user_id ?? body.applicant_id ?? body.poster_id;
  const jobId = body.job_id || null;
  const applicationId = body.application_id || null;
  if (!otherId) return jsonResponse({ error: "other_user_id or applicant_id/poster_id required." }, 400);
  const p1 = userId < otherId ? userId : otherId;
  const p2 = userId < otherId ? otherId : userId;

  // Application-scoped: reuse only by application_id (no participants-only fallback).
  if (applicationId) {
    const { data: forApplication } = await supabase
      .from("conversations")
      .select("id")
      .eq("application_id", applicationId)
      .maybeSingle();
    if (forApplication) {
      return jsonResponse({ id: forApplication.id, created: false }, 200);
    }
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        participant_1: p1,
        participant_2: p2,
        job_id: jobId,
        application_id: applicationId,
      })
      .select()
      .single();
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ id: data.id, created: true }, 201);
  }

  // Same job + same pair (e.g. dashboard "Reageer", or thread na sollicitatie): één draad per opdracht.
  if (jobId) {
    const { data: forJobPair } = await supabase
      .from("conversations")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .eq("job_id", jobId)
      .maybeSingle();
    if (forJobPair?.id) {
      return jsonResponse({ id: forJobPair.id, created: false }, 200);
    }
  }

  // Legacy: no application_id — at most one conversation per pair without application link.
  const { data: legacy } = await supabase
    .from("conversations")
    .select("id")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .is("application_id", null)
    .maybeSingle();
  if (legacy) {
    if (jobId) {
      await supabase
        .from("conversations")
        .update({
          job_id: jobId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", legacy.id);
    }
    return jsonResponse({ id: legacy.id, created: false }, 200);
  }
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      participant_1: p1,
      participant_2: p2,
      job_id: jobId,
      application_id: null,
    })
    .select()
    .single();
  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse({ id: data.id, created: true }, 201);
}
