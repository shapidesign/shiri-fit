"use client";

import { createClient } from "@/lib/supabase/client";
import type { Exercise, ScheduledWorkout, TemplateExercise, WorkoutLog, WorkoutTemplate } from "@/lib/types";

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

export async function userId() {
  const { data } = await db().auth.getUser();
  return data.user!.id;
}
