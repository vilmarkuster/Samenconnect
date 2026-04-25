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

const CONTEXT_HINTS: Record<string, string> = {
  chat: "Dit is een chatbericht op een zorgplatform.",
  application: "Dit is een sollicitatie-/motivatietekst voor een zorgopdracht.",
  intake: "Dit is een beschrijving van een zorgvraag (intake) voor matching.",
  job: "Dit is tekst bij een zorgopdracht (vacature).",
  general: "Dit is tekst op een zorgplatform.",
};

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);

  const apiKey = getAnthropicServerApiKey();
  if (!apiKey) return jsonResponse({ error: "AI is momenteel niet beschikbaar." }, 500);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const ctxKey = typeof body.context === "string" ? body.context.trim().toLowerCase() : "general";
  if (!text) return jsonResponse({ error: "Tekst ontbreekt." }, 400);
  if (text.length > 12_000) return jsonResponse({ error: "Tekst is te lang." }, 400);

  const ctxLine = CONTEXT_HINTS[ctxKey] ?? CONTEXT_HINTS.general;

  const prompt = [
    "Je bent een Nederlandse redacteur voor SamenConnect, een zorg- en opdrachtenplatform.",
    ctxLine,
    "",
    "Herschrijf de tekst helderder en professioneler in het Nederlands.",
    "Regels:",
    "- Voeg geen nieuwe feiten toe.",
    "- Houd toon menselijk en respectvol.",
    "- Geen emoji’s, geen markdown-koppen, geen opsommingstekens tenzij de originele tekst die al had.",
    "- Maximaal ongeveer dezelfde lengte; iets inkorten mag als het scherper wordt.",
    "",
    `Originele tekst:\n${text}`,
    "",
    "Geef alleen de herschreven tekst terug, zonder inleiding of uitleg.",
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: PLATFORM_ANTHROPIC_CLAUDE_MODEL,
      max_tokens: 1800,
      system:
        "Je bent een zorgvuldige Nederlandse editor. Je herschrijft tekst professioneler zonder nieuwe feiten toe te voegen.",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return jsonResponse(
      { error: "AI kon de tekst niet verbeteren.", detail: err || undefined },
      502
    );
  }

  const data = await res.json().catch(() => ({}));
  const improved = extractFirstText(data?.content).trim();
  if (!improved) return jsonResponse({ error: "Geen verbeterde tekst ontvangen." }, 502);

  return jsonResponse({ text: improved });
}
