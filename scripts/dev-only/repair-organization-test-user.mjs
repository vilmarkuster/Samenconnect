#!/usr/bin/env node
/**
 * DEV-ONLY: create or repair ONE organization test account in Supabase.
 *
 * Safety:
 * - Refuses to run unless SAMENCONNECT_DEV_ORG_SEED=1
 * - Only mutates the user identified by DEV_ORG_SEED_EMAIL (default: test7@test.com)
 * - Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (loads .env.local if present)
 *
 * Usage (from repo root):
 *   SAMENCONNECT_DEV_ORG_SEED=1 node scripts/dev-only/repair-organization-test-user.mjs
 *
 * Optional env:
 *   DEV_ORG_SEED_EMAIL     (default: test7@test.com)
 *   DEV_ORG_SEED_PASSWORD  (default: SamenConnect-OrgTest-2026!)
 *   DEV_ORG_SEED_ORG_NAME  (default: ClaudiCare (dev))
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

async function findUserByEmail(adminAuth, emailNorm) {
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await adminAuth.listUsers({ page, perPage });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || "").toLowerCase() === emailNorm);
    if (u) return u;
    if (data.users.length < perPage) return null;
  }
  return null;
}

async function main() {
  if (process.env.SAMENCONNECT_DEV_ORG_SEED !== "1") {
    console.error(
      "\n[repair-organization-test-user] Refusing to run.\n" +
        "Set SAMENCONNECT_DEV_ORG_SEED=1 for a deliberate one-off (dev/staging only).\n"
    );
    process.exit(1);
  }

  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (add to .env.local).\n"
    );
    process.exit(1);
  }

  const email = (process.env.DEV_ORG_SEED_EMAIL || "test7@test.com").trim().toLowerCase();
  const password = process.env.DEV_ORG_SEED_PASSWORD || "SamenConnect-OrgTest-2026!";
  const orgName = process.env.DEV_ORG_SEED_ORG_NAME || "ClaudiCare (dev)";
  const displayName = process.env.DEV_ORG_SEED_DISPLAY_NAME || orgName;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const actions = [];
  let mode = "noop";

  const existing = await findUserByEmail(supabase.auth.admin, email);
  let userId;

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { dev_seed: "organization-test-user" },
    });
    if (error) throw error;
    if (!data.user?.id) throw new Error("createUser returned no user id");
    userId = data.user.id;
    mode = "created";
    actions.push(`auth.users: created id=${userId}`);
  } else {
    userId = existing.id;
    mode = "repaired";
    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updErr) throw updErr;
    actions.push(`auth.users: updated password + email_confirm for id=${userId}`);
  }

  const { data: prof, error: profSelErr } = await supabase
    .from("profiles")
    .select("id, role, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (profSelErr) throw profSelErr;

  if (!prof) {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: userId,
      role: "organization",
      display_name: displayName,
    });
    if (insErr) throw insErr;
    actions.push(`profiles: inserted id=${userId} role=organization`);
  } else {
    const patch = {};
    if (prof.role !== "organization") patch.role = "organization";
    if (!prof.display_name?.trim()) patch.display_name = displayName;
    if (Object.keys(patch).length) {
      const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", userId);
      if (upErr) throw upErr;
      actions.push(`profiles: updated ${JSON.stringify(patch)}`);
    } else {
      actions.push("profiles: already organization with display_name");
    }
  }

  const { data: orgRow, error: orgSelErr } = await supabase
    .from("organization_profiles")
    .select("id, profile_id, name")
    .eq("profile_id", userId)
    .maybeSingle();

  if (orgSelErr) throw orgSelErr;

  if (!orgRow) {
    const { error: orgInsErr } = await supabase.from("organization_profiles").insert({
      profile_id: userId,
      name: orgName,
      org_type: "Zorgorganisatie",
      description: "Dev-seeded organization for SamenConnect manual testing.",
      city: "Amsterdam",
      region: "Noord-Holland",
      country: "Nederland",
    });
    if (orgInsErr) throw orgInsErr;
    actions.push(`organization_profiles: inserted for profile_id=${userId}`);
  } else {
    const orgPatch = {};
    if (!orgRow.name?.trim()) orgPatch.name = orgName;
    if (Object.keys(orgPatch).length) {
      const { error: orgUpErr } = await supabase
        .from("organization_profiles")
        .update(orgPatch)
        .eq("profile_id", userId);
      if (orgUpErr) throw orgUpErr;
      actions.push(`organization_profiles: updated ${JSON.stringify(orgPatch)}`);
    } else {
      actions.push("organization_profiles: already present");
    }
  }

  console.log("\n=== SamenConnect dev organization test user ===\n");
  console.log(`Mode:              ${mode === "created" ? "CREATED" : "REPAIRED"}`);
  console.log(`Email:             ${email}`);
  console.log(`Password:          ${password}`);
  console.log(`Profile id (auth): ${userId}`);
  console.log("\nActions:\n" + actions.map((a) => "  - " + a).join("\n"));
  console.log(
    "\nYou can log in at /login with the email and password above.\n" +
      "Re-run with the same env to reset the password or fix missing rows.\n"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
