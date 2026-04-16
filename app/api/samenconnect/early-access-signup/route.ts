import { NextRequest, NextResponse } from "next/server";
import {
  earlyAccessSignupBodySchema,
  parseEarlyAccessSource,
} from "@/lib/samenconnect/early-access-signup-schema";
import { checkEarlyAccessSignupRateLimit } from "@/lib/samenconnect/early-access-rate-limit";
import { getEarlyAccessSignupSupabase } from "@/lib/samenconnect/supabase-early-access-writer";
import {
  sendEarlyAccessApplicantConfirmation,
  sendEarlyAccessTeamNotification,
} from "@/lib/samenconnect/send-early-access-emails";

const isDev = process.env.NODE_ENV === "development";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkEarlyAccessSignupRateLimit(`early-access:${ip}`)) {
    return NextResponse.json(
      { error: "Te veel aanvragen vanaf dit adres. Probeer het later opnieuw.", code: "RATE_LIMIT" },
      { status: 429 }
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek.", code: "BAD_JSON" }, { status: 400 });
  }

  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Ongeldig verzoek.", code: "BAD_BODY" }, { status: 400 });
  }

  const body = json as Record<string, unknown>;
  const source = parseEarlyAccessSource(body.source);
  const parsed = earlyAccessSignupBodySchema.safeParse({ ...body, source });

  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ||
      parsed.error.issues[0]?.message ||
      "Controleer het formulier.";
    return NextResponse.json({ error: msg, code: "VALIDATION", fields: first }, { status: 400 });
  }

  const data = parsed.data;
  const db = getEarlyAccessSignupSupabase();

  if (db.kind === "error") {
    const messages: Record<typeof db.code, string> = {
      missing_supabase_url: "Server mist Supabase-URL (NEXT_PUBLIC_SUPABASE_URL).",
      missing_anon_key: "Server mist Supabase anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    };
    const hint =
      isDev &&
      db.code === "missing_anon_key" &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
        ? "Tip: zet NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, of gebruik SUPABASE_SERVICE_ROLE_KEY. Voer ook migratie 20260403160000 uit (insert policy) als je zonder service role wilt inserten."
        : isDev && db.code === "missing_supabase_url"
          ? "Tip: zet NEXT_PUBLIC_SUPABASE_URL in .env.local."
          : undefined;

    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[early-access-signup] Supabase client niet beschikbaar:", db.code, {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
      });
    }

    return NextResponse.json(
      {
        error: messages[db.code],
        code: db.code,
        ...(hint ? { hint } : {}),
      },
      { status: 503 }
    );
  }

  const { client: supabase, mode } = db;

  if (isDev && mode === "anon_server") {
    // eslint-disable-next-line no-console
    console.warn(
      "[early-access-signup] Gebruikt anon serverfallback (geen SUPABASE_SERVICE_ROLE_KEY). OK voor lokaal; productie: gebruik service role. Zorg dat migratie 20260403160000 (insert policy) is toegepast."
    );
  }

  const insertPayload = {
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email.toLowerCase(),
    phone: data.phone ?? null,
    applicant_type: data.applicant_type,
    region: data.region,
    message: data.message,
    consent_privacy: data.consent_privacy,
    source: data.source,
    status: "new" as const,
  };

  const { data: row, error } = await supabase
    .from("early_access_signups")
    .insert(insertPayload)
    .select("id, created_at, first_name, last_name, email, phone, applicant_type, region, message, source")
    .single();

  if (error || !row) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("[early-access-signup] Insert mislukt:", error?.message, error?.code, error?.details);
    }
    const hint =
      isDev && error?.message?.includes("policy")
        ? "RLS: voer migratie 20260403160000_early_access_signups_insert_policy.sql uit, of zet SUPABASE_SERVICE_ROLE_KEY."
        : isDev && error?.message
          ? error.message
          : undefined;
    return NextResponse.json(
      {
        error:
          "Opslaan is mislukt. Controleer of de database-migraties zijn uitgevoerd en probeer het opnieuw.",
        code: "DB_INSERT_FAILED",
        ...(hint ? { hint } : {}),
      },
      { status: 500 }
    );
  }

  const rowForMail = {
    ...row,
    phone: row.phone as string | null,
    applicant_type: row.applicant_type as (typeof insertPayload)["applicant_type"],
    created_at:
      typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at as string).toISOString(),
  };

  const teamMail = await sendEarlyAccessTeamNotification(rowForMail);

  if (teamMail.sent && mode === "service_role") {
    const { error: updErr } = await supabase
      .from("early_access_signups")
      .update({ team_email_sent_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updErr && isDev) {
      // eslint-disable-next-line no-console
      console.warn("[early-access-signup] team_email_sent_at update mislukt:", updErr.message);
    }
  } else if (teamMail.sent && mode === "anon_server" && isDev) {
    // eslint-disable-next-line no-console
    console.warn(
      "[early-access-signup] Team-mail verstuurd; team_email_sent_at niet gezet (anon client heeft geen update-RLS)."
    );
  }

  let applicantEmailDelivered = false;
  let applicantEmailSkipped = false;
  let applicantEmailError: string | undefined;
  try {
    const applicantResult = await sendEarlyAccessApplicantConfirmation({
      to: insertPayload.email,
      firstName: data.first_name,
    });
    applicantEmailDelivered = applicantResult.sent;
    applicantEmailSkipped = applicantResult.skipped === true;
    applicantEmailError = applicantResult.error;
    if (applicantResult.skipped) {
      // eslint-disable-next-line no-console
      console.info("[early-access] signup: applicant mail skipped (flag off or not recognized)");
    } else if (!applicantResult.sent && applicantResult.error) {
      // eslint-disable-next-line no-console
      console.error(
        "[early-access] signup: applicant mail failed (signup still ok)",
        applicantResult.error
      );
    }
  } catch (e) {
    applicantEmailError = e instanceof Error ? e.message : String(e);
    // eslint-disable-next-line no-console
    console.error("[early-access] signup: applicant mail threw (signup still ok)", e);
  }

  if (!teamMail.sent && isDev) {
    if (teamMail.error) {
      // eslint-disable-next-line no-console
      console.warn("[early-access-signup] Team mail niet verzonden (aanmelding wel opgeslagen):", teamMail.error);
    }
  }

  return NextResponse.json({
    ok: true,
    id: row.id,
    emailDelivered: teamMail.sent,
    applicantEmailDelivered,
    applicantEmailSkipped,
    applicantEmailError,
  });
}
