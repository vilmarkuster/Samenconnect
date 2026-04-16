/**
 * Leest een JSONL-bestand met per regel: { name, municipality?, province? }.
 * Gebruikt door compose en validate.
 */
import { readFileSync, existsSync } from "node:fs";

/**
 * @param {string} absPath
 * @returns {{ name: string, municipality: string | null, province: string | null }[]}
 */
export function readLocationsJsonl(absPath) {
  if (!existsSync(absPath)) return [];
  const raw = readFileSync(absPath, "utf8");
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
      throw new Error(`${absPath} regel ${lineNo}: ongeldige JSON`);
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
