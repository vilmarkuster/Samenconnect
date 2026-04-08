import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import {
  extensionFromFilename,
  extensionForMime,
  inferMimeFromFilename,
  isAllowedJobImageFile,
  isAllowedJobImageMime,
  JOB_IMAGE_MAX_BYTES,
  JOB_IMAGE_MAX_COUNT,
  normalizeJobImageUrls,
} from "@/lib/zorenta/job-images";
import { logger } from "@/lib/zorenta/logger";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);
  const { supabase, userId, profile } = auth;
  if (profile.role !== "client" && profile.role !== "organization") {
    return jsonResponse({ error: "Alleen vacature-eigenaren kunnen afbeeldingen uploaden." }, 403);
  }

  const { id: jobId } = await params;
  if (!jobId) return jsonResponse({ error: "Ongeldige vacature." }, 400);

  const { data: job, error: jobErr } = await supabase
    .from("care_jobs")
    .select("id, poster_id, image_urls")
    .eq("id", jobId)
    .single();

  if (jobErr || !job) {
    return jsonResponse({ error: "Vacature niet gevonden." }, 404);
  }
  if (job.poster_id !== userId) {
    return jsonResponse({ error: "Geen toegang tot deze vacature." }, 403);
  }

  const existing = normalizeJobImageUrls(job.image_urls);
  if (existing.length >= JOB_IMAGE_MAX_COUNT) {
    return jsonResponse(
      { error: `Maximaal ${JOB_IMAGE_MAX_COUNT} afbeeldingen per vacature.` },
      400
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonResponse({ error: "Ongeldige upload." }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return jsonResponse({ error: "Geen bestand ontvangen." }, 400);
  }

  if (file.size > JOB_IMAGE_MAX_BYTES) {
    return jsonResponse({ error: "Bestand is te groot (max. 5 MB)." }, 400);
  }

  const rawMime = (file.type || "").trim().toLowerCase();
  if (!isAllowedJobImageFile(file)) {
    return jsonResponse({ error: "Alleen JPEG, PNG, WebP of GIF zijn toegestaan." }, 400);
  }

  const mime = isAllowedJobImageMime(rawMime)
    ? rawMime
    : inferMimeFromFilename(file.name) || "application/octet-stream";
  const ext =
    extensionForMime(mime) ||
    extensionFromFilename(file.name) ||
    "jpg";
  const objectName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${userId}/${jobId}/${objectName}`;

  const buf = await file.arrayBuffer();
  const { error: upErr } = await supabase.storage.from("job-images").upload(storagePath, buf, {
    contentType: mime === "application/octet-stream" ? undefined : mime,
    upsert: false,
  });

  if (upErr) {
    logger.error("Job image upload failed", upErr);
    return jsonResponse({ error: upErr.message || "Upload mislukt." }, 500);
  }

  const { data: pub } = supabase.storage.from("job-images").getPublicUrl(storagePath);
  const publicUrl = pub.publicUrl;
  const nextUrls = [...existing, publicUrl].slice(0, JOB_IMAGE_MAX_COUNT);

  const { data: updated, error: updErr } = await supabase
    .from("care_jobs")
    .update({ image_urls: nextUrls, updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .select()
    .single();

  if (updErr) {
    logger.error("Job image_urls update failed", updErr);
    return jsonResponse({ error: updErr.message || "Opslaan van URL mislukt." }, 500);
  }

  return jsonResponse({ url: publicUrl, job: updated }, 201);
}
