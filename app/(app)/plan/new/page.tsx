"use client";

import { addDays, format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow, Choice } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EquipmentPicker, GearCheck, equipmentValid } from "@/components/equipment-picker";
import { ReminderPrompt } from "@/components/reminder-prompt";
import { useProfile } from "@/components/profile-provider";
import { removeCalendarEvent, syncCalendar } from "@/lib/calendar-client";
import { celebrate } from "@/lib/celebrate";
import { db, defaultWorkoutOpts, generateMixedWorkout, rememberedExerciseIds, saveGeneratedTemplate, setHistory, userId, withWeek } from "@/lib/db";
import { FOCUS_LABEL, GENERATED_VIBES, nextLevel, planDates, planFocuses, weekIndex, type Focus } from "@/lib/generate";
import { CONDITIONING, DAY_NAMES, EXPERIENCE, GOALS, OWNED_PRESETS, VIBES, experienceLevel, g } from "@/lib/labels";
import type { Profile, Vibe } from "@/lib/types";

/** Spread N training days over the week, starting Sunday. */
const spreadDays = (n: number) => [[0], [0, 3], [0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]][Math.min(7, Math.max(1, n)) - 1];

type Extra = "core" | "cardio" | "both" | "none";
type FocusMode = "rotate" | Focus;

