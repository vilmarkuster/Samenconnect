import { NextRequest } from "next/server";
import { jsonrepair } from "jsonrepair";
import { getPlatformSupabaseServerClient, getPlatformUserOrNull } from "@/lib/platform-supabase-server";
import { PLATFORM_ANTHROPIC_CLAUDE_MODEL } from "@/lib/platform-anthropic-model";

const CHAT_SYSTEM_PROMPT = `You are an AI automation copilot inside a web dashboard. Be concise and suggest concrete automations, agents, workflows, and full app plans.

When the user asks to create an agent (e.g. "Create an agent that...", "I need an agent for..."), respond with ONLY a single valid JSON object, no other text or markdown, in this exact shape:
{"action":"create_agent","name":"Agent Name","description":"What the agent does.","status":"Active" or "Draft"}

When the user asks to create a workflow (e.g. "Create a workflow that...", "Add a workflow for..."), respond with ONLY a single valid JSON object, no other text or markdown, in this exact shape:
{"action":"create_workflow","name":"Workflow Name","description":"What the workflow does.","status":"Active" or "Draft"}

When the user asks to build an app, tool, SaaS, dashboard, or workflow system (e.g. "Build me a SaaS for invoices", "Maak een app voor afspraken boeken"), you MUST respond with ONLY valid JSON. Strict rules:
- Return ONLY the JSON object. No explanations, no markdown, no code fences, no comments, no trailing commas.
- The response must pass JSON.parse() without modification. Use double quotes for all keys and string values. No single quotes, no unescaped newlines inside strings, no trailing commas after the last element in arrays or objects.
- Required format (include all keys; use empty arrays [] if not needed):

{
  "action": "create_app_plan",
  "appName": "string",
  "description": "string",
  "pages": [ { "name": "string", "description": "string" } ],
  "databaseTables": [ { "name": "table_name_snake_case", "description": "string", "columns": [ { "name": "column_name", "type": "text" or "numeric" or "boolean" or "timestamptz" } ] } ],
  "apiRoutes": [ { "path": "/api/example", "description": "string" } ],
  "agents": [ { "name": "string", "description": "string", "status": "Active" or "Draft" } ],
  "workflows": [ { "name": "string", "description": "string", "status": "Active" or "Draft" } ],
  "navigation": [ { "label": "string", "path": "string" } ],
  "dashboardWidgets": [ { "type": "count" or "link", "entity": "table_slug", "label": "string" } ]
}

Use snake_case for table and column names. Include at least one database table. Return only the JSON object.

For any other message, respond with normal helpful text (no JSON).`;

type CreateActionPayload = {
  action: "create_agent" | "create_workflow";
  name: string;
  description: string;
  status: string;
};

type AppPlanPayload = {
  action: "create_app_plan";
  appName: string;
  description: string;
  pages?: unknown[];
  databaseTables?: unknown[];
  apiRoutes?: unknown[];
  agents?: { name: string; description?: string; status?: string }[];
  workflows?: { name: string; description?: string; status?: string }[];
  // extra fields are allowed and stored in spec_json
  [key: string]: unknown;
};

