/**
 * Valideert lokale locations-bronnen en `data/nl-locations.json`.
 * Run: npm run validate:locations
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeNlPlaceName } from "./_normalize-nl-place.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const NL_PROVINCES = new Set([
  "Drenthe",
  "Flevoland",
  "Friesland",
  "Fryslân",
  "Gelderland",
  "Groningen",
  "Limburg",
  "Noord-Brabant",
  "Noord-Holland",
  "Overijssel",
  "Utrecht",
  "Zeeland",
  "Zuid-Holland",
]);

let errors = 0;
function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(msg);
  errors += 1;
}

function ok(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function validateGemeentenTsv() {
  const path = join(root, "data", "gemeenten.tsv");
  const raw = readFileSync(path, "utf8");
  const names = [];
  const seen = new Set();
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo += 1;
    const t = line.trim();
    if (!t) continue;
    const tab = t.indexOf("\t");
    if (tab === -1) {
      fail(`gemeenten.tsv regel ${lineNo}: geen tab`);
      continue;
    }
    const name = t.slice(0, tab).trim();
    const province = t.slice(tab + 1).trim();
    if (!name) fail(`gemeenten.tsv regel ${lineNo}: lege naam`);
    if (!province) fail(`gemeenten.tsv regel ${lineNo}: lege provincie voor "${name}"`);
    if (!NL_PROVINCES.has(province)) {
      fail(`gemeenten.tsv regel ${lineNo}: onbekende provincie "${province}" voor "${name}"`);
    }
    const n = normalizeNlPlaceName(name);
    if (seen.has(n)) fail(`gemeenten.tsv: dubbele genormaliseerde naam "${n}" (${name})`);
    seen.add(n);
    names.push(name);
  }
  ok(`gemeenten.tsv: ${names.length} unieke gemeentenamen.`);
}

function validateExtraJsonl() {
  const path = join(root, "data", "nl-locations-extra.jsonl");
  if (!existsSync(path)) {
    fail("nl-locations-extra.jsonl ontbreekt");
    return;
  }
  const raw = readFileSync(path, "utf8");
  let n = 0;
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo += 1;
    const t = line.trim();
    if (!t) continue;
    let o;
    try {
      o = JSON.parse(t);
    } catch {
      fail(`nl-locations-extra.jsonl regel ${lineNo}: ongeldige JSON`);
      continue;
    }
    if (typeof o.name !== "string" || !o.name.trim()) {
      fail(`nl-locations-extra.jsonl regel ${lineNo}: ontbrekende of lege "name"`);
      continue;
    }
    if ("municipality" in o && o.municipality != null && typeof o.municipality !== "string") {
      fail(`nl-locations-extra.jsonl regel ${lineNo}: municipality moet string of null zijn`);
    }
    if ("province" in o && o.province != null && typeof o.province !== "string") {
      fail(`nl-locations-extra.jsonl regel ${lineNo}: province moet string of null zijn`);
    }
    if (typeof o.province === "string" && o.province.trim() && !NL_PROVINCES.has(o.province.trim())) {
      fail(`nl-locations-extra.jsonl regel ${lineNo}: onbekende province "${o.province}"`);
    }
    n += 1;
  }
  ok(`nl-locations-extra.jsonl: ${n} geldige regels.`);
}

function validateImportedWoonplaatsenJsonl() {
  const path = join(root, "data", "nl-woonplaatsen-import.jsonl");
  if (!existsSync(path)) {
    ok("nl-woonplaatsen-import.jsonl: ontbreekt (optioneel; run import-woonplaatsen-from-csv.mjs).");
    return;
  }
  const raw = readFileSync(path, "utf8");
  let n = 0;
  let lineNo = 0;
  const byNorm = new Map();
  for (const line of raw.split(/\r?\n/)) {
    lineNo += 1;
    const t = line.trim();
    if (!t) continue;
    let o;
    try {
      o = JSON.parse(t);
    } catch {
      fail(`nl-woonplaatsen-import.jsonl regel ${lineNo}: ongeldige JSON`);
      continue;
    }
    if (typeof o.name !== "string" || !o.name.trim()) {
      fail(`nl-woonplaatsen-import.jsonl regel ${lineNo}: ontbrekende of lege "name"`);
      continue;
    }
    if ("municipality" in o && o.municipality != null && typeof o.municipality !== "string") {
      fail(`nl-woonplaatsen-import.jsonl regel ${lineNo}: municipality moet string of null zijn`);
    }
    if ("province" in o && o.province != null && typeof o.province !== "string") {
      fail(`nl-woonplaatsen-import.jsonl regel ${lineNo}: province moet string of null zijn`);
    }
    if (typeof o.province === "string" && o.province.trim() && !NL_PROVINCES.has(o.province.trim())) {
      fail(`nl-woonplaatsen-import.jsonl regel ${lineNo}: onbekende province "${o.province}"`);
    }
    const nk = normalizeNlPlaceName(o.name);
    if (byNorm.has(nk)) {
      fail(
        `nl-woonplaatsen-import.jsonl regel ${lineNo}: dubbele normalized_name "${nk}" (ook regel met "${byNorm.get(nk)}")`
      );
    }
    byNorm.set(nk, o.name.trim());
    n += 1;
  }
  ok(`nl-woonplaatsen-import.jsonl: ${n} geldige regels, ${byNorm.size} unieke normalized_name.`);
}

function validateNlLocationsJson() {
  const path = join(root, "data", "nl-locations.json");
  if (!existsSync(path)) {
    fail("data/nl-locations.json ontbreekt (run npm run compose:locations)");
    return;
  }
  let rows;
  try {
    rows = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail("data/nl-locations.json: geen geldige JSON");
    return;
  }
  if (!Array.isArray(rows)) {
    fail("data/nl-locations.json: root moet een array zijn");
    return;
  }

  const byNorm = new Map();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const prefix = `data/nl-locations.json index ${i}`;
    if (!r || typeof r !== "object") {
      fail(`${prefix}: geen object`);
      continue;
    }
    if (typeof r.name !== "string" || !r.name.trim()) {
      fail(`${prefix}: lege name`);
    }
    if (typeof r.normalized_name !== "string" || !r.normalized_name.trim()) {
      fail(`${prefix}: lege normalized_name`);
    }
    const expected = normalizeNlPlaceName(r.name);
    if (r.normalized_name !== expected) {
      fail(`${prefix}: normalized_name "${r.normalized_name}" verwacht "${expected}"`);
    }
    if (r.municipality != null && typeof r.municipality !== "string") {
      fail(`${prefix}: municipality moet string of null zijn`);
    }
    if (r.province != null && typeof r.province !== "string") {
      fail(`${prefix}: province moet string of null zijn`);
    }
    if (typeof r.province === "string" && r.province.trim() && !NL_PROVINCES.has(r.province.trim())) {
      fail(`${prefix}: onbekende province "${r.province}"`);
    }
    const nk = r.normalized_name;
    if (byNorm.has(nk)) {
      fail(`${prefix}: dubbele normalized_name "${nk}" (ook: ${byNorm.get(nk)})`);
    }
    byNorm.set(nk, r.name);
  }

  ok(`data/nl-locations.json: ${rows.length} rijen, ${byNorm.size} unieke normalized_name.`);
}

validateGemeentenTsv();
validateImportedWoonplaatsenJsonl();
validateExtraJsonl();
validateNlLocationsJson();

if (errors > 0) {
  // eslint-disable-next-line no-console
  console.error(`\nvalidate:locations gefaald met ${errors} fout(en).`);
  process.exit(1);
}
ok("\nvalidate:locations OK.");
process.exit(0);
