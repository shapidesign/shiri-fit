"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { dialMinutes } from "@/lib/dial";

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
};

const SIZE = 228;
const STROKE = 16;

/** Large clock for a duration. Drag the face; the arc follows the finger. One turn is an hour. */
export function DurationClock({ label, value, onChange, min = 5, max = 300 }: Props) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const prevFrac = useRef((value % 60) / 60);
  const dragging = useRef(false);
  const [instant, setInstant] = useState(false);
  const repeat = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  useEffect(() => () => { if (repeat.current) clearTimeout(repeat.current); }, []);

  const r = (SIZE - STROKE) / 2;
  const c = 2 * Math.PI * r;
  const cx = SIZE / 2;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  const pct = mins / 60;
  const ang = pct * Math.PI * 2 - Math.PI / 2;
  const knob = { x: cx + r * Math.cos(ang), y: cx + r * Math.sin(ang) };

  function commit(next: number) {
    const v = Math.min(max, Math.max(min, next));
    valueRef.current = v;
    prevFrac.current = (v % 60) / 60;
    onChange(v);
  }

  function step(delta: number) {
    commit(valueRef.current + delta);
  }

  function stopHold() {
    if (repeat.current) clearTimeout(repeat.current);
    repeat.current = null;
  }

  function startHold(delta: number) {
    held.current = false;
    stopHold();
    setInstant(true);
    let wait = 260;
    const run = () => {
      held.current = true;
      step(delta);
      wait = 50;
      repeat.current = setTimeout(run, wait);
    };
    repeat.current = setTimeout(run, wait);
  }

  function endHold() {
    stopHold();
    setInstant(false);
  }

  function fracFrom(e: ReactPointerEvent) {
    const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - (b.left + b.width / 2);
    const y = e.clientY - (b.top + b.height / 2);
    let ang = Math.atan2(y, x) + Math.PI / 2;
    if (ang < 0) ang += Math.PI * 2;
    return ang / (Math.PI * 2);
  }

  function move(e: ReactPointerEvent, wrap: boolean) {
    commit(dialMinutes(valueRef.current, prevFrac.current, fracFrom(e), wrap, min, max));
  }

  return (
    <div className="flex flex-col items-center">
      <span className="mb-2 self-stretch text-sm font-semibold">{label}</span>
      <div
        role="slider"
        tabIndex={0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={`${value} דקות`}
        aria-label={label}
        className="relative touch-none select-none rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        style={{ width: SIZE, height: SIZE }}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          dragging.current = true;
          setInstant(true);
          move(e, false);
        }}
        onPointerMove={(e) => { if (dragging.current) move(e, true); }}
        onPointerUp={() => { dragging.current = false; setInstant(false); }}
        onPointerCancel={() => { dragging.current = false; setInstant(false); }}
        onKeyDown={(e) => {
          const delta = e.key === "ArrowUp" || e.key === "ArrowRight" ? 1
            : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -1
            : e.key === "PageUp" ? 15
            : e.key === "PageDown" ? -15
            : 0;
          if (!delta) return;
          e.preventDefault();
          step(delta);
        }}
      >
        <svg width={SIZE} height={SIZE} aria-hidden>
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const len = i % 5 === 0 ? 9 : 4;
            const outer = r - 20;
            const inner = outer - len;
            return (
              <line
                key={i}
                x1={cx + Math.cos(a) * inner} y1={cx + Math.sin(a) * inner}
                x2={cx + Math.cos(a) * outer} y2={cx + Math.sin(a) * outer}
                stroke="currentColor" strokeOpacity={i % 5 === 0 ? 0.7 : 0.32}
                strokeWidth={i % 5 === 0 ? 2 : 1.25} strokeLinecap="round"
              />
            );
          })}
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="color-mix(in oklab, var(--ink) 12%, transparent)" strokeWidth={STROKE} />
          {hours > 0 && (
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={STROKE} transform={`rotate(-90 ${cx} ${cx})`} />
          )}
          {pct > 0 && (
            <circle
              cx={cx} cy={cx} r={r} fill="none" stroke="var(--accent)" strokeWidth={STROKE} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${cx} ${cx})`}
              style={{ transition: instant ? "none" : "stroke-dashoffset 90ms linear" }}
            />
          )}
          <circle cx={knob.x} cy={knob.y} r={12} fill="var(--accent)" stroke="var(--surface-2)" strokeWidth={4} />
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-6xl font-black leading-none tabular-nums">{value}</div>
            <div className="mt-1 text-sm font-semibold text-muted">דק׳</div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <HoldButton label={`פחות ${label}`} onStep={() => step(-1)} onHold={() => startHold(-1)} onRelease={endHold} held={held}>−</HoldButton>
        <HoldButton label={`יותר ${label}`} onStep={() => step(1)} onHold={() => startHold(1)} onRelease={endHold} held={held}>+</HoldButton>
      </div>
    </div>
  );
}

function HoldButton({ label, onStep, onHold, onRelease, held, children }: {
  label: string;
  onStep: () => void;
  onHold: () => void;
  onRelease: () => void;
  held: RefObject<boolean>;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => { if (held.current) { held.current = false; return; } onStep(); }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        onHold();
      }}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onContextMenu={(e) => e.preventDefault()}
      className="grid h-12 w-12 place-items-center rounded-full bg-surface text-2xl font-bold active:scale-95"
    >
      {children}
    </button>
  );
}
