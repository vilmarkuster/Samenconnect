const DIACRITICS: [RegExp, string][] = [
  [/á|à|ä|â/g, "a"],
  [/é|è|ë|ê/g, "e"],
  [/í|ì|ï|î/g, "i"],
  [/ó|ò|ö|ô/g, "o"],
  [/ú|ù|ü|û/g, "u"],
  [/ç/g, "c"],
  [/ñ/g, "n"],
  [/ij/g, "ij"],
  [/ß/g, "ss"],
];

/**
 * Normaliseert een plaatsnaam voor case-insensitive zoeken (zonder externe libs).
 */
export function normalizeNlPlaceName(input: string): string {
  let s = input.trim().toLowerCase();
  for (const [re, ch] of DIACRITICS) {
    s = s.replace(re, ch);
  }
  s = s.replace(/\s+/g, " ");
  return s;
}
