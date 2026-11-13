"use client";

import { Check } from "lucide-react";

type Props = {
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
};

/** Pill toggle (inspired by the muscle-select mockup). Uses aria-pressed so state is not color-only. */
export function Chip({ selected, onClick, disabled, children, className = "" }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border text-sm font-semibold transition-[transform,background-color,border-color] duration-150 active:scale-95 disabled:opacity-40 ${
        selected
          ? "border-accent bg-accent px-4 text-accent-ink"
          : "border-border bg-surface-2 px-[27px] text-ink" /* 16px + half of check (16) + gap (6): same width either way, so rows don't reflow */
      } ${className}`}
    >
      {selected && <Check className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

export function ChipRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap gap-2 ${className}`}>{children}</div>;
}

/** One big answer. The press scales down (squash) and the fill is the selected pose. */
export function Choice({ selected, onClick, children }: { selected?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center rounded-2xl border px-4 text-center text-base font-bold transition-[transform,background-color,border-color] duration-150 active:scale-[0.97] ${
        selected ? "border-accent bg-accent text-accent-ink shadow-[var(--shadow)]" : "border-border bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}
