import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("generated_apps")
      .select("id, name, slug, description, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { apps: [], error: error.message },
        { status: 200 }
      );
    }
    return NextResponse.json({ apps: data ?? [] });
  } catch {
    return NextResponse.json({ apps: [] });
  }
}
