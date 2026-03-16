import { NextRequest } from "next/server";
import { getZorentaSupabaseClient, getAccessTokenFromRequest } from "@/lib/zorenta/supabase-server";
import { jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const token = getAccessTokenFromRequest(req);
  const supabase = getZorentaSupabaseClient(token);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // "caregivers" | "jobs"
  const city = searchParams.get("city") || "";
  const region = searchParams.get("region") || "";
  const careType = searchParams.get("care_type") || "";
  const skills = searchParams.get("skills") || "";
  const availability = searchParams.get("availability") || "";
  const minRating = searchParams.get("min_rating");
  const minRatingNum = minRating != null && minRating !== "" ? parseFloat(minRating) : null;
  const minExperience = searchParams.get("min_experience");
  const minExperienceNum = minExperience != null && minExperience !== "" ? parseInt(minExperience, 10) : null;
  const maxHourlyRate = searchParams.get("max_hourly_rate");
  const maxHourlyRateNum = maxHourlyRate != null && maxHourlyRate !== "" ? parseFloat(maxHourlyRate) : null;

  if (type === "jobs") {
    let q = supabase.from("care_jobs").select("*").eq("status", "open").order("created_at", { ascending: false });
    if (city) q = q.ilike("city", `%${city}%`);
    if (careType) q = q.ilike("care_type", `%${careType}%`);
    const { data, error } = await q.limit(50);
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse({ jobs: data ?? [] });
  }

  if (type === "caregivers" || !type) {
    let q = supabase.from("caregiver_profiles").select("*").order("created_at", { ascending: false });
    if (city) q = q.ilike("city", `%${city}%`);
    if (region) q = q.ilike("region", `%${region}%`);
    if (availability) q = q.ilike("availability", `%${availability}%`);
    if (minExperienceNum != null && !Number.isNaN(minExperienceNum) && minExperienceNum >= 0)
      q = q.gte("experience_years", minExperienceNum);
    if (maxHourlyRateNum != null && !Number.isNaN(maxHourlyRateNum) && maxHourlyRateNum >= 0)
      q = q.lte("hourly_rate", maxHourlyRateNum);
    if (skills) {
      const arr = skills.split(",").map((s) => s.trim()).filter(Boolean);
      if (arr.length) q = q.overlaps("skills", arr);
    }
    const { data: caregivers, error } = await q.limit(100);
    if (error) return jsonResponse({ error: error.message }, 500);
    let list = caregivers ?? [];
    if (careType) {
      const ct = careType.trim().toLowerCase();
      list = list.filter((c) => {
        const headline = (c.headline ?? "").toLowerCase();
        const skillList = (c.skills ?? []) as string[];
        const hasSkill = skillList.some((s) => String(s).toLowerCase().includes(ct) || ct.includes(String(s).toLowerCase()));
        return hasSkill || headline.includes(ct);
      });
    }

    if (minRatingNum != null && !Number.isNaN(minRatingNum) && minRatingNum > 0) {
      const profileIds = [...new Set(list.map((c) => c.profile_id))];
      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("reviewee_id, rating")
        .in("reviewee_id", profileIds);
      const sumCount: Record<string, { sum: number; count: number }> = {};
      (reviewRows ?? []).forEach((r) => {
        const row = r as { reviewee_id: string; rating: number };
        if (!sumCount[row.reviewee_id]) sumCount[row.reviewee_id] = { sum: 0, count: 0 };
        sumCount[row.reviewee_id].sum += row.rating;
        sumCount[row.reviewee_id].count += 1;
      });
      const passingIds = new Set(
        Object.entries(sumCount)
          .filter(([, v]) => v.count > 0 && v.sum / v.count >= minRatingNum)
          .map(([id]) => id)
      );
      list = list.filter((c) => passingIds.has(c.profile_id));
    }

    const ids = [...new Set(list.map((c) => c.profile_id))];
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
    const profileMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
    const { data: reviewRows } = ids.length ? await supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", ids) : { data: [] };
    const sumCount: Record<string, { sum: number; count: number }> = {};
    (reviewRows ?? []).forEach((r) => {
      const row = r as { reviewee_id: string; rating: number };
      if (!sumCount[row.reviewee_id]) sumCount[row.reviewee_id] = { sum: 0, count: 0 };
      sumCount[row.reviewee_id].sum += row.rating;
      sumCount[row.reviewee_id].count += 1;
    });
    const avgRating: Record<string, number> = {};
    Object.entries(sumCount).forEach(([pid, v]) => { avgRating[pid] = v.count > 0 ? Math.round((v.sum / v.count) * 10) / 10 : 0; });
    const out = list.slice(0, 50).map((c) => ({
      ...c,
      profile: profileMap[c.profile_id] ?? null,
      average_rating: avgRating[c.profile_id] ?? null,
    }));
    return jsonResponse({ caregivers: out });
  }

  return jsonResponse({ error: "type must be caregivers or jobs." }, 400);
}
