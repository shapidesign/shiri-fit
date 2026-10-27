"use client";

import { endOfWeek, format, isToday, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { Check, ChevronLeft, ChevronRight, HeartPulse, Play, Plus, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { discardDraft, readDraft, type ActiveSession } from "@/lib/active-session";
import { useProfile } from "@/components/profile-provider";
import { Card, Eyebrow } from "@/components/ui/card";
import { Rings } from "@/components/ui/ring";
import { Sheet } from "@/components/ui/sheet";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { RecoverySheet } from "@/components/recovery-sheet";
import { TemplateExercises } from "@/components/schedule-sheet";
import { activePlan, db, logsBetween } from "@/lib/db";
import { g, intensityLabel, vibeLabel } from "@/lib/labels";
import type { ScheduledWorkout, WorkoutLog, WorkoutPlan } from "@/lib/types";

type PlanProgress = { plan: WorkoutPlan; done: number };

async function fetchHome() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [nx, week, rc, plan] = await Promise.all([
    db().from("scheduled_workouts").select("*").eq("status", "planned").gte("date", today).order("date").order("time").limit(5),
    logsBetween(startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString(), endOfWeek(new Date(), { weekStartsOn: 0 }).toISOString()),
    db().from("workout_logs").select("*").order("performed_at", { ascending: false }).limit(3),
    activePlan(),
  ]);
  if (nx.error || rc.error) throw nx.error ?? rc.error;
  return { upcoming: (nx.data ?? []) as ScheduledWorkout[], week, recent: (rc.data ?? []) as WorkoutLog[], plan };
}

const dayLabel = (date: string) => (isToday(new Date(`${date}T00:00`)) ? "היום" : format(new Date(`${date}T00:00`), "EEEE, d בMMMM", { locale: he }));

export function HomeScreen({ openRecovery = false }: { openRecovery?: boolean }) {
  const { profile } = useProfile();
  const [upcoming, setUpcoming] = useState<ScheduledWorkout[] | undefined>(undefined);
  const [preview, setPreview] = useState<ScheduledWorkout | null>(null);
  const [slide, setSlide] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const [week, setWeek] = useState<WorkoutLog[]>([]);
  const [plan, setPlan] = useState<PlanProgress | null | undefined>(undefined);
  const [recent, setRecent] = useState<WorkoutLog[]>([]);
  const [logging, setLogging] = useState(false);
  const [recovery, setRecovery] = useState(openRecovery);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState<ActiveSession | null>(null);

  const load = useCallback(() => {
    setLoadError(false);
    fetchHome().then((h) => { setUpcoming(h.upcoming); setWeek(h.week); setPlan(h.plan); setRecent(h.recent); }).catch(() => setLoadError(true));
  }, []);
  useEffect(load, [load]);
  useEffect(() => { setDraft(readDraft(profile.id)); }, [profile.id]);

  // Scroll-snap does the swiping; arrows move one card. In RTL scrollLeft runs negative, so use its size.
  const goSlide = (to: number) => {
    const el = strip.current;
    if (!el || !upcoming?.length) return;
    const i = Math.min(upcoming.length - 1, Math.max(0, to));
    el.scrollTo({ left: i * el.clientWidth * (getComputedStyle(el).direction === "rtl" ? -1 : 1), behavior: "smooth" });
  };
  const onStripScroll = () => {
    const el = strip.current;
    if (el) setSlide(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  const workouts = week.length;
  const planGoal = plan ? Math.max(1, plan.plan.target_workouts) : 0;
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <main className="space-y-4">
      {loadError && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-danger">{g(profile.gender, "לא הצלחנו לטעון. נסי לרענן.", "לא הצלחנו לטעון. נסה לרענן.")}</p>}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">· זמן בשבילך</p>
          <h1 className="text-4xl font-black leading-tight">טוב שחזרת{firstName ? `, ${firstName}` : ""}.</h1>
        </div>
        <Link href="/profile" aria-label="הפרופיל שלי" className="grid h-11 w-11 place-items-center rounded-2xl bg-surface"><User className="h-5 w-5" /></Link>
      </header>

      {draft && (
        <Card tone="accent" className="space-y-3">
          <p className="text-sm font-semibold">אימון פתוח</p>
          <h2 className="text-2xl font-black leading-tight">{draft.title}</h2>
          <div className="flex gap-2">
            <Link href={draft.href} className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]">לחזור לאימון</Link>
            <button type="button" onClick={() => { void discardDraft(profile.id); setDraft(null); }} className="inline-flex h-12 items-center justify-center rounded-2xl bg-surface px-4 font-semibold">למחוק</button>
          </div>
        </Card>
      )}

      {upcoming === undefined && !loadError ? <div className="h-44 animate-pulse rounded-[24px] bg-surface" /> : !loadError && (upcoming?.length ? (
        <section aria-label="האימונים הקרובים" aria-roledescription="קרוסלה" className="relative">
          <div ref={strip} onScroll={onStripScroll} className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto rounded-[24px]">
            {upcoming.map((w, i) => (
              <Card key={w.id} tone="strong" className="w-full shrink-0 snap-center" aria-roledescription="שקופית" aria-label={`${i + 1} מתוך ${upcoming.length}`}>
                <button type="button" onClick={() => setPreview(w)} className="block w-full text-start">
                  <Eyebrow>{i === 0 ? `הבא · ${dayLabel(w.date)}` : dayLabel(w.date)}</Eyebrow>
                  <h2 className="mt-3 text-3xl font-black leading-tight">{w.title}</h2>
                  <p className="mt-1 text-sm opacity-80">{vibeLabel(w.vibe)}{w.time ? ` · ${w.time.slice(0, 5)}` : ""} · {w.duration_min} דק׳ · <span className="underline">לפרטים</span></p>
                </button>
                <div className="mt-5 flex gap-2">
                  <Link href={`/session?scheduled=${w.id}`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]"><Play className="h-4 w-4" /> להתחיל</Link>
                  <Link href="/plan" className="inline-flex h-12 items-center justify-center rounded-2xl bg-on-strong/10 px-4 font-semibold">ללוח</Link>
                </div>
              </Card>
            ))}
          </div>
          {upcoming.length > 1 && (
            <div className="mt-2 flex items-center justify-center gap-3">
              <button type="button" onClick={() => goSlide(slide - 1)} disabled={slide === 0} aria-label="האימון הקודם" className="grid h-10 w-10 place-items-center rounded-full bg-surface disabled:opacity-40"><ChevronRight className="h-5 w-5" /></button>
              <span className="flex gap-1.5" aria-hidden>
                {upcoming.map((w, i) => <span key={w.id} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-5 bg-accent" : "w-1.5 bg-border"}`} />)}
              </span>
              <button type="button" onClick={() => goSlide(slide + 1)} disabled={slide >= upcoming.length - 1} aria-label="האימון הבא" className="grid h-10 w-10 place-items-center rounded-full bg-surface disabled:opacity-40"><ChevronLeft className="h-5 w-5" /></button>
            </div>
          )}
        </section>
      ) : (
        <Card tone="strong" className="relative overflow-hidden">
          <Eyebrow>אין אימון מתוכנן</Eyebrow>
          <h2 className="mt-3 text-3xl font-black leading-tight">האימון הבא שלך.</h2>
          <p className="mt-1 text-sm opacity-80">{g(profile.gender, "שבצי משהו בלוח, או צאי לאימון חופשי עכשיו.", "שבץ משהו בלוח, או צא לאימון חופשי עכשיו.")}</p>
          <div className="mt-5 flex gap-2">
            <Link href="/plan" className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]">לתכנון האימון הבא</Link>
            <Link href="/session" className="inline-flex h-12 items-center justify-center rounded-2xl bg-on-strong/10 px-4 font-semibold">אימון חופשי</Link>
          </div>
        </Card>
      ))}

      <Card className="flex items-center gap-5">
        <Rings
          size={128}
          rings={[
            { value: workouts / Math.max(1, profile.days_per_week), color: "var(--ring-1)", label: "אימונים השבוע" },
            ...(plan ? [{ value: plan.done / planGoal, color: "var(--ring-2)", label: "תוכנית החודש" }] : []),
          ]}
        />
        <div className="flex-1 space-y-2">
          <Stat color="var(--ring-1)" label="אימונים השבוע" value={`${workouts}/${profile.days_per_week}`} />
          {plan ? (
            <Stat color="var(--ring-2)" label="תוכנית החודש" value={`${plan.done}/${plan.plan.target_workouts}`} />
          ) : plan === null ? (
            <Link href="/plan/new" className="text-sm font-semibold underline">לבנות תוכנית חודשית</Link>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setRecovery(true)} className="rounded-[24px] bg-accent-soft p-5 text-start transition-transform active:scale-[0.98]">
          <HeartPulse className="mb-6 h-6 w-6" aria-hidden />
          <p className="text-lg font-bold leading-tight">איך הרגשת?</p>
          <p className="text-xs text-muted">תיעוד התאוששות אחרי אימון</p>
        </button>
        <button type="button" onClick={() => setLogging(true)} className="rounded-[24px] bg-surface p-5 text-start transition-transform active:scale-[0.98]">
          <Plus className="mb-6 h-6 w-6" aria-hidden />
          <p className="text-lg font-bold leading-tight">תיעוד אימון</p>
          <p className="text-xs text-muted">שעשית בחוץ או ספונטני</p>
        </button>
      </div>

      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-bold">לאחרונה</h2>
            <Link href="/progress?tab=history" className="text-sm font-semibold text-muted underline">הכול</Link>
          </div>
          <ul className="space-y-2">
            {recent.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-success text-accent-ink" aria-hidden><Check className="h-4 w-4" /></span>
                <div className="flex-1">
                  <p className="font-semibold">{l.title}</p>
                  <p className="text-xs text-muted">{format(new Date(l.performed_at), "EEEE d.M · HH:mm", { locale: he })} · {vibeLabel(l.vibe)}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{l.duration_min} דק׳ · {l.calories} קק״ל</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LogWorkoutSheet open={logging} onClose={() => setLogging(false)} onSaved={load} />
      <RecoverySheet open={recovery} onClose={() => setRecovery(false)} />
      <Sheet open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ""}>
        {preview && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {dayLabel(preview.date)}{preview.time ? ` · ${preview.time.slice(0, 5)}` : ""} · {preview.duration_min} דק׳ · {vibeLabel(preview.vibe)} · {intensityLabel(preview.intensity)}
            </p>
            {preview.template_id ? <TemplateExercises templateId={preview.template_id} /> : <p className="rounded-2xl bg-surface p-4 text-sm text-muted">אין רשימת תרגילים לאימון הזה.</p>}
            {preview.notes && <p className="text-sm">{preview.notes}</p>}
            <div className="flex gap-2">
              {isToday(new Date(`${preview.date}T00:00`)) && preview.source === "app" && (
                <Link href={`/session?scheduled=${preview.id}`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]"><Play className="h-4 w-4" /> להתחיל</Link>
              )}
              <Link href="/plan" className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-surface font-semibold">ללוח</Link>
            </div>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function Stat({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden />
      <span className="text-muted">{label}</span>
      <span className="ms-auto font-bold tabular-nums">{value}</span>
    </p>
  );
}
