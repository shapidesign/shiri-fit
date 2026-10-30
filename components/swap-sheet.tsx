"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { useProfile } from "@/components/profile-provider";
import { searchExercises } from "@/lib/db";
import { swapCandidates, usableWithGear, WARMUP_TERMS, type GearCounts } from "@/lib/generate";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import type { Exercise, Phase } from "@/lib/types";

type Props = { exercise: Exercise | null; phase: Phase; exclude: number[]; onClose: () => void; onSwap: (e: Exercise) => void };
type Mode = "same" | "any";

/** Alternatives for the same primary muscle. Same gear unless she asks to change it. */
export function SwapSheet({ exercise, phase, exclude, onClose, onSwap }: Props) {
  const [preview, setPreview] = useState<Exercise | null>(null);
  const swap = (e: Exercise) => { setPreview(null); onSwap(e); };
  return (
    <>
      <Sheet open={!!exercise} onClose={onClose} title={exercise ? `במקום ${exercise.name_he ?? exercise.name}` : ""}>
        {exercise && <Picker key={exercise.id} exercise={exercise} phase={phase} exclude={exclude} onPreview={setPreview} onSwap={swap} />}
      </Sheet>
      <ExerciseSheet exercise={preview} onClose={() => setPreview(null)} onPick={swap} pickLabel="החלפה" />
    </>
  );
}

function Picker({ exercise, phase, exclude, onPreview, onSwap }: Omit<Props, "onClose" | "exercise"> & { exercise: Exercise; onPreview: (e: Exercise) => void }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const gear = exercise.category ? equipmentLabel(exercise.category) : "משקל גוף";
  if (!mode) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">התרגיל הזה עם {gear}.</p>
        <button type="button" onClick={() => setMode("same")} className="w-full rounded-2xl bg-accent p-4 text-start text-accent-ink active:scale-[0.98]">
          <span className="block font-bold">רק תרגיל</span>
          <span className="block text-xs opacity-70">להישאר עם {gear}</span>
        </button>
        <button type="button" onClick={() => setMode("any")} className="w-full rounded-2xl bg-surface p-4 text-start active:scale-[0.98]">
          <span className="block font-bold">גם ציוד</span>
          <span className="block text-xs text-muted">תרגיל מציוד אחר שיש לך</span>
        </button>
      </div>
    );
  }
  return <Gallery key={mode} exercise={exercise} phase={phase} exclude={exclude} mode={mode} onPreview={onPreview} onSwap={onSwap} onWiden={() => setMode("any")} />;
}

function Gallery({ exercise, phase, exclude, mode, onPreview, onSwap, onWiden }: Omit<Props, "onClose" | "exercise"> & { exercise: Exercise; mode: Mode; onPreview: (e: Exercise) => void; onWiden: () => void }) {
  const { profile } = useProfile();
  const [items, setItems] = useState<Exercise[] | null>(null);
  const muscle = exercise.muscles[0];

  useEffect(() => {
    const gear: GearCounts = {
      dumbbells: profile.equipment.includes("dumbbells") ? profile.dumbbell_pairs : null,
      kettlebells: profile.equipment.includes("kettlebells") ? profile.kettlebell_pairs : null,
    };
    const wide = [...new Set(["bodyweight", "mat", ...profile.equipment, ...(phase === "cooldown" ? ["other"] : [])])];
    const categories = mode === "same" ? [exercise.category ?? "bodyweight"] : [...new Set([...wide, exercise.category ?? "other"])];
    const fit = (rows: Exercise[]) => rows.filter((e) => usableWithGear(e, gear));
    const terms = phase === "warmup" ? WARMUP_TERMS : phase === "cooldown" ? ["stretch"] : undefined;
    let cancel = false;
    (async () => {
      let pool = fit(await searchExercises({ muscles: muscle ? [muscle] : undefined, categories, limit: 200 }));
      let next = swapCandidates(pool, exercise, phase, exclude);
      // Same gear stays strict. Changing gear, or a dead end, falls through to owned gear and then bodyweight.
      if (!next.length && mode === "any") {
        pool = fit(await searchExercises({ categories: wide, terms, limit: 200 }));
        next = swapCandidates(pool, exercise, phase, exclude);
      }
      if (!next.length && mode === "any") {
        pool = fit(await searchExercises({ categories: ["bodyweight", "mat"], limit: 100 }));
        next = swapCandidates(pool, exercise, phase, exclude);
      }
      if (!cancel) setItems(next);
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one fetch per mode
  }, [mode]);

  if (!items) return <div className="flex gap-3 overflow-hidden" aria-busy>{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-72 w-[78%] shrink-0 animate-pulse rounded-3xl bg-surface" />)}</div>;
  if (!items.length) {
    return (
      <div className="space-y-4 py-8 text-center">
        <p className="text-muted">{mode === "same" ? `אין תרגיל אחר עם ${exercise.category ? equipmentLabel(exercise.category) : "משקל גוף"}.` : "לא נמצאו חלופות עם הציוד שלך."}</p>
        {mode === "same" && <Button onClick={onWiden}>להחליף גם ציוד</Button>}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{muscle && items.every((e) => e.muscles[0] === muscle) ? `תרגילים ל${muscleLabel(muscle)}. ` : ""}נגיעה בתמונה מציגה הדגמה.{items.length > 1 ? " אפשר לגלול לצדדים." : ""}</p>}
      <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
        {items.map((e) => (
          <article key={e.id} className="w-[78%] shrink-0 snap-center rounded-3xl bg-surface p-3">
            <button type="button" onClick={() => onPreview(e)} aria-label={`הדגמה: ${e.name_he ?? e.name}`} className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-surface-2">
              {e.images[0] || e.gif ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.images[0] || e.gif!} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-sm text-muted">בלי הדגמה</span>
              )}
            </button>
            <h3 className="mt-3 text-lg font-bold">{e.name_he ?? e.name}</h3>
            <p className="text-sm text-muted">{e.category ? equipmentLabel(e.category) : ""}</p>
            <Button className="mt-3 w-full" onClick={() => onSwap(e)}>החלפה</Button>
          </article>
        ))}
      </div>
    </div>
  );
}
