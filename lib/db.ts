"use client";

import { format } from "date-fns";
import { exerciseOr } from "@/lib/exercise-or";
import { cooldownCount, fitsLevel, FOCUS_LABEL, GENERATED_VIBES, mainCount, muscleOrder, pickMain, pickPreferring, progressFor, restFor, STRETCH, trainingSignals, usableWithGear, volumeFor, WARMUP, weekRow, type Focus, type GearCounts } from "@/lib/generate";
import { intensityFor, muscleLabel, needsWeight, vibeLabel } from "@/lib/labels";
import { chosenWork, suggestWeight, type LoggedSet } from "@/lib/progression";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, Phase, Profile, ScheduledWorkout, TemplateExercise, Vibe, WorkoutLog, WorkoutPlan, WorkoutTemplate } from "@/lib/types";

export const db = () => createClient();

export type TemplateWithExercises = WorkoutTemplate & { template_exercises: (TemplateExercise & { exercise: Exercise | null })[] };

export async function getTemplate(id: string): Promise<TemplateWithExercises | null> {
  const { data } = await db()
    .from("workout_templates")
    .select("*, template_exercises(*, exercise:exercises(*))")
    .eq("id", id)
    .order("position", { referencedTable: "template_exercises" })
    .maybeSingle();
  return (data as unknown as TemplateWithExercises) ?? null;
}

export async function searchExercises(opts: { q?: string; muscles?: string[]; categories?: string[]; limit?: number }): Promise<Exercise[]> {
  let query = db().from("exercises").select("*").limit(opts.limit ?? 60);
  const or = opts.q ? exerciseOr(opts.q) : null;
  if (or) query = query.or(or);
  if (opts.muscles?.length) query = query.overlaps("muscles", opts.muscles);
  if (opts.categories?.length) query = query.in("category", opts.categories);
  // MuscleWiki rows (with video) first, then ones with a GIF, then by name
  const { data } = await query.order("source", { ascending: false }).order("gif", { nullsFirst: false }).order("name");
  return (data ?? []) as Exercise[];
}

export async function scheduleBetween(from: string, to: string): Promise<ScheduledWorkout[]> {
  const { data } = await db().from("scheduled_workouts").select("*").gte("date", from).lte("date", to).order("date").order("time");
  return (data ?? []) as ScheduledWorkout[];
}

/** The current (or next upcoming) monthly plan and how many of its workouts are done. */
export async function activePlan(): Promise<{ plan: WorkoutPlan; done: number } | null> {
  const today = format(new Date(), "yyyy-MM-dd");
  const { data: plan } = await db().from("workout_plans").select("*").gte("ends_on", today).order("starts_on").limit(1).maybeSingle();
  if (!plan) return null;
  const { count } = await db().from("scheduled_workouts").select("id", { count: "exact", head: true }).eq("plan_id", plan.id).eq("status", "done");
  return { plan, done: count ?? 0 };
}

