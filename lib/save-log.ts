"use client";

import { format } from "date-fns";
import { syncCalendar } from "@/lib/calendar-client";
import { db, userId } from "@/lib/db";
import { estimateCalories } from "@/lib/met";
import type { ExerciseDone, Intensity, ScheduledWorkout, Vibe, WorkoutLog } from "@/lib/types";

export type LogInput = {
  scheduled?: ScheduledWorkout | null;
  title: string;
  performedAt: Date;
  minutes: number;
  vibe: Vibe;
  intensity: Intensity;
  calories?: number;
  weightKg?: number | null;
  external?: boolean;
  exercises?: ExerciseDone[];
  notes?: string | null;
  templateId?: string | null;
  /** Unscheduled logs fill the active plan's next planned slot. */
  countForPlan?: boolean;
  calendarSync: boolean;
};

/** One place that writes a workout log: marks its planned row done, or credits the plan for an off-plan workout. */
export async function saveWorkoutLog(i: LogInput): Promise<WorkoutLog> {
  const supabase = db();
  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: await userId(),
      scheduled_id: i.scheduled?.id ?? null,
      template_id: i.templateId ?? i.scheduled?.template_id ?? null,
      title: i.title,
      performed_at: i.performedAt.toISOString(),
      duration_min: i.minutes,
      vibe: i.vibe,
      intensity: i.intensity,
      calories: i.calories ?? estimateCalories({ vibe: i.vibe, intensity: i.intensity, minutes: i.minutes, weightKg: i.weightKg }),
      is_external: i.external ?? false,
      exercises_done: i.exercises ?? [],
      notes: i.notes || null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("log insert failed");
  let log = data as WorkoutLog;

  if (i.scheduled) {
    await supabase.from("scheduled_workouts").update({ status: "done" }).eq("id", i.scheduled.id);
    return log;
  }

  const slot = i.countForPlan ? await creditPlan(log, i) : null;
  if (slot) {
    log = { ...log, scheduled_id: slot };
    if (i.calendarSync) void syncCalendar("scheduled", slot);
  } else if (i.calendarSync) {
    // Spontaneous workouts get a retroactive calendar event; credited ones reuse the plan slot's event.
    void syncCalendar("log", log.id);
  }
  return log;
}

/** Moves the active plan's next planned workout onto this log's day and marks it done off-plan. Returns its id. */
async function creditPlan(log: WorkoutLog, i: LogInput): Promise<string | null> {
  const supabase = db();
  const day = format(i.performedAt, "yyyy-MM-dd");
  const { data: plan } = await supabase.from("workout_plans").select("id").lte("starts_on", day).gte("ends_on", day).order("starts_on", { ascending: false }).limit(1).maybeSingle();
  if (!plan) return null;
  const { data: next } = await supabase
    .from("scheduled_workouts")
    .select("id, template_id")
    .eq("plan_id", plan.id)
    .eq("status", "planned")
    .gte("date", day)
    .order("date")
    .order("time")
    .limit(1)
    .maybeSingle();
  if (!next) return null;
  const { error } = await supabase.from("scheduled_workouts").update({
    date: day,
    time: format(i.performedAt, "HH:mm"),
    title: i.title,
    vibe: i.vibe,
    intensity: i.intensity,
    duration_min: i.minutes,
    template_id: i.templateId ?? next.template_id,
    status: "done",
    off_plan: true,
  }).eq("id", next.id);
  if (error) return null;
  await supabase.from("workout_logs").update({ scheduled_id: next.id }).eq("id", log.id);
  return next.id;
}
