"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarRange, Check, ChevronLeft, ChevronRight, Play, Plus, SkipForward, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleSheet } from "@/components/schedule-sheet";
import { NewWorkoutSheet } from "@/components/new-workout-sheet";
import { Card } from "@/components/ui/card";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { activePlan, db, scheduleBetween } from "@/lib/db";
import { DAY_NAMES, GOALS, TONE_LEGEND, intensityLabel, statusTone, vibeLabel } from "@/lib/labels";
import type { ScheduledWorkout, WorkoutPlan } from "@/lib/types";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export default function PlanPage() {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<ScheduledWorkout[]>([]);
  const [plan, setPlan] = useState<{ plan: WorkoutPlan; done: number } | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [sheet, setSheet] = useState<{ open: boolean; existing: ScheduledWorkout | null }>({ open: false, existing: null });
  const [logging, setLogging] = useState<ScheduledWorkout | null>(null);

  const { days, reload } = useMemo(() => {
    const gridStart = startOfWeek(month, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return {
      days: eachDayOfInterval({ start: gridStart, end: gridEnd }),
      reload: () => { scheduleBetween(ymd(gridStart), ymd(gridEnd)).then(setItems); },
    };
  }, [month]);
  useEffect(reload, [reload]);
  useEffect(() => { activePlan().then(setPlan); }, [items]);

  const today = ymd(new Date());
  const forDay = (d: Date) => items.filter((i) => i.date === ymd(d));
  const dayItems = forDay(selected);

  async function setStatus(w: ScheduledWorkout, status: ScheduledWorkout["status"]) {
    const { error } = await db().from("scheduled_workouts").update({ status }).eq("id", w.id);
    if (error) return alert("השמירה נכשלה");
    reload();
  }

  return (
    <main>
      <PageHeader
        title="התוכנית"
        eyebrow={format(month, "LLLL yyyy", { locale: he })}
        action={
          <div className="flex gap-1">
            <button aria-label="חודש קודם" onClick={() => setMonth(addMonths(month, -1))} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ChevronRight className="h-5 w-5" /></button>
            <button aria-label="חודש הבא" onClick={() => setMonth(addMonths(month, 1))} className="grid h-10 w-10 place-items-center rounded-full bg-surface"><ChevronLeft className="h-5 w-5" /></button>
          </div>
        }
      />

      {plan ? (
        <Card tone="accent" className="mb-4">
          <p className="text-xs font-semibold text-muted">תוכנית חודשית · עד {format(new Date(`${plan.plan.ends_on}T00:00`), "d.M")}</p>
          <h2 className="text-xl font-bold">{plan.plan.goals.map((id) => GOALS.find((x) => x.id === id)?.label ?? id).join(" · ")}</h2>
          {plan.plan.target_note && <p className="text-sm">{plan.plan.target_note}</p>}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={plan.done} aria-valuemax={plan.plan.target_workouts} aria-label="התקדמות בתוכנית">
            <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, (plan.done / plan.plan.target_workouts) * 100)}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold tabular-nums">{plan.done}/{plan.plan.target_workouts} אימונים</p>
        </Card>
      ) : plan === null && (
        <Link href="/plan/new" className="mb-4 flex items-center gap-3 rounded-[24px] bg-accent p-4 font-bold text-accent-ink active:scale-[0.98]">
          <CalendarRange className="h-6 w-6" aria-hidden /> לבנות תוכנית חודשית
        </Link>
      )}

      <div className="rounded-[24px] bg-surface p-3">
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted">{DAY_NAMES.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-1">
          {days.map((d) => {
            const list = forDay(d);
            const sel = isSameDay(d, selected);
            return (
              <button
                key={d.toISOString()}
                onClick={() => { setSelected(d); if (!isSameMonth(d, month)) setMonth(startOfMonth(d)); }}
                aria-label={format(d, "d בMMMM", { locale: he })}
                aria-pressed={sel}
                className={`flex h-12 flex-col items-center justify-center rounded-2xl text-sm font-semibold transition-colors ${sel ? "bg-accent text-accent-ink" : isToday(d) ? "ring-2 ring-inset ring-accent" : isSameMonth(d, month) ? "" : "text-muted/50"}`}
              >
                <span className="tabular-nums">{format(d, "d")}</span>
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {list.slice(0, 3).map((w) => (
                    <span key={w.id} className={`h-1.5 w-1.5 rounded-full ${statusTone(w, today).dot} ${sel ? "ring-1 ring-accent-ink/50" : ""}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 border-t border-border pt-2 text-xs text-muted" aria-label="מקרא">
          {TONE_LEGEND.map((t) => <li key={t.label} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden />{t.label}</li>)}
        </ul>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isToday(selected) ? "היום" : format(selected, "EEEE, d בMMMM", { locale: he })}</h2>
          <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> שיבוץ</Button>
        </div>

        {dayItems.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border p-6 text-center text-muted">
            <p>יום מנוחה. או שעוד לא שיבצת.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {dayItems.map((w) => {
              const tone = statusTone(w, today);
              return (
              <li key={w.id} className={`rounded-[24px] border-s-4 p-4 ${tone.border} ${w.status === "done" ? "bg-success/10" : w.status === "skipped" ? "bg-surface opacity-60" : "bg-surface"}`}>
                <button className="w-full text-start" onClick={() => setSheet({ open: true, existing: w })}>
                  <p className="text-xs font-semibold text-muted">
                    {w.time?.slice(0, 5)} · {w.duration_min} דק׳ · {vibeLabel(w.vibe)} · {intensityLabel(w.intensity)}{w.source === "external" && " · חיצוני"}
                  </p>
                  <h3 className={`text-lg font-bold ${w.status === "skipped" ? "line-through" : ""}`}>{w.title}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold"><span className={`h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />{tone.label}</p>
                </button>
                <div className="mt-3 flex gap-2">
                  {w.status === "planned" ? (
                    <>
                      {w.source === "app" && isToday(new Date(`${w.date}T00:00`)) && <Link href={`/session?scheduled=${w.id}`} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-surface-strong px-4 text-sm font-semibold text-on-strong"><Play className="h-4 w-4" /> להתחיל</Link>}
                      <Button size="sm" variant="success" className="flex-1" onClick={() => setLogging(w)}><Check className="h-4 w-4" /> בוצע</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(w, "skipped")}><SkipForward className="h-4 w-4" /> דילוג</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(w, "planned")}><Undo2 className="h-4 w-4" /> חזרה למתוכנן</Button>
                  )}
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      <ScheduleSheet open={sheet.open} existing={sheet.existing} date={ymd(selected)} onClose={() => setSheet((s) => ({ ...s, open: false }))} onChanged={reload} />
      <NewWorkoutSheet open={adding} onClose={() => setAdding(false)} date={ymd(selected)} onScheduled={reload} onExternal={() => setSheet({ open: true, existing: null })} />
      <LogWorkoutSheet open={!!logging} scheduled={logging} onClose={() => setLogging(null)} onSaved={reload} />
    </main>
  );
}
