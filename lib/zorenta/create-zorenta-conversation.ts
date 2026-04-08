import { zorentaHeaders } from "@/lib/zorenta/client";

export type CreateZorentaConversationResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

/**
 * POST /api/zorenta/conversations — same contract as {@link StartMessageButton}.
 */
export async function createZorentaConversation(
  token: string,
  opts: { otherUserId: string; jobId?: string | null }
): Promise<CreateZorentaConversationResult> {
  const body: Record<string, unknown> = { other_user_id: opts.otherUserId };
  if (opts.jobId) body.job_id = opts.jobId;

  const res = await fetch("/api/zorenta/conversations", {
    method: "POST",
    headers: zorentaHeaders(token),
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) {
    return {
      ok: false,
      error:
        typeof data?.error === "string"
          ? data.error
          : "Bericht starten is niet gelukt. Probeer het later opnieuw.",
    };
  }
  return { ok: true, conversationId: String(data.id) };
}

export type SendZorentaMessageResult = { ok: true } | { ok: false; error: string };

/**
 * POST /api/zorenta/messages — first message or follow-up in a thread.
 */
export async function sendZorentaMessage(
  token: string,
  opts: { conversationId: string; body: string }
): Promise<SendZorentaMessageResult> {
  const trimmed = opts.body.trim();
  if (!trimmed) {
    return { ok: false, error: "Berichttekst ontbreekt." };
  }
  const res = await fetch("/api/zorenta/messages", {
    method: "POST",
    headers: zorentaHeaders(token),
    body: JSON.stringify({
      conversation_id: opts.conversationId,
      body: trimmed,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "Bericht versturen mislukt.",
    };
  }
  return { ok: true };
}

type MessageRow = { sender_id: string; body: string; created_at: string };

async function fetchMessagesPage(
  token: string,
  conversationId: string,
  limit: number,
  offset: number
): Promise<
  | { ok: true; messages: MessageRow[]; total: number }
  | { ok: false; error: string }
> {
  const res = await fetch(
    `/api/zorenta/messages?conversation_id=${encodeURIComponent(conversationId)}&limit=${limit}&offset=${offset}`,
    { headers: zorentaHeaders(token) }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data?.error === "string" ? data.error : "Berichten laden mislukt.",
    };
  }
  const messages = (data.messages ?? []) as MessageRow[];
  const total = typeof data.total === "number" ? data.total : 0;
  return { ok: true, messages, total };
}

/**
 * Latest outgoing (from current user) message body in the thread, or null if none.
 * Paginates through GET /api/zorenta/messages until the full thread is scanned.
 */
export async function findLatestOutgoingMessageBody(
  token: string,
  conversationId: string,
  currentUserId: string
): Promise<{ ok: true; body: string | null } | { ok: false; error: string }> {
  const pageSize = 200;
  let offset = 0;
  let total = -1;
  let best: { body: string; created_at: string } | null = null;

  while (true) {
    const page = await fetchMessagesPage(token, conversationId, pageSize, offset);
    if (!page.ok) return page;
    if (total < 0) total = page.total;

    for (const m of page.messages) {
      if (m.sender_id === currentUserId) {
        const ts = m.created_at ?? "";
        if (!best || ts > best.created_at) {
          best = { body: m.body ?? "", created_at: ts };
        }
      }
    }

    offset += page.messages.length;
    if (offset >= total || page.messages.length === 0) break;
  }

  return { ok: true, body: best ? best.body : null };
}

export type ShouldSendBatchMessageResult =
  | { ok: true; shouldSend: boolean }
  | { ok: false; error: string };

/**
 * If the latest outgoing message body equals the new batch body (trimmed), do not send again.
 */
export async function shouldSendBatchMessage(
  token: string,
  opts: { conversationId: string; currentUserId: string; newBody: string }
): Promise<ShouldSendBatchMessageResult> {
  const newNorm = opts.newBody.trim();
  const latest = await findLatestOutgoingMessageBody(
    token,
    opts.conversationId,
    opts.currentUserId
  );
  if (!latest.ok) return latest;
  if (latest.body === null) return { ok: true, shouldSend: true };
  if (latest.body.trim() === newNorm) return { ok: true, shouldSend: false };
  return { ok: true, shouldSend: true };
}
