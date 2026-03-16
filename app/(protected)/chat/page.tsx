"use client";

import { useState, FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

function renderAssistantContent(text: string) {
  // Very lightweight Markdown-style code-block support for ``` fenced blocks
  const segments = text.split(/```/g);

  // No fenced blocks, just render with preserved line breaks
  if (segments.length === 1) {
    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">
        {text}
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {segments.map((segment, index) => {
        const isCode = index % 2 === 1;

        if (isCode) {
          // Allow ```lang\ncode``` – drop the first "lang" line if present
          const lines = segment.split("\n");
          const [maybeLang, ...rest] = lines;
          const hasLang =
            maybeLang.trim().length > 0 &&
            !maybeLang.includes(" ") &&
            rest.length > 0;
          const code = (hasLang ? rest : lines).join("\n").trimEnd();

          return (
            <pre
              key={index}
              className="whitespace-pre-wrap rounded-md bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-50"
            >
              <code>{code}</code>
            </pre>
          );
        }

        const trimmed = segment.trimEnd();
        if (!trimmed) {
          return null;
        }

        // Render Markdown-ish prose (lists, paragraphs) with preserved newlines
        return (
          <p
            key={index}
            className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900"
          >
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Welcome to your AI automation dashboard. Ask me to design agents, workflows, or tasks."
    }
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const nextId = messages.length ? messages[messages.length - 1].id + 1 : 1;
    const userMsg: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ message: trimmed })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message =
          data?.error ||
          data?.detail ||
          `Chat request failed with status ${res.status}`;
        setError(message);
        return;
      }

      const data = await res.json();
      const reply: string =
        typeof data?.reply === "string"
          ? data.reply
          : "No reply content returned from API.";

      const assistantMsg: ChatMessage = {
        id: nextId + 1,
        role: "assistant",
        content: reply
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Chat request error", err);
      const message =
        err?.message || (typeof err === "string" ? err : "Chat request failed");
      setError(message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title="AI Chat"
        description="Build apps, design agents, and iterate on workflows with natural language."
      />

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 pt-6">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {message.role === "assistant"
                  ? renderAssistantContent(message.content)
                  : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    )}
              </div>
            </div>
          ))}
          {isSending && (
            <p className="text-xs text-slate-400">Thinking about a response…</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-200 pt-4">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. Build a CRM, Create an agent that summarizes emails…"
          />
          {error && (
            <p className="text-xs text-red-600 rounded-md border border-red-100 bg-red-50 px-3 py-1.5">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Powered by Claude. Describe any app to generate it.
            </p>
            <Button type="submit" disabled={isSending || !input.trim()}>
              {isSending ? "Sending…" : "Send"}
            </Button>
          </div>
        </form>
        </CardContent>
      </Card>
    </div>
  );
}


