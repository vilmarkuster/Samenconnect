import { NextRequest } from "next/server";
import { requireZorentaAuth, jsonResponse } from "@/lib/zorenta/auth";
import { getAnthropicServerApiKey } from "@/lib/zorenta/anthropic-server-key";
import { PLATFORM_ANTHROPIC_CLAUDE_MODEL } from "@/lib/platform-anthropic-model";

function extractFirstText(output: unknown): string {
  if (!Array.isArray(output)) return "";
  for (const item of output) {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      (item as { type?: string }).type === "text" &&
      "text" in item &&
      typeof (item as { text?: unknown }).text === "string"
    ) {
      return (item as { text: string }).text;
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);

  const apiKey = getAnthropicServerApiKey();
  if (!apiKey) return jsonResponse({ error: "AI is momenteel niet beschikbaar." }, 500);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return jsonResponse({ error: "Beschrijving ontbreekt." }, 400);

  const careTypes = Array.isArray(body.careTypes)
    ? body.careTypes.filter(
        (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];
  const availability = Array.isArray(body.availability)
    ? body.availability.filter(
        (v: unknown): v is string => typeof v === "string" && v.trim().length > 0
      )
    : [];
  const frequency = typeof body.frequency === "string" ? body.frequency.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";

  const contextLines = [
    careTypes.length > 0 ? `Zorgtype: ${careTypes.join(", ")}` : null,
    frequency ? `Frequentie: ${frequency}` : null,
    location ? `Locatie: ${location}` : null,
    availability.length > 0 ? `Beschikbaarheid: ${availability.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    "Herschrijf onderstaande zorgvraagbeschrijving in helder en natuurlijk Nederlands voor betere matching op een zorgplatform.",
    "",
    "Belangrijke regels:",
    "- Voeg GEEN nieuwe feiten toe.",
    "- Als info ontbreekt, benoem het niet als feit en laat onzekerheid intact.",
    "- Houd het menselijk, praktisch en compact (max 120 woorden).",
    "- Gebruik 1 korte alinea of 2 korte alinea's.",
    "- Geen bullets, geen labels, geen markdown.",
    "",
    contextLines ? `Context:\n${contextLines}\n` : "",
    `Originele tekst:\n${description}`,
    "",
    "Geef alleen de herschreven tekst terug.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: PLATFORM_ANTHROPIC_CLAUDE_MODEL,
      max_tokens: 500,
      system:
        "Je bent een Nederlandse redacteur voor zorgvragen. Je maakt tekst duidelijker zonder nieuwe feiten te verzinnen.",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return jsonResponse({ error: "AI kon de beschrijving niet verbeteren.", detail: err || undefined }, 502);
  }

  const data = await res.json().catch(() => ({}));
  const rewritten = extractFirstText(data?.content).trim();
  if (!rewritten) return jsonResponse({ error: "Geen verbeterde tekst ontvangen." }, 502);

  return jsonResponse({ description: rewritten });
}

