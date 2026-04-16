import type { ApplicantType } from "@/lib/samenconnect/early-access-signup-schema";

const applicantLabels: Record<ApplicantType, string> = {
  caregiver: "Zorgverlener",
  client: "Opdrachtgever",
  pgb_holder: "PGB-houder",
  organization: "Organisatie",
};

export type EarlyAccessSignupRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  applicant_type: ApplicantType;
  region: string;
  message: string;
  source: string;
  id: string;
  created_at: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildTeamEmailHtml(row: EarlyAccessSignupRow): string {
  const phone = row.phone?.trim() || "—";
  const typeLabel = applicantLabels[row.applicant_type] ?? row.applicant_type;
  const rows: [string, string][] = [
    ["Voornaam", row.first_name],
    ["Achternaam", row.last_name],
    ["E-mail", row.email],
    ["Telefoon", phone],
    ["Type", typeLabel],
    ["Regio / woonplaats", row.region],
    ["Bron (pagina)", row.source],
    ["Aanmeldings-id", row.id],
    ["Aangemeld op", row.created_at],
    ["Toelichting", row.message],
  ];
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;color:#0f172a;width:180px">${escapeHtml(k)}</td><td style="padding:8px 12px;border:1px solid #e2e8f0;color:#334155;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
    )
    .join("");
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0f172a">
  <h1 style="font-size:18px;margin:0 0 12px">Nieuwe early access aanmelding</h1>
  <p style="margin:0 0 16px;color:#64748b">SamenConnect — automatische notificatie</p>
  <table style="border-collapse:collapse;width:100%;max-width:640px">${body}</table>
  </body></html>`;
}

/** `1`, `true`, `yes` (case-insensitive, getrimd). */
export function isEarlyAccessApplicantConfirmEnabled(): boolean {
  const v = process.env.EARLY_ACCESS_SEND_APPLICANT_CONFIRM?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

async function sendResendEmail(params: {
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { ok: false, status: 0, body: "RESEND_API_KEY ontbreekt" };
  }
  const from =
    process.env.EARLY_ACCESS_FROM_EMAIL?.trim() ||
    "SamenConnect <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text.slice(0, 8000) };
  }
  return { ok: true };
}

/**
 * Stuurt teamnotificatie via Resend. Vereist RESEND_API_KEY en EARLY_ACCESS_NOTIFY_EMAIL (default info@samenconnect.nl).
 * Retourneert of de mail is verzonden; bij mislukking blijft DB-insert al staan — caller logt / handelt af.
 */
export async function sendEarlyAccessTeamNotification(
  row: EarlyAccessSignupRow
): Promise<{ sent: boolean; error?: string }> {
  const notify =
    process.env.EARLY_ACCESS_NOTIFY_EMAIL?.trim() || "info@samenconnect.nl";

  const result = await sendResendEmail({
    to: [notify],
    subject: "Nieuwe early access aanmelding – SamenConnect",
    html: buildTeamEmailHtml(row),
    replyTo: row.email,
  });

  if (!result.ok) {
    if (result.status === 0) {
      return { sent: false, error: result.body };
    }
    return { sent: false, error: `Resend ${result.status}: ${result.body}` };
  }
  return { sent: true };
}

export async function sendEarlyAccessApplicantConfirmation(params: {
  to: string;
  firstName: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const enabled = isEarlyAccessApplicantConfirmEnabled();
  const flagRaw = process.env.EARLY_ACCESS_SEND_APPLICANT_CONFIRM;

  if (!enabled) {
    // eslint-disable-next-line no-console
    console.info("[early-access] applicant-confirm disabled", {
      flagDefined: flagRaw !== undefined,
      flagPreview: flagRaw == null ? null : `${String(flagRaw).slice(0, 20)}…(len=${String(flagRaw).length})`,
    });
    return { sent: false, skipped: true };
  }

  // eslint-disable-next-line no-console
  console.info("[early-access] applicant-confirm enabled", {
    toDomain: params.to.includes("@") ? params.to.split("@")[1] : "(invalid)",
  });

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#0f172a">
  <p>Beste ${escapeHtml(params.firstName)},</p>
  <p>Bedankt voor je interesse in SamenConnect. We hebben je aanvraag ontvangen en nemen persoonlijk contact op zodra we een passende volgende stap zien.</p>
  <p style="color:#64748b;font-size:14px">Met vriendelijke groet,<br/>Team SamenConnect</p>
  <p style="margin-top:24px;font-size:12px;color:#888;line-height:1.5">Je ontvangt deze mail omdat je je hebt aangemeld voor early access via samenconnect.nl</p>
  </body></html>`;

  // eslint-disable-next-line no-console
  console.info("[early-access] applicant-confirm attempt", {
    to: params.to,
    subject: "We hebben je early access aanvraag ontvangen – SamenConnect",
  });

  const result = await sendResendEmail({
    to: [params.to],
    subject: "We hebben je early access aanvraag ontvangen – SamenConnect",
    html,
  });

  if (!result.ok) {
    const errMsg =
      result.status === 0
        ? result.body
        : `Resend HTTP ${result.status}: ${result.body}`;
    // eslint-disable-next-line no-console
    console.error("[early-access] applicant-confirm failure", {
      to: params.to,
      message: errMsg,
    });
    return { sent: false, error: errMsg };
  }

  // eslint-disable-next-line no-console
  console.info("[early-access] applicant-confirm success", { to: params.to });
  return { sent: true };
}

export function applicantTypeLabel(type: ApplicantType): string {
  return applicantLabels[type];
}
