import { NextRequest } from "next/server";
import { getPlatformSupabaseServerClient, getPlatformUserOrNull } from "@/lib/platform-supabase-server";
import { PLATFORM_ANTHROPIC_CLAUDE_MODEL } from "@/lib/platform-anthropic-model";

type CareJobRow = {
  id: string;
  title: string | null;
  description: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

type CaregiverRow = {
  id: string;
  name: string;
  location: string;
  zorgtype: string[] | null;
  specialisaties: string[] | null;
  vaardigheden: string[] | null;
  certificaten: string[] | null;
  registraties: string[] | null;
  beschikbaarheid: string[] | null;
  prijs: number | null;
  profile_id: string | null;
};

type MatchResponseItem = {
  caregiverId: string;
  caregiverName: string;
  fitScore: number;
  reason: string;
  concerns: string[];
  recommendation: string;
};

function extractJsonObjectFromText(text: string): string | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return trimmed.slice(start, end + 1).trim();
}

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
    let userInput: string = body?.input || "";
    const jobId = body?.jobId;
    let jobIdForMatchResult: string | null = null;
    let jobForMatch: CareJobRow | null = null;

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

    const supabase = getPlatformSupabaseServerClient(req);

    if (jobId !== undefined && jobId !== null && String(jobId).trim()) {
      const jobIdStr = String(jobId).trim();
      jobIdForMatchResult = jobIdStr;
      const { data: job, error: jobError } = await supabase
        .from("care_jobs")
        .select("id, title, description, city, region, country")
        .eq("id", jobIdStr)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({
            error: "Job not found.",
            detail: jobError?.message
          }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }

      const jobRow = job as CareJobRow;
      jobForMatch = jobRow;
      const title = typeof jobRow.title === "string" ? jobRow.title.trim() : "";
      const description = typeof jobRow.description === "string" ? jobRow.description.trim() : "";

      const locationParts: string[] = [];
      const city = typeof jobRow.city === "string" ? jobRow.city.trim() : "";
      const region = typeof jobRow.region === "string" ? jobRow.region.trim() : "";
      const country = typeof jobRow.country === "string" ? jobRow.country.trim() : "";

      if (city) locationParts.push(city);
      if (region) locationParts.push(region);
      if (country) locationParts.push(country);

      if (!title && !description && locationParts.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Job has no usable data.",
            detail: "Expected title, description, or location fields on care_jobs."
          }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }

      userInput = [
        "Run this agent for the job below.",
        "",
        `Job ID: ${jobIdStr}`,
        title ? `Title: ${title}` : null,
        description ? `Description: ${description}` : null,
        locationParts.length > 0 ? `Location: ${locationParts.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("*")
      .eq("id", agentId)
      .single();

    if (agentError || !agent) {
      return new Response(
        JSON.stringify({
          error: "Agent not found.",
          detail: agentError?.message
        }),
        { status: 404 }
      );
    }

    const agentName = agent.name;
    const agentDescription = agent.description;
    const agentNameStr = typeof agentName === "string" ? agentName : "";
    const isMatchAgent = agentNameStr.trim().toLowerCase() === "match agent";

    if (isMatchAgent) {
      if (!jobForMatch || !jobIdForMatchResult) {
        return new Response(
          JSON.stringify({
            output: "Match Agent requires a jobId to run real matching."
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      const { data: caregivers, error: caregiversError } = await supabase
        .from("caregivers")
        .select(
          "id, name, location, zorgtype, specialisaties, vaardigheden, certificaten, registraties, beschikbaarheid, prijs, created_at, profile_id"
        )
        .order("created_at", { ascending: false })
        .limit(30);

      if (caregiversError) {
        return new Response(
          JSON.stringify({
            output: `Failed to load caregivers: ${caregiversError.message}`
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      const caregiverRows: CaregiverRow[] = (caregivers ?? []) as CaregiverRow[];
      if (caregiverRows.length === 0) {
        return new Response(
          JSON.stringify({
            output: "No caregivers found in the database to match against."
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      const profileIds = caregiverRows
        .map((c) => c.profile_id)
        .filter((id): id is string => Boolean(id));

      const [{ data: profileRows }, { data: caregiverProfileRows }] = await Promise.all([
        profileIds.length > 0
          ? supabase.from("profiles").select("id, display_name").in("id", profileIds)
          : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
        profileIds.length > 0
          ? supabase
              .from("caregiver_profiles")
              .select(
                "profile_id, headline, bio, skills, experience_years, availability, city, region, country, created_at"
              )
              .in("profile_id", profileIds)
          : Promise.resolve({
              data: [] as Array<{
                profile_id: string;
                headline: string | null;
                bio: string | null;
                skills: string[] | null;
                experience_years: number | null;
                availability: string | null;
                city: string | null;
                region: string | null;
                country: string | null;
                created_at: string;
              }>,
            }),
      ]);

      const profileById = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p]));
      const caregiverProfileByProfileId = Object.fromEntries(
        (caregiverProfileRows ?? []).map((cp) => [cp.profile_id, cp])
      );

      const candidates = caregiverRows
        .filter((c) => Boolean(c.profile_id))
        .map((c) => {
          const profile = c.profile_id ? profileById[c.profile_id] : undefined;
          const cp = c.profile_id ? caregiverProfileByProfileId[c.profile_id] : undefined;
        const locationStr = (() => {
          const parts: string[] = [];
          const city = typeof cp?.city === "string" ? cp.city.trim() : "";
          const region = typeof cp?.region === "string" ? cp.region.trim() : "";
          const country = typeof cp?.country === "string" ? cp.country.trim() : "";
          if (city) parts.push(city);
          if (region) parts.push(region);
          if (country) parts.push(country);
          if (parts.length > 0) return parts.join(", ");
          return c.location;
        })();

        return {
          // Zorenta route expects `profiles.id` (== caregiver_profiles.profile_id)
          id: c.profile_id as string,
          name: profile?.display_name ?? c.name,
          location: locationStr,
          bio: cp?.bio ?? null,
          headline: cp?.headline ?? null,
          experience_years: cp?.experience_years ?? null,
          skills: cp?.skills ?? c.vaardigheden ?? null,
          care_types: c.zorgtype ?? null,
          specializations: c.specialisaties ?? null,
          availability: cp?.availability ?? (c.beschikbaarheid ?? null),
          registrations: c.registraties ?? null,
          price: c.prijs ?? null,
          certificates: c.certificaten ?? null,
        };
        });

      const jobLocationParts = [jobForMatch.city, jobForMatch.region, jobForMatch.country]
        .filter((x) => typeof x === "string" && x.trim().length > 0)
        .map((x) => (x as string).trim());

      const jobPayload = {
        id: jobForMatch.id,
        title: jobForMatch.title,
        description: jobForMatch.description,
        location: jobLocationParts.length > 0 ? jobLocationParts.join(", ") : null,
      };

      const matchSystemPrompt = [
        'You are "Match Agent", an expert matching assistant for a care platform.',
        "You must rank caregivers for a care job using ONLY the provided candidates.",
        "Do NOT invent caregivers, profiles, skills, certifications, availability, prices, or locations.",
        "Use ONLY caregiver IDs that exist in the provided candidates list.",
        "NEVER invent caregiver IDs.",
        "The caregiverId you return must be a Zorenta route id (profiles.id / caregiver_profiles.profile_id).",
        "If data is missing, say so explicitly.",
        "",
        "DATA SOURCE:",
        "- Match ONLY using the provided caregiver candidates JSON.",
        "- caregiverId MUST match one of the candidate ids.",
        "- If information is missing, mention it and do NOT guess.",
        "",
        "OUTPUT FORMAT:",
        "- Return ONLY valid JSON.",
        "- No markdown.",
        "- No code fences.",
        "- No extra text.",
        "",
        "Return this exact structure:",
        "{",
        '  "matches": [',
        "    {",
        '      "caregiverId": "string",',
        '      "caregiverName": "string",',
        '      "fitScore": 0,',
        '      "reason": "short explanation",',
        '      "concerns": ["short bullets"],',
        '      "recommendation": "final verdict"',
        "    }",
        "  ]",
        "}",
        "",
        "RULES:",
        "- Max 3 matches.",
        "- Sort highest fitScore first.",
        "- If at least 2 candidates are reasonably suitable (fitScore >= 50), return at least 2 matches (up to 3); do not return only one match when two or more qualify at >= 50.",
        "- If fewer than 3 candidates are suitable, return fewer.",
        "- fitScore must be an integer from 0 to 100.",
        "- Keep text short, clear, and professional.",
        "",
        "SCORING:",
        "- Experience (0-30)",
        "- Skills & certificates (0-25)",
        "- Location (0-20)",
        "- Availability (0-15)",
        "- Profile quality (0-10)",
        "",
        "CALIBRATION:",
        "- 60-75 = good match",
        "- 75-90 = strong match",
        "- 90+ = rare / near perfect",
        "- Do NOT give high scores easily.",
        "",
        "TEXT STYLE:",
        "- Write like a real human sending a message (NOT like a report).",
        "- Avoid formal or robotic phrases.",
        "- Do NOT use phrases like 'aandachtspunt', 'verifieer', 'geschikte kandidaat'.",
        "- Use natural Dutch.",
        "- Keep sentences short and conversational.",
        "",
        "- reason = max 2 sentences, natural and friendly",
        "- concerns = short, simple, human phrasing",
        '- recommendation = casual advice like "Ziet er goed uit, maar even checken of reizen lukt" or "Goede optie, maar vraag nog even naar beschikbaarheid"',
      ].join("\n");

      const matchUserMessage = [
        "Job:",
        JSON.stringify(jobPayload),
        "",
        "Caregiver candidates:",
        JSON.stringify(candidates),
      ].join("\n");

      const matchResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: PLATFORM_ANTHROPIC_CLAUDE_MODEL,
          max_tokens: 800,
          system: matchSystemPrompt,
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: matchUserMessage }]
            }
          ]
        })
      });

      if (!matchResponse.ok) {
        const errorText = await matchResponse.text();
        // eslint-disable-next-line no-console
        console.error("Claude match agent error", matchResponse.status, errorText);
        return new Response(
          JSON.stringify({
            error: "Claude agent run failed.",
            detail: errorText
          }),
          { status: 500 }
        );
      }

      const matchData = await matchResponse.json();
      const matchBlocks = Array.isArray(matchData?.content) ? matchData.content : [];
      const matchText = matchBlocks
        .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
        .map((b: any) => b.text)
        .join("\n\n");

      const candidateIdSet = new Set(candidates.map((c) => c.id));
      const candidateNameById = new Map(candidates.map((c) => [c.id, c.name]));

      let validated: { matches: MatchResponseItem[] } = { matches: [] };
      const jsonStr =
        matchText && typeof matchText === "string"
          ? extractJsonObjectFromText(matchText)
          : null;
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr) as { matches?: unknown[] };
          const rows = Array.isArray(parsed?.matches) ? parsed.matches : [];
          const validRows: MatchResponseItem[] = [];

          for (const row of rows) {
            if (!row || typeof row !== "object") continue;
            const caregiverId = typeof (row as any).caregiverId === "string" ? (row as any).caregiverId : "";
            if (!candidateIdSet.has(caregiverId)) continue;

            const caregiverNameRaw =
              typeof (row as any).caregiverName === "string"
                ? (row as any).caregiverName
                : candidateNameById.get(caregiverId) ?? "Unknown caregiver";
            const fitScoreRaw = Number((row as any).fitScore);
            const fitScore = Number.isFinite(fitScoreRaw)
              ? Math.max(0, Math.min(100, Math.round(fitScoreRaw)))
              : 0;
            const reason = typeof (row as any).reason === "string" ? (row as any).reason : "";
            const concerns = Array.isArray((row as any).concerns)
              ? (row as any).concerns.filter((x: unknown) => typeof x === "string")
              : [];
            const recommendation =
              typeof (row as any).recommendation === "string" ? (row as any).recommendation : "";

            validRows.push({
              caregiverId,
              caregiverName: caregiverNameRaw,
              fitScore,
              reason,
              concerns,
              recommendation,
            });
          }

          validRows.sort((a, b) => b.fitScore - a.fitScore);
          validated = { matches: validRows.slice(0, 3) };
        } catch {
          validated = { matches: [] };
        }
      }

      const output = JSON.stringify(validated, null, 2);

      // Store run + match result (best-effort; failure shouldn't break the response).
      try {
        const user = await getPlatformUserOrNull(req);
        if (!user) {
          return new Response(JSON.stringify({ output }), { status: 200, headers: { "content-type": "application/json" } });
        }
        const supabase = getPlatformSupabaseServerClient(req);
        await supabase.from("runs").insert({
          kind: "agent",
          agent_id: agentId,
          agent_name: agentName ?? null,
          input: matchUserMessage,
          output
        });

        if (jobIdForMatchResult) {
          await supabase.from("agent_match_results").insert({
            agent_id: agentId,
            job_id: jobIdForMatchResult,
            output
          });
        }
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
        model: PLATFORM_ANTHROPIC_CLAUDE_MODEL,
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

    // Store run in Supabase (best-effort; failure shouldn't break the response).
    try {
      const user = await getPlatformUserOrNull(req);
      if (!user) {
        // If no session exists, best-effort persistence should be skipped.
        return new Response(JSON.stringify({ output }), { status: 200, headers: { "content-type": "application/json" } });
      }
      const supabase = getPlatformSupabaseServerClient(req);
      await supabase.from("runs").insert({
        kind: "agent",
        agent_id: agentId,
        agent_name: agentName ?? null,
        input: userMessage,
        output
      });

      // Store match results (best-effort) for the Match Agent.
      if (isMatchAgent && jobIdForMatchResult) {
        await supabase.from("agent_match_results").insert({
          agent_id: agentId,
          job_id: jobIdForMatchResult,
          output
        });
      }
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

