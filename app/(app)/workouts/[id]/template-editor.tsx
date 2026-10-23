"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { Field, Mini, Stepper } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { ExerciseLibrary } from "@/components/exercise-library";
import { ExerciseSheet } from "@/components/exercise-sheet";
import { db, getTemplate, userId } from "@/lib/db";
import { INTENSITIES, MUSCLES, VIBES, muscleLabel } from "@/lib/labels";
import type { Exercise, Intensity, Vibe } from "@/lib/types";

type Row = {
  key: string;
  exercise: Exercise | null;
  custom_name: string | null;
  sets: number | null;
  reps: number | null;
  duration_sec: number | null;
  weight_kg: number | null;
  notes: string | null;
};

const uid = () => Math.random().toString(36).slice(2);

export function TemplateEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const router = useRouter();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [vibe, setVibe] = useState<Vibe>("strength");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [minutes, setMinutes] = useState(60);
  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [picking, setPicking] = useState(false);
  const [customName, setCustomName] = useState("");
  const [detail, setDetail] = useState<Exercise | null>(null);

  useEffect(() => {
    if (isNew) return;
    getTemplate(id).then((t) => {
      if (!t) return router.replace("/workouts");
      setName(t.name); setVibe(t.vibe); setIntensity(t.intensity); setMinutes(t.est_minutes);
      setMuscleGroups(t.muscle_groups); setNotes(t.notes ?? "");
      setRows(t.template_exercises.map((te) => ({ key: te.id, exercise: te.exercise, custom_name: te.custom_name, sets: te.sets, reps: te.reps, duration_sec: te.duration_sec, weight_kg: te.weight_kg, notes: te.notes })));
      setLoading(false);
    });
  }, [id, isNew, router]);

  const isTimed = ["yoga", "pilates", "cardio", "walk", "run", "cycle", "swim", "stretch", "hiit"].includes(vibe);

  function addExercise(e: Exercise) {
    setRows((r) => [...r, { key: uid(), exercise: e, custom_name: null, sets: isTimed ? null : 3, reps: isTimed ? null : 10, duration_sec: isTimed ? 60 : null, weight_kg: null, notes: null }]);
    setMuscleGroups((m) => Array.from(new Set([...m, ...e.muscles])));
  }
  function addCustom() {
    if (!customName.trim()) return;
    setRows((r) => [...r, { key: uid(), exercise: null, custom_name: customName.trim(), sets: isTimed ? null : 3, reps: isTimed ? null : 10, duration_sec: isTimed ? 300 : null, weight_kg: null, notes: null }]);
    setCustomName("");
  }
  const update = (key: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => setRows((r) => { const n = [...r]; const j = i + d; if (j < 0 || j >= n.length) return r; [n[i], n[j]] = [n[j], n[i]]; return n; });

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const supabase = db();
    const base = { name: name.trim(), vibe, intensity, est_minutes: minutes, muscle_groups: muscleGroups, notes: notes || null };
    let templateId = id;
    if (isNew) {
      const { data, error } = await supabase.from("workout_templates").insert({ ...base, user_id: await userId() }).select("id").single();
      if (error || !data) { setSaving(false); return alert("השמירה נכשלה"); }
      templateId = data.id;
    } else {
      const { error } = await supabase.from("workout_templates").update(base).eq("id", id);
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
      const { error: delErr } = await supabase.from("template_exercises").delete().eq("template_id", id);
      if (delErr) { setSaving(false); return alert("השמירה נכשלה"); }
    }
    if (rows.length) {
      const { error } = await supabase.from("template_exercises").insert(
        rows.map((r, i) => ({ template_id: templateId, exercise_id: r.exercise?.id ?? null, custom_name: r.custom_name, position: i, sets: r.sets, reps: r.reps, duration_sec: r.duration_sec, weight_kg: r.weight_kg, notes: r.notes })),
      );
      if (error) { setSaving(false); return alert("השמירה נכשלה"); }
    }
    router.replace("/workouts");
    router.refresh();
  }

  async function remove() {
    if (!confirm("למחוק את התבנית? אימונים שכבר שובצו יישארו.")) return;
    const { error } = await db().from("workout_templates").delete().eq("id", id);
    if (error) return alert("המחיקה נכשלה");
    router.replace("/workouts");
  }

  if (loading) return <div className="h-60 animate-pulse rounded-[24px] bg-surface" />;

  return (
    <main className="pb-24">
      <PageHeader title={isNew ? "תבנית חדשה" : "עריכת תבנית"} back="/workouts" />

      <div className="space-y-5">
        <Field label="שם האימון" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="למשל: אימון A — כל הגוף" />

        <div>
          <p className="mb-2 text-sm font-semibold">אווירה</p>
          <ChipRow>{VIBES.map((v) => <Chip key={v.id} selected={vibe === v.id} onClick={() => setVibe(v.id)}>{v.label}</Chip>)}</ChipRow>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-2">
            <span className="text-sm font-semibold">עצימות</span>
            <div className="flex gap-1 rounded-xl bg-surface p-1">
              {INTENSITIES.map((i) => (
                <button key={i.id} type="button" aria-pressed={intensity === i.id} onClick={() => setIntensity(i.id)} className={`h-9 rounded-lg px-3 text-sm font-semibold ${intensity === i.id ? "bg-accent text-accent-ink" : "text-muted"}`}>{i.label}</button>
              ))}
            </div>
          </div>
          <Stepper label="משך משוער" value={minutes} onChange={setMinutes} min={10} max={180} step={5} suffix="דק׳" />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">קבוצות שרירים</p>
          <ChipRow>{MUSCLES.map((m) => <Chip key={m.id} selected={muscleGroups.includes(m.id)} onClick={() => setMuscleGroups((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}>{m.label}</Chip>)}</ChipRow>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">תרגילים ({rows.length})</p>
            <Button size="sm" variant="strong" onClick={() => setPicking(true)}><Plus className="h-4 w-4" /> מהספרייה</Button>
          </div>
          <ul className="space-y-2">
            {rows.map((r, i) => (
              <li key={r.key} className="rounded-2xl bg-surface p-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => r.exercise && setDetail(r.exercise)} className="min-w-0 flex-1 text-start">
                    <span className="block truncate font-semibold">{r.exercise ? r.exercise.name_he ?? r.exercise.name : r.custom_name}</span>
                    {r.exercise && <span className="block truncate text-xs text-muted">{r.exercise.muscles.map(muscleLabel).join(" · ")}</span>}
                  </button>
                  <button type="button" aria-label="למעלה" onClick={() => move(i, -1)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" aria-label="למטה" onClick={() => move(i, 1)} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" aria-label="הסרה" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} className="grid h-9 w-9 place-items-center rounded-full bg-danger/10 text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  <Mini label="סטים" value={r.sets} onChange={(v) => update(r.key, { sets: v })} />
                  <Mini label="חזרות" value={r.reps} onChange={(v) => update(r.key, { reps: v })} />
                  <Mini label="שניות" value={r.duration_sec} onChange={(v) => update(r.key, { duration_sec: v })} />
                  <Mini label="ק״ג" value={r.weight_kg} onChange={(v) => update(r.key, { weight_kg: v })} step="0.5" />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="או תרגיל חופשי: ״הליכה מהירה״" className="h-12 flex-1 rounded-2xl border border-border bg-surface-2 px-4 outline-none placeholder:text-muted" aria-label="תרגיל חופשי" />
            <Button variant="secondary" onClick={addCustom} aria-label="הוספת תרגיל חופשי"><Plus className="h-5 w-5" /></Button>
          </div>
        </section>

        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">הערות</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 outline-none" />
        </label>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-lg gap-2 px-4">
        {!isNew && <div className="rounded-2xl bg-bg shadow-lg"><Button variant="danger" size="lg" onClick={remove} aria-label="מחיקת תבנית"><Trash2 className="h-5 w-5" /></Button></div>}
        <Button size="lg" className="flex-1 shadow-lg" loading={saving} disabled={!name.trim()} onClick={save}>שמירה</Button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="הוספת תרגילים">
        <ExerciseLibrary onSelect={addExercise} selectedIds={new Set(rows.map((r) => r.exercise?.id).filter((x): x is number => !!x))} />
      </Sheet>
      <ExerciseSheet exercise={detail} onClose={() => setDetail(null)} onRename={(e) => { setDetail(e); setRows((r) => r.map((x) => (x.exercise?.id === e.id ? { ...x, exercise: e } : x))); }} />
    </main>
  );
}
