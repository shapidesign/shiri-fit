"use client";

type RingProps = {
  value: number; // 0..1+
  size?: number;
  stroke?: number;
  color: string; // css color
  track?: string;
  children?: React.ReactNode;
  label: string;
};

/** Apple-Health style activity ring. Pure SVG; animates via stroke-dashoffset transition. */
export function Ring({ value, size = 120, stroke = 12, color, track = "color-mix(in oklab, var(--ink) 10%, transparent)", children, label }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(value, 1));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${Math.round(value * 100)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

/** Three concentric rings. */
export function Rings({ rings, size = 180 }: { rings: { value: number; color: string; label: string }[]; size?: number }) {
  const stroke = Math.round(size / 11);
  const gap = 4;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {rings.map((r, i) => {
        const s = size - i * 2 * (stroke + gap);
        return (
          <div key={r.label} className="absolute" style={{ inset: i * (stroke + gap) }}>
            <Ring value={r.value} size={s} stroke={stroke} color={r.color} label={r.label} />
          </div>
        );
      })}
    </div>
  );
}
