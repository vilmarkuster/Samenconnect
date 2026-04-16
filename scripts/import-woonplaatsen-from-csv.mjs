/**
 * Eenmalige / onderhouds-import: zet een LOKAAL CSV-bestand om naar
 * `data/nl-woonplaatsen-import.jsonl` (zelfde shape als nl-locations-extra regels).
 *
 * Geen netwerk, geen curl — alleen Node + filesystem.
 *
 * Verwachte input (UTF-8), eerste regel = koppen. Herkende kolomnamen (case-insensitive):
 *   - plaatsnaam: Woonplaatsnaam | woonplaatsnaam | WPL_NAAM | naam | name
 *   - gemeente:   Gemeentenaam | gemeentenaam | GM_NAAM | municipality
 *   - provincie:  Provincienaam | provincienaam | PV_NAAM | province
 *
 * Scheidingsteken: `;` (standaard NL/CBS-export) of `,` (auto als er geen `;` in de kopregel zit).
 *
 * Ontbreekt provincie maar wel gemeente: provincie wordt gehaald uit `data/gemeenten.tsv`
 * (exacte gemeentenaam).
 *
 * Usage:
 *   IMPORT_CSV=data/sources/woonplaatsen.csv node scripts/import-woonplaatsen-from-csv.mjs
 *
 * Output:
 *   data/nl-woonplaatsen-import.jsonl
 *
 * Daarna: npm run compose:locations && npm run validate:locations
 */
import { createReadStream, createWriteStream, readFileSync, existsSync, mkdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeNlPlaceName } from "./_normalize-nl-place.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_IN = join(root, "data", "sources", "woonplaatsen.csv");
const OUT = join(root, "data", "nl-woonplaatsen-import.jsonl");
const GEM = join(root, "data", "gemeenten.tsv");

const NAME_KEYS = new Set([
  "woonplaatsnaam",
  "wpl_naam",
  "wplnaam",
  "plaatsnaam",
  "naam",
  "name",
  "woonplaats",
]);
const GEM_KEYS = new Set(["gemeentenaam", "gm_naam", "gmnaam", "gemeente", "municipality"]);
const PROV_KEYS = new Set(["provincienaam", "pv_naam", "pvnaam", "provincie", "province"]);

function normHeader(h) {
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function loadGemeenteToProvince() {
  const map = new Map();
  if (!existsSync(GEM)) return map;
  const raw = readFileSync(GEM, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const tab = t.indexOf("\t");
    if (tab === -1) continue;
    const name = t.slice(0, tab).trim();
    const prov = t.slice(tab + 1).trim();
    if (name && prov) map.set(name, prov);
  }
  return map;
}

function detectDelimiter(headerLine) {
  if (headerLine.includes(";")) return ";";
  return ",";
}

/** Simpele CSV-regel: ondersteunt "veld"; geen nested quotes. */
function splitCsvLine(line, delim) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (!inQ && c === delim) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function pickIndices(headers) {
  const idx = { name: -1, municipality: -1, province: -1 };
  headers.forEach((h, i) => {
    const k = normHeader(h);
    if (NAME_KEYS.has(k)) idx.name = i;
    if (GEM_KEYS.has(k)) idx.municipality = i;
    if (PROV_KEYS.has(k)) idx.province = i;
  });
  return idx;
}

async function main() {
  const inputPath = process.env.IMPORT_CSV?.trim() || DEFAULT_IN;
  if (!existsSync(inputPath)) {
    // eslint-disable-next-line no-console
    console.error(
      `Invoerbestand ontbreekt: ${inputPath}\n` +
        `Zet je bron-CSV daar neer of geef IMPORT_CSV=/pad/naar/bestand.csv`
    );
    process.exit(1);
  }

  mkdirSync(dirname(OUT), { recursive: true });

  const gemeenteProv = loadGemeenteToProvince();
  const rl = createInterface({
    input: createReadStream(inputPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNo = 0;
  let headerLine = "";
  let delim = ";";
  let idx = { name: -1, municipality: -1, province: -1 };
  const seenNorm = new Map();
  let skippedDup = 0;
  let skippedNoName = 0;

  const ws = createWriteStream(OUT, { encoding: "utf8" });

  for await (const line of rl) {
    lineNo += 1;
    const t = line.trim();
    if (!t) continue;
    if (lineNo === 1) {
      headerLine = t;
      delim = detectDelimiter(t);
      const headers = splitCsvLine(t, delim);
      idx = pickIndices(headers);
      if (idx.name === -1) {
        // eslint-disable-next-line no-console
        console.error(
          "Geen herkende plaatsnaam-kolom (verwacht o.a. Woonplaatsnaam of naam). Koppen:\n" +
            headers.join(" | ")
        );
        ws.end();
        process.exit(1);
      }
      if (idx.municipality === -1) {
        // eslint-disable-next-line no-console
        console.error(
          "Geen herkende gemeente-kolom (verwacht o.a. Gemeentenaam). Koppen:\n" + headers.join(" | ")
        );
        ws.end();
        process.exit(1);
      }
      continue;
    }

    const cells = splitCsvLine(t, delim);
    const name = (cells[idx.name] ?? "").replace(/^"|"$/g, "").trim();
    if (!name) {
      skippedNoName += 1;
      continue;
    }
    let municipality = (cells[idx.municipality] ?? "").replace(/^"|"$/g, "").trim() || null;
    let province = idx.province >= 0 ? (cells[idx.province] ?? "").replace(/^"|"$/g, "").trim() : "";
    province = province || null;

    if (!province && municipality && gemeenteProv.has(municipality)) {
      province = gemeenteProv.get(municipality);
    }

    const norm = normalizeNlPlaceName(name);
    if (!norm) continue;
    if (seenNorm.has(norm)) {
      skippedDup += 1;
      continue;
    }
    seenNorm.set(norm, name);

    const row = { name, municipality, province };
    ws.write(`${JSON.stringify(row)}\n`);
  }

  await new Promise((resolve, reject) => {
    ws.end((e) => (e ? reject(e) : resolve()));
  });

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${seenNorm.size} unieke woonplaatsen naar ${OUT} (regels overgeslagen: leeg=${skippedNoName}, dubbel norm=${skippedDup})`
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
