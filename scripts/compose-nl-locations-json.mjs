/**
 * Bouwt `data/nl-locations.json` uit lokale bronnen (geen netwerk).
 * Volgorde: gemeenten (canoniek) → extra (woonplaatsen/alias/regio) alleen als normalized_name nog vrij is.
 *
 * Run: npm run compose:locations
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeNlPlaceName } from "./_normalize-nl-place.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readGemeentenTsv() {
  const raw = readFileSync(join(root, "data", "gemeenten.tsv"), "utf8");
  const rows = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const tab = t.indexOf("\t");
    if (tab === -1) continue;
    const name = t.slice(0, tab).trim();
    const province = t.slice(tab + 1).trim();
    if (!name || !province) continue;
    rows.push({ name, municipality: name, province });
  }
  return rows;
}

function readExtraJsonl() {
  const path = join(root, "data", "nl-locations-extra.jsonl");
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  const rows = [];
  let lineNo = 0;
  for (const line of raw.split(/\r?\n/)) {
    lineNo += 1;
    const t = line.trim();
    if (!t) continue;
    let o;
    try {
      o = JSON.parse(t);
    } catch {
      throw new Error(`nl-locations-extra.jsonl regel ${lineNo}: ongeldige JSON`);
    }
    if (!o || typeof o.name !== "string") continue;
    const name = o.name.trim();
    if (!name) continue;
    rows.push({
      name,
      municipality:
        typeof o.municipality === "string" && o.municipality.trim() ? o.municipality.trim() : null,
      province: typeof o.province === "string" && o.province.trim() ? o.province.trim() : null,
    });
  }
  return rows;
}

function main() {
  const byNorm = new Map();

  for (const r of readGemeentenTsv()) {
    const norm = normalizeNlPlaceName(r.name);
    if (!norm) continue;
    byNorm.set(norm, {
      name: r.name,
      municipality: r.municipality,
      province: r.province,
      normalized_name: norm,
    });
  }

  for (const r of readExtraJsonl()) {
    const norm = normalizeNlPlaceName(r.name);
    if (!norm) continue;
    if (byNorm.has(norm)) continue;
    byNorm.set(norm, {
      name: r.name,
      municipality: r.municipality,
      province: r.province,
      normalized_name: norm,
    });
  }

  const out = [...byNorm.values()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  const target = join(root, "data", "nl-locations.json");
  writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${out.length} canonical rows to ${target}`);
}

main();
