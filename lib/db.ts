"use client";

import { createClient } from "@/lib/supabase/client";
import type { LoggedSet } from "@/lib/progression";
import type { Exercise, Profile, ScheduledWorkout, TemplateExercise, Vibe, WorkoutLog, WorkoutTemplate } from "@/lib/types";

export const db = () => createClient();

export type TemplateWithExercises = WorkoutTemplate & { template_exercises: (TemplateExercise & { exercise: Exercise | null })[] };

export async function listTemplates(): Promise<TemplateWithExercises[]> {
  const { data } = await db()
    .from("workout_templates")
    .select("*, template_exercises(*, exercise:exercises(*))")
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "template_exercises" });
  return (data ?? []) as unknown as TemplateWithExercises[];
}

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
  if (opts.q) query = query.or(`name.ilike.%${opts.q}%,name_he.ilike.%${opts.q}%`);
  if (opts.muscles?.length) query = query.overlaps("muscles", opts.muscles);
  if (opts.categories?.length) query = query.in("category", opts.categories);
  // MuscleWiki rows (with video) first, then by name
  const { data } = await query.order("source", { ascending: false }).order("name");
  return (data ?? []) as Exercise[];
}

export async function scheduleBetween(from: string, to: string): Promise<ScheduledWorkout[]> {
  const { data } = await db().from("scheduled_workouts").select("*").gte("date", from).lte("date", to).order("date").order("time");
  return (data ?? []) as ScheduledWorkout[];
}

export async function logsBetween(fromIso: string, toIso: string): Promise<WorkoutLog[]> {
  const { data } = await db().from("workout_logs").select("*").gte("performed_at", fromIso).lte("performed_at", toIso).order("performed_at", { ascending: false });
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

const QUICK_VIBES: Vibe[] = ["strength", "pilates", "yoga", "hiit", "stretch"];

/** "Set me up now": an unsaved template of 6 exercises, one per main muscle, using only the user's equipment. */
export async function quickWorkout(profile: Profile): Promise<TemplateWithExercises> {
  const vibe = (profile.vibes.find((v) => QUICK_VIBES.includes(v as Vibe)) ?? "strength") as Vibe;
  const timed = vibe !== "strength";
  const pool = await searchExercises({ categories: [...new Set(["bodyweight", ...profile.equipment])], limit: 300 });
  const seen = new Set<string>();
  // ponytail: random shuffle + first-per-muscle; no balancing of push/pull or difficulty.
  const picked = pool
    .filter((e) => e.images.length)
    .sort(() => Math.random() - 0.5)
    .filter((e) => e.muscles[0] && !seen.has(e.muscles[0]) && seen.add(e.muscles[0]))
    .slice(0, 6);
  return {
    id: "", user_id: profile.id, name: "אימון מהיר", vibe, intensity: "moderate", est_minutes: 60, notes: null, created_at: "",
    muscle_groups: picked.map((e) => e.muscles[0]),
    template_exercises: picked.map((e, i) => ({
      id: `quick-${i}`, template_id: "", exercise_id: e.id, exercise: e, custom_name: null, position: i, notes: null, weight_kg: null,
      sets: timed ? 2 : 3, reps: timed ? null : 12, duration_sec: timed ? 45 : null,
    })),
  };
}

export async function userId() {
  const { data } = await db().auth.getUser();
  return data.user!.id;
}
