"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/chip";
import { DateField, Field, Stepper } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { EquipmentPicker, GearCheck, equipmentValid, persistGear } from "@/components/equipment-picker";
import { ReminderPrompt } from "@/components/reminder-prompt";
import { useProfile } from "@/components/profile-provider";
import { syncCalendar } from "@/lib/calendar-client";
import { celebrate } from "@/lib/celebrate";
import { replaceDraft } from "@/lib/active-session";
import { db, defaultWorkoutOpts, generateWorkout, saveGeneratedTemplate, userId } from "@/lib/db";
import { FOCUS_LABEL, GENERATED_VIBES, type Focus } from "@/lib/generate";
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

type Extra = "core" | "cardio" | "both" | "none";

const UPPER = ["chest", "shoulders", "biceps", "triceps", "lats", "traps"];
const LOWER = ["glutes", "quads", "hamstrings", "calves", "adductors", "abductors"];

/** Single workout: one question per card, then start now or schedule it. */
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
  const [stepId, setStepId] = useState("vibe");
  const [minutes, setMinutes] = useState(d.minutes);
  const [vibe, setVibe] = useState<Vibe>(d.vibe);
  const [region, setRegion] = useState<Focus | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState(d.equipment);
  const [pairs, setPairs] = useState(profile.dumbbell_pairs);
  const [kbPairs, setKbPairs] = useState(profile.kettlebell_pairs);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [later, setLater] = useState(!!date);
  const [day, setDay] = useState(date ?? format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("08:00");
  const [saving, setSaving] = useState(false);

  const generated = GENERATED_VIBES.includes(vibe);
  const focus = muscle ? undefined : region ?? undefined;
  const target = muscle ?? region ?? undefined;
  const muscles = region === "upper" ? UPPER : region === "lower" ? LOWER : [];

  const steps = [
    {
      id: "vibe", title: "איזה אימון?", sub: "בחירה אחת.", valid: true,
      body: <div className="grid grid-cols-2 gap-2">{VIBES.filter((v) => v.id !== "other").map((v) => <Choice key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Choice>)}</div>,
    },
    ...(generated ? [{
      id: "target", title: "על מה עובדים?", sub: "קודם האזור. שריר אחד רק אם בא.", valid: region !== null,
      body: (
        <div className="space-y-4">
          <div className="grid gap-2">
            {(["full", "upper", "lower"] as const).map((id) => (
              <Choice key={id} selected={region === id} onClick={() => { setRegion(id); setMuscle(null); }}>{FOCUS_LABEL[id]}</Choice>
            ))}
          </div>
          {muscles.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-muted">או שריר אחד</p>
              <div className="grid grid-cols-2 gap-2">
                {muscles.map((id) => (
                  <Choice key={id} selected={muscle === id} onClick={() => { setRegion(region); setMuscle(id); }}>{MUSCLES.find((m) => m.id === id)?.label}</Choice>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    }] : []),
    {
      id: "gear", title: "מה יש במכון?", sub: "רק מה שפנוי עכשיו. זה מסדר את התרגילים.", valid: equipmentValid(equipment, pairs, kbPairs),
      body: <EquipmentPicker equipment={equipment} onEquipment={setEquipment} pairs={pairs} onPairs={setPairs} kbPairs={kbPairs} onKbPairs={setKbPairs} />,
    },
    {
      id: "check", title: "רגע על הציוד", sub: "אפשר להוסיף ולהמשיך.", valid: true,
      body: <GearCheck vibe={vibe} target={target} equipment={equipment} onAdd={(id) => setEquipment((e) => (e.includes(id) ? e : [...e, id]))} />,
    },
    ...(generated ? [{
      id: "extra", title: "להוסיף משהו בהתחלה?", sub: "בטן, אירובי, שניהם, או בלי.", valid: extra !== null,
      body: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([["core", "בטן"], ["cardio", "אירובי"], ["both", "שניהם"], ["none", "בלי"]] as const).map(([id, label]) => (
              <Choice key={id} selected={extra === id} onClick={() => setExtra(id)}>{label}</Choice>
            ))}
          </div>
          {(extra === "cardio" || extra === "both") && !equipment.some((id) => id === "bike" || id === "treadmill" || id === "elliptical" || id === "stairmaster") && (
            <p className="text-sm text-muted">אין מכונת אירובי מסומנת, אז החימום יהיה במשקל גוף.</p>
          )}
        </div>
      ),
    }] : []),
    { id: "time", title: "כמה זמן יש לך?", sub: "נמלא את הדקות האלה.", valid: true, body: <Stepper label="אורך אימון" value={minutes} onChange={setMinutes} min={10} max={120} step={5} suffix="דק׳" /> },
    {
      id: "when", title: "מתי?", sub: later ? "נשבץ ונקבע תזכורת." : "אפשר להתחיל ברגע שהאימון מוכן.", valid: true,
      body: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Choice selected={!later} onClick={() => setLater(false)}>עכשיו</Choice>
            <Choice selected={later} onClick={() => setLater(true)}>לשבץ</Choice>
          </div>
          {later && (
            <div key="slot" className="ask grid grid-cols-2 gap-3">
              <DateField label="תאריך" name="date" value={day} onChange={setDay} />
              <Field label="שעה" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          )}
        </div>
      ),
    },
  ];

  const idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[idx] ?? steps[0];
  const last = idx === steps.length - 1;

  async function go() {
    setSaving(true);
    try {
      await persistGear(profile, setProfile, { equipment, dumbbell_pairs: pairs, kettlebell_pairs: kbPairs });
      const level = experienceLevel(profile.training_experience);
      const who = { ...profile, equipment, dumbbell_pairs: pairs, kettlebell_pairs: kbPairs };
      const ask = generated && extra !== null;
      const picked = muscle ? [muscle] : [region ?? "full"];
      const opts = {
        minutes, vibe, equipment, muscles: picked,
        ...(level !== undefined ? { level } : {}),
        ...(ask ? { core: extra === "core" || extra === "both", cardio: extra === "cardio" || extra === "both" } : {}),
      };
      const t = await generateWorkout(who, opts);
      const templateId = t.template_exercises.length ? await saveGeneratedTemplate(t) : null;
      if (!later) {
        const coreOn = extra === "core" || extra === "both";
        const cardioOn = extra === "cardio" || extra === "both";
        const href = templateId
          ? `/session?template=${templateId}`
          : `/session?quick=1&min=${minutes}&vibe=${vibe}&eq=${equipment.join(",")}&parts=${encodeURIComponent(picked.join(","))}${extra !== null ? `&core=${coreOn ? 1 : 0}&cardio=${cardioOn ? 1 : 0}` : ""}`;
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
    <div>
      <div className="mb-4 flex gap-1" aria-label={`שאלה ${idx + 1} מתוך ${steps.length}`}>
        {steps.map((s, i) => <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= idx ? "bg-accent" : "bg-border"}`} />)}
      </div>
      <div key={step.id} className="ask">
        <h3 className="text-2xl font-black">{step.title}</h3>
        <p className="mb-4 mt-1 text-sm text-muted">{step.sub}</p>
        {step.body}
      </div>
      {last && onExternal && <button type="button" onClick={onExternal} className="mt-6 w-full text-center text-sm font-semibold text-muted underline">אימון חיצוני (סטודיו, חוג, פיזיו)</button>}
      <div className="h-28" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-2 px-5 pt-3 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.55)] safe-bottom">
        <div className="mx-auto flex max-w-lg gap-3">
          {idx > 0 && <Button variant="secondary" onClick={() => setStepId(steps[idx - 1].id)}>חזרה</Button>}
          <Button className="flex-1" disabled={!step.valid} loading={saving} onClick={() => (last ? void go() : setStepId(steps[idx + 1].id))}>
            {last ? (later ? "שיבוץ" : g(profile.gender, "סדרי לי אימון", "סדר לי אימון")) : "הבא"}
          </Button>
        </div>
      </div>
    </div>
  );
}