function tryParseCreateAction(text: string): CreateActionPayload | null {
  const str = extractJsonObject(text);
  if (!str) return null;
  try {
    const parsed = JSON.parse(str) as { action?: string; name?: string; description?: string; status?: string };
    if (parsed?.action === "create_agent" || parsed?.action === "create_workflow") {
      const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
      if (!name) return null;
      return {
        action: parsed.action as "create_agent" | "create_workflow",
        name,
        description: typeof parsed.description === "string" ? parsed.description.trim() : "",
        status: parsed.status === "Active" ? "Active" : "Draft"
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Extract the JSON object from text robustly:
 * 1. Try a fenced ```json ... ``` block first.
 * 2. Otherwise find first "{" and last "}", slice, then trim.
 */
function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    return codeBlock[1].trim();
  }
  const start = trimmed.indexOf("{");
  if (start === -1) return null;
  const end = trimmed.lastIndexOf("}");
  if (end === -1 || end < start) return null;
  return trimmed.slice(start, end + 1).trim();
}

function tryParseAppPlan(text: string): AppPlanPayload | null {
  // Temporary debug logs for app plan parsing
  // eslint-disable-next-line no-console
  console.log("[/api/chat] app plan – raw Claude text length:", text?.length);
  const str = extractJsonObject(text);
  // eslint-disable-next-line no-console
  console.log(
    "[/api/chat] app plan – extracted JSON:",
    str === null ? "(null)" : str.length > 500 ? `${str.slice(0, 500)}...` : str
  );
  if (!str) return null;
  let repaired: string;
  try {
    repaired = jsonrepair(str);
  } catch (repairErr) {
    // eslint-disable-next-line no-console
    console.error(
      "[/api/chat] app plan – jsonrepair error:",
      repairErr instanceof Error ? repairErr.message : String(repairErr)
    );
    return null;
  }
  // eslint-disable-next-line no-console
  console.log(
    "[/api/chat] app plan – repaired JSON:",
    repaired.length > 500 ? `${repaired.slice(0, 500)}...` : repaired
  );
  try {
    const parsed = JSON.parse(repaired) as Partial<AppPlanPayload>;
    if (parsed?.action !== "create_app_plan") return null;
    const appName =
      typeof parsed.appName === "string" ? parsed.appName.trim() : "";
    if (!appName) return null;
    const description =
      typeof parsed.description === "string"
        ? parsed.description.trim()
        : "";
    return {
      ...(parsed as AppPlanPayload),
      action: "create_app_plan",
      appName,
      description
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      "[/api/chat] app plan – parse error:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getPlatformUserOrNull(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // eslint-disable-next-line no-console
      console.error("[/api/chat] Missing ANTHROPIC_API_KEY");
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY is not set on the server."
        }),
        { status: 500 }
      );
    }

    const body = await req.json();
    const userMessage: string | undefined = body?.message;

    if (!userMessage || typeof userMessage !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'message' in request body." }),
        { status: 400 }
      );
    }

    const payload = {
      model: PLATFORM_ANTHROPIC_CLAUDE_MODEL,
      max_tokens: 512,
      system: CHAT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: userMessage
            }
          ]
        }
      ]
    };

    // eslint-disable-next-line no-console
    console.log("[/api/chat] Sending request to Anthropic", {
      model: payload.model
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.error(
        "[/api/chat] Claude API error",
        response.status,
        response.statusText,
        errorText
      );
      return new Response(
        JSON.stringify({
          error: "Claude API request failed.",
          status: response.status,
          statusText: response.statusText,
          anthropicRaw: errorText
        }),
        { status: 500 }
      );
    }

    const data = await response.json();
    const rawBlocks = Array.isArray(data?.content) ? data.content : [];
    const text = rawBlocks
      .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
      .map((b: any) => b.text)
      .join("\n\n");

    const content =
      text && typeof text === "string"
        ? text
        : "No content returned from Claude.";

    const origin = new URL(req.url).origin;
    const forwardCookie = req.headers.get("cookie") ?? "";

    // First, try to interpret the response as a full app plan
    const parsed = tryParseAppPlan(content);
    if (parsed?.action === "create_app_plan") {
      const supabase = getPlatformSupabaseServerClient(req);
      const { data: planRow, error: insertError } = await supabase
        .from("app_plans")
        .insert({
          app_name: parsed.appName,
          description: parsed.description ?? "",
          spec_json: parsed
        })
        .select()
        .single();

      if (insertError || !planRow) {
        return new Response(
          JSON.stringify({
            reply: `Saving the app plan failed: ${insertError?.message ?? "Unknown error"}.`
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Same-origin + session cookie: server-side fetch does not inherit cookies unless forwarded.
      const scaffoldRes = await fetch(`${origin}/api/app-plans/scaffold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(forwardCookie ? { Cookie: forwardCookie } : {})
        },
        body: JSON.stringify({ appPlanId: String(planRow.id) })
      });

      const scaffoldPayload = await scaffoldRes.json().catch(() => ({}));

      if (!scaffoldRes.ok) {
        const detail =
          typeof scaffoldPayload?.error === "string"
            ? scaffoldPayload.error
            : typeof scaffoldPayload?.detail === "string"
              ? scaffoldPayload.detail
              : scaffoldRes.statusText;
        return new Response(
          JSON.stringify({
            reply: `App plan was saved, but scaffolding failed (${scaffoldRes.status}): ${detail}.`
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const successMessage = `App scaffold created for ${parsed.appName}`;
      return new Response(
        JSON.stringify({
          message: successMessage,
          reply: successMessage
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Otherwise, fall back to the simpler create-agent / create-workflow flow
    const createPayload = tryParseCreateAction(content);

    if (createPayload?.action === "create_agent") {
      const agentRes = await fetch(`${origin}/api/agents`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(forwardCookie ? { Cookie: forwardCookie } : {})
        },
        body: JSON.stringify({
          name: createPayload.name,
          description: createPayload.description,
          status: createPayload.status
        })
      });
      if (agentRes.ok) {
        return new Response(
          JSON.stringify({
            reply: `Agent created: ${createPayload.name}. You can see it and run tests on the Agents page.`
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }
      const errData = await agentRes.json().catch(() => ({}));
      const errMsg = errData?.error || errData?.detail || `Failed to create agent (${agentRes.status}).`;
      return new Response(
        JSON.stringify({
          reply: `I understood you wanted to create an agent, but saving it failed: ${errMsg}`
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    }

    if (createPayload?.action === "create_workflow") {
      const workflowRes = await fetch(`${origin}/api/workflows`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(forwardCookie ? { Cookie: forwardCookie } : {})
        },
        body: JSON.stringify({
          name: createPayload.name,
          description: createPayload.description,
          status: createPayload.status
        })
      });
      if (workflowRes.ok) {
        return new Response(
          JSON.stringify({
            reply: `Workflow created: ${createPayload.name}. You can see it on the Workflows page.`
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        );
      }
      const errData = await workflowRes.json().catch(() => ({}));
      const errMsg = errData?.error || errData?.detail || `Failed to create workflow (${workflowRes.status}).`;
      return new Response(
        JSON.stringify({
          reply: `I understood you wanted to create a workflow, but saving it failed: ${errMsg}`
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
    }

    // Never return raw JSON to the UI; if it looks like an app plan that failed to parse, show a short message
    if (
      typeof content === "string" &&
      content.includes("create_app_plan") &&
      content.includes("appName")
    ) {
      return new Response(
        JSON.stringify({
          reply: "App plan was returned but could not be parsed. Please try again."
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(JSON.stringify({ reply: content }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/chat] Chat API error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while processing chat request.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}


