"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { CoreQuestion, EquipmentPicker, equipmentValid, persistGear } from "@/components/equipment-picker";
import { ReminderPrompt } from "@/components/reminder-prompt";
import { useProfile } from "@/components/profile-provider";
import { syncCalendar } from "@/lib/calendar-client";
import { celebrate } from "@/lib/celebrate";
import { replaceDraft } from "@/lib/active-session";
import { db, defaultWorkoutOpts, generateWorkout, saveGeneratedTemplate, userId } from "@/lib/db";
import { FOCUS_LABEL, GENERATED_VIBES } from "@/lib/generate";
import { experienceLevel, g, MUSCLES, VIBES } from "@/lib/labels";
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
  const [kbPairs, setKbPairs] = useState(profile.kettlebell_pairs);
  const [later, setLater] = useState(!!date);
  const [day, setDay] = useState(date ?? format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("08:00");
  const [saving, setSaving] = useState(false);

  const [parts, setParts] = useState<string[]>(["full"]);
  const [core, setCore] = useState<boolean | null>(null);
  const togglePart = (id: string) => setParts((cur) => {
    if (id === "full") return ["full"];
    const next = cur.filter((x) => x !== "full" && x !== id);
    if (!cur.includes(id)) return [...next, id];
    return next.length ? next : ["full"];
  });
  const askCore = GENERATED_VIBES.includes(vibe) && parts.some((p) => p === "full" || p === "upper" || p === "lower");

  async function go() {
    setSaving(true);
    try {
      await persistGear(profile, setProfile, { dumbbell_pairs: pairs, kettlebell_pairs: kbPairs });
      const level = experienceLevel(profile.training_experience);
      const who = { ...profile, dumbbell_pairs: pairs, kettlebell_pairs: kbPairs };
      const opts = { minutes, vibe, equipment, muscles: parts, ...(level !== undefined ? { level } : {}), ...(askCore && core !== null ? { core } : {}) };
      const t = await generateWorkout(who, opts);
      const templateId = t.template_exercises.length ? await saveGeneratedTemplate(t) : null;
      if (!later) {
        const href = templateId
          ? `/session?template=${templateId}`
          : `/session?quick=1&min=${minutes}&vibe=${vibe}&eq=${equipment.join(",")}&parts=${encodeURIComponent(parts.join(","))}${askCore && core !== null ? `&core=${core ? 1 : 0}` : ""}`;
        await replaceDraft(profile.id, { templateId, scheduledId: null, title: t.name, href, sets: {} });
        router.push(href);
        return onStart();
      }
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
        <p className="mb-2 text-sm font-semibold">על מה עובדים?</p>
        <ChipRow>
          {[...(["full", "upper", "lower"] as const).map((id) => ({ id, label: FOCUS_LABEL[id] })), ...MUSCLES.filter((m) => m.id !== "full body")].map((m) => (
            <Chip key={m.id} selected={parts.includes(m.id)} onClick={() => togglePart(m.id)}>{m.label}</Chip>
          ))}
        </ChipRow>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">איזה ציוד יש לך עכשיו?</p>
        <EquipmentPicker equipment={equipment} onEquipment={setEquipment} pairs={pairs} onPairs={setPairs} kbPairs={kbPairs} onKbPairs={setKbPairs} />
      </div>
      {askCore && <CoreQuestion value={core} onChange={setCore} />}
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
      <Button size="lg" className="w-full" loading={saving} disabled={!equipmentValid(equipment, pairs, kbPairs) || (askCore && core === null)} onClick={go}>
        {later ? "שיבוץ" : g(profile.gender, "סדרי לי אימון", "סדר לי אימון")}
      </Button>
      {onExternal && <button type="button" onClick={onExternal} className="w-full text-center text-sm font-semibold text-muted underline">אימון חיצוני (סטודיו, חוג, פיזיו)</button>}
    </div>
  );
}
