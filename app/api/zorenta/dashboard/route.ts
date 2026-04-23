import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";

export async function GET(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;

  if (profile.role === "caregiver") {
    const [jobsRes, appsRes, notifRes, convosRes] = await Promise.all([
      supabase.from("care_jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("job_applications").select("id, status, created_at, job_id").eq("applicant_id", userId).order("created_at", { ascending: false }).limit(5),
      supabase.from("notifications").select("id, type, title, created_at").eq("user_id", userId).is("read_at", null).limit(5),
      supabase.from("conversations").select("id", { count: "exact", head: true }).or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
    ]);
    const apps = appsRes.data ?? [];
    const jobIds = [...new Set(apps.map((a: { job_id: string }) => a.job_id))];
    const { data: jobs } = jobIds.length ? await supabase.from("care_jobs").select("id, title").in("id", jobIds) : { data: [] };
    const jobMap = Object.fromEntries((jobs ?? []).map((j: { id: string; title: string }) => [j.id, j]));
    const recentApplications = apps.map((a: { job_id: string }) => ({ ...a, care_jobs: jobMap[a.job_id] }));
    const { count: appsCount } = await supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("applicant_id", userId);
    return jsonResponse({
      role: "caregiver",
      openJobsCount: jobsRes.count ?? 0,
      applicationsCount: appsCount ?? 0,
      recentApplications,
      unreadNotifications: notifRes.data ?? [],
      conversationsCount: convosRes.count ?? 0,
    });
  }

  if (profile.role === "client" || profile.role === "organization") {
    const [myJobsRes, intakesRes, convosRes] = await Promise.all([
      supabase.from("care_jobs").select("id, title, status, created_at").eq("poster_id", userId).order("created_at", { ascending: false }),
      supabase.from("care_intakes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("conversations").select("id", { count: "exact", head: true }).or(`participant_1.eq.${userId},participant_2.eq.${userId}`),
    ]);
    const myJobs = myJobsRes.data ?? [];
    const jobIds = myJobs.map((j: { id: string }) => j.id);
    const { count: applicationsCount } = jobIds.length
      ? await supabase.from("job_applications").select("id", { count: "exact", head: true }).in("job_id", jobIds)
      : { count: 0 };
    const { data: appList } = jobIds.length
      ? await supabase.from("job_applications").select("id, job_id, applicant_id, status, message, created_at").in("job_id", jobIds).order("created_at", { ascending: false }).limit(20)
      : { data: [] };
    const applicationsByJob = (appList ?? []).reduce((acc: Record<string, number>, a: { job_id: string }) => {
      acc[a.job_id] = (acc[a.job_id] || 0) + 1;
      return acc;
    }, {});
    const applicantIds = [...new Set((appList ?? []).map((a: { applicant_id: string }) => a.applicant_id))];
    const { data: profs } = applicantIds.length ? await supabase.from("profiles").select("id, display_name").in("id", applicantIds) : { data: [] };
    const profileMap = Object.fromEntries((profs ?? []).map((p: { id: string; display_name: string | null }) => [p.id, p]));
    const jobMap = Object.fromEntries((myJobs ?? []).map((j: { id: string; title: string }) => [j.id, j]));
    const recentApplications = (appList ?? []).map((a: { applicant_id: string; job_id: string }) => ({
      ...a,
      job_title: jobMap[a.job_id]?.title ?? null,
      applicant_display_name: profileMap[a.applicant_id]?.display_name ?? null,
    }));
    const { data: unread } = await supabase
      .from("notifications")
      .select("id, type, title, created_at")
      .eq("user_id", userId)
      .is("read_at", null)
      .limit(5);
    return jsonResponse({
      role: profile.role,
      myJobs,
      applicationsCount: applicationsCount ?? 0,
      applicationsByJob,
      recentApplications,
      unreadNotifications: unread ?? [],
      intakesCount: intakesRes.count ?? 0,
      conversationsCount: convosRes.count ?? 0,
    });
  }

  return jsonResponse({ role: profile.role });
}
