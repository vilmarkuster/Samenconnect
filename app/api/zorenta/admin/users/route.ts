import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/zorenta/admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify(auth.body), {
      status: auth.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { supabase } = auth;
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") || "";
  const q = searchParams.get("q") || "";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    let query = supabase
      .from("profiles")
      .select("id, display_name, role, created_at, plan_slug, stripe_customer_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (role && ["caregiver", "client", "organization", "admin"].includes(role)) {
      query = query.eq("role", role);
    }
    if (q.trim()) {
      query = query.or(`display_name.ilike.%${q.trim()}%`);
    }

    const { data: profiles, error, count } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userIds = (profiles ?? []).map((p) => p.id);
    const [jobsCount, applicationsCount] = await Promise.all([
      userIds.length
        ? supabase.from("care_jobs").select("poster_id").in("poster_id", userIds)
        : { data: [] },
      userIds.length
        ? supabase.from("job_applications").select("applicant_id").in("applicant_id", userIds)
        : { data: [] },
    ]);

    const jobsByUser: Record<string, number> = {};
    (jobsCount.data ?? []).forEach((r: { poster_id: string }) => {
      jobsByUser[r.poster_id] = (jobsByUser[r.poster_id] ?? 0) + 1;
    });
    const applicationsByUser: Record<string, number> = {};
    (applicationsCount.data ?? []).forEach((r: { applicant_id: string }) => {
      applicationsByUser[r.applicant_id] = (applicationsByUser[r.applicant_id] ?? 0) + 1;
    });

    const users = (profiles ?? []).map((p) => ({
      ...p,
      jobsCount: jobsByUser[p.id] ?? 0,
      applicationsCount: applicationsByUser[p.id] ?? 0,
    }));

    return new Response(
      JSON.stringify({ users, total: count ?? 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
