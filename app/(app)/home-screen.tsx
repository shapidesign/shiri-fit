"use client";

import { endOfWeek, format, isToday, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { HeartPulse, Play, Plus, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { Card, Eyebrow } from "@/components/ui/card";
import { Rings } from "@/components/ui/ring";
import { LogWorkoutSheet } from "@/components/log-workout-sheet";
import { RecoverySheet } from "@/components/recovery-sheet";
import { db, logsBetween } from "@/lib/db";
import { vibeLabel } from "@/lib/labels";
import type { ScheduledWorkout, WorkoutLog } from "@/lib/types";

async function fetchHome() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [{ data: nx }, week, { data: rc }] = await Promise.all([
    db().from("scheduled_workouts").select("*").eq("status", "planned").gte("date", today).order("date").order("time").limit(1).maybeSingle(),
    logsBetween(startOfWeek(new Date(), { weekStartsOn: 0 }).toISOString(), endOfWeek(new Date(), { weekStartsOn: 0 }).toISOString()),
    db().from("workout_logs").select("*").order("performed_at", { ascending: false }).limit(3),
  ]);
  return { next: (nx as ScheduledWorkout | null) ?? null, week, recent: (rc ?? []) as WorkoutLog[] };
}

export function HomeScreen({ openRecovery = false }: { openRecovery?: boolean }) {
  const { profile } = useProfile();
  const [next, setNext] = useState<ScheduledWorkout | null | undefined>(undefined);
  const [week, setWeek] = useState<WorkoutLog[]>([]);
  const [recent, setRecent] = useState<WorkoutLog[]>([]);
  const [logging, setLogging] = useState(false);
  const [recovery, setRecovery] = useState(openRecovery);

  const load = useCallback(() => {
    fetchHome().then((h) => { setNext(h.next); setWeek(h.week); setRecent(h.recent); });
  }, []);
  useEffect(load, [load]);

  const workouts = week.length;
  const minutes = week.reduce((n, l) => n + l.duration_min, 0);
  const kcal = week.reduce((n, l) => n + l.calories, 0);
  const firstName = profile.display_name?.split(" ")[0];

  return (
    <main className="space-y-4">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">· זמן בשבילך</p>
          <h1 className="text-4xl font-black leading-tight">טוב שחזרת{firstName ? `, ${firstName}` : ""}.</h1>
        </div>
        <Link href="/profile" aria-label="הפרופיל שלי" className="grid h-11 w-11 place-items-center rounded-2xl bg-surface"><User className="h-5 w-5" /></Link>
      </header>

      <Card tone="strong" className="relative overflow-hidden">
        <Eyebrow>{next ? (isToday(new Date(next.date)) ? "היום" : format(new Date(next.date), "EEEE, d בMMMM", { locale: he })) : "אין אימון מתוכנן"}</Eyebrow>
        <h2 className="mt-3 text-3xl font-black leading-tight">{next ? next.title : "האימון הבא שלך."}</h2>
        <p className="mt-1 text-sm opacity-80">
          {next ? `${vibeLabel(next.vibe)} · ${next.time?.slice(0, 5) ?? ""} · ${next.duration_min} דק׳` : "שבצי משהו בלוח, או צאי לאימון חופשי עכשיו."}
        </p>
        <div className="mt-5 flex gap-2">
          {next ? (
            <>
              <Link href={`/session?scheduled=${next.id}`} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]"><Play className="h-4 w-4" /> להתחיל</Link>
              <Link href="/plan" className="inline-flex h-12 items-center justify-center rounded-2xl bg-on-strong/10 px-4 font-semibold">ללוח</Link>
            </>
          ) : (
            <>
              <Link href="/plan" className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent font-semibold text-accent-ink active:scale-[0.97]">לתכנון האימון הבא</Link>
              <Link href="/session" className="inline-flex h-12 items-center justify-center rounded-2xl bg-on-strong/10 px-4 font-semibold">אימון חופשי</Link>
            </>
          )}
        </div>
      </Card>

      <Card className="flex items-center gap-5">
        <Rings
          size={128}
          rings={[
            { value: workouts / Math.max(1, profile.days_per_week), color: "var(--ring-1)", label: "אימונים" },
            ...(profile.weekly_minutes_goal ? [{ value: minutes / profile.weekly_minutes_goal, color: "var(--ring-2)", label: "דקות" }] : []),
            { value: kcal / Math.max(1, profile.weekly_kcal_goal), color: "var(--ring-3)", label: "קלוריות" },
          ]}
        />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-muted">השבוע שלך</p>
          <Stat color="var(--ring-1)" label="אימונים" value={`${workouts}/${profile.days_per_week}`} />
          {profile.weekly_minutes_goal ? <Stat color="var(--ring-2)" label="דקות" value={`${minutes}/${profile.weekly_minutes_goal}`} /> : null}
          <Stat color="var(--ring-3)" label="קק״ל" value={`${kcal}/${profile.weekly_kcal_goal}`} />
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
              <li key={l.id} className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3">
                <div>
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
      <RecoverySheet open={recovery} log={recent[0] ?? null} onClose={() => setRecovery(false)} />
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
