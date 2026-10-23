"use client";

import { differenceInCalendarWeeks, eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, endOfDay, format, isSameDay, isSameMonth, isSameWeek, startOfDay, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import { he } from "date-fns/locale";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useProfile } from "@/components/profile-provider";
import { Card, SectionTitle } from "@/components/ui/card";
import { Rings } from "@/components/ui/ring";
import { PageHeader, Segmented } from "@/components/ui/page-header";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { removeCalendarEvent } from "@/lib/calendar-client";
import { db, logsBetween } from "@/lib/db";
import { BODY_STATES, DAY_NAMES, FEELINGS, g, intensityLabel, vibeLabel } from "@/lib/labels";
import type { RecoveryLog, WorkoutLog } from "@/lib/types";

type Period = "week" | "month" | "quarter" | "year";
const PERIODS: { id: Period; label: string }[] = [{ id: "week", label: "שבוע" }, { id: "month", label: "חודש" }, { id: "quarter", label: "3 חודשים" }, { id: "year", label: "שנה" }];

function range(p: Period) {
  const now = new Date();
  if (p === "week") return { from: startOfWeek(now, { weekStartsOn: 0 }), to: endOfDay(now) };
  if (p === "month") return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
  if (p === "quarter") return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
  return { from: startOfMonth(subMonths(now, 11)), to: endOfDay(now) };
}

