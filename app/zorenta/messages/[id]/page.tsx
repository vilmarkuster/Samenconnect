"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";
import { trackZorentaEvent } from "@/lib/zorenta/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZorentaPageHeader } from "@/components/zorenta/page-header";
import { MessageSquare, Shield } from "lucide-react";

type Message = { id: string; sender_id: string; body: string; created_at: string };
type Convo = {
  id: string;
  other?: { display_name: string | null };
  last_message?: { body: string; created_at: string } | null;
};

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default function ConversationPage() {
  const params = useParams();
  const id = params.id as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Convo[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentConvo = conversations.find((c) => c.id === id);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch("/api/zorenta/conversations", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setConversations(d.conversations ?? []); });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getZorentaAccessToken().then((token) => {
      if (!token) return;
      fetch("/api/zorenta/me", { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.profile) setMeId(d.profile.id);
        });
      fetch(`/api/zorenta/messages?conversation_id=${id}`, { headers: zorentaHeaders(token) })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setMessages(d.messages ?? []);
        });
    });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim()) return;
    const token = await getZorentaAccessToken();
    if (!token) return;
    setSending(true);
    const res = await fetch("/api/zorenta/messages", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ conversation_id: id, body: body.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (res.ok) {
      trackZorentaEvent("message_sent", { conversation_id: id });
      setMessages((prev) => [...prev, data]);
      setBody("");
      setIsTyping(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-1 flex-col md:min-h-0 md:flex-row md:gap-0">
      {/* Left: conversation list (desktop) */}
      <aside className="hidden border-r border-slate-200 bg-white md:flex md:w-72 md:flex-col">
        <div className="border-b border-slate-100 p-3">
          <Link href="/zorenta/messages" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Berichten
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/zorenta/messages/${c.id}`}
              className={`mb-1 flex items-center gap-3 rounded-lg p-2.5 ${
                c.id === id ? "bg-emerald-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{c.other?.display_name || "Gebruiker"}</p>
                <p className="truncate text-xs text-slate-500">
                  {c.last_message?.body
                    ? (c.last_message.body.length > 45 ? c.last_message.body.slice(0, 45) + "…" : c.last_message.body)
                    : "Geen berichten"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      {/* Right: thread */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <ZorentaPageHeader
            title={currentConvo?.other?.display_name || "Gesprek"}
            backHref="/zorenta/messages"
            backLabel="Berichten"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-slate-50/80">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.length === 0 && !currentConvo && (
                <p className="py-8 text-center text-sm text-slate-500">Selecteer een gesprek.</p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender_id === meId ? "ml-auto items-end max-w-[85%]" : "mr-auto items-start max-w-[85%]"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      m.sender_id === meId
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  </div>
                  <p className={`mt-1 text-xs text-slate-400 ${m.sender_id === meId ? "text-right" : "text-left"}`}>
                    {formatMessageTime(m.created_at)}
                  </p>
                </div>
              ))}
            </div>
            <div ref={bottomRef} />
          </div>

          <div className="sticky bottom-0 border-t border-slate-200 bg-white p-3">
            {isTyping && (
              <p className="mb-1 px-2 text-xs italic text-slate-500">Je typt…</p>
            )}
            <div className="mx-auto flex max-w-2xl gap-2">
              <Input
                placeholder="Schrijf een bericht…"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setIsTyping(!!e.target.value.trim());
                }}
                onBlur={() => setTimeout(() => setIsTyping(false), 200)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())
                }
                className="flex-1 rounded-xl border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
              />
              <Button
                onClick={send}
                disabled={sending || !body.trim()}
                className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700"
              >
                Versturen
              </Button>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <Shield className="h-3 w-3" />
              Veilig berichten via Zorenta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
