import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";
import { jsonResponse } from "@/lib/zorenta/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: profileId } = await params;
  const supabase = getSupabaseClient();
  const { data: profile, error: pError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", profileId)
    .single();
  if (pError || !profile) return jsonResponse({ error: "Profile not found." }, 404);
  const { data: caregiver, error: cError } = await supabase
    .from("caregiver_profiles")
    .select("*")
    .eq("profile_id", profileId)
    .single();
  if (cError || !caregiver) return jsonResponse({ error: "Caregiver profile not found." }, 404);
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer_id")
    .eq("reviewee_id", profileId)
    .order("created_at", { ascending: false })
    .limit(50);
  const { data: agg } = await supabase.from("reviews").select("rating").eq("reviewee_id", profileId);
  const ratings = (agg ?? []).map((r: { rating: number }) => r.rating).filter((n: number) => n != null);
  const average = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;
  return jsonResponse({
    profile: { id: profile.id, display_name: profile.display_name },
    caregiver,
    reviews: reviews ?? [],
    averageRating: average != null ? Math.round(average * 10) / 10 : null,
    reviewCount: ratings.length,
  });
}