export async function logsBetween(fromIso: string, toIso: string): Promise<WorkoutLog[]> {
  const { data, error } = await db().from("workout_logs").select("*").gte("performed_at", fromIso).lte("performed_at", toIso).order("performed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkoutLog[];
}

export const exerciseKey = (e: { exercise_id?: number | null; name: string }) => String(e.exercise_id ?? e.name);

/** Logged sets per exercise (see exerciseKey), newest session first. */
export async function setHistory(): Promise<Map<string, LoggedSet[][]>> {
  // ponytail: last 60 logs scanned client-side; move to a jsonb query if history needs to go deeper.
  const { data } = await db().from("workout_logs").select("exercises_done").order("performed_at", { ascending: false }).limit(60);
  const m = new Map<string, LoggedSet[][]>();
  for (const l of data ?? []) for (const e of l.exercises_done) if (e.sets?.length) m.set(exerciseKey(e), [...(m.get(exerciseKey(e)) ?? []), e.sets]);
  return m;
}

/** Pace and too-easy/too-hard bias from the newest logs (see trainingSignals). */
export async function recentSignals(goals: string[]) {
  const { data } = await db().from("workout_logs").select("duration_min, exercises_done, difficulty, is_external").order("performed_at", { ascending: false }).limit(10);
  return trainingSignals((data ?? []) as Parameters<typeof trainingSignals>[0], restFor(goals));
}

/** Plan context: `goals` set the rep scheme, `level` caps difficulty (unset = any), `week` (0-3) sets the volume. `muscle` overrides `focus`. `core` unset = no question asked. */
export type WorkoutOpts = { minutes: number; vibe: Vibe; equipment: string[]; focus?: Focus; muscle?: string; goals?: string[]; level?: number; week?: number; core?: boolean };

const EXTRAS_OR = ["stretch", "jumping jack", "jog", "march", "arm circle", "high knee", "butt kick", "inchworm", "leg swing", "cat%cow"].map((n) => `name.ilike.%${n}%`).join(",");
/** Warm-up and stretch candidates; fetched separately so the 300-row main pool can't crowd them out. */
async function extrasPool(categories: string[]): Promise<Exercise[]> {
  const { data } = await db().from("exercises").select("*").or(EXTRAS_OR).in("category", categories).limit(300);
  return (data ?? []) as Exercise[];
}

type Row = TemplateWithExercises["template_exercises"][number];
const row = (e: Exercise, i: number, phase: Phase, sets: number, reps: number | null, duration_sec: number | null): Row => ({
  id: `quick-${i}`, template_id: "", exercise_id: e.id, exercise: e, custom_name: null, position: i, notes: null, weight_kg: null, phase, sets, reps, duration_sec,
});

/** The same workout at another plan week's volume (main block only). Pinned exercises keep their reps. */
export function withWeek(t: TemplateWithExercises, week: number, goals: string[], pinned: ReadonlySet<number> = new Set()): TemplateWithExercises {
  return { ...t, template_exercises: t.template_exercises.map((r) => weekRow(r, week, goals, pinned)) };
}

/** Exercises whose last log should pin reps across the plan's weeks. */
export function rememberedExerciseIds(rows: { phase: string; exercise_id: number | null }[], history: Map<string, LoggedSet[][]>): Set<number> {
  const ids = new Set<number>();
  for (const r of rows) {
    if (r.phase !== "main" || r.exercise_id == null) continue;
    const c = chosenWork(history.get(String(r.exercise_id)));
    if (c.reps != null || c.kg != null) ids.add(r.exercise_id);
  }
  return ids;
}

/** Profile defaults for the single-workout questions. */
export const defaultWorkoutOpts = (profile: Profile): WorkoutOpts => ({
  minutes: 45,
  vibe: (profile.vibes.find((v) => GENERATED_VIBES.includes(v as Vibe)) ?? "strength") as Vibe,
  equipment: profile.equipment,
});

/** An unsaved template sized to the time available: warm-up, one exercise per main muscle, cool-down stretches. */
export async function generateWorkout(profile: Profile, o: WorkoutOpts, history?: Map<string, LoggedSet[][]>): Promise<TemplateWithExercises> {
  const focus = o.focus ?? "full";
  const goals = o.goals ?? profile.goals;
  const intensity = intensityFor(profile.conditioning);
  const base = {
    id: "", user_id: profile.id, vibe: o.vibe, intensity, est_minutes: o.minutes, notes: null, created_at: "",
  };
  if (!GENERATED_VIBES.includes(o.vibe)) return { ...base, name: vibeLabel(o.vibe), muscle_groups: [], template_exercises: [] };

  const gear = [...new Set(["bodyweight", "mat", ...o.equipment])];
  // Nearly all stretches are filed under "other" and need nothing but a wall or chair.
  const [pool, extras, past, signals] = await Promise.all([
    searchExercises({ categories: gear, muscles: o.muscle ? [o.muscle] : undefined, limit: 300 }),
    extrasPool([...gear, "other"]),
    history ? Promise.resolve(history) : setHistory(),
    recentSignals(goals),
  ]);
  const candidates = pool.filter((e) => !WARMUP.test(e.name) && !STRETCH.test(e.name) && (o.level === undefined || fitsLevel(e, o.level)));
  const counts: GearCounts = {
    dumbbells: o.equipment.includes("dumbbells") ? profile.dumbbell_pairs : null,
    kettlebells: o.equipment.includes("kettlebells") ? profile.kettlebell_pairs : null,
  };
  const v = volumeFor(o.week ?? 0, goals);
  const timed = o.vibe !== "strength";
  const count = mainCount(o.minutes, {
    sets: v.sets, reps: timed ? null : v.reps, durationSec: timed ? v.durationSec : null, rest: restFor(goals), pace: signals.pace,
    bias: signals.bias - (profile.conditioning === "low" ? 1 : 0),
  });
  // One muscle: several different exercises for it, not one per muscle.
  const main = o.muscle
    ? pickPreferring(candidates.filter((e) => e.images.length && usableWithGear(e, counts)), count, [])
    : pickMain(candidates, count, muscleOrder(focus, profile.gender), counts, o.core, o.minutes);
  const muscles = main.flatMap((e) => e.muscles);
  const used = new Set(main.map((e) => e.id));
  // ponytail: only ~8 named warm-ups in the DB; easy bodyweight moves fill the gap.
  const warmup = [
    ...pickPreferring(extras.filter((e) => WARMUP.test(e.name)), 2, []),
    ...pickPreferring(pool.filter((e) => e.category === "bodyweight" && fitsLevel(e, 0) && !used.has(e.id) && !STRETCH.test(e.name)), 2, muscles),
  ].slice(0, 2);
  const cooldown = pickPreferring(extras.filter((e) => STRETCH.test(e.name)), cooldownCount(goals), muscles);

  const progress = progressFor(intensity, o.vibe, goals, signals.bias);
  const owned = profile.owned_weights ?? [];
  const rows = [
    ...warmup.map((e) => [e, "warmup", 1, null, 45] as const),
    ...main.map((e) => [e, "main", v.sets, timed ? null : v.reps, timed ? v.durationSec : null] as const),
    ...cooldown.map((e) => [e, "cooldown", 1, null, 30] as const),
  ].map(([e, phase, sets, reps, dur], i) => {
    const built = row(e, i, phase, sets, reps, dur);
    if (phase !== "main") return built;
    const h = past.get(exerciseKey({ exercise_id: e.id, name: e.name }));
    const chosen = chosenWork(h);
    const weighted = needsWeight(e.category);
    const tip = weighted ? suggestWeight(h ?? [], chosen.reps ?? reps, progress, e.category, owned) : null;
    return { ...built, reps: reps != null && chosen.reps ? chosen.reps : reps, weight_kg: weighted ? tip?.kg ?? chosen.kg ?? null : null };
  });

  return { ...base, name: `${vibeLabel(o.vibe)} · ${o.muscle ? muscleLabel(o.muscle) : FOCUS_LABEL[focus]}`, muscle_groups: main.map((e) => e.muscles[0]), template_exercises: rows };
}

/** Persists a generated workout so scheduled rows can point at it. Returns the template id. */
export async function saveGeneratedTemplate(t: TemplateWithExercises): Promise<string> {
  const supabase = db();
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: await userId(), name: t.name, vibe: t.vibe, intensity: t.intensity, muscle_groups: t.muscle_groups, est_minutes: t.est_minutes })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("template insert failed");
  if (t.template_exercises.length) {
    const { error: exErr } = await supabase.from("template_exercises").insert(
      t.template_exercises.map(({ exercise_id, position, sets, reps, duration_sec, weight_kg, phase }) => ({ template_id: data.id, exercise_id, position, sets, reps, duration_sec, weight_kg, phase })),
    );
    if (exErr) throw exErr;
  }
  return data.id;
}

export const swapTemplateExercise = (rowId: string, exerciseId: number) =>
  db().from("template_exercises").update({ exercise_id: exerciseId }).eq("id", rowId);

export async function userId() {
  const { data } = await db().auth.getUser();
  return data.user!.id;
}
