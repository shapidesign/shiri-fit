"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { useProfile } from "@/components/profile-provider";
import { searchExercises } from "@/lib/db";
import { STRETCH, usableWithGear, WARMUP } from "@/lib/generate";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import type { Exercise, Phase } from "@/lib/types";

type Props = { exercise: Exercise | null; phase: Phase; exclude: number[]; onClose: () => void; onSwap: (e: Exercise) => void };

/** Alternatives for the same primary muscle, with the user's gear. */
export function SwapSheet({ exercise, phase, exclude, onClose, onSwap }: Props) {
  const [preview, setPreview] = useState<Exercise | null>(null);
  const swap = (e: Exercise) => { setPreview(null); onSwap(e); };
  return (
    <>
      <Sheet open={!!exercise} onClose={onClose} title={exercise ? `במקום ${exercise.name_he ?? exercise.name}` : ""}>
        {exercise && <List key={exercise.id} exercise={exercise} phase={phase} exclude={exclude} onPreview={setPreview} onSwap={swap} />}
      </Sheet>
      <ExerciseSheet exercise={preview} onClose={() => setPreview(null)} onPick={swap} pickLabel="החלפה" />
    </>
  );
}

function List({ exercise, phase, exclude, onPreview, onSwap }: Omit<Props, "onClose" | "exercise"> & { exercise: Exercise; onPreview: (e: Exercise) => void }) {
  const { profile } = useProfile();
  const [items, setItems] = useState<Exercise[] | null>(null);
  const muscle = exercise.muscles[0];

  useEffect(() => {
    const categories = [...new Set(["bodyweight", "mat", ...profile.equipment, exercise.category ?? "other", ...(phase === "cooldown" ? ["other"] : [])])];
    const pairs = profile.equipment.includes("dumbbells") ? profile.dumbbell_pairs : null;
    searchExercises({ muscles: muscle ? [muscle] : undefined, categories, limit: 200 }).then((res) => setItems(
      res.filter((e) => e.id !== exercise.id && !exclude.includes(e.id) && e.images.length && usableWithGear(e, pairs)
        && (phase === "cooldown" ? STRETCH.test(e.name) : phase === "main" ? !STRETCH.test(e.name) && !WARMUP.test(e.name) : !STRETCH.test(e.name)))
        .slice(0, 20),
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one fetch per opened exercise
  }, []);

  if (!items) return <ul className="space-y-2" aria-busy>{Array.from({ length: 5 }).map((_, i) => <li key={i} className="h-[72px] animate-pulse rounded-2xl bg-surface" />)}</ul>;
  if (!items.length) return <p className="py-8 text-center text-muted">לא נמצאו חלופות עם הציוד שלך.</p>;
  return (
    <div className="space-y-2">
      {muscle && <p className="text-sm text-muted">תרגילים ל{muscleLabel(muscle)}. נגיעה בתמונה מציגה הדגמה.</p>}
      <ul className="space-y-2">
        {items.map((e) => (
          <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-surface p-2 pe-3">
            <button type="button" onClick={() => onPreview(e)} aria-label={`הדגמה: ${e.name_he ?? e.name}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.images[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
            <button type="button" onClick={() => onSwap(e)} className="min-w-0 flex-1 text-start">
              <span className="block truncate font-semibold">{e.name_he ?? e.name}</span>
              <span className="block truncate text-xs text-muted">{e.category ? equipmentLabel(e.category) : ""}</span>
            </button>
            <button type="button" onClick={() => onSwap(e)} className="h-9 shrink-0 rounded-xl bg-accent px-3 text-sm font-semibold text-accent-ink">החלפה</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
