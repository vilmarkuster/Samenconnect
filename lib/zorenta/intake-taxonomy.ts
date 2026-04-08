/**
 * Shared intake taxonomy: Dutch labels in the UI, stable `value` strings in DB/API.
 * Used by zorgvraag intake, vacatures, and matching.
 */

export type TaxonomyOption = { value: string; label: string };

export const FINANCIERING_REGELING_OPTIONS: TaxonomyOption[] = [
  { value: "pgb", label: "PGB" },
  { value: "wlz", label: "Wlz" },
  { value: "wmo", label: "Wmo" },
  { value: "zvw", label: "Zvw" },
  { value: "particulier", label: "Particulier" },
];

/** Soort hulp / zorg — aligned with zorgvraag intake */
export const SOORT_HULP_ZORG_OPTIONS: TaxonomyOption[] = [
  { value: "thuiszorg", label: "Thuiszorg" },
  { value: "verpleging", label: "Verpleging" },
  { value: "begeleiding", label: "Begeleiding" },
  { value: "persoonlijke_verzorging", label: "Persoonlijke verzorging" },
  { value: "huishoudelijke_hulp", label: "Huishoudelijke hulp" },
  { value: "dagbesteding", label: "Dagbesteding" },
  { value: "nachtzorg", label: "Nachtzorg" },
  { value: "24_uurs_zorg", label: "24-uurs zorg" },
  { value: "dementiezorg", label: "Dementiezorg" },
  { value: "ouderenzorg", label: "Ouderenzorg" },
  { value: "ggz_begeleiding", label: "GGZ begeleiding" },
  { value: "verslavingszorg", label: "Verslavingszorg" },
  { value: "autisme_begeleiding_soort", label: "Autisme begeleiding" },
  { value: "trauma_ptss_begeleiding", label: "Trauma / PTSS begeleiding" },
  { value: "forensische_zorg", label: "Forensische zorg" },
  { value: "gehandicaptenzorg", label: "Gehandicaptenzorg" },
  { value: "nah_begeleiding", label: "NAH begeleiding" },
  { value: "palliatieve_zorg_soort", label: "Palliatieve zorg" },
  { value: "jeugdzorg", label: "Jeugdzorg" },
  { value: "gezinsbegeleiding", label: "Gezinsbegeleiding" },
  { value: "opvoedondersteuning", label: "Opvoedondersteuning" },
  { value: "logeeropvang", label: "Logeeropvang" },
  { value: "kraamzorg", label: "Kraamzorg" },
];

export const ZORGNIVEAU_OPTIONS: TaxonomyOption[] = [
  { value: "basis_ondersteuning", label: "Basis ondersteuning" },
  { value: "niveau_persoonlijke_verzorging", label: "Persoonlijke verzorging" },
  { value: "niveau_verpleging", label: "Verpleging" },
  { value: "specialistische_zorg", label: "Specialistische zorg" },
  { value: "intensieve_zorg", label: "Intensieve zorg" },
  { value: "24_uurs_begeleiding", label: "24-uurs begeleiding" },
];

export const TYPE_INZET_OPTIONS: TaxonomyOption[] = [
  { value: "mantelzorg", label: "Mantelzorg" },
  { value: "vrijwilligerswerk", label: "Vrijwilligerswerk" },
  { value: "zzp_opdracht", label: "ZZP-opdracht" },
  { value: "tijdelijke_vervanging", label: "Tijdelijke vervanging" },
  { value: "structurele_ondersteuning", label: "Structurele ondersteuning" },
  { value: "spoedhulp", label: "Spoedhulp" },
];

export const VAARDIGHEDEN_ERVARING_OPTIONS: TaxonomyOption[] = [
  { value: "medicatie_toedienen", label: "Medicatie toedienen" },
  { value: "tillift", label: "Tillift" },
  { value: "adl_ondersteuning", label: "ADL ondersteuning" },
  { value: "gedragsproblematiek", label: "Gedragsproblematiek" },
  { value: "autisme_begeleiding_vaardigheid", label: "Autisme begeleiding" },
  { value: "dementie_ervaring", label: "Dementie ervaring" },
  { value: "palliatieve_zorg_ervaring", label: "Palliatieve zorg ervaring" },
  { value: "revalidatie_ondersteuning", label: "Revalidatie ondersteuning" },
];

/** Doelgroep — intake only, not part of job matching taxonomy */
export const TARGET_GROUP_OPTIONS: TaxonomyOption[] = [
  { value: "oudere", label: "Oudere" },
  { value: "kind", label: "Kind" },
  { value: "jongere", label: "Jongere" },
  { value: "volwassene", label: "Volwassene" },
  { value: "gezin", label: "Gezin" },
  { value: "meerdere_clienten", label: "Meerdere cliënten" },
];

export function labelForValue(options: TaxonomyOption[], value: string): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

export function labelsForValues(options: TaxonomyOption[], values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return values.map((v) => labelForValue(options, v) ?? v).filter(Boolean);
}

