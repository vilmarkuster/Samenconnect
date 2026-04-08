import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getPlatformSupabaseServerClient, getPlatformUserOrNull } from "@/lib/platform-supabase-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return NextResponse.json({ apps: [], error: "Unauthorized." }, { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
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
