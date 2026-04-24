"use client";

import type { KeyboardEventHandler } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HOURLY_EURO_MIN,
  HOURLY_EURO_STEP,
  parseHourlyEuroInputString,
  snapHourlyEuro,
} from "@/lib/zorenta/hourly-euro-ux";

type Props = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

/**
 * Numeriek uurtariefveld: €-prefix, geen centen, step €5, min €10.
 * Waarde blijft string voor lokale state; bij blur wordt naar dichtstbijzijnde €5 gesnapt.
 */
export function HourlyEuroInput({
  id,
  value,
  onChange,
  placeholder = "Bijv. 35",
  className,
  inputClassName,
  onKeyDown,
}: Props) {
  const onBlurSnap = () => {
    const n = parseHourlyEuroInputString(value);
    if (n == null) return;
    const snapped = String(snapHourlyEuro(n));
    if (snapped !== value.trim()) onChange(snapped);
  };

  return (
    <div className={cn("relative", className)}>
      <span
        className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-sm font-medium text-slate-500"
        aria-hidden
      >
        €
      </span>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        step={HOURLY_EURO_STEP}
        min={HOURLY_EURO_MIN}
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange("");
            return;
          }
          const n = parseHourlyEuroInputString(raw);
          if (n == null) return;
          if (n < 0) return;
          onChange(String(n));
        }}
        onBlur={onBlurSnap}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(
          "pl-8 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          inputClassName
        )}
      />
    </div>
  );
}

type NullableNumberProps = {
  id?: string;
  value: number | null;
  onChange: (next: number | null) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

/** Zelfde gedrag; gekoppeld aan `number | null` form state (intake). */
export function HourlyEuroNullableInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  inputClassName,
  onKeyDown,
}: NullableNumberProps) {
  const str = value == null ? "" : String(value);
  return (
    <HourlyEuroInput
      id={id}
      value={str}
      onKeyDown={onKeyDown}
      onChange={(s) => {
        if (s.trim() === "") {
          onChange(null);
          return;
        }
        const n = parseHourlyEuroInputString(s);
        if (n == null) return;
        onChange(n);
      }}
      placeholder={placeholder}
      className={className}
      inputClassName={inputClassName}
    />
  );
}