export type LegacySplitIntake = {
  financiering_regeling: string[];
  soort_hulp_zorg: string[];
  zorgniveau: string[];
  type_inzet: string[];
  vaardigheden_ervaring: string[];
  target_group: string[];
};

/** First matching dimension wins (same Dutch label can exist in multiple sets). */
function legacyLabelToBucket(raw: string): keyof LegacySplitIntake | null {
  const t = raw.trim();
  if (!t) return null;
  if (FINANCIERING_REGELING_OPTIONS.some((o) => o.label === t)) return "financiering_regeling";
  if (SOORT_HULP_ZORG_OPTIONS.some((o) => o.label === t)) return "soort_hulp_zorg";
  if (ZORGNIVEAU_OPTIONS.some((o) => o.label === t)) return "zorgniveau";
  if (TYPE_INZET_OPTIONS.some((o) => o.label === t)) return "type_inzet";
  if (VAARDIGHEDEN_ERVARING_OPTIONS.some((o) => o.label === t)) return "vaardigheden_ervaring";
  if (TARGET_GROUP_OPTIONS.some((o) => o.label === t)) return "target_group";
  return null;
}

function valueForLabelInSet(options: TaxonomyOption[], label: string): string | undefined {
  return options.find((o) => o.label === label)?.value;
}

/** Split flat `skills_required` (legacy Dutch labels) into structured taxonomy arrays */
export function splitLegacyIntakeTags(skills: string[] | null | undefined): LegacySplitIntake {
  const empty: LegacySplitIntake = {
    financiering_regeling: [],
    soort_hulp_zorg: [],
    zorgniveau: [],
    type_inzet: [],
    vaardigheden_ervaring: [],
    target_group: [],
  };
  if (!Array.isArray(skills)) return empty;
  for (const raw of skills) {
    if (typeof raw !== "string") continue;
    const bucket = legacyLabelToBucket(raw);
    if (!bucket) continue;
    const opts =
      bucket === "financiering_regeling"
        ? FINANCIERING_REGELING_OPTIONS
        : bucket === "soort_hulp_zorg"
          ? SOORT_HULP_ZORG_OPTIONS
          : bucket === "zorgniveau"
            ? ZORGNIVEAU_OPTIONS
            : bucket === "type_inzet"
              ? TYPE_INZET_OPTIONS
              : bucket === "vaardigheden_ervaring"
                ? VAARDIGHEDEN_ERVARING_OPTIONS
                : TARGET_GROUP_OPTIONS;
    const val = valueForLabelInSet(opts, raw.trim());
    if (val && !empty[bucket].includes(val)) empty[bucket].push(val);
  }
  return empty;
}

/** Primary line for legacy care_type / care_context display */
export function primaryCareLabelFromTaxonomy(soort: string[] | null | undefined, zorgniveau: string[] | null | undefined): string {
  const s = labelsForValues(SOORT_HULP_ZORG_OPTIONS, soort);
  const z = labelsForValues(ZORGNIVEAU_OPTIONS, zorgniveau);
  if (s.length) return s.slice(0, 2).join(", ");
  if (z.length) return z.slice(0, 2).join(", ");
  return "";
}

function pickOrLegacy(
  row: Record<string, unknown>,
  key: keyof LegacySplitIntake,
  legacy: LegacySplitIntake
): string[] {
  const v = row[key];
  if (Array.isArray(v) && v.length > 0) return v.filter((x): x is string => typeof x === "string");
  return legacy[key];
}

/** Merge DB row + legacy skills_required into structured taxonomy for forms / matching */
export function intakeTaxonomyFromRow(row: Record<string, unknown>): LegacySplitIntake {
  const legacy = splitLegacyIntakeTags(row.skills_required as string[]);
  return {
    financiering_regeling: pickOrLegacy(row, "financiering_regeling", legacy),
    soort_hulp_zorg: pickOrLegacy(row, "soort_hulp_zorg", legacy),
    zorgniveau: pickOrLegacy(row, "zorgniveau", legacy),
    type_inzet: pickOrLegacy(row, "type_inzet", legacy),
    vaardigheden_ervaring: pickOrLegacy(row, "vaardigheden_ervaring", legacy),
    target_group: pickOrLegacy(row, "target_group", legacy),
  };
}

/** Client POST body: explicit taxonomy arrays win; otherwise derive from legacy `skills_required` (Dutch labels). */
export function mergeIntakeSubmission(body: Record<string, unknown>): LegacySplitIntake {
  const legacy = splitLegacyIntakeTags(body.skills_required as string[]);
  const pick = (k: keyof LegacySplitIntake): string[] => {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
      return [];
    }
    return legacy[k];
  };
  return {
    financiering_regeling: pick("financiering_regeling"),
    soort_hulp_zorg: pick("soort_hulp_zorg"),
    zorgniveau: pick("zorgniveau"),
    type_inzet: pick("type_inzet"),
    vaardigheden_ervaring: pick("vaardigheden_ervaring"),
    target_group: pick("target_group"),
  };
}
