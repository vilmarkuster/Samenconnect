/**
 * Eerste bericht voor chat-prefill vanaf AI-matchkaarten.
 * Gebruikt matchdata alleen als hint; output is vaste, natuurlijke tweede persoon — geen analyse-copy.
 */

export type AiMatchIntroMatchInput = {
  reasons: string[];
  aiMainReason?: string;
  aiConcerns?: string[];
};

/** Verboden analyse- / derde-persoonstaal; bij match wordt niet letterlijk overgenomen. */
const BANNED_SNIPPET_RE =
  /\b(hij|zij|hem|haar|zijn\b|hunner|kandidaat|deze kandidaat|sterke match|matchscore|precies wat hier|hier gevraagd|reizen is geen probleem|geen probleem met reizen|zit ook in|woont ook in)\b/i;

const SKILL_DUMP_RE = /(\badl\b.*\bmedicatie\b|\bmedicatie\b.*\badl\b)/i;

function firstName(displayName: string): string | null {
  const t = displayName.trim();
  if (!t) return null;
  return t.split(/\s+/)[0] || null;
}

function stripTrailingPeriod(s: string): string {
  const t = s.trim();
  return t.endsWith(".") ? t.slice(0, -1).trim() : t;
}

function matchAnalysisBlob(m: AiMatchIntroMatchInput): string {
  const parts = [m.aiMainReason, ...(m.reasons ?? [])].filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0
  );
  return parts.join(" ").trim();
}

function firstCityToken(location: string): string | null {
  const t = location.trim();
  if (!t) return null;
  const first = t.split(/[,/]/)[0]?.trim() ?? "";
  return first.length >= 2 ? first : null;
}

function locationMentionedInBlob(cityLc: string, blobLc: string): boolean {
  if (cityLc.length < 3) return false;
  return blobLc.includes(cityLc);
}

/**
 * Eén korte reden in tweede persoon, afgeleid van opdracht + match-hints (niet letterlijk uit de AI).
 */
function deriveSingleThemePhrase(
  jobTitle: string | null | undefined,
  jobLocation: string | null | undefined,
  blob: string
): string | null {
  const titleLc = (jobTitle ?? "").toLowerCase();
  const blobLc = blob.toLowerCase();
  const locRaw = (jobLocation ?? "").trim();
  const city = firstCityToken(locRaw);
  const cityLc = city?.toLowerCase() ?? "";

  if (titleLc.includes("dementie") || blobLc.includes("dementie")) {
    return "je ervaring met dementiezorg";
  }
  if (titleLc.includes("parkinson") || blobLc.includes("parkinson")) {
    return "je achtergrond rond parkinson";
  }
  if (
    /\b(ggz|psychiatr|psychisch)\b/.test(titleLc) ||
    /\b(ggz|psychiatr|psychisch)\b/.test(blobLc)
  ) {
    return "je achtergrond in de GGZ";
  }
  if (
    titleLc.includes("thuiszorg") ||
    titleLc.includes("aan huis") ||
    blobLc.includes("thuiszorg") ||
    blobLc.includes("aan huis")
  ) {
    return city
      ? `je ervaring in de thuiszorg in ${city}`
      : "je ervaring in de thuiszorg";
  }
  if (/\b(verzorgende|verpleegkundige|verpleeg| helpende)\b/i.test(titleLc + blobLc)) {
    return city
      ? `je rol in de zorg in ${city}`
      : "je rol in de zorg";
  }
  if (
    city &&
    (locationMentionedInBlob(cityLc, blobLc) ||
      titleLc.includes(cityLc) ||
      blobLc.includes("regio") ||
      blobLc.includes("woon"))
  ) {
    return `je ervaring in de zorg in ${city}`;
  }
  if (blobLc.includes("medicatie") && !SKILL_DUMP_RE.test(blob)) {
    return "je ervaring met medicatie";
  }
  return null;
}

