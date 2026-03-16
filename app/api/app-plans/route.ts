import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

type AppPlanRow = {
  id: string;
  app_name: string;
  description: string | null;
  spec_json: unknown;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("app_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // eslint-disable-next-line no-console
      console.error("[/api/app-plans] Supabase GET error", error);
      return new Response(
        JSON.stringify({
          error: "Failed to load app plans.",
          detail: error.message
        }),
        { status: 500 }
      );
    }

    const appPlan = (data ?? null) as AppPlanRow | null;

    return new Response(JSON.stringify({ appPlan }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/app-plans] Unexpected GET error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while loading app plans.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const appName: string | undefined = body?.appName;
    const description: string | undefined = body?.description ?? "";
    const spec = body?.spec;

    if (!appName || typeof appName !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'appName'." }),
        { status: 400 }
      );
    }

    if (!spec || typeof spec !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'spec' object." }),
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("app_plans")
      .insert({
        app_name: appName,
        description,
        spec_json: spec
      })
      .select("*")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/app-plans] Supabase POST error", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create app plan.",
          detail: error.message
        }),
        { status: 500 }
      );
    }

    const appPlan = data as AppPlanRow;

    return new Response(JSON.stringify({ appPlan }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/app-plans] Unexpected POST error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while creating app plan.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

