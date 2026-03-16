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
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  try {
    const { data: profiles, error, count } = await supabase
      .from("profiles")
      .select("id, display_name, role, plan_slug, subscription_status, stripe_customer_id", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const list = (profiles ?? []).map((p) => ({
      userId: p.id,
      displayName: p.display_name,
      role: p.role,
      planSlug: p.plan_slug ?? "free",
      subscriptionStatus: p.subscription_status ?? null,
      stripeCustomerId: p.stripe_customer_id ?? null,
    }));

    const [freeEqRes, freeNullRes, proRes, teamRes, featuredRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan_slug", "free"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).is("plan_slug", null),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan_slug", "pro"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan_slug", "team"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("plan_slug", "featured"),
    ]);
    const byPlan: Record<string, number> = {
      free: (freeEqRes.count ?? 0) + (freeNullRes.count ?? 0),
      pro: proRes.count ?? 0,
      team: teamRes.count ?? 0,
      featured: featuredRes.count ?? 0,
    };

    return new Response(
      JSON.stringify({
        users: list,
        total: count ?? 0,
        byPlan,
        placeholder: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
