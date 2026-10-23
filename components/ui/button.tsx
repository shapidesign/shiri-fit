"use client";

import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "strong";
  size?: "md" | "lg" | "sm";
  loading?: boolean;
};

const variants = {
  primary: "bg-accent text-accent-ink disabled:not-aria-busy:bg-border disabled:not-aria-busy:text-muted disabled:not-aria-busy:opacity-100",
  strong: "bg-surface-strong text-on-strong",
  secondary: "bg-surface-2 text-ink border border-border",
  ghost: "bg-transparent text-ink",
  danger: "bg-danger/10 text-danger",
};
const sizes = { sm: "h-10 px-4 text-sm", md: "h-12 px-5 text-base", lg: "h-14 px-6 text-lg" };

export function Button({ variant = "primary", size = "md", loading, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,opacity] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
