"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({ title, eyebrow, back, onBack, action }: { title: string; eyebrow?: string; back?: string; onBack?: () => void; action?: React.ReactNode }) {
  const cls = "mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface";
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="חזרה" className={cls}><ChevronRight className="h-5 w-5" /></button>
        ) : back && (
          <Link href={back} aria-label="חזרה" className={cls}><ChevronRight className="h-5 w-5" /></Link>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="text-sm text-muted">{eyebrow}</p>}
          <h1 className="truncate text-3xl font-black leading-tight">{title}</h1>
        </div>
      </div>
      {action}
    </header>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="mb-4 grid grid-flow-col auto-cols-fr rounded-2xl bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-10 rounded-xl text-sm font-semibold transition-colors ${value === o.id ? "bg-surface-2 shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
