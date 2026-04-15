/**
 * Normaliseert AI Match Agent–teksten voor job-detail cards (één korte samenvatting bovenaan; bullets en aandacht volledig).
 */

/** Alleen voor de samenvatting direct onder de matchbalk. */
const SUMMARY_MAX = 118;
const MAX_BULLETS = 2;

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function truncateOneLine(s: string, max: number): string {
  const t = normalizeWhitespace(s);
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function firstSentence(text: string): string {
  const t = normalizeWhitespace(text);
  if (!t) return "";
  const m = t.match(/^[^.!?]+[.!?]?/);
  return normalizeWhitespace(m?.[0] ?? t);
}

function lower(s: string): string {
  return normalizeWhitespace(s).toLowerCase();
}

/** Woordoverlap tussen twee strings (bullets niet dubbel tonen). */
function wordOverlapRatio(a: string, b: string): number {
  const tokenize = (s: string) =>
    lower(s)
      .split(/\s+/)
      .map((w) => w.replace(/^[("']+|[),.;:!?'"]+$/g, ""))
      .filter((w) => w.length > 2);
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.length === 0 || B.length === 0) return 0;
  const setB = new Set(B);
  let inter = 0;
  for (const w of A) {
    if (setB.has(w)) inter++;
  }
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

/** Ruwe overlap: zelfde of bijna dezelfde regel. */
export function isSubstantiallySameLine(a: string, b: string): boolean {
  const x = lower(a);
  const y = lower(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 14 && y.length >= 14) {
    if (x.includes(y) || y.includes(x)) return true;
  }
  if (wordOverlapRatio(a, b) >= 0.5) return true;
  return false;
}

export function dedupeMatchCopy(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const t = normalizeWhitespace(raw);
    if (!t) continue;
    const k = lower(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * Eén korte scanregel onder de balk; hier alleen `truncateOneLine`.
 */
export function normalizeMatchSummary(input: {
  recommendation?: string | null;
  mainReason?: string | null;
}): string {
  const rec = input.recommendation?.trim();
  const reason = input.mainReason?.trim();
  const line = firstSentence(rec || reason || "");
  if (line) return truncateOneLine(line, SUMMARY_MAX);
  return "Sterke match — zie onderstaande punten.";
}

/**
 * Max 2 redenen, volledige zinnen; geen tekens-cap, wel dedupe t.o.v. samenvatting en elkaar.
 */
export function extractTopReasons(input: {
  summaryLine: string;
  mainReason?: string | null;
  recommendation?: string | null;
  positiveReasonsFallback?: string[];
}): string[] {
  const summary = input.summaryLine;
  const out: string[] = [];

  const pushDistinct = (s: string) => {
    const t = normalizeWhitespace(s);
    if (!t) return;
    if (isSubstantiallySameLine(t, summary)) return;
    if (out.some((o) => isSubstantiallySameLine(o, t) || wordOverlapRatio(o, t) > 0.45)) return;
    out.push(t);
  };

  const splitIntoChunks = (text: string) => {
    const t = normalizeWhitespace(text);
    if (!t) return;
    const bySemi = t.split(/\s*;\s*/).map((p) => normalizeWhitespace(p)).filter((p) => p.length > 5);
    if (bySemi.length >= 2) {
      bySemi.forEach(pushDistinct);
      return;
    }
    const bySentence = t
      .split(/(?<=[.!?])\s+/)
      .map((p) => normalizeWhitespace(p))
      .filter((p) => p.length > 5);
    if (bySentence.length >= 2) {
      bySentence.forEach(pushDistinct);
      return;
    }
    pushDistinct(t);
  };

  if (input.mainReason) splitIntoChunks(input.mainReason);
  if (out.length < MAX_BULLETS && input.recommendation) {
    const rec = normalizeWhitespace(input.recommendation);
    if (rec && !isSubstantiallySameLine(rec, summary)) {
      splitIntoChunks(rec);
    }
  }

  if (out.length === 0 && input.positiveReasonsFallback?.length) {
    const first = input.positiveReasonsFallback[0];
    if (first) splitIntoChunks(first);
  }

  let deduped = dedupeMatchCopy(out).filter((b) => !isSubstantiallySameLine(b, summary));
  deduped = deduped.slice(0, MAX_BULLETS);

  if (deduped.length === 0) {
    const fb = input.mainReason?.trim() || input.recommendation?.trim();
    if (fb && !isSubstantiallySameLine(fb, summary)) {
      deduped = [normalizeWhitespace(fb)];
    }
  }

  return deduped.slice(0, MAX_BULLETS);
}

/** Eerste concern; volledige tekst (geen truncate). */
export function extractPrimaryConcern(concerns?: string[] | null): string | null {
  const raw = concerns?.find((c) => normalizeWhitespace(c).length > 0);
  if (!raw) return null;
  return normalizeWhitespace(raw);
}
