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

function toCleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0);
}

type ImprovedPayload = {
  title: string;
  description: string;
  experience: string;
  requirements: string;
};

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function parseImprovedPayload(text: string): ImprovedPayload | null {
  const jsonText = extractJsonObject(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const title = toCleanString(parsed.title);
    const description = toCleanString(parsed.description);
    const experience = toCleanString(parsed.experience);
    const requirements = toCleanString(parsed.requirements);
    if (!title && !description && !experience && !requirements) return null;
    return { title, description, experience, requirements };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireZorentaAuth(req);
  if (!auth.ok) return jsonResponse(auth.body, auth.status);

  const apiKey = getAnthropicServerApiKey();
  if (!apiKey) return jsonResponse({ error: "AI is momenteel niet beschikbaar." }, 500);

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const description = toCleanString(body.description);
  const title = toCleanString(body.title);
  const careTypes = toStringArray(body.careTypes);
  const zorgniveau = toStringArray(body.zorgniveau);
  const typeInzet = toStringArray(body.typeInzet);
  const roleSought = toCleanString(body.roleSought);
  const location = toCleanString(body.location);
  const schedule = toCleanString(body.schedule);
  const budget = toCleanString(body.budget);
  const experience = toCleanString(body.experience);
  const requirements = toCleanString(body.requirements);
  if (!title && !description && !experience && !requirements) {
    return jsonResponse({ error: "Voeg eerst titel, omschrijving, ervaring of eisen toe." }, 400);
  }

  const prompt = [
    "Je bent een ervaren recruiter en redacteur voor een zorgplatform.",
    "",
    "Je schrijft helder, professioneel en menselijk Nederlands voor zorgopdrachten.",
    "",
    "Je doel:",
    "- Maak teksten duidelijker, concreter en beter leesbaar",
    "- Optimaliseer voor snelle scan door zorgverleners",
    "- Verbeter kwaliteit zonder nieuwe informatie toe te voegen",
    "",
    "Belangrijke regels:",
    "- Voeg GEEN nieuwe feiten toe",
    "- Gebruik alleen informatie uit input",
    "- Maak tekst logisch en professioneel",
    "- Vermijd herhaling",
    "- Geen emojis",
    "",
    "---",
    "",
    "Verbeter en structureer onderstaande zorgopdracht.",
    "",
    "Geef output als JSON met deze velden:",
    '- "title"',
    '- "description"',
    '- "experience"',
    '- "requirements"',
    "",
    "Richtlijnen per veld:",
    "",
    "TITLE:",
    "- Kort en krachtig (max 12 woorden)",
    "- Benoem rol + setting + eventueel doelgroep",
    "- Maak het aantrekkelijk en professioneel",
    "",
    "DESCRIPTION:",
    "- Natuurlijk lopende tekst (geen bullets)",
    "- Kort en duidelijk",
    "- Beschrijf situatie + werkzaamheden",
    "",
    "EXPERIENCE:",
    "- Kort en concreet (1 zin)",
    "- Focus op relevante ervaring",
    "- Professioneel geformuleerd",
    "",
    "REQUIREMENTS:",
    "- Opschonen en duidelijk maken",
    "- Correct Nederlands",
    "- Alleen harde eisen (bijv. diploma, taal)",
    "- Geen zachte competenties, geen bijzinnen, geen losse steekwoorden",
    "- Maak er bij voorkeur 1 duidelijke zin van met correcte interpunctie",
    "",
    "Context:",
    `Titel: ${title || ""}`,
    `Omschrijving: ${description}`,
    `Ervaring: ${experience || ""}`,
    `Certificaten: ${requirements || ""}`,
    `Zorgtype: ${careTypes.join(", ")}`,
    `Zorgniveau: ${zorgniveau.join(", ")}`,
    `Type inzet: ${typeInzet.join(", ")}`,
    `Gezochte rol: ${roleSought || ""}`,
    `Locatie: ${location || ""}`,
    `Planning: ${schedule || ""}`,
    `Budget: ${budget || ""}`,
    "",
    "Geef alleen geldige JSON terug.",
    "Gebruik dubbele quotes.",
    "Geen tekst buiten JSON.",
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
      max_tokens: 500,
      system:
        "Je bent een Nederlandse redacteur voor zorgopdrachten. Je maakt tekst duidelijker, concreter en beter leesbaar zonder nieuwe feiten te verzinnen.",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    return jsonResponse(
      { error: "AI kon de beschrijving niet verbeteren.", detail: err || undefined },
      502
    );
  }

  const data = await res.json().catch(() => ({}));
  const raw = extractFirstText(data?.content).trim();
  if (!raw) return jsonResponse({ error: "Geen verbeterde tekst ontvangen." }, 502);
  const improved = parseImprovedPayload(raw);
  if (!improved) return jsonResponse({ error: "Geen geldige AI-output ontvangen." }, 502);

  return jsonResponse(improved);
}
