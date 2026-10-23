"use client";

import { ChevronDown, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import Body, { type Slug } from "react-muscle-highlighter";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-provider";
import { EQUIPMENT, MUSCLES, equipmentLabel, g, muscleLabel } from "@/lib/labels";
import { searchExercises } from "@/lib/db";
import type { Exercise } from "@/lib/types";

// Body-map slugs → MUSCLES ids (the chip filter values).
const SLUG_TO_MUSCLE: Partial<Record<Slug, string>> = {
  abs: "abdominals", adductors: "adductors", biceps: "biceps", calves: "calves", chest: "chest", deltoids: "shoulders",
  forearm: "forearms", gluteal: "glutes", hamstring: "hamstrings", "lower-back": "lower back", neck: "neck",
  obliques: "obliques", quadriceps: "quads", trapezius: "traps", triceps: "triceps", "upper-back": "lats",
};
const MAP_DISABLED: Slug[] = ["ankles", "feet", "hair", "head", "knees", "hands", "tibialis"];

type Props = { onSelect: (e: Exercise) => void; selectedIds?: Set<number> };

export function ExerciseLibrary({ onSelect, selectedIds }: Props) {
  const { profile } = useProfile();
  const [q, setQ] = useState("");
  const [muscles, setMuscles] = useState<string[]>([]);
  const [gear, setGear] = useState(profile.equipment.length ? "mine" : "all");
  const [result, setResult] = useState<{ key: string; items: Exercise[] }>({ key: "", items: [] });
  const [mwState, setMwState] = useState<"idle" | "loading" | "unavailable" | "done">("idle");
  const toggleMuscle = (id: string) => setMuscles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const categories = gear === "mine" ? [...profile.equipment, "bodyweight", "mat"] : gear === "all" ? undefined : [gear];
  const key = JSON.stringify([q.trim(), muscles, categories]);
  const loading = result.key !== key; // derived: no setState-in-effect needed
  const items = result.items;
  const setItems = (fn: (cur: Exercise[]) => Exercise[]) => setResult((r) => ({ ...r, items: fn(r.items) }));

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const res = await searchExercises({ q: q.trim() || undefined, muscles, categories });
      if (alive) setResult({ key, items: res });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  async function searchMuscleWiki() {
    setMwState("loading");
    const r = await fetch(`/api/exercises/search?q=${encodeURIComponent(q.trim())}`).then((r) => r.json());
    if (r.upstream === "unavailable") return setMwState("unavailable");
    setMwState("done");
    setItems((cur) => {
      const ids = new Set(cur.map((e) => e.id));
      return [...(r.results as Exercise[]).filter((e) => !ids.has(e.id)), ...cur];
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex h-12 items-center gap-2 rounded-2xl border border-border bg-surface-2 px-4 focus-within:border-ink">
        <Search className="h-5 w-5 text-muted" aria-hidden />
        <input value={q} onChange={(e) => { setQ(e.target.value); setMwState("idle"); }} placeholder="חיפוש תרגיל (עברית או אנגלית)" className="h-full w-full bg-transparent outline-none placeholder:text-muted" aria-label="חיפוש תרגיל" />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
        <label className={`relative inline-flex h-11 shrink-0 items-center rounded-full border text-sm font-semibold ${gear === "all" ? "border-border bg-surface-2" : "border-accent bg-accent text-accent-ink"}`}>
          <select value={gear} onChange={(e) => setGear(e.target.value)} aria-label="ציוד" className="h-full appearance-none rounded-full bg-transparent ps-4 pe-9 outline-none">
            {profile.equipment.length > 0 && <option value="mine">הציוד שלי</option>}
            <option value="all">כל הציוד</option>
            {EQUIPMENT.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 h-4 w-4" aria-hidden />
        </label>
        {MUSCLES.map((m) => (
          <Chip key={m.id} selected={muscles.includes(m.id)} onClick={() => toggleMuscle(m.id)}>
            {m.label}
          </Chip>
        ))}
      </div>

      {!q.trim() && (
        <div role="group" aria-label="מפת גוף: נגיעה בשריר מסננת תרגילים" className="grid grid-cols-2 gap-2 rounded-[24px] bg-surface p-3 [&_svg]:h-auto [&_svg]:w-full">
          {(["front", "back"] as const).map((side) => (
            <div key={side} className="cursor-pointer">
              <Body
                gender={profile.gender ?? "female"}
                side={side}
                border="none"
                defaultFill="#a39d96"
                disabledParts={MAP_DISABLED}
                data={(Object.keys(SLUG_TO_MUSCLE) as Slug[]).filter((s) => muscles.includes(SLUG_TO_MUSCLE[s]!)).map((slug) => ({ slug, color: "#e9f739" }))}
                onBodyPartPress={(p) => { const m = p.slug && SLUG_TO_MUSCLE[p.slug]; if (m) toggleMuscle(m); }}
              />
              <p className="text-center text-xs text-muted">{side === "front" ? "מלפנים" : "מאחור"}</p>
            </div>
          ))}
        </div>
      )}

      {q.trim().length >= 2 && (
        <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-2 text-sm">
          <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" aria-hidden /> לא מצאת? {g(profile.gender, "חפשי", "חפש")} ב-MuscleWiki</span>
          {mwState === "unavailable" ? (
            <span className="text-xs text-muted">לא זמין כרגע</span>
          ) : (
            <Button size="sm" variant="strong" loading={mwState === "loading"} disabled={mwState === "done"} onClick={searchMuscleWiki}>
              {mwState === "done" ? "נוסף" : "חיפוש"}
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <ul className="space-y-2" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-[72px] animate-pulse rounded-2xl bg-surface" />)}
        </ul>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-muted">אין תרגילים שמתאימים לסינון. {g(profile.gender, "נסי", "נסה")} לבחור ציוד אחר.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => onSelect(e)} className={`flex w-full items-center gap-3 rounded-2xl p-2 pe-4 text-start transition-colors active:bg-surface-2 ${selectedIds?.has(e.id) ? "bg-accent-soft" : "bg-surface"}`}>
                <Thumb e={e} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.name_he ?? e.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {e.muscles.map(muscleLabel).join(" · ")}{e.category ? ` · ${equipmentLabel(e.category)}` : ""}
                  </span>
                </span>
                {e.videos.length > 0 && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-ink">וידאו</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {gear === "all" && !loading && <p className="text-center text-xs text-muted">מוצגים {items.length} תרגילים. אפשר לצמצם לפי ציוד או קבוצת שרירים.</p>}
      {!profile.equipment.length && <p className="text-center text-xs text-muted">טיפ: {g(profile.gender, "עדכני", "עדכן")} ציוד בפרופיל כדי לסנן רק מה שיש לך.</p>}
    </div>
  );
}

function Thumb({ e }: { e: Exercise }) {
  const src = e.images[0];
  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="text-xs text-muted">—</span>}
    </span>
  );
}
