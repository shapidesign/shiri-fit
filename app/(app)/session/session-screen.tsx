"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { RecoverySheet } from "@/components/recovery-sheet";
import { useProfile } from "@/components/profile-provider";
import { Mini } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { db, defaultWorkoutOpts, exerciseKey, generateWorkout, getTemplate, setHistory, type TemplateWithExercises, type WorkoutOpts } from "@/lib/db";
import { g, muscleLabel, needsWeight, PHASE_LABEL, vibeLabel } from "@/lib/labels";
import { suggestWeight, type LoggedSet, type Suggestion } from "@/lib/progression";
import type { Exercise, ExerciseDone, ScheduledWorkout, WorkoutLog } from "@/lib/types";

export type QuickParams = Partial<Omit<WorkoutOpts, "focus">>;
type Props = { scheduledId: string | null; templateId: string | null; quick: QuickParams | null };
type Row = TemplateWithExercises["template_exercises"][number];
const rowName = (r: Row) => (r.exercise ? r.exercise.name_he ?? r.exercise.name : r.custom_name ?? "");
/** Warm-up and cool-down are timed and never weighted. */
const weighted = (r: Row) => r.phase === "main" && needsWeight(r.exercise?.category ?? null);

export function SessionScreen({ scheduledId, templateId, quick }: Props) {
  const router = useRouter();
  const { profile } = useProfile();
  const [scheduled, setScheduled] = useState<ScheduledWorkout | null>(null);
  const [template, setTemplate] = useState<TemplateWithExercises | null>(null);
  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<Record<string, LoggedSet[]>>({});
  const [tips, setTips] = useState<Record<string, Suggestion | null>>({});
  const [clock, setClock] = useState({ start: 0, now: 0 });
  const [paused, setPaused] = useState<number | null>(null);
  const [pausedTotal, setPausedTotal] = useState(0);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [savedLog, setSavedLog] = useState<WorkoutLog | null>(null);
  const [leaving, setLeaving] = useState(false);

  // Closing the tab mid-workout gets the browser's own "leave site?" prompt.
  useEffect(() => {
    if (savedLog) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [savedLog]);

  useEffect(() => {
    (async () => {
      let tid = templateId;
      let sched: ScheduledWorkout | null = null;
      if (scheduledId) {
        const { data } = await db().from("scheduled_workouts").select("*").eq("id", scheduledId).maybeSingle();
        sched = data as ScheduledWorkout | null;
        setScheduled(sched);
        tid = sched?.template_id ?? tid;
      }
      const d = defaultWorkoutOpts(profile);
      const t = tid ? await getTemplate(tid) : quick
        ? await generateWorkout(profile, { minutes: quick.minutes ?? d.minutes, vibe: quick.vibe ?? d.vibe, equipment: quick.equipment ?? d.equipment })
        : null;
      if (t) {
        const history = await setHistory();
        // Push heavier only when the program is about getting stronger / toned and isn't a light day.
        const progress = (sched?.intensity ?? t.intensity) !== "light"
          && ((sched?.vibe ?? t.vibe) === "strength" || profile.goals.some((g) => g === "strength" || g === "tone"));
        const nextTips: Record<string, Suggestion | null> = {};
        const nextSets: Record<string, LoggedSet[]> = {};
        for (const r of t.template_exercises) {
          const w = weighted(r);
          const tip = w ? suggestWeight(history.get(exerciseKey({ exercise_id: r.exercise?.id, name: rowName(r) })) ?? [], r.reps, progress, r.exercise?.category ?? null) : null;
          nextTips[r.id] = tip;
          nextSets[r.id] = Array.from({ length: r.sets ?? 1 }, () => ({ reps: r.reps ?? undefined, weight_kg: w ? tip?.kg ?? r.weight_kg ?? undefined : undefined, done: false }));
        }
        setTips(nextTips);
        setSets(nextSets);
      }
      setTemplate(t);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build the quick workout once, not on profile edits
  }, [scheduledId, templateId, quick]);

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
  const ticked = Object.values(sets).flat().filter((s) => s.done).length;

  const exercisesDone: ExerciseDone[] = useMemo(() => rows.map((r) => ({
    name: rowName(r),
    exercise_id: r.exercise?.id ?? null,
    duration_sec: r.duration_sec ?? undefined,
    sets: sets[r.id] ?? [],
  })), [rows, sets]);

  // A weight change carries forward to the sets not done yet.
  const edit = (id: string, i: number, patch: Partial<LoggedSet>) => setSets((d) => ({
    ...d,
    [id]: d[id].map((s, j) => (j === i || ("weight_kg" in patch && j > i && !s.done) ? { ...s, ...patch } : s)),
  }));
  const tick = (id: string, i: number, on: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`סט ${i + 1}`}
      onClick={() => edit(id, i, { done: !on })}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border text-sm font-bold transition-transform active:scale-90 ${on ? "border-success bg-success text-accent-ink" : "border-border bg-surface-2"}`}
    >
      {on ? <Check className="h-5 w-5" /> : i + 1}
    </button>
  );

  const title = scheduled?.title ?? template?.name ?? "אימון";
  const vibe = scheduled?.vibe ?? template?.vibe ?? "strength";
  const intensity = scheduled?.intensity ?? template?.intensity ?? "moderate";

  if (loading) return <div className="h-80 animate-pulse rounded-[24px] bg-surface" />;

  return (
    <main className="pb-24">
      <PageHeader title={title} eyebrow={`${vibeLabel(vibe)} · ${template ? `${rows.length} תרגילים` : "אימון חופשי"}`} onBack={() => setLeaving(true)} />

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
        <p className="mt-6 rounded-[24px] bg-surface p-5 text-center text-muted">אין תרגילים בתבנית — פשוט {g(profile.gender, "תתאמני", "תתאמן")}, ובסוף נתעד.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r, idx) => {
            const rowSets = sets[r.id] ?? [];
            const name = rowName(r);
            const allDone = rowSets.length > 0 && rowSets.every((s) => s.done);
            const timed = !r.reps && !!r.duration_sec;
            const tip = tips[r.id];
            return (
              <Fragment key={r.id}>
              {r.phase !== rows[idx - 1]?.phase && <li><h2 className="px-1 pt-2 text-sm font-bold text-muted">{PHASE_LABEL[r.phase]}</h2></li>}
              <li className={`rounded-[24px] p-4 transition-colors ${allDone ? "bg-success/15" : "bg-surface"}`}>
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
                      {r.reps ? `${rowSets.length} × ${r.reps} חזרות` : r.duration_sec ? `${rowSets.length} × ${r.duration_sec} שנ׳` : `${rowSets.length} סטים`}
                      {r.exercise && ` · ${r.exercise.muscles.map(muscleLabel).join(", ")}`}
                    </p>
                    {tip && <p className="mt-1 text-xs font-semibold">המלצה: {tip.kg} ק״ג · <span className="font-normal text-muted">{tip.why}</span></p>}
                  </button>
                </div>
                {timed ? (
                  <div className="mt-3 flex flex-wrap gap-2">{rowSets.map((s, i) => <span key={i}>{tick(r.id, i, s.done)}</span>)}</div>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {rowSets.map((s, i) => (
                      <li key={i} className="flex items-end gap-2">
                        {tick(r.id, i, s.done)}
                        <div className="flex-1"><Mini label="חזרות" value={s.reps ?? null} onChange={(v) => edit(r.id, i, { reps: v ?? undefined })} /></div>
                        {weighted(r) && <div className="flex-1"><Mini label="ק״ג" step="0.5" placeholder="—" value={s.weight_kg ?? null} onChange={(v) => edit(r.id, i, { weight_kg: v ?? undefined })} /></div>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4">
        <Button size="lg" className="w-full shadow-lg" onClick={() => setFinishing(true)}>סיום אימון</Button>
      </div>

      <Sheet open={leaving} onClose={() => setLeaving(false)} title="לצאת מהאימון?">
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={() => { setLeaving(false); setFinishing(true); }}>לתעד את האימון</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setLeaving(false)}>להמשיך להתאמן</Button>
          <Button size="lg" variant="danger" className="w-full" onClick={() => router.replace("/")}>לצאת בלי לשמור</Button>
        </div>
      </Sheet>
      <LogWorkoutSheet
        open={finishing}
        onClose={() => setFinishing(false)}
        scheduled={scheduled}
        session={{ title, vibe, intensity, minutes, exercises: exercisesDone, templateId: template?.id || null }}
        onSaved={(log) => setSavedLog(log)}
      />
      <RecoverySheet open={!!savedLog} log={savedLog} onClose={() => { setSavedLog(null); router.replace("/"); router.refresh(); }} />
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
    </main>
  );
}
