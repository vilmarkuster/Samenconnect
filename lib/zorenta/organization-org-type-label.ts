const LEGACY_TO_CANONICAL: Record<string, string> = {
  home_care: "zorginstelling",
  nursing_home: "zorginstelling",
  hospital: "zorginstelling",
  agency: "bureau",
  other: "overig",
};

/** Map legacy DB values to current `ORG_TYPES` values (idempotent for new codes). */
export function canonicalOrganizationOrgTypeValue(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  const k = t.toLowerCase();
  return LEGACY_TO_CANONICAL[k] ?? t;
}

const LABELS: Record<string, string> = {
  zorginstelling: "Zorginstelling",
  pgb: "PGB",
  bureau: "Bureau",
  zelfstandig: "Zelfstandig",
  overig: "Overig",
  // legacy (pre-migration) fallbacks
  home_care: "Zorginstelling",
  nursing_home: "Zorginstelling",
  hospital: "Zorginstelling",
  agency: "Bureau",
  other: "Overig",
};

export function formatOrganizationOrgTypeLabel(raw: string | null | undefined): string {
  if (raw == null || typeof raw !== "string") return "";
  const k = raw.trim().toLowerCase();
  if (!k) return "";
  const canon = LEGACY_TO_CANONICAL[k] ?? k;
  return LABELS[canon] ?? LABELS[k] ?? raw.trim();
}
