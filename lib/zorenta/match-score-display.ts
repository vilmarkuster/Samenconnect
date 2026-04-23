/**
 * Shared match % normalization for UI (badges, cards, lists).
 * Returns null when the value is missing or not a finite number — callers should show a neutral fallback, not 0%.
 */
export function normalizeMatchScore(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(100, Math.max(0, n)));
}
