"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, Plus, SkipForward, Undo2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleSheet } from "@/components/schedule-sheet";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { db, listTemplates, scheduleBetween, type TemplateWithExercises } from "@/lib/db";
import { DAY_NAMES, STATUS_LABEL, intensityLabel, vibeLabel } from "@/lib/labels";
import type { ScheduledWorkout } from "@/lib/types";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export default function PlanPage() {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(new Date());
  const [items, setItems] = useState<ScheduledWorkout[]>([]);
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
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
  useEffect(() => { listTemplates().then(setTemplates); }, []);

  const forDay = (d: Date) => items.filter((i) => i.date === ymd(d));
  const dayItems = forDay(selected);

  async function setStatus(w: ScheduledWorkout, status: ScheduledWorkout["status"]) {
    await db().from("scheduled_workouts").update({ status }).eq("id", w.id);
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
                    <span key={w.id} className={`h-1.5 w-1.5 rounded-full ${w.status === "done" ? "bg-success" : w.status === "skipped" ? "bg-muted/40" : "bg-current"}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{isToday(selected) ? "היום" : format(selected, "EEEE, d בMMMM", { locale: he })}</h2>
          <Button size="sm" onClick={() => setSheet({ open: true, existing: null })}><Plus className="h-4 w-4" /> שיבוץ</Button>
        </div>

        {dayItems.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border p-6 text-center text-muted">
            <p>יום מנוחה. או שעוד לא שיבצת.</p>
            {templates.length === 0 && <Link href="/workouts/new" className="mt-2 inline-block text-sm font-semibold underline">ליצור תבנית ראשונה</Link>}
          </div>
        ) : (
          <ul className="space-y-3">
            {dayItems.map((w) => (
              <li key={w.id} className={`rounded-[24px] p-4 ${w.status === "done" ? "bg-accent-soft" : w.status === "skipped" ? "bg-surface opacity-60" : "bg-surface"}`}>
                <button className="w-full text-start" onClick={() => setSheet({ open: true, existing: w })}>
                  <p className="text-xs font-semibold text-muted">
                    {w.time?.slice(0, 5)} · {w.duration_min} דק׳ · {vibeLabel(w.vibe)} · {intensityLabel(w.intensity)}{w.source === "external" && " · חיצוני"}
                  </p>
                  <h3 className={`text-lg font-bold ${w.status === "skipped" ? "line-through" : ""}`}>{w.title}</h3>
                  <p className="text-xs text-muted">{STATUS_LABEL[w.status]}</p>
                </button>
                <div className="mt-3 flex gap-2">
                  {w.status === "planned" ? (
                    <>
                      <Button size="sm" className="flex-1" onClick={() => setLogging(w)}><Check className="h-4 w-4" /> בוצע</Button>
                      <Button size="sm" variant="secondary" onClick={() => setStatus(w, "skipped")}><SkipForward className="h-4 w-4" /> דילוג</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(w, "planned")}><Undo2 className="h-4 w-4" /> חזרה למתוכנן</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ScheduleSheet open={sheet.open} existing={sheet.existing} date={ymd(selected)} templates={templates} onClose={() => setSheet((s) => ({ ...s, open: false }))} onChanged={reload} />
      <LogWorkoutSheet open={!!logging} scheduled={logging} onClose={() => setLogging(null)} onSaved={reload} />
    </main>
  );
}
