import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const [companiesRes, dealsRes, tasksRes] = await Promise.all([
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open")
    ]);

    const companies = companiesRes.count ?? 0;
    const openDeals = dealsRes.count ?? 0;
    const openTasks = tasksRes.count ?? 0;

    return NextResponse.json({
      companies,
      openDeals,
      openTasks
    });
  } catch (err) {
    return NextResponse.json(
      { companies: 0, openDeals: 0, openTasks: 0, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