export function ProgressScreen() {
  const { profile } = useProfile();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as "overview" | "history") ?? "overview";
  const [period, setPeriod] = useState<Period>("week");
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [recovery, setRecovery] = useState<RecoveryLog[]>([]);
  const [all, setAll] = useState<WorkoutLog[]>([]);
  const [detail, setDetail] = useState<WorkoutLog | null>(null);

  const { from, to } = useMemo(() => range(period), [period]);
  useEffect(() => {
    logsBetween(from.toISOString(), to.toISOString()).then(setLogs);
    db().from("recovery_logs").select("*").gte("created_at", from.toISOString()).then(({ data }) => setRecovery((data ?? []) as RecoveryLog[]));
  }, [from, to]);
  useEffect(() => {
    if (tab === "history") db().from("workout_logs").select("*").order("performed_at", { ascending: false }).limit(300).then(({ data }) => setAll((data ?? []) as WorkoutLog[]));
  }, [tab]);

  const weeks = Math.max(1, differenceInCalendarWeeks(to, from, { weekStartsOn: 0 }) + 1);
  const workouts = logs.length;
  const minutes = logs.reduce((n, l) => n + l.duration_min, 0);
  const kcal = logs.reduce((n, l) => n + l.calories, 0);

  // Buckets: days (week), weeks (month/quarter), months (year)
  const buckets = useMemo(() => {
    if (period === "week") return eachDayOfInterval({ start: from, end: to }).map((d) => ({ label: DAY_NAMES[d.getDay()], count: logs.filter((l) => isSameDay(new Date(l.performed_at), d)).length }));
    if (period === "year") return eachMonthOfInterval({ start: from, end: to }).map((d) => ({ label: format(d, "LLL", { locale: he }), count: logs.filter((l) => isSameMonth(new Date(l.performed_at), d)).length }));
    return eachWeekOfInterval({ start: from, end: to }, { weekStartsOn: 0 }).map((d) => ({ label: format(d, "d.M"), count: logs.filter((l) => isSameWeek(new Date(l.performed_at), d, { weekStartsOn: 0 })).length }));
  }, [logs, period, from, to]);

  const byHour = useMemo(() => {
    const bins = [{ label: "לילה", h: [0, 6] }, { label: "בוקר", h: [6, 10] }, { label: "צהריים", h: [10, 14] }, { label: "אחה״צ", h: [14, 18] }, { label: "ערב", h: [18, 22] }, { label: "מאוחר", h: [22, 24] }];
    return bins.map((b) => ({ label: b.label, count: logs.filter((l) => { const h = new Date(l.performed_at).getHours(); return h >= b.h[0] && h < b.h[1]; }).length }));
  }, [logs]);

  const byVibe = useMemo(() => {
    const m = new Map<string, number>();
    logs.forEach((l) => m.set(l.vibe, (m.get(l.vibe) ?? 0) + l.duration_min));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [logs]);

  async function removeLog(l: WorkoutLog) {
    if (!confirm("למחוק את האימון מההיסטוריה?")) return;
    await db().from("workout_logs").delete().eq("id", l.id);
    if (l.scheduled_id) await db().from("scheduled_workouts").update({ status: "planned" }).eq("id", l.scheduled_id);
    else void removeCalendarEvent(l.google_event_id);
    setAll((a) => a.filter((x) => x.id !== l.id));
    setLogs((a) => a.filter((x) => x.id !== l.id));
    setDetail(null);
  }

  return (
    <main>
      <PageHeader title="התקדמות" eyebrow="בדרך שלך" />
      <Segmented value={tab} onChange={(t) => router.replace(`/progress?tab=${t}`)} options={[{ id: "overview", label: "סקירה" }, { id: "history", label: "היסטוריה" }]} />

      {tab === "overview" ? (
        <div className="space-y-4">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none">
            {PERIODS.map((p) => (
              <button key={p.id} aria-pressed={period === p.id} onClick={() => setPeriod(p.id)} className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${period === p.id ? "bg-surface-strong text-on-strong" : "bg-surface"}`}>{p.label}</button>
            ))}
          </div>

          <Card className="flex items-center gap-5">
            <Rings
              size={150}
              rings={[
                { value: workouts / (profile.days_per_week * weeks), color: "var(--ring-1)", label: "אימונים" },
                ...(profile.weekly_minutes_goal ? [{ value: minutes / (profile.weekly_minutes_goal * weeks), color: "var(--ring-2)", label: "דקות" }] : []),
                { value: kcal / (profile.weekly_kcal_goal * weeks), color: "var(--ring-3)", label: "קלוריות" },
              ]}
            />
            <div className="flex-1 space-y-3">
              <Big color="var(--ring-1)" label="אימונים" value={workouts} target={profile.days_per_week * weeks} />
              {profile.weekly_minutes_goal ? <Big color="var(--ring-2)" label="דקות" value={minutes} target={profile.weekly_minutes_goal * weeks} /> : null}
              <Big color="var(--ring-3)" label="קק״ל" value={kcal} target={profile.weekly_kcal_goal * weeks} />
            </div>
          </Card>

          <Card>
            <SectionTitle className="mb-3">אימונים לאורך זמן</SectionTitle>
            <Chart data={buckets} />
          </Card>

          <Card>
            <SectionTitle className="mb-1">{g(profile.gender, "באיזו שעה את מתאמנת?", "באיזו שעה אתה מתאמן?")}</SectionTitle>
            <p className="mb-3 text-xs text-muted">{workouts ? `הכי הרבה: ${byHour.reduce((a, b) => (b.count > a.count ? b : a)).label}` : "עוד אין מספיק נתונים"}</p>
            <Chart data={byHour} />
          </Card>

          {byVibe.length > 0 && (
            <Card>
              <SectionTitle className="mb-3">לפי סוג אימון (דקות)</SectionTitle>
              <ul className="space-y-2">
                {byVibe.map(([v, m]) => (
                  <li key={v}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-semibold">{vibeLabel(v)}</span><span className="tabular-nums text-muted">{m} דק׳</span></div>
                    <div className="h-2 rounded-full bg-bg"><div className="h-2 rounded-full bg-accent" style={{ width: `${(m / byVibe[0][1]) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {recovery.length > 0 && (
            <Card tone="accent">
              <SectionTitle className="mb-3">איך הרגשת</SectionTitle>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {FEELINGS.map((f) => { const n = recovery.filter((r) => r.feeling === f.id).length; return n ? <p key={f.id} className="flex justify-between"><span>{f.emoji} {f.label}</span><b className="tabular-nums">{n}</b></p> : null; })}
                {BODY_STATES.map((b) => { const n = recovery.filter((r) => r.body_state === b.id).length; return n ? <p key={b.id} className="flex justify-between text-muted"><span>{b.label}</span><b className="tabular-nums">{n}</b></p> : null; })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <History logs={all} onOpen={setDetail} />
      )}

      <Sheet open={!!detail} onClose={() => setDetail(null)} title={detail?.title}>
        {detail && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {format(new Date(detail.performed_at), "EEEE, d בMMMM yyyy · HH:mm", { locale: he })}<br />
              {vibeLabel(detail.vibe)} · {intensityLabel(detail.intensity)} · {detail.duration_min} דק׳ · {detail.calories} קק״ל{detail.is_external && " · חיצוני"}
            </p>
            {detail.exercises_done.length > 0 && (
              <ul className="space-y-1.5">
                {detail.exercises_done.map((e, i) => (
                  <li key={i} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm">
                    <span className="font-semibold">{e.name}</span>
                    <span className="tabular-nums text-muted">{e.sets ? `${e.sets.filter((s) => s.done).length}/${e.sets.length} סטים` : e.duration_sec ? `${e.duration_sec} שנ׳` : ""}
                      {e.sets?.some((s) => s.weight_kg) && ` · ${e.sets.filter((s) => s.done && s.weight_kg).map((s) => `${s.reps ?? "?"}×${s.weight_kg}`).join(", ") || "—"} ק״ג`}</span>
                  </li>
                ))}
              </ul>
            )}
            {detail.notes && <p className="rounded-xl bg-surface px-3 py-2 text-sm">{detail.notes}</p>}
            <Button variant="danger" className="w-full" onClick={() => removeLog(detail)}>מחיקה</Button>
          </div>
        )}
      </Sheet>
    </main>
  );
}

function Big({ color, label, value, target }: { color: string; label: string; value: number; target: number }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />{label}</p>
      <p className="text-xl font-black tabular-nums leading-tight">{value}<span className="text-sm font-semibold text-muted"> / {Math.round(target)}</span></p>
    </div>
  );
}

function Chart({ data }: { data: { label: string; count: number }[] }) {
  // Chart is LTR internally; reverse so time flows right→left like the rest of the Hebrew UI.
  const rtl = [...data].reverse();
  return (
    <div dir="ltr" className="h-40 w-full" role="img" aria-label={data.map((d) => `${d.label}: ${d.count}`).join(", ")}>
      <ResponsiveContainer>
        <BarChart data={rtl} margin={{ top: 8, right: -28, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <YAxis orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "color-mix(in oklab, var(--ink) 6%, transparent)" }} contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)", color: "var(--ink)", fontSize: 12 }} formatter={(v) => [v, "אימונים"]} />
          <Bar dataKey="count" fill="var(--accent)" radius={[8, 8, 8, 8]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function History({ logs, onOpen }: { logs: WorkoutLog[]; onOpen: (l: WorkoutLog) => void }) {
  if (!logs.length) return <p className="py-10 text-center text-muted">עוד אין אימונים מתועדים. הראשון תמיד הכי קשה.</p>;
  const groups = new Map<string, WorkoutLog[]>();
  logs.forEach((l) => { const k = format(new Date(l.performed_at), "LLLL yyyy", { locale: he }); groups.set(k, [...(groups.get(k) ?? []), l]); });
  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([month, list]) => (
        <section key={month}>
          <h2 className="mb-2 flex items-baseline justify-between text-lg font-bold">{month}<span className="text-sm font-semibold text-muted">{list.length} אימונים · {list.reduce((n, l) => n + l.calories, 0)} קק״ל</span></h2>
          <ul className="space-y-2">
            {list.map((l) => (
              <li key={l.id}>
                <button onClick={() => onOpen(l)} className="flex w-full items-center justify-between rounded-2xl bg-surface px-4 py-3 text-start active:scale-[0.99]">
                  <span>
                    <span className="block font-semibold">{l.title}</span>
                    <span className="block text-xs text-muted">{format(new Date(l.performed_at), "EEEE d.M · HH:mm", { locale: he })} · {vibeLabel(l.vibe)}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{l.duration_min} דק׳</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
