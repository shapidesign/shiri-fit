"use client";

import { addWeeks, format } from "date-fns";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SwapSheet } from "@/components/swap-sheet";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useProfile } from "@/components/profile-provider";
import { IntensityPicker } from "@/components/log-workout-sheet";
import { removeCalendarEvent, syncCalendar } from "@/lib/calendar-client";
import { celebrate } from "@/lib/celebrate";
import { db, getTemplate, swapTemplateExercise, userId, type TemplateWithExercises } from "@/lib/db";
import { muscleLabel, PHASE_LABEL, VIBES } from "@/lib/labels";
import type { Exercise, Intensity, ScheduledWorkout, Vibe } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  date: string;                       // yyyy-MM-dd default for new
  existing?: ScheduledWorkout | null; // edit mode
};

export function ScheduleSheet({ open, onClose, onChanged, date, existing }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={existing ? "עריכת אימון" : "אימון חיצוני"}>
      {open && <Form date={date} existing={existing} onDone={() => { onChanged(); onClose(); }} />}
    </Sheet>
  );
}

/** Edits any scheduled workout; creates only external ones (app workouts come from NewWorkoutSheet / the plan wizard). */
function Form({ date, existing, onDone }: Omit<Props, "open" | "onClose" | "onChanged"> & { onDone: () => void }) {
  const { profile } = useProfile();
  const external = !existing || existing.source === "external";
  const [title, setTitle] = useState(existing?.title ?? "");
  const [vibe, setVibe] = useState<Vibe>(existing?.vibe ?? "pilates");
  const [intensity, setIntensity] = useState<Intensity>(existing?.intensity ?? "moderate");
  const [day, setDay] = useState(existing?.date ?? date);
  const [time, setTime] = useState(existing?.time?.slice(0, 5) ?? "08:00");
  const [duration, setDuration] = useState(existing?.duration_min ?? 60);
  const [weeks, setWeeks] = useState(1);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = db();
    const base = { title: title.trim(), vibe, intensity, time, duration_min: duration, notes: notes || null };

    if (existing) {
      const { error } = await supabase.from("scheduled_workouts").update({ ...base, date: day }).eq("id", existing.id);
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
      if (profile.calendar_sync) void syncCalendar("scheduled", existing.id);
    } else {
      const uid = await userId();
      const series = weeks > 1 ? crypto.randomUUID() : null;
      const rows = Array.from({ length: weeks }, (_, i) => ({
        ...base, source: "external" as const, user_id: uid, date: format(addWeeks(new Date(day), i), "yyyy-MM-dd"), series_id: series,
      }));
      const { data, error } = await supabase.from("scheduled_workouts").insert(rows).select("id");
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
      if (profile.calendar_sync) data?.forEach((r) => void syncCalendar("scheduled", r.id));
      void celebrate("האימון שובץ");
    }
    setSaving(false);
    onDone();
  }

  async function remove(series: boolean) {
    if (!existing) return;
    if (!confirm(series ? "למחוק את כל הסדרה השבועית?" : "למחוק את האימון הזה?")) return;
    const supabase = db();
    const q = series && existing.series_id
      ? supabase.from("scheduled_workouts").select("id, google_event_id").eq("series_id", existing.series_id).gte("date", existing.date)
      : supabase.from("scheduled_workouts").select("id, google_event_id").eq("id", existing.id);
    const { data, error } = await q;
    if (error || !data?.length) return alert("המחיקה נכשלה");
    const { error: delErr } = await supabase.from("scheduled_workouts").delete().in("id", data.map((r) => r.id));
    if (delErr) return alert("המחיקה נכשלה");
    data?.forEach((r) => void removeCalendarEvent(r.google_event_id));
    onDone();
  }

  return (
    <div className="space-y-4">
      <Field label="שם" name="ext_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="פילאטיס מכשירים / פיזיותרפיה" />
      {external && <ChipRow>{VIBES.map((v) => <Chip key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Chip>)}</ChipRow>}

      <div className="grid grid-cols-2 gap-3">
        <Field label="תאריך" name="date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <Field label="שעה" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Stepper label="משך" value={duration} onChange={setDuration} min={10} max={240} step={5} suffix="דק׳" />
      <IntensityPicker value={intensity} onChange={setIntensity} />
      {!existing && <Stepper label="לשבץ לכמה שבועות" value={weeks} onChange={setWeeks} min={1} max={12} suffix={weeks === 1 ? "שבוע" : "שבועות"} />}
      {existing?.template_id && <TemplateExercises templateId={existing.template_id} />}
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">הערות</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-12 w-full rounded-2xl border border-border bg-surface-2 px-4 outline-none" />
      </label>

      <div className="flex gap-2">
        {existing && (
          <>
            <Button variant="danger" onClick={() => remove(false)} aria-label="מחיקה"><Trash2 className="h-5 w-5" /></Button>
            {existing.series_id && <Button variant="danger" onClick={() => remove(true)}>כל הסדרה</Button>}
          </>
        )}
        <Button size="lg" className="flex-1" loading={saving} disabled={!title.trim()} onClick={save}>{existing ? "שמירה" : "שיבוץ"}</Button>
      </div>
    </div>
  );
}

/** The planned workout's exercises; each swaps for another one for the same muscle (saved right away). */
function TemplateExercises({ templateId }: { templateId: string }) {
  const [rows, setRows] = useState<TemplateWithExercises["template_exercises"] | null>(null);
  const [swapping, setSwapping] = useState<TemplateWithExercises["template_exercises"][number] | null>(null);
  useEffect(() => { getTemplate(templateId).then((t) => setRows(t?.template_exercises ?? [])); }, [templateId]);

  async function swap(e: Exercise) {
    const r = swapping!;
    setSwapping(null);
    const { error } = await swapTemplateExercise(r.id, e.id);
    if (error) return alert("השמירה נכשלה");
    setRows((rs) => rs!.map((x) => (x.id === r.id ? { ...x, exercise_id: e.id, exercise: e } : x)));
  }

  if (!rows) return <div className="h-24 animate-pulse rounded-2xl bg-surface" />;
  if (!rows.length) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">תרגילים</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{r.exercise ? r.exercise.name_he ?? r.exercise.name : r.custom_name}</span>
              <span className="block text-xs text-muted">{PHASE_LABEL[r.phase]}{r.exercise?.muscles[0] ? ` · ${muscleLabel(r.exercise.muscles[0])}` : ""}</span>
            </span>
            {r.exercise && (
              <button type="button" onClick={() => setSwapping(r)} aria-label="החלפה" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 active:scale-95">
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <SwapSheet
        exercise={swapping?.exercise ?? null}
        phase={swapping?.phase ?? "main"}
        exclude={rows.flatMap((r) => (r.exercise ? [r.exercise.id] : []))}
        onClose={() => setSwapping(null)}
        onSwap={swap}
      />
    </div>
  );
}