function hookParagraph(theme: string | null, nameForVariant: string): string {
  if (theme) {
    const alt = (nameForVariant.length + (theme?.length ?? 0)) % 2 === 1;
    if (alt) {
      return `Je profiel viel me op door ${theme}.`;
    }
    return `Ik zag je profiel en dacht dat deze opdracht goed bij je zou kunnen passen, vooral door ${theme}.`;
  }
  return "Ik zag je profiel en dacht dat deze opdracht goed bij je zou kunnen passen.";
}

/** Voorkomt “… in Amsterdam in Amsterdam” als de titel de plaats al noemt. */
function titleAlreadyHasLocation(title: string, location: string): boolean {
  const t = title.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = location.trim().toLowerCase().replace(/\s+/g, " ");
  if (!t || !raw) return false;
  const parts = raw
    .split(/[,\/]/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);
  for (const part of parts) {
    const i = t.indexOf(part);
    if (i === -1) continue;
    const before = i > 0 ? t[i - 1] : " ";
    const after = i + part.length < t.length ? t[i + part.length] : " ";
    const okBefore = i === 0 || /[\s,(]/.test(before);
    const okAfter = i + part.length === t.length || /[\s,).]/.test(after);
    if (okBefore && okAfter) return true;
  }
  return false;
}

function jobDescriptionLine(title?: string | null, location?: string | null): string {
  const t = (title ?? "").trim().replace(/\s+/g, " ");
  const loc = (location ?? "").trim().replace(/\s+/g, " ");
  const shortTitle = t.length > 100 ? `${t.slice(0, 97).trim()}…` : t;
  const cleanedTitle = stripTrailingPeriod(shortTitle);

  if (cleanedTitle && loc && !titleAlreadyHasLocation(cleanedTitle, loc)) {
    return `een opdracht als ${cleanedTitle} in ${loc}`;
  }
  if (cleanedTitle) {
    return `een opdracht als ${cleanedTitle}`;
  }
  if (loc) {
    return `een opdracht in ${loc}`;
  }
  return "deze opdracht";
}

function concernToQuestion(softConcern?: string | null): string | null {
  const c = (softConcern ?? "").trim();
  if (!c || c.length > 90) return null;
  if (BANNED_SNIPPET_RE.test(c)) return null;
  const lc = c.toLowerCase();
  if (
    lc.includes("parttime") ||
    lc.includes("beschikbaar") ||
    lc.includes("uren") ||
    lc.includes("tijd") ||
    lc.includes("agenda") ||
    lc.includes("planning")
  ) {
    return "Zou dit qua tijd en beschikbaarheid voor jou kunnen passen?";
  }
  return null;
}

function defaultClosing(displayName: string, concern: string | null): string {
  const fromConcern = concernToQuestion(concern);
  if (fromConcern) return fromConcern;
  const opts = [
    "Heb je ruimte om hierover kennis te maken?",
    "Zou dit iets voor jou kunnen zijn?",
  ];
  return opts[(displayName.length + (concern?.length ?? 0)) % 2];
}

/**
 * Korte openingsboodschap: voornaam, één menselijke hook, opdracht, concrete vraag.
 * Matchtekst wordt niet letterlijk geplakt; bij onbruikbare analyse alleen generieke zinnen.
 */
export function buildAiMatchFirstMessage(input: {
  caregiverDisplayName: string;
  jobTitle?: string | null;
  jobLocation?: string | null;
  match: AiMatchIntroMatchInput;
}): string {
  const fn = firstName(input.caregiverDisplayName);
  const greeting = fn ? `Hoi ${fn},` : "Hoi,";
  const blob = matchAnalysisBlob(input.match);
  const theme = deriveSingleThemePhrase(input.jobTitle, input.jobLocation, blob);
  const hook = hookParagraph(theme, input.caregiverDisplayName.trim() || "x");
  const jobLine = jobDescriptionLine(input.jobTitle, input.jobLocation);
  const concern0 = input.match.aiConcerns?.find((x) => x.trim())?.trim() ?? null;
  const closing = defaultClosing(input.caregiverDisplayName, concern0);

  return [greeting, "", hook, "", `Het gaat om ${jobLine}.`, "", closing].join("\n");
}
