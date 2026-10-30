import { NextResponse, type NextRequest } from "next/server";
import { bearerOk } from "@/lib/allowlist";
import { reminderCopy } from "@/lib/nudge";
import { pushToUser } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";
import { wallClock } from "@/lib/google-calendar";

/**
 * Called by pg_cron every 5 minutes (see supabase/migrations/*_cron.sql) with `Authorization: Bearer CRON_SECRET`.
 * 1. Planned workouts starting within [now, now + reminder_minutes_before] → "soon" push (once).
 * 2. Workout logs finished 2h+ ago without a recovery entry → "how did it feel?" push (once).
 */
export async function POST(request: NextRequest) {
  if (!bearerOk(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const now = new Date();
  const todayWall = wallClock(now); // "YYYY-MM-DDTHH:mm:ss" in Israel time
  const today = todayWall.slice(0, 10);
  const nowMin = Number(todayWall.slice(11, 13)) * 60 + Number(todayWall.slice(14, 16));
  let sent = 0;

  // --- 1. upcoming workouts ---
  const { data: planned } = await admin
    .from("scheduled_workouts")
    .select("id, user_id, title, time, date")
    .eq("status", "planned")
    .eq("date", today)
    .is("reminded_at", null)
    .not("time", "is", null);

  const userIds = Array.from(new Set((planned ?? []).map((p) => p.user_id)));
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, reminder_minutes_before, gender, display_name").in("id", userIds)
    : { data: [] as { id: string; reminder_minutes_before: number; gender: "female" | "male" | null; display_name: string | null }[] };
  const who = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const w of planned ?? []) {
    const [h, m] = w.time!.split(":").map(Number);
    const startMin = h * 60 + m;
    const profile = who.get(w.user_id);
    const before = profile?.reminder_minutes_before ?? 60;
    if (before <= 0) continue;
    const diff = startMin - nowMin;
    if (diff < 0 || diff > before) continue;
    const nudge = reminderCopy(w.id, profile?.gender ?? null, profile?.display_name ?? null);
    await pushToUser(w.user_id, {
      title: diff <= 5 ? nudge : `עוד ${diff} דק׳ — ${w.title}`,
      body: diff <= 5 ? w.title : nudge,
      url: `/session?scheduled=${w.id}`,
      tag: `workout-${w.id}`,
    });
    await admin.from("scheduled_workouts").update({ reminded_at: now.toISOString() }).eq("id", w.id);
    sent++;
  }

  // --- 2. recovery nudges ---
  const twoHoursAgo = new Date(now.getTime() - 2 * 3600_000).toISOString();
  const dayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
  const { data: logs } = await admin
    .from("workout_logs")
    .select("id, user_id, title")
    .is("recovery_reminded_at", null)
    .lte("performed_at", twoHoursAgo)
    .gte("performed_at", dayAgo);
  for (const l of logs ?? []) {
    const { count } = await admin.from("recovery_logs").select("id", { count: "exact", head: true }).eq("log_id", l.id);
    if (!count) {
      await pushToUser(l.user_id, { title: "איך הגוף מרגיש?", body: `רגע אחד לתעד איך היה ב${l.title}.`, url: "/?recovery=1", tag: `recovery-${l.id}` });
      sent++;
    }
    await admin.from("workout_logs").update({ recovery_reminded_at: now.toISOString() }).eq("id", l.id);
  }

  return NextResponse.json({ ok: true, sent });
}
