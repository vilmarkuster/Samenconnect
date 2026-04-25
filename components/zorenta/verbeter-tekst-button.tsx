"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getZorentaAccessToken, zorentaHeaders } from "@/lib/zorenta/client";

type ImproveContext = "chat" | "application" | "intake" | "job" | "general";

type Props = {
  /** Current field text to send to AI */
  getText: () => string;
  /** Called when user accepts the improved version */
  onAccept: (improved: string) => void;
  context?: ImproveContext;
  /** Optional compact label */
  compact?: boolean;
  className?: string;
};

export function VerbeterTekstButton({ getText, onAccept, context = "general", compact, className }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function runImprove() {
    const raw = getText().trim();
    if (!raw) {
      setError("Voeg eerst tekst toe.");
      return;
    }
    setLoading(true);
    setError(null);
    const token = await getZorentaAccessToken();
    if (!token) {
      setLoading(false);
      setError("Log in om AI-hulp te gebruiken.");
      return;
    }
    const res = await fetch("/api/zorenta/improve-text", {
      method: "POST",
      headers: zorentaHeaders(token),
      body: JSON.stringify({ text: raw, context }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data?.error === "string" ? data.error : "Verbeteren is mislukt.");
      return;
    }
    const next = typeof data?.text === "string" ? data.text.trim() : "";
    if (!next) {
      setError("Geen resultaat ontvangen.");
      return;
    }
    setDraft(next);
    setOpen(true);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void runImprove()}
        disabled={loading}
        className={
          className ??
          "shrink-0 border-[#40ada8]/50 text-[#2d7f7b] hover:bg-[#40ada8]/10 hover:text-[#256f6b]"
        }
      >
        {loading ? "…" : compact ? "AI" : "Verbeter tekst"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,640px)] max-w-xl overflow-hidden p-0">
          <div className="max-h-[min(90vh,640px)] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Verbeterde tekst</DialogTitle>
              <p className="text-sm text-slate-500">Controleer de tekst en kies Accepteren of Annuleren.</p>
            </DialogHeader>
            {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              className="mt-2 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#40ada8] focus:outline-none focus:ring-2 focus:ring-[#40ada8]/20"
            />
          </div>
          <DialogFooter className="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button
              type="button"
              className="bg-[#40ada8] text-white hover:bg-[#369e9a]"
              onClick={() => {
                onAccept(draft.trim());
                setOpen(false);
                setDraft("");
              }}
            >
              Accepteren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
