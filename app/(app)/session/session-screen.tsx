"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { RecoverySheet } from "@/components/recovery-sheet";
import { db, getTemplate, type TemplateWithExercises } from "@/lib/db";
import { muscleLabel, vibeLabel } from "@/lib/labels";
import type { Exercise, ExerciseDone, ScheduledWorkout, WorkoutLog } from "@/lib/types";

type Props = { scheduledId: string | null; templateId: string | null };

export function SessionScreen({ scheduledId, templateId }: Props) {
  const router = useRouter();
  const [scheduled, setScheduled] = useState<ScheduledWorkout | null>(null);
  const [template, setTemplate] = useState<TemplateWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState<Record<string, boolean[]>>({});
  const [clock, setClock] = useState({ start: 0, now: 0 });
  const [paused, setPaused] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [savedLog, setSavedLog] = useState<WorkoutLog | null>(null);

  useEffect(() => {
    (async () => {
      let tid = templateId;
      if (scheduledId) {
        const { data } = await db().from("scheduled_workouts").select("*").eq("id", scheduledId).maybeSingle();
        setScheduled(data as ScheduledWorkout | null);
        tid = (data as ScheduledWorkout | null)?.template_id ?? tid;
      }
      if (tid) setTemplate(await getTemplate(tid));
      setLoading(false);
    })();
  }, [scheduledId, templateId]);

  useEffect(() => {
    const tick = () => setClock((c) => ({ start: c.start || Date.now(), now: Date.now() }));
    const raf = requestAnimationFrame(tick);
    const t = setInterval(tick, 1000);
    return () => { cancelAnimationFrame(raf); clearInterval(t); };
  }, []);
  const elapsedMs = clock.start ? Math.max(0, (paused ?? clock.now) - clock.start - pausedTotal) : 0;
  const minutes = Math.max(1, Math.round(elapsedMs / 60000));
  const mmss = `${String(Math.floor(elapsedMs / 60000)).padStart(2, "0")}:${String(Math.floor((elapsedMs / 1000) % 60)).padStart(2, "0")}`;

  const rows = useMemo(() => template?.template_exercises ?? [], [template]);
  const total = rows.reduce((n, r) => n + (r.sets ?? 1), 0);
  const ticked = Object.values(done).flat().filter(Boolean).length;

  const exercisesDone: ExerciseDone[] = useMemo(() => rows.map((r) => ({
    name: r.exercise ? r.exercise.name_he ?? r.exercise.name : r.custom_name ?? "",
    exercise_id: r.exercise?.id ?? null,
    duration_sec: r.duration_sec ?? undefined,
    sets: Array.from({ length: r.sets ?? 1 }, (_, i) => ({ reps: r.reps ?? undefined, weight_kg: r.weight_kg ?? undefined, done: !!done[r.id]?.[i] })),
  })), [rows, done]);

  const title = scheduled?.title ?? template?.name ?? "אימון";
  const vibe = scheduled?.vibe ?? template?.vibe ?? "strength";
  const intensity = scheduled?.intensity ?? template?.intensity ?? "moderate";

  if (loading) return <div className="h-80 animate-pulse rounded-[24px] bg-surface" />;

  return (
    <main className="pb-24">
      <PageHeader title={title} eyebrow={`${vibeLabel(vibe)} · ${template ? `${rows.length} תרגילים` : "אימון חופשי"}`} back="/" />

      <div className="flex items-center justify-between rounded-[24px] bg-surface-strong p-5 text-on-strong">
        <div>
          <p className="text-xs opacity-70">זמן אימון</p>
          <p className="text-4xl font-black tabular-nums" aria-live="off">{mmss}</p>
        </div>
        <div className="text-end">
          <p className="text-xs opacity-70">סטים</p>
          <p className="text-2xl font-bold tabular-nums">{ticked}/{total}</p>
        </div>
        <button
          type="button"
          aria-label={paused ? "המשך" : "השהיה"}
          onClick={() => { if (paused) { setPausedTotal((p) => p + (Date.now() - paused)); setPaused(null); } else setPaused(Date.now()); }}
          className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink active:scale-95"
        >
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-[24px] bg-surface p-5 text-center text-muted">אין תרגילים בתבנית — פשוט תתאמני, ובסוף נתעד.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const sets = r.sets ?? 1;
            const name = r.exercise ? r.exercise.name_he ?? r.exercise.name : r.custom_name;
            const allDone = (done[r.id] ?? []).filter(Boolean).length === sets;
            return (
              <li key={r.id} className={`rounded-[24px] p-4 transition-colors ${allDone ? "bg-accent-soft" : "bg-surface"}`}>
                <div className="flex items-center gap-3">
                  {r.exercise?.images[0] && (
                    <button type="button" onClick={() => setDetail(r.exercise)} aria-label={`הדגמה: ${name}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.exercise.images[0]} alt="" className="h-full w-full object-cover" />
                    </button>
                  )}
                  <button type="button" onClick={() => r.exercise && setDetail(r.exercise)} className="min-w-0 flex-1 text-start">
                    <p className="truncate text-lg font-bold">{name}</p>
                    <p className="text-xs text-muted">
                      {r.reps ? `${sets} × ${r.reps} חזרות` : r.duration_sec ? `${sets} × ${r.duration_sec} שנ׳` : `${sets} סטים`}
                      {r.weight_kg ? ` · ${r.weight_kg} ק״ג` : ""}
                      {r.exercise && ` · ${r.exercise.muscles.map(muscleLabel).join(", ")}`}
                    </p>
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Array.from({ length: sets }, (_, i) => {
                    const on = !!done[r.id]?.[i];
                    return (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={on}
                        aria-label={`סט ${i + 1}`}
                        onClick={() => setDone((d) => { const arr = [...(d[r.id] ?? Array(sets).fill(false))]; arr[i] = !arr[i]; return { ...d, [r.id]: arr }; })}
                        className={`grid h-11 w-11 place-items-center rounded-full border text-sm font-bold transition-transform active:scale-90 ${on ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2"}`}
                      >
                        {on ? <Check className="h-5 w-5" /> : i + 1}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4">
        <Button size="lg" className="w-full shadow-lg" onClick={() => setFinishing(true)}>סיום אימון</Button>
      </div>

      <LogWorkoutSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        scheduled={scheduled}
        session={{ title, vibe, intensity, minutes, exercises: exercisesDone, templateId: template?.id ?? null }}
        onSaved={(log) => setSavedLog(log)}
      />
      <RecoverySheet open={!!savedLog} log={savedLog} onClose={() => { setSavedLog(null); router.replace("/"); router.refresh(); }} />
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
