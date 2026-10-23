"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Stepper } from "@/components/ui/field";
import { EQUIPMENT, GOALS, VIBES } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

type Props = { profile: Profile; mode: "onboarding" | "edit"; onSaved?: (p: Profile) => void };

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export function OnboardingForm({ profile, mode, onSaved }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [p, setP] = useState({
    display_name: profile.display_name ?? "",
    weight_kg: profile.weight_kg ?? 60,
    height_cm: profile.height_cm ?? 165,
    birth_year: profile.birth_year ?? 1995,
    equipment: profile.equipment,
    days_per_week: profile.days_per_week,
    goals: profile.goals,
    vibes: profile.vibes,
    weekly_minutes_goal: profile.weekly_minutes_goal,
    weekly_kcal_goal: profile.weekly_kcal_goal,
  });
  const set = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => setP((s) => ({ ...s, [k]: v }));

  const steps = [
    {
      title: "קצת עלייך",
      sub: "המשקל משמש רק לחישוב קלוריות. הכול נשאר אצלך.",
      body: (
        <div className="space-y-4">
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
        <ChipRow>
          {EQUIPMENT.map((e) => (
            <Chip key={e.id} selected={p.equipment.includes(e.id)} onClick={() => set("equipment", toggle(p.equipment, e.id))}>{e.label}</Chip>
          ))}
        </ChipRow>
      ),
      valid: true,
    },
    {
      title: "כמה ומה המטרה?",
      sub: "אפשר לשנות בכל רגע.",
      body: (
        <div className="space-y-5">
          <Stepper label="אימונים בשבוע" value={p.days_per_week} onChange={(v) => set("days_per_week", v)} min={1} max={7} />
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
      title: "מה את אוהבת?",
      sub: "סוגי האימון שנשים קדימה. היעדים השבועיים מוצעים לפי זה.",
      body: (
        <div className="space-y-5">
          <ChipRow>
            {VIBES.filter((v) => v.id !== "other").map((v) => (
              <Chip key={v.id} selected={p.vibes.includes(v.id)} onClick={() => set("vibes", toggle(p.vibes, v.id))}>{v.label}</Chip>
            ))}
          </ChipRow>
          <Stepper label="יעד דקות בשבוע" value={p.weekly_minutes_goal} onChange={(v) => set("weekly_minutes_goal", v)} min={30} max={900} step={15} suffix="דק׳" />
          <Stepper label="יעד קלוריות בשבוע" value={p.weekly_kcal_goal} onChange={(v) => set("weekly_kcal_goal", v)} min={200} max={6000} step={100} suffix="קק״ל" />
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
      .update({ ...p, onboarding_done: true })
      .eq("id", profile.id)
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) return setError("לא הצלחנו לשמור. נסי שוב.");
    onSaved?.(data);
    if (mode === "onboarding") {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col">
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
          {last ? (mode === "onboarding" ? "יאללה, מתחילות" : "שמירה") : "הבא"}
        </Button>
      </div>
    </div>
  );
}