export default function NewPlanPage() {
  const router = useRouter();
  const { profile, setProfile } = useProfile();
  const d = defaultWorkoutOpts(profile);
  const t = (f: string, m: string) => g(profile.gender, f, m);
  const [stepId, setStepId] = useState("vibe");
  const [goals, setGoals] = useState(profile.goals.length ? profile.goals.slice(0, 3) : ["consistency"]);
  const [prev, setPrev] = useState<{ level: number; target: number; done: number } | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [targetNote, setTargetNote] = useState("");
  const [weekdays, setWeekdays] = useState(spreadDays(profile.days_per_week));
  const [time, setTime] = useState("08:00");
  const [start, setStart] = useState(format(new Date(), "yyyy-MM-dd"));
  const [minutes, setMinutes] = useState(d.minutes);
  const [vibes, setVibes] = useState<Vibe[]>([d.vibe]);
  const [pct, setPct] = useState(50);
  const [focusMode, setFocusMode] = useState<FocusMode | null>(null);
  const [equipment, setEquipment] = useState(d.equipment);
  const [pairs, setPairs] = useState(profile.dumbbell_pairs);
  const [kbPairs, setKbPairs] = useState(profile.kettlebell_pairs);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [experience, setExperience] = useState(profile.training_experience);
  const [conditioning, setConditioning] = useState(profile.conditioning);
  const [owned, setOwned] = useState<number[]>((profile.owned_weights ?? []).map(Number).filter((n) => n > 0));
  const [extraKg, setExtraKg] = useState("");
  const [startNow, setStartNow] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [remind, setRemind] = useState(false);
  const [after, setAfter] = useState<string | null>(null);

  const startDate = new Date(`${start}T00:00`);
  const dates = planDates(startDate, weekdays);
  const targetWorkouts = target ?? dates.length;
  const vibe = vibes.find((v) => GENERATED_VIBES.includes(v)) ?? vibes[0];
  const generated = vibes.some((v) => GENERATED_VIBES.includes(v));
  const needsWeights = ["dumbbells", "kettlebells", "barbell", "ez-bar"].some((id) => equipment.includes(id));
  const toggleWeight = (n: number) => setOwned((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n].sort((a, b) => a - b)));
  const addWeight = () => {
    const n = Math.round(Number(extraKg) * 2) / 2;
    if (!n || n <= 0 || n > 200) return;
    setOwned((w) => (w.includes(n) ? w : [...w, n].sort((a, b) => a - b)));
    setExtraKg("");
  };

  // The latest plan that already started decides this one's level.
  useEffect(() => {
    (async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: p } = await db().from("workout_plans").select("id, level, target_workouts").lte("starts_on", today).order("starts_on", { ascending: false }).limit(1).maybeSingle();
      if (!p) return;
      const { count } = await db().from("scheduled_workouts").select("id", { count: "exact", head: true }).eq("plan_id", p.id).eq("status", "done");
      setPrev({ level: p.level, target: p.target_workouts, done: count ?? 0 });
    })();
  }, []);

  const steps = [
    {
      id: "vibe",
      title: "איזה אימון?",
      sub: "אפשר לבחור שניים ולחלק ביניהם את הזמן.",
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">{VIBES.filter((v) => v.id !== "other").map((v) => <Choice key={v.id} selected={vibes.includes(v.id)} onClick={() => setVibes((cur) => {
            if (cur.includes(v.id)) return cur.length === 1 ? cur : cur.filter((x) => x !== v.id);
            return cur.length >= 2 ? [cur[0], v.id] : [...cur, v.id];
          })}>{v.label}</Choice>)}</div>
          {vibes.length === 2 && (
            <div className="space-y-2">
              <p className="text-center text-sm font-bold">{pct}% {VIBES.find((v) => v.id === vibes[0])?.label} · {100 - pct}% {VIBES.find((v) => v.id === vibes[1])?.label}</p>
              <div dir="ltr" className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-semibold">{VIBES.find((v) => v.id === vibes[0])?.label}</span>
                <input type="range" min={20} max={80} step={10} value={100 - pct} aria-label="חלוקת הזמן בין שני סוגי האימון" onChange={(e) => setPct(100 - Number(e.target.value))} className="h-2 flex-1 accent-accent" />
                <span className="shrink-0 text-xs font-semibold">{VIBES.find((v) => v.id === vibes[1])?.label}</span>
              </div>
            </div>
          )}
        </div>
      ),
      valid: true,
    },
    ...(generated ? [{
      id: "focus",
      title: "על מה עובדים?",
      sub: "לפי הימים מחלק פלג תחתון, עליון וכל הגוף.",
      body: (
        <div className="grid gap-2">
          <Choice selected={focusMode === "rotate"} onClick={() => setFocusMode("rotate")}>לפי הימים</Choice>
          {(["lower", "upper", "full"] as const).map((id) => <Choice key={id} selected={focusMode === id} onClick={() => setFocusMode(id)}>{FOCUS_LABEL[id]}</Choice>)}
        </div>
      ),
      valid: focusMode !== null,
    }] : []),
    {
      id: "gear",
      title: "מה יש במכון?",
      sub: "נבחר רק תרגילים שאפשר לעשות עם מה שפנוי.",
      body: <EquipmentPicker equipment={equipment} onEquipment={setEquipment} pairs={pairs} onPairs={setPairs} kbPairs={kbPairs} onKbPairs={setKbPairs} />,
      valid: equipmentValid(equipment, pairs, kbPairs),
    },
    {
      id: "check",
      title: "רגע על הציוד",
      sub: "אפשר להוסיף ולהמשיך.",
      body: <GearCheck vibe={vibe} target={focusMode && focusMode !== "rotate" ? focusMode : "full"} equipment={equipment} onAdd={(id) => setEquipment((e) => (e.includes(id) ? e : [...e, id]))} />,
      valid: true,
    },
    ...(generated ? [{
      id: "extra",
      title: "להוסיף משהו בהתחלה?",
      sub: "בטן, אירובי, שניהם, או בלי. אותו דבר בכל אימון בסדרה.",
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
      valid: extra !== null,
    }] : []),
    {
      id: "time",
      title: "כמה זמן יש לך?",
      sub: "כל אימון בסדרה באותו אורך.",
      body: <Stepper label="אורך אימון" value={minutes} onChange={setMinutes} min={10} max={120} step={5} suffix="דק׳" />,
      valid: true,
    },
    {
      id: "goals",
      title: "מה המטרות שלך החודש?",
      sub: "עד 3 מטרות. הראשונה קובעת את מספר החזרות.",
      body: (
        <ChipRow>
          {GOALS.map((x) => {
            const on = goals.includes(x.id);
            return <Chip key={x.id} selected={on} disabled={!on && goals.length >= 3} onClick={() => setGoals((s) => (on ? s.filter((y) => y !== x.id) : [...s, x.id]))}>{x.label}</Chip>;
          })}
        </ChipRow>
      ),
      valid: goals.length > 0,
    },
    {
      id: "days",
      title: "באילו ימים?",
      sub: `${dates.length} אימונים ב-4 שבועות.`,
      body: (
        <div role="group" aria-label="ימי אימון" className="grid grid-cols-7 gap-1.5">
          {DAY_NAMES.map((n, i) => (
            <button key={n} type="button" aria-pressed={weekdays.includes(i)} onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i]))} className={`h-14 rounded-2xl border text-sm font-bold transition-transform duration-150 active:scale-95 ${weekdays.includes(i) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2"}`}>{n}</button>
          ))}
        </div>
      ),
      valid: weekdays.length > 0,
    },
    {
      id: "slot",
      title: "מתי בלוח?",
      sub: "תאריך התחלה ושעה קבועה.",
      body: (
        <div className="grid grid-cols-2 gap-3">
          <Field label="מתחילים ב" name="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <Field label="שעה" name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      ),
      valid: !!start,
    },
    {
      id: "experience",
      title: t("כמה זמן את מתאמנת?", "כמה זמן אתה מתאמן?"),
      sub: prev ? `בחודש שעבר השלמת ${prev.done}/${prev.target}.` : "זה קובע את רמת התרגילים.",
      body: <div className="grid gap-2">{EXPERIENCE.map((x) => <Choice key={x.id} selected={experience === x.id} onClick={() => setExperience(x.id)}>{t(x.f, x.m)}</Choice>)}</div>,
      valid: !!experience,
    },
    {
      id: "conditioning",
      title: "איך מרגיש מאמץ?",
      sub: "זה קובע את העוצמה.",
      body: <div className="grid gap-2">{CONDITIONING.map((x) => <Choice key={x.id} selected={conditioning === x.id} onClick={() => setConditioning(x.id)}>{t(x.f, x.m)}</Choice>)}</div>,
      valid: !!conditioning,
    },
    ...(needsWeights ? [{
      id: "weights",
      title: "אילו משקלים יש לך?",
      sub: "נציע רק מאלה.",
      body: (
        <div>
          <ChipRow>
            {[...OWNED_PRESETS, ...owned.filter((n) => !OWNED_PRESETS.includes(n))].map((n) => (
              <Chip key={n} selected={owned.includes(n)} onClick={() => toggleWeight(n)}>{n} ק״ג</Chip>
            ))}
          </ChipRow>
          <div className="mt-3 flex items-end gap-2">
            <Field className="flex-1" label="משקל אחר" name="custom_kg" type="number" inputMode="decimal" suffix="ק״ג" value={extraKg} onChange={(e) => setExtraKg(e.target.value)} />
            <Button variant="secondary" onClick={addWeight}>הוספה</Button>
          </div>
        </div>
      ),
      valid: owned.length > 0,
    }] : []),
    {
      id: "target",
      title: "היעד לחודש",
      sub: t("משהו מדיד שתרצי לראות בסוף החודש.", "משהו מדיד שתרצה לראות בסוף החודש."),
      body: (
        <div className="space-y-4">
          <Stepper label="אימונים בחודש" value={targetWorkouts} onChange={setTarget} min={1} max={31} suffix="אימונים" />
          <Field label="יעד אישי (לא חובה)" name="target_note" value={targetNote} onChange={(e) => setTargetNote(e.target.value)} placeholder="סקוואט עם 20 ק״ג / 10 שכיבות סמיכה" />
        </div>
      ),
      valid: true,
    },
    {
      id: "when",
      title: "מה עכשיו?",
      sub: "הסדרה נכנסת ללוח בכל מקרה. בסוף אפשר לקבוע תזכורת.",
      body: (
        <div className="grid gap-2">
          <Choice selected={startNow === true} onClick={() => setStartNow(true)}>להתחיל את האימון הראשון</Choice>
          <Choice selected={startNow === false} onClick={() => setStartNow(false)}>רק לשבץ</Choice>
        </div>
      ),
      valid: startNow !== null,
    },
  ];
  const idx = Math.max(0, steps.findIndex((s) => s.id === stepId));
  const step = steps[idx] ?? steps[0];
  const last = idx === steps.length - 1;
  const abilityPatch = { equipment, dumbbell_pairs: pairs, kettlebell_pairs: kbPairs, training_experience: experience, conditioning, owned_weights: owned };

  async function saveAbility() {
    setProfile({ ...profile, ...abilityPatch });
    const { error } = await db().from("profiles").update(abilityPatch).eq("id", profile.id);
    if (error) throw error;
  }

  async function advance() {
    if (last) return save();
    setStepId(steps[idx + 1].id);
  }

  async function save() {
    setSaving(true);
    try {
      const supabase = db();
      const uid = await userId();
      await saveAbility();
      const level = experienceLevel(experience) ?? nextLevel(prev);
      const who: Profile = { ...profile, ...abilityPatch };

      // One active plan at a time: a new one takes over the old plan's remaining planned workouts.
      const { data: old } = await supabase.from("workout_plans").select("id").gte("ends_on", start);
      if (old?.length) {
        if (!confirm("יש כבר תוכנית פעילה. להחליף אותה?")) return setSaving(false);
        const { data: rows } = await supabase.from("scheduled_workouts").select("id, google_event_id").in("plan_id", old.map((p) => p.id)).eq("status", "planned").gte("date", start);
        if (rows?.length) await supabase.from("scheduled_workouts").delete().in("id", rows.map((r) => r.id));
        rows?.forEach((r) => void removeCalendarEvent(r.google_event_id));
        await supabase.from("workout_plans").update({ ends_on: format(addDays(startDate, -1), "yyyy-MM-dd") }).in("id", old.map((p) => p.id));
      }

      const { data: plan, error } = await supabase.from("workout_plans").insert({
        user_id: uid, goals, level, target_workouts: targetWorkouts, target_note: targetNote.trim() || null,
        starts_on: start, ends_on: format(addDays(startDate, 27), "yyyy-MM-dd"),
      }).select("id").single();
      if (error || !plan) throw error;

      // Same exercises all month per A/B/C workout; each week gets its own template with more volume (weights rise from logged sets).
      const focuses = !generated || focusMode === "rotate" || !focusMode ? planFocuses(weekdays.length) : [focusMode];
      const history = await setHistory();
      const built = extra !== null ? { core: extra === "core" || extra === "both", cardio: extra === "cardio" || extra === "both" } : {};
      const workouts = await Promise.all(focuses.map(async (focus, i) => {
        const w = await generateMixedWorkout(who, { minutes, vibe: vibes[0], equipment, focus, goals, level, ...built }, vibes, pct, history);
        const pinned = rememberedExerciseIds(w.template_exercises, history);
        const name = focuses.length > 1 && w.template_exercises.length ? `${"ABC"[i]} · ${w.name}` : w.name;
        return Promise.all([0, 1, 2, 3].map(async (week) => ({
          name: w.template_exercises.length ? `${name} · שבוע ${week + 1}` : name,
          intensity: w.intensity,
          vibe: w.vibe,
          templateId: w.template_exercises.length ? await saveGeneratedTemplate({ ...withWeek(w, week, goals, pinned), name: `${name} · שבוע ${week + 1}` }) : null,
        })));
      }));
      const { data: rows, error: rowsErr } = await supabase.from("scheduled_workouts").insert(dates.map((date, i) => {
        const w = workouts[i % workouts.length][weekIndex(startDate, date)];
        return { user_id: uid, plan_id: plan.id, date, time, title: w.name, vibe: w.vibe, intensity: w.intensity, duration_min: minutes, source: "app" as const, template_id: w.templateId };
      })).select("id");
      if (rowsErr) throw rowsErr;
      if (profile.calendar_sync) rows?.forEach((r) => void syncCalendar("scheduled", r.id));
      await celebrate("התוכנית מוכנה");
      setAfter(startNow && rows?.[0] ? `/session?scheduled=${rows[0].id}` : null);
      setRemind(true);
    } catch {
      setSaving(false);
      alert("השמירה נכשלה");
    }
  }

  return (
    <main className="flex min-h-[70dvh] flex-col">
      <PageHeader title="תוכנית חודשית" eyebrow={`שאלה ${idx + 1} מתוך ${steps.length}`} back="/plan" />
      <div className="mb-6 flex gap-1.5" aria-hidden>
        {steps.map((s, i) => <span key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i <= idx ? "bg-accent" : "bg-border"}`} />)}
      </div>
      <div key={step.id} className="ask flex-1">
        <h2 className="text-3xl font-black">{step.title}</h2>
        <p className="mb-6 mt-1 text-muted">{step.sub}</p>
        {step.body}
      </div>
      <div className="h-32" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-lg px-4">
        <div className="flex gap-3 rounded-2xl border border-border bg-bg p-3 shadow-[var(--shadow)]">
          {idx > 0 && <Button variant="secondary" onClick={() => setStepId(steps[idx - 1].id)}>חזרה</Button>}
          <Button className="flex-1" disabled={!step.valid} loading={saving} onClick={() => void advance()}>
            {last ? "יצירת התוכנית" : "הבא"}
          </Button>
        </div>
      </div>
      <ReminderPrompt open={remind} onClose={() => { setRemind(false); router.replace(after ?? "/plan"); }} />
    </main>
  );
}
