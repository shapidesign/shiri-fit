"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { equipmentLabel, muscleLabel } from "@/lib/labels";
import { db } from "@/lib/db";
import type { Exercise } from "@/lib/types";

type Props = { exercise: Exercise | null; onClose: () => void; onPick?: (e: Exercise) => void; pickLabel?: string; onRename?: (e: Exercise) => void };

export function ExerciseSheet({ exercise, onClose, onPick, pickLabel, onRename }: Props) {
  return (
    <Sheet open={!!exercise} onClose={onClose} title={exercise ? exercise.name_he ?? exercise.name : ""}>
      {exercise && <Body key={exercise.id} exercise={exercise} onPick={onPick} pickLabel={pickLabel} onRename={onRename} />}
    </Sheet>
  );
}

function Body({ exercise, onPick, pickLabel = "הוספה לאימון", onRename }: { exercise: Exercise } & Pick<Props, "onPick" | "pickLabel" | "onRename">) {
  const [frame, setFrame] = useState(0);
  const [nameHe, setNameHe] = useState(exercise.name_he ?? "");
  const [editing, setEditing] = useState(false);

  // free-exercise-db has 2 frames per exercise — alternate them to fake motion.
  useEffect(() => {
    if (exercise.gif || exercise.videos.length || exercise.images.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % exercise.images.length), 900);
    return () => clearInterval(t);
  }, [exercise]);

  const video = exercise.videos.find((v) => v.angle?.toLowerCase().includes("front")) ?? exercise.videos[0];
  const bodymap = (exercise.bodymap as { female?: string | null } | null)?.female;

  async function saveName() {
    const { data, error } = await db().from("exercises").update({ name_he: nameHe || null }).eq("id", exercise.id).select("*").single();
    if (error || !data) return alert("השמירה נכשלה");
    onRename?.(data as Exercise);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      {exercise.name_he && <p className="-mt-3 text-sm text-muted" dir="ltr">{exercise.name}</p>}

      <div className="overflow-hidden rounded-2xl bg-surface">
        {exercise.gif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exercise.gif} alt={`הדגמה: ${exercise.name}`} className="aspect-square w-full bg-white object-contain" />
        ) : video ? (
          <video key={video.url} src={video.url} autoPlay loop muted playsInline className="aspect-square w-full object-cover" />
        ) : exercise.images.length ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exercise.images[frame]} alt={exercise.name} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="grid aspect-video place-items-center text-muted">אין הדגמה</div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {exercise.muscles.map((m) => <span key={m} className="rounded-full bg-accent px-3 py-1 text-accent-ink">{muscleLabel(m)}</span>)}
        {exercise.secondary_muscles.map((m) => <span key={m} className="rounded-full bg-surface px-3 py-1">{muscleLabel(m)}</span>)}
        {exercise.category && <span className="rounded-full border border-border px-3 py-1">{equipmentLabel(exercise.category)}</span>}
      </div>

      {bodymap && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bodymap} alt="מפת שרירים" className="mx-auto h-40 object-contain" />
      )}

      {exercise.steps.length > 0 && (
        <ol className="list-decimal space-y-1.5 ps-5 text-sm leading-relaxed" dir={exercise.steps_he?.length ? "rtl" : "ltr"}>
          {(exercise.steps_he?.length ? exercise.steps_he : exercise.steps).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}

      {editing ? (
        <div className="flex gap-2">
          <input value={nameHe} onChange={(e) => setNameHe(e.target.value)} placeholder="שם בעברית" className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 px-4 outline-none" autoFocus />
          <Button onClick={saveName}>שמירה</Button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-muted underline">
          {exercise.name_he ? "שינוי השם בעברית" : "הוספת שם בעברית"}
        </button>
      )}

      {onPick && <Button size="lg" className="w-full" onClick={() => onPick(exercise)}>{pickLabel}</Button>}
    </div>
  );
}
