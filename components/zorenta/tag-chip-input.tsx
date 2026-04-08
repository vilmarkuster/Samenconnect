"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ZorentaFormField } from "@/components/zorenta/form-field";
import { formatLabelValue } from "@/lib/zorenta/profile-display";

type TagChipInputProps = {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Optional display formatter per tag (default: title-style words). */
  formatTag?: (tag: string) => string;
  id?: string;
};

export function TagChipInput({
  label,
  hint,
  value,
  onChange,
  placeholder = "Typ en druk op Enter",
  formatTag = (t) => formatLabelValue(t),
  id,
}: TagChipInputProps) {
  const [draft, setDraft] = useState("");

  const addFromDraft = useCallback(() => {
    const raw = draft.trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (value.some((v) => v.toLowerCase() === lower)) {
      setDraft("");
      return;
    }
    onChange([...value, raw]);
    setDraft("");
  }, [draft, onChange, value]);

  const removeAt = useCallback(
    (index: number) => {
      onChange(value.filter((_, i) => i !== index));
    },
    [onChange, value]
  );

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addFromDraft();
    }
    if (e.key === "Backspace" && draft === "" && value.length > 0) {
      removeAt(value.length - 1);
    }
  }

  const fieldId = id ?? `tag-chip-${label.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <ZorentaFormField label={label} hint={hint}>
      <div className="space-y-2">
        <div className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
          {value.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50/90 pl-2.5 pr-1 py-0.5 text-sm text-emerald-900"
            >
              <span className="truncate">{formatTag(tag)}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-emerald-700 hover:bg-emerald-100"
                aria-label={`Verwijder ${formatTag(tag)}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <Input
            id={fieldId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (draft.trim()) addFromDraft();
            }}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
          />
        </div>
      </div>
    </ZorentaFormField>
  );
}
