"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { EquipmentPicker, equipmentValid } from "@/components/equipment-picker";
import { GOALS, VIBES, g } from "@/lib/labels";
import { CalendarCheck } from "lucide-react";
import { createClient, signInWithGoogle } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Props = { profile: Profile; mode: "onboarding" | "edit"; calendarConnected?: boolean; onSaved?: (p: Profile) => void };

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function OnboardingForm({ profile, mode, calendarConnected, onSaved }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [calendarSync, setCalendarSync] = useState(profile.calendar_sync);
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState({
    display_name: profile.display_name ?? "",
    gender: profile.gender ?? "female",
    weight_kg: profile.weight_kg ?? 60,
    height_cm: profile.height_cm ?? 165,
    birth_year: profile.birth_year ?? 1995,
    equipment: profile.equipment,
    dumbbell_pairs: profile.dumbbell_pairs,
    days_per_week: profile.days_per_week,
    goals: profile.goals,
    vibes: profile.vibes,
    weekly_minutes_goal: profile.weekly_minutes_goal,
  });
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((s) => ({ ...s, [k]: v }));
  const t = (f: string, m: string) => g(p.gender, f, m);

  const calendarStep = {
    title: "מחברים את היומן",
    sub: `אימונים ${t("שתשבצי", "שתשבץ")} ייכנסו ליומן Google עם תזכורת, ואימונים ספונטניים יירשמו בו אחורה.`,
    body: (
      <div className="space-y-4">
        {calendarConnected ? (
          <p className="flex items-center gap-2 rounded-2xl bg-accent/15 px-4 py-3 font-semibold">
            <CalendarCheck className="h-5 w-5" aria-hidden /> היומן מחובר
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">עוד אין לנו גישה ליומן. צריך לאשר אותה במסך של Google.</p>
            <Button variant="secondary" loading={connecting} onClick={() => { setConnecting(true); void signInWithGoogle(); }}>
              חיבור ליומן Google
            </Button>
          </div>
        )}
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-border px-4 py-3">
          <span className="font-semibold">סנכרון אימונים ליומן</span>
          <input type="checkbox" checked={calendarSync} onChange={(e) => setCalendarSync(e.target.checked)} className="h-6 w-6 accent-[var(--accent)]" />
        </label>
      </div>
    ),
    valid: true,
  };

  const steps = [
    ...(mode === "onboarding" ? [calendarStep] : []),
    {
      title: t("קצת עלייך", "קצת עליך"),
      sub: "המשקל משמש רק לחישוב קלוריות. הכול נשאר אצלך.",
      body: (
        <div className="space-y-4">
          <div role="group" aria-label="מגדר" className="grid grid-cols-2 gap-3">
            {([["female", "אישה"], ["male", "גבר"]] as const).map(([id, label]) => (
              <Chip key={id} selected={p.gender === id} onClick={() => set("gender", id)} className="justify-center">{label}</Chip>
            ))}
          </div>
          <Field label="איך לקרוא לך?" name="display_name" value={p.display_name} onChange={(e) => set("display_name", e.target.value)} autoComplete="given-name" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="משקל" name="weight_kg" type="number" inputMode="decimal" suffix="ק״ג" value={p.weight_kg} onChange={(e) => set("weight_kg", Number(e.target.value))} min={30} max={250} />
            <Field label="גובה" name="height_cm" type="number" inputMode="numeric" suffix="ס״מ" value={p.height_cm} onChange={(e) => set("height_cm", Number(e.target.value))} min={120} max={220} />
          </div>
          <Field label="שנת לידה" name="birth_year" type="number" inputMode="numeric" value={p.birth_year} onChange={(e) => set("birth_year", Number(e.target.value))} min={1940} max={2015} />
        </div>
      ),
      valid: p.weight_kg >= 30 && p.weight_kg <= 250,
    },
    {
      title: "איזה ציוד יש לך?",
      sub: "נציע תרגילים רק עם מה שבאמת יש בבית או בסטודיו.",
      body: (
        <EquipmentPicker equipment={p.equipment} onEquipment={(e) => set("equipment", e)} pairs={p.dumbbell_pairs} onPairs={(v) => set("dumbbell_pairs", v)} />
      ),
      valid: equipmentValid(p.equipment, p.dumbbell_pairs),
    },
    {
      title: "כמה ומה המטרה?",
      sub: "אפשר לשנות בכל רגע.",
      body: (
        <div className="space-y-5">
          <div>
            <Stepper label="יעד אימונים בשבוע" value={p.days_per_week} onChange={(v) => set("days_per_week", v)} min={1} max={7} suffix={p.days_per_week === 1 ? "אימון" : "אימונים"} />
            <p className="mt-1.5 text-xs text-muted">כל אימון בערך שעה.</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">מטרות</p>
            <ChipRow>
              {GOALS.map((g) => (
                <Chip key={g.id} selected={p.goals.includes(g.id)} onClick={() => set("goals", toggle(p.goals, g.id))}>{g.label}</Chip>
              ))}
            </ChipRow>
          </div>
        </div>
      ),
      valid: true,
    },
    {
      title: t("מה את אוהבת?", "מה אתה אוהב?"),
      sub: "סוגי האימון שנשים קדימה. יעד דקות הוא אופציונלי.",
      body: (
        <div className="space-y-5">
          <ChipRow>
            {VIBES.filter((v) => v.id !== "other").map((v) => (
              <Chip key={v.id} selected={p.vibes.includes(v.id)} onClick={() => set("vibes", toggle(p.vibes, v.id))}>{v.label}</Chip>
            ))}
          </ChipRow>
          {p.weekly_minutes_goal == null ? (
            <Button variant="secondary" size="sm" onClick={() => set("weekly_minutes_goal", p.days_per_week * 60)}>+ להוסיף יעד דקות</Button>
          ) : (
            <div>
              <Stepper label="יעד דקות בשבוע" value={p.weekly_minutes_goal} onChange={(v) => set("weekly_minutes_goal", v)} min={30} max={900} step={15} suffix="דק׳" />
              <button type="button" onClick={() => set("weekly_minutes_goal", null)} className="mt-1.5 text-xs font-semibold text-muted underline">בלי יעד דקות</button>
            </div>
          )}
        </div>
      ),
      valid: true,
    },
  ];

  const last = step === steps.length - 1;

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ ...p, ...(mode === "onboarding" && { calendar_sync: calendarSync }), onboarding_done: true })
      .eq("id", profile.id)
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) return setError(`לא הצלחנו לשמור. ${t("נסי", "נסה")} שוב.`);
    onSaved?.(data);
    if (mode === "onboarding") {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-6 flex gap-1.5" aria-label={`שלב ${step + 1} מתוך ${steps.length}`}>
        {steps.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      <h1 className="text-3xl font-black">{steps[step].title}</h1>
      <p className="mb-6 mt-1 text-muted">{steps[step].sub}</p>
      <div className="flex-1">{steps[step].body}</div>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <div className="mt-8 flex gap-3">
        {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>חזרה</Button>}
        <Button className="flex-1" disabled={!steps[step].valid} loading={saving} onClick={() => (last ? save() : setStep(step + 1))}>
          {last ? (mode === "onboarding" ? t("יאללה, מתחילות", "יאללה, מתחילים") : "שמירה") : "הבא"}
        </Button>
      </div>
    </div>
  );
}
