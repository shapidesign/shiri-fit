"use client";

import { useRef, useState, type InputHTMLAttributes, type RefObject } from "react";
import { isoFromParts, partsFromIso } from "@/lib/date-parts";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; suffix?: string };

export function Field({ label, hint, suffix, id, className = "", ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  const time = rest.type === "time";
  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <span className="flex h-12 items-center rounded-2xl border border-border bg-surface-2 px-4 focus-within:border-ink">
        <input id={inputId} {...rest} {...(time ? { dir: "ltr" as const } : {})} className={`h-full w-full bg-transparent text-base outline-none placeholder:text-muted ${time ? "text-end" : ""}`} />
        {suffix && <span className="ms-2 text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const SLOTS = [
  ["יום", "dd"],
  ["חודש", "mm"],
  ["שנה", "yy"],
] as const;

/** dd / mm / yy as three fields. `value` stays yyyy-MM-dd. */
export function DateField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (iso: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <DateParts name={name} value={value} onChange={onChange} />
    </label>
  );
}

/** Date as dd/mm/yy plus a separate time, so the native datetime field can't stack them. `value` stays yyyy-MM-ddTHH:mm. */
export function DateTimeField({ label, name, value, onChange }: { label: string; name: string; value: string; onChange: (v: string) => void }) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16) || "00:00";
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div className="grid grid-cols-[1fr_7.5rem] gap-2">
        <DateParts name={name} value={date} onChange={(iso) => onChange(`${iso}T${time}`)} />
        <span className="flex h-12 items-center rounded-2xl border border-border bg-surface-2 px-3 focus-within:border-ink">
          <input type="time" dir="ltr" aria-label="שעה" value={time} onChange={(e) => onChange(`${date}T${e.target.value}`)} className="h-full w-full bg-transparent text-end text-base outline-none" />
        </span>
      </div>
    </div>
  );
}

function DateParts({ name, value, onChange }: { name: string; value: string; onChange: (iso: string) => void }) {
  const [source, setSource] = useState(value);
  const [parts, setParts] = useState(() => partsFromIso(value));
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  if (value !== source) {
    setSource(value);
    setParts(partsFromIso(value));
  }

  function commit(next: [string, string, string]) {
    setParts(next);
    const iso = isoFromParts(next[0], next[1], next[2]);
    if (!iso) return;
    setSource(iso);
    onChange(iso);
  }

  function edit(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (i === 0 && digits.length > 2) {
      commit([digits.slice(0, 2), digits.slice(2, 4) || parts[1], digits.slice(4, 6) || parts[2]]);
      const focus = digits.length >= 6 ? 2 : digits.length >= 4 ? 1 : 0;
      refs[focus].current?.focus();
      return;
    }
    const v = digits.slice(0, 2);
    const next: [string, string, string] = [parts[0], parts[1], parts[2]];
    next[i] = v;
    commit(next);
    if (v.length === 2) refs[i + 1]?.current?.focus();
  }

  function blur(i: number) {
    if (parts[i].length !== 1) return;
    const next: [string, string, string] = [parts[0], parts[1], parts[2]];
    next[i] = parts[i].padStart(2, "0");
    commit(next);
  }

  const invalid = parts.every((p) => p.length === 2) && !isoFromParts(parts[0], parts[1], parts[2]);

  return (
    <span dir="ltr" className={`flex h-12 w-full items-center justify-center gap-0.5 rounded-2xl border bg-surface-2 px-2 focus-within:border-ink ${invalid ? "border-danger" : "border-border"}`}>
      {SLOTS.map(([slotLabel, placeholder], i) => (
        <Slot key={slotLabel} label={slotLabel} placeholder={placeholder} value={parts[i]} inputRef={refs[i]} name={i === 0 ? name : undefined} slash={i > 0} onChange={(v) => edit(i, v)} onBlur={() => blur(i)} />
      ))}
    </span>
  );
}

function Slot({ label, placeholder, value, inputRef, name, slash, onChange, onBlur }: {
  label: string; placeholder: string; value: string; inputRef: RefObject<HTMLInputElement | null>; name?: string; slash: boolean; onChange: (v: string) => void; onBlur: () => void;
}) {
  return (
    <>
      {slash && <span className="text-muted" aria-hidden>/</span>}
      <input
        ref={inputRef}
        name={name}
        aria-label={label}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        maxLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-7 shrink-0 bg-transparent text-center text-base tabular-nums outline-none placeholder:text-muted"
      />
    </>
  );
}

export function Mini({ label, value, onChange, step, placeholder }: { label: string; value: number | null; onChange: (v: number | null) => void; step?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-muted">{label}</span>
      <input type="number" inputMode="decimal" step={step} placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} className="h-10 w-full rounded-xl border border-border bg-surface-2 px-2 text-center font-semibold tabular-nums outline-none placeholder:text-muted" />
    </label>
  );
}

/** Numeric stepper: big tap targets, no tiny spinners. */
export function Stepper({ label, value, onChange, min = 0, max = 99, step = 1, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`פחות ${label}`} onClick={() => onChange(clamp(value - step))} className="grid h-10 w-10 place-items-center rounded-full bg-surface text-xl font-bold active:scale-95">−</button>
        <span className="min-w-24 text-center text-lg font-bold tabular-nums">{value}{suffix && <span className="ms-1 text-xs text-muted">{suffix}</span>}</span>
        <button type="button" aria-label={`יותר ${label}`} onClick={() => onChange(clamp(value + step))} className="grid h-10 w-10 place-items-center rounded-full bg-surface text-xl font-bold active:scale-95">+</button>
      </div>
    </div>
  );
}
