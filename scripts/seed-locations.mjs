/**
 * Vult public.locations vanuit data/nl-locations.json.
 *
 * Voorkeur (lokaal / Supabase dashboard-keys):
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Fallback (directe Postgres-connection):
 *   DATABASE_URL of DIRECT_URL
 *
 * Run: npm run seed:locations
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Laadt `.env.local` zodat `npm run seed:locations` zonder export werkt (zelfde keys als Next). */
function loadEnvLocal() {
  const p = join(root, ".env.local");
  if (!existsSync(p)) return;
  const txt = readFileSync(p, "utf8");
  for (const line of txt.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const CHUNK = 250;

function loadRows() {
  const raw = readFileSync(join(root, "data", "nl-locations.json"), "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(
      "data/nl-locations.json ontbreekt of is leeg. Run eerst: npm run compose:locations"
    );
  }
  return rows;
}

async function seedWithSupabase(supabaseUrl, serviceRoleKey, rows) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await supabase.from("locations").delete().not("id", "is", null);
  if (delErr) {
    const hint =
      /locations/i.test(delErr.message) && /(not find|schema cache|does not exist)/i.test(delErr.message)
        ? " Voer eerst migratie 20260405120000_locations_reference.sql uit op dit Supabase-project (bijv. supabase db push of SQL Editor)."
        : "";
    throw new Error(`Supabase delete locations: ${delErr.message}.${hint}`);
  }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const part = rows.slice(i, i + CHUNK).map((r) => ({
      name: r.name,
      municipality: r.municipality ?? null,
      province: r.province ?? null,
      normalized_name: r.normalized_name,
      is_active: true,
    }));
    const { error: insErr } = await supabase.from("locations").insert(part);
    if (insErr) throw new Error(`Supabase insert (batch ${i}–${i + part.length}): ${insErr.message}`);
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${rows.length} rows via Supabase service role (public.locations).`);
}

async function seedWithPg(connectionString, rows) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("delete from public.locations");
    for (let i = 0; i < rows.length; i += CHUNK) {
      const part = rows.slice(i, i + CHUNK);
      const values = [];
      const params = [];
      let p = 1;
      for (const r of part) {
        values.push(`($${p++}, $${p++}, $${p++}, $${p++}, true)`);
        params.push(r.name, r.municipality ?? null, r.province ?? null, r.normalized_name);
      }
      const sql = `insert into public.locations (name, municipality, province, normalized_name, is_active) values ${values.join(",")}`;
      await client.query(sql, params);
    }
    await client.query("commit");
    // eslint-disable-next-line no-console
    console.log(`Seeded ${rows.length} rows via Postgres (${connectionString.includes("@") ? "DATABASE_URL/DIRECT_URL" : "connection string"}).`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnvLocal();
  const rows = loadRows();

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const pgUrl = (process.env.DATABASE_URL || process.env.DIRECT_URL)?.trim();

  if (sbUrl && serviceKey) {
    await seedWithSupabase(sbUrl, serviceKey, rows);
  } else if (pgUrl) {
    await seedWithPg(pgUrl, rows);
  } else {
    // eslint-disable-next-line no-console
    console.error(
      "Geen seed-config gevonden. Zet één van:\n" +
        "  • NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (aanbevolen), of\n" +
        "  • DATABASE_URL of DIRECT_URL (Postgres connection string)."
    );
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(
    "\nLokaal testen: npm run dev → http://localhost:3002/api/locations/search?q=ams\n" +
      "  (stad/regio-autocomplete: o.a. /jobs/new, /search, /early-access)"
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
