import { NextRequest } from "next/server";
import { getPlatformSupabaseServerClient, getPlatformUserOrNull } from "@/lib/platform-supabase-server";

type WorkflowRow = {
  id: number;
  name: string;
  description: string | null;
  status: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/workflows] Supabase GET error", error);
      return new Response(
        JSON.stringify({
          error: "Failed to load workflows.",
          detail: error.message
        }),
        { status: 500 }
      );
    }

    const workflows: WorkflowRow[] = (data ?? []) as WorkflowRow[];

    return new Response(JSON.stringify({ workflows }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/workflows] Unexpected GET error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while loading workflows.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    const supabase = getPlatformSupabaseServerClient(req);
    const body = await req.json();
    const name: string | undefined = body?.name;
    const description: string | undefined = body?.description;
    const status: string | undefined = body?.status;

    if (!name || typeof name !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'name'." }),
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("workflows")
      .insert({
        name,
        description: description ?? null,
        status: status ?? "Draft"
      })
      .select("*")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[/api/workflows] Supabase POST error", error);
      return new Response(
        JSON.stringify({
          error: "Failed to create workflow.",
          detail: error.message
        }),
        { status: 500 }
      );
    }

    const workflow = data as WorkflowRow;

    return new Response(JSON.stringify({ workflow }), {
      status: 201,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/workflows] Unexpected POST error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while creating workflow.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

