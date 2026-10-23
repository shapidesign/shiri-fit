"use client";

import { format } from "date-fns";
import { Flame } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useProfile } from "@/components/profile-provider";
import { syncCalendar } from "@/lib/calendar-client";
import { db, userId } from "@/lib/db";
import { INTENSITIES, VIBES } from "@/lib/labels";
import { estimateCalories } from "@/lib/met";
import type { ExerciseDone, Intensity, ScheduledWorkout, Vibe, WorkoutLog } from "@/lib/types";

type Session = { title: string; vibe: Vibe; intensity: Intensity; minutes: number; exercises: ExerciseDone[]; templateId?: string | null };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (log: WorkoutLog) => void;
  /** Completing a planned workout: prefill + mark it done. */
  scheduled?: ScheduledWorkout | null;
  /** Prefill from an active session (exercises ticked, elapsed minutes). */
  session?: Session | null;
};

export function LogWorkoutSheet({ open, onClose, onSaved, scheduled, session }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={scheduled ? "סיימת? כל הכבוד" : "תיעוד אימון"}>
      {open && <Form scheduled={scheduled} session={session} onSaved={(l) => { onSaved(l); onClose(); }} />}
    </Sheet>
  );
}

function Form({ scheduled, session, onSaved }: { scheduled?: ScheduledWorkout | null; session?: Session | null; onSaved: (l: WorkoutLog) => void }) {
  const { profile } = useProfile();
  const src = session ?? scheduled;
  const [title, setTitle] = useState(src?.title ?? "");
  const [vibe, setVibe] = useState<Vibe>(src?.vibe ?? (profile.vibes[0] as Vibe) ?? "strength");
  const [intensity, setIntensity] = useState<Intensity>(src?.intensity ?? "moderate");
  const [minutes, setMinutes] = useState(session?.minutes ?? scheduled?.duration_min ?? 45);
  const [when, setWhen] = useState(() => {
    const planned = scheduled ? new Date(`${scheduled.date}T${scheduled.time?.slice(0, 5) ?? "08:00"}`) : null;
    return format(planned && planned < new Date() ? planned : new Date(), "yyyy-MM-dd'T'HH:mm");
  });
  const [external, setExternal] = useState(scheduled?.source === "external");
  const [notes, setNotes] = useState("");
  const [kcalOverride, setKcalOverride] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const kcal = useMemo(() => estimateCalories({ vibe, intensity, minutes, weightKg: profile.weight_kg }), [vibe, intensity, minutes, profile.weight_kg]);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = db();
    const { data, error } = await supabase
      .from("workout_logs")
      .insert({
        user_id: await userId(),
        scheduled_id: scheduled?.id ?? null,
        template_id: session?.templateId ?? scheduled?.template_id ?? null,
        title: title.trim(),
        performed_at: new Date(when).toISOString(),
        duration_min: minutes,
        vibe,
        intensity,
        calories: kcalOverride ?? kcal,
        is_external: external,
        exercises_done: session?.exercises ?? [],
        notes: notes || null,
      })
      .select("*")
      .single();
    if (error || !data) { setSaving(false); return alert("השמירה נכשלה"); }
    if (scheduled) await supabase.from("scheduled_workouts").update({ status: "done" }).eq("id", scheduled.id);
    // Planned workouts already have a calendar event; spontaneous ones get a retroactive one.
    if (!scheduled && profile.calendar_sync) void syncCalendar("log", data.id);
    onSaved(data as WorkoutLog);
  }

  return (
    <div className="space-y-4">
      <Field label="מה עשית?" name="log_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: פילאטיס בסטודיו" />
      <div>
        <p className="mb-2 text-sm font-semibold">סוג</p>
        <ChipRow>{VIBES.map((v) => <Chip key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Chip>)}</ChipRow>
      </div>
      <IntensityPicker value={intensity} onChange={setIntensity} label="כמה היה קשה?" />
      <Stepper label="משך" value={minutes} onChange={setMinutes} min={5} max={300} step={5} suffix="דק׳" />
      <Field label="מתי" name="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />

      <div className="flex items-center justify-between rounded-2xl bg-accent-soft px-4 py-3">
        <span className="flex items-center gap-2 font-semibold"><Flame className="h-5 w-5" aria-hidden /> שריפה משוערת</span>
        <span className="flex items-center gap-1">
          <input type="number" inputMode="numeric" aria-label="קלוריות" value={kcalOverride ?? kcal} onChange={(e) => setKcalOverride(Number(e.target.value))} className="h-9 w-20 rounded-lg bg-surface-2 text-center text-lg font-bold tabular-nums outline-none" />
          <span className="text-sm text-muted">קק״ל</span>
        </span>
      </div>

      <label className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3">
        <span className="text-sm font-semibold">אימון חיצוני (סטודיו / קופ״ח)</span>
        <input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">הערות</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 outline-none" />
      </label>

      <Button size="lg" className="w-full" loading={saving} disabled={!title.trim()} onClick={save}>שמירת האימון</Button>
    </div>
  );
}

export function IntensityPicker({ value, onChange, label = "עצימות" }: { value: Intensity; onChange: (i: Intensity) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        {INTENSITIES.map((i) => (
          <button key={i.id} type="button" aria-pressed={value === i.id} onClick={() => onChange(i.id)} className={`h-9 rounded-lg px-3 text-sm font-semibold ${value === i.id ? "bg-accent text-accent-ink" : "text-muted"}`}>{i.label}</button>
        ))}
      </div>
    </div>
  );
}
