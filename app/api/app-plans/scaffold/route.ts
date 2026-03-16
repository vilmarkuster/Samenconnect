import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  buildSqlFromSpec,
  buildFullAppScaffoldFiles,
  getAppSlug,
  writeGeneratedAppFiles
} from "@/lib/app-plan-scaffold";

type AppPlanRow = {
  id: string;
  app_name: string;
  description: string | null;
  spec_json: unknown;
  created_at: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const appPlanId = body?.appPlanId;
    const specFromBody = body?.spec;
    const appNameFromBody = body?.appName;

    let spec: unknown;
    let appName: string;

    if (specFromBody && typeof specFromBody === "object" && appNameFromBody) {
      spec = specFromBody;
      appName = String(appNameFromBody);
    } else if (appPlanId && typeof appPlanId === "string") {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("app_plans")
        .select("*")
        .eq("id", appPlanId)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({
            error: "App plan not found.",
            detail: error?.message
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      const row = data as AppPlanRow;
      spec = row.spec_json;
      appName = row.app_name;
    } else {
      return new Response(
        JSON.stringify({
          error: "Provide appPlanId or (spec + appName)."
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const specObj = spec && typeof spec === "object" ? (spec as Record<string, unknown>) : {};
    const appSlug = getAppSlug(appName);
    const specForScaffold = {
      appName,
      description: typeof specObj.description === "string" ? specObj.description : undefined,
      databaseTables: Array.isArray(specObj.databaseTables) ? specObj.databaseTables : [],
      pages: Array.isArray(specObj.pages) ? specObj.pages : [],
      navigation: Array.isArray(specObj.navigation) ? specObj.navigation : [],
      dashboardWidgets: Array.isArray(specObj.dashboardWidgets) ? specObj.dashboardWidgets : []
    };
    const files = buildFullAppScaffoldFiles(specForScaffold, appSlug);
    const sql = buildSqlFromSpec(specForScaffold);

    const rootDir = process.cwd();
    const { written, errors } = writeGeneratedAppFiles(files, rootDir);

    let tablesCreated = false;
    if (sql && process.env.DATABASE_URL) {
      try {
        const { Client } = await import("pg");
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        await client.connect();
        await client.query(sql);
        await client.end();
        tablesCreated = true;
      } catch (sqlErr: unknown) {
        // eslint-disable-next-line no-console
        console.error("Scaffold: SQL execution failed", sqlErr);
        errors.push(`Tables: ${sqlErr instanceof Error ? sqlErr.message : String(sqlErr)}`);
      }
    }

    try {
      const supabase = getSupabaseClient();
      await supabase.from("generated_apps").upsert(
        { name: appName, slug: appSlug, description: specObj.description ?? null },
        { onConflict: "slug" }
      );
    } catch (regErr: unknown) {
      // eslint-disable-next-line no-console
      console.error("Scaffold: generated_apps insert failed", regErr);
    }

    return new Response(
      JSON.stringify({
        appSlug,
        filesWritten: written,
        filesErrors: errors,
        tablesCreated,
        schemaSql: sql || null,
        appUrl: `/generated-apps/${appSlug}`
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[/api/app-plans/scaffold] Error", err);
    return new Response(
      JSON.stringify({
        error: "Scaffold failed.",
        detail: err instanceof Error ? err.message : String(err)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
