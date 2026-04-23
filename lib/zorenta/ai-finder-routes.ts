/** Shared query + list URLs so shell, dashboard, and CTAs stay aligned (P1 IA). */
export const AI_FINDER_QUERY = "source=ai-finder" as const;

export function aiFinderListHref(role: string | null | undefined): string | null {
  if (role === "caregiver") return `/jobs?${AI_FINDER_QUERY}`;
  if (role === "client" || role === "organization") return `/matches?${AI_FINDER_QUERY}`;
  return null;
}
