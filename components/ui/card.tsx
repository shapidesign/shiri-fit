import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & { tone?: "default" | "strong" | "accent" | "outline" };

const tones = {
  default: "bg-surface text-ink",
  strong: "bg-surface-strong text-on-strong",
  accent: "bg-accent-soft text-ink",
  outline: "bg-surface-2 text-ink border border-border",
};

export function Card({ tone = "default", className = "", ...rest }: Props) {
  return <div {...rest} className={`rise rounded-[24px] p-5 ${tones[tone]} ${className}`} />;
}

export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h2 className={`text-xl font-bold ${className}`}>{children}</h2>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="inline-block rounded-full bg-on-strong/10 px-3 py-1 text-xs font-semibold text-on-strong/80">{children}</span>;
}
