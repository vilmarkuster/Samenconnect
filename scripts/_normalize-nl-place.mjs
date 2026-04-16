/** Zelfde regels als `lib/locations/normalize-nl-place.ts` (Node compose/validate). */
export function normalizeNlPlaceName(input) {
  let s = String(input).trim().toLowerCase();
  const pairs = [
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
  for (const [re, ch] of pairs) s = s.replace(re, ch);
  return s.replace(/\s+/g, " ");
}
