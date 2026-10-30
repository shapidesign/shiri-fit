"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { RecoverySheet } from "@/components/recovery-sheet";
import { RestTimer } from "@/components/rest-timer";
import { SwapSheet } from "@/components/swap-sheet";
import { useProfile } from "@/components/profile-provider";
import { Mini } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { clearDraft, discardDraft, readDraft, replaceDraft } from "@/lib/active-session";
import { db, defaultWorkoutOpts, exerciseKey, generateWorkout, getTemplate, recentSignals, setHistory, swapTemplateExercise, type TemplateWithExercises, type WorkoutOpts } from "@/lib/db";
import { celebrate } from "@/lib/celebrate";
import { progressFor, restFor } from "@/lib/generate";
import { durationLabel, g, muscleLabel, needsWeight, PHASE_LABEL, vibeLabel } from "@/lib/labels";
import { chosenWork, suggestWeight, type LoggedSet, type Suggestion } from "@/lib/progression";
import { saveWorkoutLog } from "@/lib/save-log";
import type { Exercise, ExerciseDone, ScheduledWorkout, WorkoutLog } from "@/lib/types";

export type QuickParams = Partial<Pick<WorkoutOpts, "minutes" | "vibe" | "equipment" | "muscles" | "core">>;
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
  // No visible clock during the workout; elapsed minutes only prefill the log.
  const [start] = useState(Date.now);
  const [detail, setDetail] = useState<Exercise | null>(null);
  const [swapping, setSwapping] = useState<Row | null>(null);
  const [finishMin, setFinishMin] = useState<number | null>(null);
  const finish = () => setFinishMin(Math.max(1, Math.round((Date.now() - start) / 60000)));
  const [savedLog, setSavedLog] = useState<WorkoutLog | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [rest, setRest] = useState<{ endsAt: number | null; total: number }>({ endsAt: null, total: 0 });
  const onRest = useCallback((endsAt: number | null, total: number) => setRest({ endsAt, total }), []);
  const restSec = restFor(profile.goals);

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
        ? await generateWorkout(profile, { minutes: quick.minutes ?? d.minutes, vibe: quick.vibe ?? d.vibe, equipment: quick.equipment ?? d.equipment, muscles: quick.muscles, core: quick.core })
        : null;
      if (t) {
        const [history, signals] = await Promise.all([setHistory(), recentSignals(profile.goals)]);
        const progress = progressFor(sched?.intensity ?? t.intensity, sched?.vibe ?? t.vibe, profile.goals, signals.bias);
        const draft = readDraft(profile.id);
        const here = `${location.pathname}${location.search}`;
        const same = !!draft && (
          (!!scheduledId && draft.scheduledId === scheduledId) ||
          (!!t.id && draft.templateId === t.id) ||
          (!scheduledId && !t.id && draft.href === here)
        );
        const owned = profile.owned_weights ?? [];
        const nextTips: Record<string, Suggestion | null> = {};
        const nextSets: Record<string, LoggedSet[]> = {};
        for (const r of t.template_exercises) {
          const w = weighted(r);
          const past = history.get(exerciseKey({ exercise_id: r.exercise?.id, name: rowName(r) }));
          const chosen = chosenWork(past);
          const reps = chosen.reps ?? r.reps;
          const tip = w ? suggestWeight(past ?? [], reps, progress, r.exercise?.category ?? null, owned) : null;
          nextTips[r.id] = tip;
          const saved = same ? draft?.sets[r.id] : undefined;
          nextSets[r.id] = saved?.length
            ? saved
            : Array.from({ length: r.sets ?? 1 }, () => ({ reps: reps ?? undefined, weight_kg: w ? tip?.kg ?? chosen.kg ?? r.weight_kg ?? undefined : undefined, done: false }));
        }
        setTips(nextTips);
        setSets(nextSets);
      }
      setTemplate(t);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build the quick workout once, not on profile edits
  }, [scheduledId, templateId, quick]);

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
  // The set number is only a label; the check is the only control, and it always shows a V so "done" is visible before tapping.
  const tick = (r: Row, i: number, on: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `ביטול סימון סט ${i + 1}` : `סימון סט ${i + 1} כבוצע`}
      onClick={() => {
        edit(r.id, i, { done: !on });
        // Rest only between main sets, and not after the last one.
        if (!on && r.phase === "main" && ticked + 1 < total) setRest({ endsAt: Date.now() + restSec * 1000, total: restSec });
      }}
      className="block shrink-0 active:scale-95"
    >
      <span className="block text-center text-[11px] font-semibold text-muted">בוצע</span>
      <span className={`grid h-10 w-10 place-items-center rounded-xl border transition-colors ${on ? "border-success bg-success text-accent-ink" : "border-border bg-surface-2 text-muted"}`}>
        <Check className="h-5 w-5" />
      </span>
    </button>
  );

  async function swap(r: Row, e: Exercise) {
    setSwapping(null);
    if (!r.id.startsWith("quick-")) {
      const { error } = await swapTemplateExercise(r.id, e.id);
      if (error) return alert("השמירה נכשלה");
    }
    setTemplate((t) => t && { ...t, template_exercises: t.template_exercises.map((x) => (x.id === r.id ? { ...x, exercise_id: e.id, exercise: e } : x)) });
    // ponytail: no weight tip for the new exercise until the next session; keep history in state if that matters.
    setTips((t) => ({ ...t, [r.id]: null }));
    setSets((d) => ({ ...d, [r.id]: d[r.id].map((s) => ({ ...s, weight_kg: undefined, done: false })) }));
  }

  const title = scheduled?.title ?? template?.name ?? "אימון";
  const vibe = scheduled?.vibe ?? template?.vibe ?? "strength";
  const intensity = scheduled?.intensity ?? template?.intensity ?? "moderate";

  // Every set ticked: save the log straight away and go to the review. Fires once per reaching the total.
  const allTicked = total > 0 && ticked === total;
  const autoSaved = useRef(false);
  useEffect(() => {
    if (!allTicked) { autoSaved.current = false; return; }
    if (autoSaved.current || savedLog || finishMin !== null) return;
    autoSaved.current = true;
    setRest({ endsAt: null, total: 0 });
    saveWorkoutLog({
      scheduled, title, performedAt: new Date(), minutes: Math.max(1, Math.round((Date.now() - start) / 60000)), vibe, intensity,
      weightKg: profile.weight_kg, exercises: exercisesDone, templateId: template?.id || null, countForPlan: true, calendarSync: profile.calendar_sync,
    })
      .then((log) => celebrate("אימון הושלם").then(() => setSavedLog(log)))
      .catch(() => { autoSaved.current = false; alert("השמירה נכשלה"); });
  }, [allTicked, savedLog, finishMin, scheduled, title, start, vibe, intensity, profile.weight_kg, profile.calendar_sync, exercisesDone, template]);

  // Keep the workout on this phone so closing the app doesn't drop it.
  useEffect(() => {
    if (savedLog) { clearDraft(profile.id); return; }
    if (loading) return;
    const templateId = template?.id || null;
    if (!scheduledId && !templateId && !quick) return;
    const href = scheduledId
      ? `/session?scheduled=${scheduledId}`
      : templateId
        ? `/session?template=${templateId}`
        : `${location.pathname}${location.search}`;
    void replaceDraft(profile.id, { templateId, scheduledId, title, href, sets });
  }, [savedLog, loading, template, scheduledId, quick, title, sets, profile.id]);

  if (loading) return <div className="h-80 animate-pulse rounded-[24px] bg-surface" />;

  return (
    <main className="pb-24">
      <PageHeader title={title} eyebrow={`${vibeLabel(vibe)} · ${template ? `${rows.length} תרגילים` : "אימון חופשי"}`} onBack={() => setLeaving(true)} />

      <div className="flex items-center justify-between rounded-[24px] bg-surface-strong p-5 text-on-strong">
        <p className="text-sm opacity-70">סטים שבוצעו</p>
        <p className="text-2xl font-bold tabular-nums">{ticked}/{total}</p>
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
                      {r.reps ? `${rowSets.length} × ${r.reps} חזרות` : r.duration_sec ? `${rowSets.length} × ${durationLabel(r.duration_sec)}` : `${rowSets.length} סטים`}
                      {r.exercise && ` · ${r.exercise.muscles.map(muscleLabel).join(", ")}`}
                    </p>
                    {tip && <p className="mt-1 text-xs font-semibold">המלצה: {tip.kg} ק״ג · <span className="font-normal text-muted">{tip.why}</span></p>}
                  </button>
                  {r.exercise && (
                    <button type="button" onClick={() => setSwapping(r)} aria-label={`החלפת ${name}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 active:scale-95">
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <ul className="mt-3 space-y-2">
                  {rowSets.map((s, i) => (
                    <li key={i} className="flex items-end gap-2">
                      <span className="block w-10 shrink-0 text-center">
                        <span className="block text-[11px] font-semibold text-muted">סט</span>
                        <span className="grid h-10 place-items-center font-bold tabular-nums">{i + 1}</span>
                      </span>
                      {!timed && <div className="flex-1"><Mini label="חזרות" value={s.reps ?? null} onChange={(v) => edit(r.id, i, { reps: v ?? undefined })} /></div>}
                      {!timed && weighted(r) && <div className="flex-1"><Mini label="ק״ג" step="0.5" placeholder="—" value={s.weight_kg ?? null} onChange={(v) => edit(r.id, i, { weight_kg: v ?? undefined })} /></div>}
                      {timed && <span className="mb-2 flex-1 text-sm text-muted">{durationLabel(r.duration_sec!)}</span>}
                      {tick(r, i, s.done)}
                    </li>
                  ))}
                </ul>
              </li>
              </Fragment>
            );
          })}
        </ul>
      )}

      {!savedLog && <RestTimer endsAt={rest.endsAt} total={rest.total} onChange={onRest} />}

      <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4">
        <Button size="lg" className="w-full shadow-lg" onClick={finish}>סיום אימון</Button>
      </div>

      <Sheet open={leaving} onClose={() => setLeaving(false)} title="לצאת מהאימון?">
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={() => { setLeaving(false); finish(); }}>לתעד את האימון</Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={() => setLeaving(false)}>להמשיך להתאמן</Button>
          <Button size="lg" variant="danger" className="w-full" onClick={() => { void discardDraft(profile.id).then(() => router.replace("/")); }}>לצאת בלי לשמור</Button>
        </div>
      </Sheet>
      <LogWorkoutSheet
        open={finishMin !== null}
        onClose={() => setFinishMin(null)}
        scheduled={scheduled}
        session={{ title, vibe, intensity, minutes: finishMin ?? 1, exercises: exercisesDone, templateId: template?.id || null }}
        onSaved={(log) => setSavedLog(log)}
      />
      <RecoverySheet open={!!savedLog} log={savedLog} askDifficulty onClose={() => { setSavedLog(null); router.replace("/"); router.refresh(); }} />
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} />
      <SwapSheet
        exercise={swapping?.exercise ?? null}
        phase={swapping?.phase ?? "main"}
        exclude={rows.flatMap((r) => (r.exercise ? [r.exercise.id] : []))}
        onClose={() => setSwapping(null)}
        onSwap={(e) => swapping && swap(swapping, e)}
      />
    </main>
  );
}
