"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { EquipmentPicker, equipmentValid, persistPairs } from "@/components/equipment-picker";
import { ReminderPrompt } from "@/components/reminder-prompt";
import { useProfile } from "@/components/profile-provider";
import { syncCalendar } from "@/lib/calendar-client";
import { celebrate } from "@/lib/celebrate";
import { db, defaultWorkoutOpts, generateWorkout, saveGeneratedTemplate, userId } from "@/lib/db";
import { g, VIBES } from "@/lib/labels";
import type { Vibe } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Preset date (yyyy-MM-dd) opens in "schedule" mode. */
  date?: string;
  onScheduled?: () => void;
  /** Shown as a link for studio classes etc. */
  onExternal?: () => void;
};

/** Single workout: how much time, what kind, which equipment — then start now or schedule it. */
export function NewWorkoutSheet({ open, onClose, date, onScheduled, onExternal }: Props) {
  const [remind, setRemind] = useState(false);
  return (
    <>
      <Sheet open={open} onClose={onClose} title="אימון בודד">
        {open && <Form date={date} onStart={onClose} onExternal={onExternal && (() => { onClose(); onExternal(); })} onScheduled={() => { onClose(); onScheduled?.(); void celebrate("האימון שובץ").then(() => setRemind(true)); }} />}
      </Sheet>
      <ReminderPrompt open={remind} onClose={() => setRemind(false)} />
    </>
  );
}

function Form({ date, onStart, onScheduled, onExternal }: { date?: string; onStart: () => void; onScheduled: () => void; onExternal?: () => void }) {
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const d = defaultWorkoutOpts(profile);
  const [minutes, setMinutes] = useState(d.minutes);
  const [vibe, setVibe] = useState<Vibe>(d.vibe);
  const [equipment, setEquipment] = useState(d.equipment);
  const [pairs, setPairs] = useState(profile.dumbbell_pairs);
  const [later, setLater] = useState(!!date);
  const [day, setDay] = useState(date ?? format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("08:00");
  const [saving, setSaving] = useState(false);

  async function go() {
    setSaving(true);
    await persistPairs(profile, setProfile, pairs);
    if (!later) {
      router.push(`/session?quick=1&min=${minutes}&vibe=${vibe}&eq=${equipment.join(",")}`);
      return onStart();
    }
    try {
      const t = await generateWorkout({ ...profile, dumbbell_pairs: pairs }, { minutes, vibe, equipment });
      const templateId = t.template_exercises.length ? await saveGeneratedTemplate(t) : null;
      const { data, error } = await db().from("scheduled_workouts").insert({
        user_id: await userId(), date: day, time, title: t.name, vibe, intensity: t.intensity, duration_min: minutes, source: "app", template_id: templateId,
      }).select("id").single();
      if (error || !data) throw error;
      if (profile.calendar_sync) void syncCalendar("scheduled", data.id);
      onScheduled();
    } catch {
      setSaving(false);
      alert("השמירה נכשלה");
    }
  }

  return (
    <div className="space-y-5">
      <Stepper label="כמה זמן יש לך?" value={minutes} onChange={setMinutes} min={10} max={120} step={5} suffix="דק׳" />
      <div>
        <p className="mb-2 text-sm font-semibold">איזה אימון?</p>
        <ChipRow>{VIBES.filter((v) => v.id !== "other").map((v) => <Chip key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Chip>)}</ChipRow>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">איזה ציוד יש לך עכשיו?</p>
        <EquipmentPicker equipment={equipment} onEquipment={setEquipment} pairs={pairs} onPairs={setPairs} />
      </div>
      <div role="tablist" className="grid grid-cols-2 rounded-2xl bg-surface p-1">
        {([[false, "עכשיו"], [true, "לשבץ"]] as const).map(([id, label]) => (
          <button key={label} role="tab" aria-selected={later === id} onClick={() => setLater(id)} className={`h-10 rounded-xl text-sm font-semibold ${later === id ? "bg-surface-2 shadow-sm" : "text-muted"}`}>{label}</button>
        ))}
      </div>
      {later && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="תאריך" name="date" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          <Field label="שעה" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      )}
      <Button size="lg" className="w-full" loading={saving} disabled={!equipmentValid(equipment, pairs)} onClick={go}>
        {later ? "שיבוץ" : g(profile.gender, "סדרי לי אימון", "סדר לי אימון")}
      </Button>
      {onExternal && <button type="button" onClick={onExternal} className="w-full text-center text-sm font-semibold text-muted underline">אימון חיצוני (סטודיו, חוג, פיזיו)</button>}
    </div>
  );
}
