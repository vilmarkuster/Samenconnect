/** Publieke SamenConnect marketing routes (landing + early access). */

export const EARLY_ACCESS_PATH = "/early-access";

export function earlyAccessUrl(source: string): string {
  const safe = encodeURIComponent(source.replace(/[^a-z0-9_]/gi, "_").slice(0, 64) || "landing");
  return `${EARLY_ACCESS_PATH}?src=${safe}`;
}
