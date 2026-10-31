import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; suffix?: string };

export function Field({ label, hint, suffix, id, className = "", ...rest }: Props) {
  const inputId = id ?? rest.name ?? label;
  const timeLike = rest.type === "date" || rest.type === "time" || rest.type === "datetime-local";
  return (
    <label htmlFor={inputId} className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <span className="flex h-12 min-w-0 items-center overflow-hidden rounded-2xl border border-border bg-surface-2 px-4 focus-within:border-ink">
        <input id={inputId} {...rest} dir={timeLike ? "ltr" : rest.dir} className="h-full min-w-0 w-full bg-transparent text-base outline-none placeholder:text-muted" />
        {suffix && <span className="ms-2 shrink-0 text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
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
