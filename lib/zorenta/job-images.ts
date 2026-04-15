/** Opdrachtafbeeldingen (care_jobs.image_urls) — helpers, geen React. */

export const JOB_IMAGE_MAX_COUNT = 5;
export const JOB_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

export function normalizeJobImageUrls(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .map((u) => u.trim())
      .slice(0, JOB_IMAGE_MAX_COUNT);
  }
  return [];
}

export function getFirstJobImageUrl(value: unknown): string | null {
  const urls = normalizeJobImageUrls(value);
  return urls[0] ?? null;
}

/** Minimale job-velden voor kaart/cover — uit API’s met uiteenlopende namen. */
export type JobCardImageSource = {
  image_urls?: unknown;
  image_url?: unknown;
  cover_image_url?: unknown;
  cover_image?: unknown;
  photo_url?: unknown;
  photo?: unknown;
  title?: string | null;
  care_type?: string | null;
};

function firstLegacyImageUrl(job: JobCardImageSource): string | null {
  const candidates = [
    job.image_url,
    job.cover_image_url,
    job.cover_image,
    job.photo_url,
    job.photo,
  ];
  for (const c of candidates) {
    if (typeof c !== "string") continue;
    const t = c.trim();
    if (!t) continue;
    if (/^https?:\/\//i.test(t) || t.startsWith("/")) return t;
  }
  return null;
}

/**
 * Eén plek voor dashboard- en lijstkaarten: eerste geldige URL uit bekende velden.
 * Gebruikt `image_urls` (array) eerst, daarna losse string-velden.
 */
export function resolveJobCardImage(job: JobCardImageSource): {
  src: string | null;
  alt: string;
  hasImage: boolean;
} {
  const fromUrls = getFirstJobImageUrl(job.image_urls);
  const src = fromUrls ?? firstLegacyImageUrl(job);
  const title = typeof job.title === "string" ? job.title.trim() : "";
  const alt = title ? `Opdracht: ${title}` : "Opdrachtafbeelding";
  return { src, alt, hasImage: Boolean(src) };
}

export function isAllowedJobImageMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function extensionFromFilename(filename: string): string | null {
  const trimmed = filename.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(".");
  if (parts.length < 2) return null;
  const ext = parts[parts.length - 1]?.toLowerCase() ?? "";
  return ext || null;
}

export function isAllowedJobImageExtension(ext: string): boolean {
  return ALLOWED_EXT.has(ext.toLowerCase());
}

export function isAllowedJobImageFile(file: { type?: string; name?: string }): boolean {
  const mime = (file.type ?? "").trim().toLowerCase();
  if (mime && isAllowedJobImageMime(mime)) return true;
  const ext = extensionFromFilename(file.name ?? "");
  return !!ext && isAllowedJobImageExtension(ext);
}

export function inferMimeFromFilename(filename: string): string | null {
  const ext = extensionFromFilename(filename);
  if (!ext) return null;
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return null;
}

export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  return "jpg";
}
