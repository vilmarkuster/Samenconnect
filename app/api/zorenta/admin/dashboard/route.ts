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

  try {
    const [
      { count: totalUsers },
      { count: totalCaregivers },
      { count: totalClients },
      { count: totalOrgs },
      { count: totalJobs },
      { count: openJobs },
      { count: totalApplications },
      { count: totalConversations },
      { count: totalMessages },
      { count: totalReviews },
      { count: unreadNotifications },
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "caregiver"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "organization"),
      supabase.from("care_jobs").select("id", { count: "exact", head: true }),
      supabase.from("care_jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("job_applications").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
      supabase.from("messages").select("id", { count: "exact", head: true }),
      supabase.from("reviews").select("id", { count: "exact", head: true }),
      supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    ]);

    const stats = {
      totalUsers: totalUsers ?? 0,
      caregivers: totalCaregivers ?? 0,
      clients: totalClients ?? 0,
      organizations: totalOrgs ?? 0,
      totalJobs: totalJobs ?? 0,
      openJobs: openJobs ?? 0,
      totalApplications: totalApplications ?? 0,
      totalConversations: totalConversations ?? 0,
      totalMessages: totalMessages ?? 0,
      totalReviews: totalReviews ?? 0,
      unreadNotifications: unreadNotifications ?? 0,
      billingPlaceholder: true,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Request failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
