import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; suffix?: string };

export function Field({ label, hint, suffix, id, className = "", ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  return (
    <label htmlFor={inputId} className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <span className="flex h-12 items-center rounded-2xl border border-border bg-surface-2 px-4 focus-within:border-ink">
        <input id={inputId} {...rest} className="h-full w-full bg-transparent text-base outline-none placeholder:text-muted" />
        {suffix && <span className="ms-2 text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
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
