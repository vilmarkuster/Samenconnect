"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatLocation } from "@/lib/zorenta/formatters";

type Props = {
  recipientName: string;
  recipientId?: string;
  onClose: () => void;
};

const MESSAGES_KEY = "samenconnect_messages";

type StoredMessage = {
  id: string;
  from: "user" | "caregiver";
  body: string;
  time: string;
  ts: number;
};

type StoredConversation = {
  id: string;
  participantId: string | undefined;
  participantName: string;
  messages: StoredMessage[];
  unread: boolean;
  context?: {
    careType?: string;
    location?: string;
    frequency?: string;
    budget?: string;
    flexibility?: string;
  };
};

export function ZorentaMessageModal({ recipientName, recipientId, onClose }: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let defaultSubject = "Zorgvraag via SamenConnect";
    if (typeof window !== "undefined") {
      const storedTitle = window.sessionStorage.getItem(
        "samenconnect_generated_title"
      );
      if (storedTitle) {
        defaultSubject = storedTitle;
      }
    }
    setSubject(defaultSubject);
    const firstName = recipientName.split(" ")[0] || recipientName;
    setMessage(
      `Hoi ${firstName},\n\nIk zag jouw profiel op SamenConnect en denk dat je goed past bij onze zorgvraag.\n\nZou je beschikbaar zijn om hierover te praten?`
    );
    setSent(false);
    setSending(false);
  }, [recipientName]);

  function handleSendMessage() {
    // eslint-disable-next-line no-console
    console.log("SEND CLICKED");
    if (sending) return;
    // eslint-disable-next-line no-console
    console.log("SEND RECIPIENT", recipientId, recipientName);
    // eslint-disable-next-line no-console
    console.log("SEND SUBJECT", subject);
    // eslint-disable-next-line no-console
    console.log("SEND MESSAGE BODY", message);

    setSending(true);

    try {
      if (typeof window === "undefined") {
        setSending(false);
        return;
      }

      const raw = window.localStorage.getItem(MESSAGES_KEY);
      // eslint-disable-next-line no-console
      console.log("SEND RAW STORAGE BEFORE", raw);
      const conversations: StoredConversation[] = raw ? JSON.parse(raw) : [];

      // Build zorgvraag context from stored intake if available
      let context: StoredConversation["context"] = undefined;
      try {
        const draftRaw = window.localStorage.getItem("samenconnect_zorgvraag_draft");
        if (draftRaw) {
          const parsed = JSON.parse(draftRaw) as {
            form?: {
              care_type?: string | null;
              preferred_city?: string | null;
              care_frequency?: string | null;
              budget_min?: number | null;
              budget_max?: number | null;
              urgency?: string | null;
            };
          };
          const form = parsed.form;
            if (form) {
            const min = form.budget_min ?? undefined;
            const max = form.budget_max ?? undefined;
            let budget: string | undefined;
            if (min != null || max != null) {
              const minPart = min != null ? `€${min}` : "€?";
              const maxPart = max != null ? `€${max}` : "€?";
              budget = `${minPart}–${maxPart} per uur`;
            }
            context = {
              careType: form.care_type ?? undefined,
                location: form.preferred_city ?? undefined,
              frequency: form.care_frequency ?? undefined,
              budget,
              flexibility: form.urgency ?? undefined,
            };
          }
        }
      } catch {
        context = undefined;
      }
      // eslint-disable-next-line no-console
      console.log("SEND CONTEXT", context);

      const timestamp = new Date();
      const time = timestamp.toLocaleTimeString("nl-NL", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const nowTs = Date.now();
      const newMessageBase: Omit<StoredMessage, "body"> = {
        id: nowTs.toString(),
        from: "user",
        time,
        ts: nowTs,
      };

      // One stable conversation id per participant
      const conversationId = recipientId
        ? `conv-${recipientId}`
        : `conv-anon`;

      let convo = conversations.find(
        (c) =>
          (recipientId && c.participantId === recipientId) ||
          (!recipientId && c.participantName === recipientName)
      );

      const isNewConversation = !convo;

      if (!convo) {
        convo = {
          id: conversationId,
          participantId: recipientId,
          participantName: recipientName,
          messages: [],
          unread: true,
          context,
        };
        conversations.unshift(convo);
      } else if (!convo.context && context) {
        convo.context = context;
      }

      // For a brand-new conversation, allow the richer intro if message is empty
      const bodyForNew =
        (message || subject || "").trim() ||
        "Zorgvraag via SamenConnect";

      // For existing conversations, only send what the user typed in the modal
      const bodyForExisting = (message || "").trim();

      const finalBody = isNewConversation ? bodyForNew : bodyForExisting;
      if (!finalBody) {
        setSending(false);
        return;
      }

      const newMessage: StoredMessage = {
        ...newMessageBase,
        body: finalBody,
      };

      // eslint-disable-next-line no-console
      console.log("MESSAGE SENT:", newMessage);

      convo.messages.push(newMessage);
      convo.unread = true;

      window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(conversations));
      // eslint-disable-next-line no-console
      console.log("SEND STORAGE AFTER", conversations);

      setSent(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("MESSAGE SEND ERROR:", e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Bericht sturen naar {recipientName}
          </h2>
        </div>
        <div className="space-y-4 px-5 py-4">
          {sent ? (
            <div className="space-y-3 text-sm text-slate-700">
              <p className="font-medium text-slate-900">
                Bericht verzonden.
              </p>
              <p>Je vindt dit gesprek straks terug in je berichten.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1 border-slate-200 text-xs"
                onClick={() => {
                  onClose();
                  router.push("/berichten");
                }}
              >
                Bekijk berichten
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Onderwerp
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Bericht
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-200 text-xs"
            onClick={onClose}
            disabled={sending}
          >
            Annuleren
          </Button>
          {!sent ? (
            <Button
              size="sm"
              className="gap-1.5 bg-[#40ada8] text-xs text-white hover:bg-[#369e9a]"
              disabled={sending}
              onClick={handleSendMessage}
            >
              {sending ? "Versturen…" : "Versturen"}
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-1.5 bg-[#40ada8] text-xs text-white hover:bg-[#369e9a]"
              onClick={onClose}
            >
              Sluiten
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

