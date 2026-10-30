"use client";

import { format } from "date-fns";
import { exerciseOr } from "@/lib/exercise-or";
import { cooldownCount, fitsLevel, FOCUS_LABEL, GENERATED_VIBES, isTimedVibe, mainCount, partsOrder, pickMain, pickPreferring, pickWarmup, progressFor, restFor, splitMinutes, STRETCH, trainingSignals, usableWithGear, volumeFor, WARMUP, WARMUP_TERMS, warmCoolSeconds, warmupSeconds, weekRow, type Focus, type GearCounts } from "@/lib/generate";
import { intensityFor, muscleLabel, needsWeight, vibeLabel } from "@/lib/labels";
import { chosenWork, suggestWeight, type LoggedSet } from "@/lib/progression";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, Phase, Profile, ScheduledWorkout, TemplateExercise, Vibe, WorkoutLog, WorkoutPlan, WorkoutTemplate } from "@/lib/types";

export const db = () => createClient();

const ilikeOr = (terms: string[]) => terms.map((n) => `name.ilike.%${n}%`).join(",");

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

export async function searchExercises(opts: { q?: string; muscles?: string[]; categories?: string[]; terms?: string[]; limit?: number }): Promise<Exercise[]> {
  let query = db().from("exercises").select("*").limit(opts.limit ?? 60);
  const or = opts.q ? exerciseOr(opts.q) : opts.terms?.length ? ilikeOr(opts.terms) : null;
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

/** Plan context: `goals` set the rep scheme, `level` caps difficulty (unset = any), `week` (0-3) sets the volume. `muscles` (from the single-workout chips) overrides `focus`. `core` unset = no question asked. `shape` "main" skips warm-up and cool-down. */
export type WorkoutOpts = { minutes: number; vibe: Vibe; equipment: string[]; focus?: Focus; muscles?: string[]; goals?: string[]; level?: number; week?: number; core?: boolean; shape?: "full" | "main"; skipCardioWarmup?: boolean };

/** Name-matched candidates, so the 300-row main pool can't crowd warm-ups and stretches out. */
async function namedPool(terms: string[], categories?: string[]): Promise<Exercise[]> {
  let query = db().from("exercises").select("*").or(ilikeOr(terms)).limit(300);
  if (categories?.length) query = query.in("category", categories);
  const { data } = await query;
  return (data ?? []) as Exercise[];
}

/** Hebrew title piece for the body-part chips. */
function partsTitle(parts: string[]) {
  if (!parts.length || parts.includes("full") || (parts.includes("upper") && parts.includes("lower"))) return FOCUS_LABEL.full;
  const specific = parts.filter((p) => p !== "upper" && p !== "lower");
  const region = parts.includes("upper") ? FOCUS_LABEL.upper : parts.includes("lower") ? FOCUS_LABEL.lower : "";
  if (specific.length) return [region, ...specific.map((m) => muscleLabel(m))].filter(Boolean).join(" · ");
  return region || FOCUS_LABEL.full;
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

  const shape = o.shape ?? "full";
  const gear = [...new Set(["bodyweight", "mat", ...o.equipment])];
  const parts = o.muscles?.length ? o.muscles : [focus];
  const { single, order } = partsOrder(parts, profile.gender);
  const region = parts.includes("full") || parts.includes("upper") || parts.includes("lower");
  const specific = parts.filter((p) => p !== "full" && p !== "upper" && p !== "lower");
  // Nearly all stretches are filed under "other" and need nothing but a wall or chair.
  // Warm-ups (walk, bike, jumps) are fetched by name, not by the session's gear.
  const [pool, stretches, warmups, past, signals] = await Promise.all([
    searchExercises({ categories: gear, muscles: !region && specific.length ? specific : undefined, limit: 300 }),
    shape === "main" ? Promise.resolve([]) : namedPool(["stretch"], [...gear, "other"]),
    shape === "main" ? Promise.resolve([]) : namedPool(WARMUP_TERMS),
    history ? Promise.resolve(history) : setHistory(),
    recentSignals(goals),
  ]);
  const counts: GearCounts = {
    dumbbells: o.equipment.includes("dumbbells") ? profile.dumbbell_pairs : null,
    kettlebells: o.equipment.includes("kettlebells") ? profile.kettlebell_pairs : null,
  };
  const v = volumeFor(o.week ?? 0, goals);
  const timed = o.vibe !== "strength";
  const warmup = shape === "main" ? [] : pickWarmup(warmups, { cardio: !o.skipCardioWarmup });
  const warmIds = new Set(warmup.map((e) => e.id));
  const candidates = pool.filter((e) => !warmIds.has(e.id) && !WARMUP.test(e.name) && !STRETCH.test(e.name) && (o.level === undefined || fitsLevel(e, o.level)));
  const coolN = shape === "main" ? 0 : cooldownCount(goals);
  const count = mainCount(o.minutes, {
    sets: v.sets, reps: timed ? null : v.reps, durationSec: timed ? v.durationSec : null, rest: restFor(goals), pace: signals.pace,
    bias: signals.bias - (profile.conditioning === "low" ? 1 : 0),
    warmCoolSec: shape === "main" ? 0 : warmCoolSeconds(warmup.map((e) => e.name), coolN, o.minutes),
    min: o.minutes < 15 ? 1 : 2,
  });
  // One muscle: several different exercises for it, not one per muscle.
  const main = single
    ? pickPreferring(candidates.filter((e) => e.images.length && usableWithGear(e, counts)), count, [])
    : pickMain(candidates, count, order, counts, o.core, o.minutes);
  const muscles = main.flatMap((e) => e.muscles);
  const cooldown = shape === "main" ? [] : pickPreferring(stretches.filter((e) => STRETCH.test(e.name) && !warmup.some((w) => w.id === e.id)), coolN, muscles);

  const progress = progressFor(intensity, o.vibe, goals, signals.bias);
  const owned = profile.owned_weights ?? [];
  const rows = [
    ...warmup.map((e) => [e, "warmup" as const, 1, null, warmupSeconds(e.name, o.minutes)] as const),
    ...main.map((e) => [e, "main" as const, v.sets, timed ? null : v.reps, timed ? v.durationSec : null] as const),
    ...cooldown.map((e) => [e, "cooldown" as const, 1, null, 30] as const),
  ].map(([e, phase, sets, reps, dur], i) => {
    const built = row(e, i, phase, sets, reps, dur);
    if (phase !== "main") return built;
    const h = past.get(exerciseKey({ exercise_id: e.id, name: e.name }));
    const chosen = chosenWork(h);
    const weighted = needsWeight(e.category);
    const tip = weighted ? suggestWeight(h ?? [], chosen.reps ?? reps, progress, e.category, owned) : null;
    return { ...built, reps: reps != null && chosen.reps ? chosen.reps : reps, weight_kg: weighted ? tip?.kg ?? chosen.kg ?? null : null };
  });

  return { ...base, name: `${vibeLabel(o.vibe)} · ${partsTitle(parts)}`, muscle_groups: main.map((e) => e.muscles[0]), template_exercises: rows };
}

const timedRow = (name: string, minutes: number): Row => ({
  id: "quick-timed", template_id: "", exercise_id: null, exercise: null, custom_name: name, position: 0, notes: null, weight_kg: null, phase: "main", sets: 1, reps: null, duration_sec: minutes * 60,
});

/** Warm-up, the bigger share, the smaller share, cool-down. */
function assemble(larger: Row[], smaller: Row[]): Row[] {
  const all = [...larger, ...smaller];
  return [
    ...all.filter((r) => r.phase === "warmup"),
    ...larger.filter((r) => r.phase === "main"),
    ...smaller.filter((r) => r.phase === "main"),
    ...all.filter((r) => r.phase === "cooldown"),
  ].map((r, i) => ({ ...r, id: `quick-${i}`, position: i }));
}

/** One session that mixes two vibes. The bigger share is the saved vibe. A single vibe is a normal workout. */
export async function generateMixedWorkout(profile: Profile, o: WorkoutOpts, vibes: Vibe[], pctFirst: number, history?: Map<string, LoggedSet[][]>): Promise<TemplateWithExercises> {
  if (vibes.length < 2) return generateWorkout(profile, { ...o, vibe: vibes[0] ?? o.vibe }, history);
  const [m0, m1] = splitMinutes(o.minutes, pctFirst, isTimedVibe(vibes[0]), isTimedVibe(vibes[1]));
  const parts = [{ vibe: vibes[0], minutes: m0 }, { vibe: vibes[1], minutes: m1 }];
  const larger = parts[0].minutes >= parts[1].minutes ? parts[0] : parts[1];
  const smaller = larger === parts[0] ? parts[1] : parts[0];
  const hasTimed = parts.some((p) => isTimedVibe(p.vibe));
  const frame = GENERATED_VIBES.includes(larger.vibe) ? larger : parts.find((p) => GENERATED_VIBES.includes(p.vibe));
  const block = async (p: { vibe: Vibe; minutes: number }) => {
    if (!GENERATED_VIBES.includes(p.vibe)) return [timedRow(vibeLabel(p.vibe), p.minutes)];
    const full = p === frame;
    const w = await generateWorkout(profile, { ...o, minutes: p.minutes, vibe: p.vibe, shape: full ? "full" : "main", skipCardioWarmup: hasTimed }, history);
    return full ? w.template_exercises : w.template_exercises.filter((r) => r.phase === "main");
  };
  const rows = assemble(await block(larger), await block(smaller));
  return {
    id: "", user_id: profile.id, vibe: larger.vibe, intensity: intensityFor(profile.conditioning), est_minutes: o.minutes, notes: null, created_at: "",
    name: `${vibeLabel(vibes[0])} + ${vibeLabel(vibes[1])}`,
    muscle_groups: rows.flatMap((r) => (r.exercise?.muscles[0] ? [r.exercise.muscles[0]] : [])),
    template_exercises: rows,
  };
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
      t.template_exercises.map(({ exercise_id, custom_name, position, sets, reps, duration_sec, weight_kg, phase }) => ({ template_id: data.id, exercise_id, custom_name, position, sets, reps, duration_sec, weight_kg, phase })),
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
