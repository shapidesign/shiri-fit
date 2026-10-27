"use client";

import { SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  /** Epoch ms when rest ends; null hides the timer. */
  endsAt: number | null;
  total: number;
  onChange: (endsAt: number | null, total: number) => void;
};

const POS_KEY = "shiri-rest-timer-pos";
const R = 22;
const C = 2 * Math.PI * R;

/** Short double beep; iPhone Safari ignores navigator.vibrate, so the sound is the signal there. */
function alertDone() {
  navigator.vibrate?.([200, 100, 200]);
  try {
    const ctx = new AudioContext();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.2, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch { /* no audio */ }
}

/** Floating rest countdown. Counts toward an end time, so a locked screen doesn't drift it. */
export function RestTimer({ endsAt, total, onChange }: Props) {
  const [now, setNow] = useState(Date.now);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") setPos(saved);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (endsAt && now >= endsAt) {
      alertDone();
      onChange(null, total);
    }
  }, [now, endsAt, total, onChange]);

  if (!endsAt) return null;
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const frac = total > 0 ? Math.min(1, left / total) : 0;
  const shift = (sec: number) => {
    const next = endsAt + sec * 1000;
    if (next <= Date.now()) return onChange(null, total);
    onChange(next, Math.max(total, Math.ceil((next - Date.now()) / 1000)));
  };

  const clamp = (x: number, y: number) => {
    const el = box.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 64;
    return { x: Math.min(innerWidth - w - 8, Math.max(8, x)), y: Math.min(innerHeight - h - 8, Math.max(8, y)) };
  };

  return (
    <div
      ref={box}
      role="timer"
      aria-label={`מנוחה, נותרו ${left} שניות`}
      className="fixed z-40 flex touch-none select-none items-center gap-2 rounded-full bg-surface-strong p-2 pe-3 text-on-strong shadow-lg"
      style={pos ? { left: pos.x, top: pos.y } : { left: "50%", top: "calc(env(safe-area-inset-top) + 72px)", transform: "translateX(-50%)" }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        const r = box.current!.getBoundingClientRect();
        drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false };
        box.current!.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        drag.current.moved = true;
        setPos(clamp(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
      }}
      onPointerUp={() => {
        if (drag.current?.moved && pos) localStorage.setItem(POS_KEY, JSON.stringify(pos));
        drag.current = null;
      }}
    >
      <span className="relative grid h-14 w-14 shrink-0 place-items-center">
        <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="5" />
          <circle cx="28" cy="28" r={R} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} className="transition-[stroke-dashoffset] duration-200" />
        </svg>
        <span className="text-sm font-bold tabular-nums">{Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
      </span>
      <button type="button" onClick={() => shift(-10)} aria-label="פחות 10 שניות" className="h-10 rounded-full bg-on-strong/10 px-3 text-sm font-bold tabular-nums active:scale-95">−10</button>
      <button type="button" onClick={() => shift(10)} aria-label="עוד 10 שניות" className="h-10 rounded-full bg-on-strong/10 px-3 text-sm font-bold tabular-nums active:scale-95">+10</button>
      <button type="button" onClick={() => onChange(null, total)} aria-label="דילוג על המנוחה" className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink active:scale-95">
        <SkipForward className="h-4 w-4" />
      </button>
    </div>
  );
}
