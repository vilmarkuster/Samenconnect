import { NextRequest } from "next/server";
import { getSupabaseClient } from "@/lib/supabase-client";

// Default Anthropic Claude model for agents
const CLAUDE_MODEL = "claude-3-5-sonnet-latest";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY is not set on the server."
        }),
        { status: 500 }
      );
    }

    const body = await req.json();
    const agentId = body?.agentId;
    const agentName: string | undefined = body?.agentName;
    const agentDescription: string | undefined = body?.description;
    const userInput: string = body?.input || "";

    const hasValidId =
      agentId !== undefined &&
      agentId !== null &&
      (typeof agentId === "number" || typeof agentId === "string");
    if (!hasValidId) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'agentId'." }),
        { status: 400 }
      );
    }

    const systemPrompt =
      agentName && agentDescription
        ? `You are an AI agent named "${agentName}". ${agentDescription}\n\nRespond in character: give a short, concrete example of what this agent would do for a user (1–3 paragraphs). Do not repeat the instructions; simulate real output.`
        : agentName
          ? `You are an AI agent named "${agentName}". Run a representative test and describe what you would do for a typical user in 1–3 short paragraphs.`
          : "You are an AI automation agent. Run a representative test and describe what you would do for a typical user in 1–3 short paragraphs.";

    const userMessage =
      userInput ||
      "Run a representative test for this agent and show example output a user would see.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: userMessage }]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.error("Claude agent run error", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Claude agent run failed.",
          detail: errorText
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

    const output: string =
      text && typeof text === "string"
        ? text
        : "No content returned from Claude for this agent run.";

    // Store run in Supabase (best-effort; failure shouldn't break the response)
    try {
      const supabase = getSupabaseClient();
      await supabase.from("runs").insert({
        kind: "agent",
        agent_id: agentId,
        agent_name: agentName ?? null,
        input: userMessage,
        output
      });
    } catch (storageError) {
      // eslint-disable-next-line no-console
      console.error("Failed to store agent run in Supabase", storageError);
    }

    return new Response(
      JSON.stringify({
        output
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Agent run API error", err);
    return new Response(
      JSON.stringify({
        error: "Unexpected error while running agent.",
        detail: err?.message ?? String(err)
      }),
      { status: 500 }
    );
  }
}

