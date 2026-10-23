"use client";

import { addWeeks, format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { useProfile } from "@/components/profile-provider";
import { IntensityPicker } from "@/components/log-workout-sheet";
import { removeCalendarEvent, syncCalendar } from "@/lib/calendar-client";
import { db, userId, type TemplateWithExercises } from "@/lib/db";
import { VIBES } from "@/lib/labels";
import type { Intensity, ScheduledWorkout, Vibe } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  date: string;                       // yyyy-MM-dd default for new
  existing?: ScheduledWorkout | null; // edit mode
  templates: TemplateWithExercises[];
};

export function ScheduleSheet({ open, onClose, onChanged, date, existing, templates }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={existing ? "עריכת אימון" : "שיבוץ אימון"}>
      {open && <Form date={date} existing={existing} templates={templates} onDone={() => { onChanged(); onClose(); }} />}
    </Sheet>
  );
}

function Form({ date, existing, templates, onDone }: Omit<Props, "open" | "onClose" | "onChanged"> & { onDone: () => void }) {
  const { profile } = useProfile();
  const first = templates[0];
  const [mode, setMode] = useState<"template" | "external">(existing ? (existing.source === "external" ? "external" : "template") : first ? "template" : "external");
  const [templateId, setTemplateId] = useState<string | null>(existing ? existing.template_id : first?.id ?? null);
  const [title, setTitle] = useState(existing?.title ?? first?.name ?? "");
  const [vibe, setVibe] = useState<Vibe>(existing?.vibe ?? first?.vibe ?? "strength");
  const [intensity, setIntensity] = useState<Intensity>(existing?.intensity ?? first?.intensity ?? "moderate");
  const [day, setDay] = useState(existing?.date ?? date);
  const [time, setTime] = useState(existing?.time?.slice(0, 5) ?? "08:00");
  const [duration, setDuration] = useState(existing?.duration_min ?? first?.est_minutes ?? 60);
  const [weeks, setWeeks] = useState(1);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  function pickTemplate(t: TemplateWithExercises) {
    setTemplateId(t.id); setTitle(t.name); setVibe(t.vibe); setIntensity(t.intensity); setDuration(t.est_minutes);
  }

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const supabase = db();
    const base = {
      title: title.trim(), vibe, intensity, time, duration_min: duration, notes: notes || null,
      source: mode === "template" ? ("app" as const) : ("external" as const),
      template_id: mode === "template" ? templateId : null,
    };

    if (existing) {
      const { error } = await supabase.from("scheduled_workouts").update({ ...base, date: day }).eq("id", existing.id);
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
      if (profile.calendar_sync) void syncCalendar("scheduled", existing.id);
    } else {
      const uid = await userId();
      const series = weeks > 1 ? crypto.randomUUID() : null;
      const rows = Array.from({ length: weeks }, (_, i) => ({
        ...base, user_id: uid, date: format(addWeeks(new Date(day), i), "yyyy-MM-dd"), series_id: series,
      }));
      const { data, error } = await supabase.from("scheduled_workouts").insert(rows).select("id");
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
      if (profile.calendar_sync) data?.forEach((r) => void syncCalendar("scheduled", r.id));
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
      <div role="tablist" className="grid grid-cols-2 rounded-2xl bg-surface p-1">
        {([["template", "מתבנית"], ["external", "אימון חיצוני"]] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={`h-10 rounded-xl text-sm font-semibold ${mode === id ? "bg-surface-2 shadow-sm" : "text-muted"}`}>{label}</button>
        ))}
      </div>

      {mode === "template" ? (
        templates.length === 0 ? (
          <p className="rounded-2xl bg-accent-soft px-4 py-3 text-sm">עוד אין תבניות. אפשר לשבץ אימון חיצוני, או ליצור תבנית בטאב ״אימונים״.</p>
        ) : (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {templates.map((t) => <Chip key={t.id} selected={templateId === t.id} onClick={() => pickTemplate(t)}>{t.name}</Chip>)}
          </div>
        )
      ) : (
        <>
          <Field label="שם" name="ext_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="פילאטיס מכשירים / פיזיותרפיה" />
          <ChipRow>{VIBES.map((v) => <Chip key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Chip>)}</ChipRow>
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="תאריך" name="date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        <Field label="שעה" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <Stepper label="משך" value={duration} onChange={setDuration} min={10} max={240} step={5} suffix="דק׳" />
      <IntensityPicker value={intensity} onChange={setIntensity} />
      {!existing && <Stepper label="לשבץ לכמה שבועות" value={weeks} onChange={setWeeks} min={1} max={12} suffix={weeks === 1 ? "שבוע" : "שבועות"} />}
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
