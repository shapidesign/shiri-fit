import { NextResponse, type NextRequest } from "next/server";
import { deleteEvent, upsertEvent, wallClock, wallPlus } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { intensityLabel, vibeLabel } from "@/lib/labels";

/**
 * POST { kind: "scheduled" | "log", id } → creates/updates the Google Calendar event for that row, stores google_event_id.
 * DELETE { eventId } → removes the event.
 * The DB row is the source of truth; calendar is best-effort.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind, id } = (await request.json()) as { kind: "scheduled" | "log"; id: string };
  const { data: profile } = await supabase.from("profiles").select("calendar_sync, reminder_minutes_before").eq("id", user.id).single();
  if (!profile?.calendar_sync) return NextResponse.json({ skipped: "calendar_sync off" });

  if (kind === "scheduled") {
    const { data: w } = await supabase.from("scheduled_workouts").select("*").eq("id", id).single();
    if (!w) return NextResponse.json({ error: "not found" }, { status: 404 });
    const time = w.time ?? "08:00";
    const eventId = await upsertEvent(user.id, {
      summary: w.title,
      description: `${vibeLabel(w.vibe)} · ${intensityLabel(w.intensity)} · ${w.duration_min} דק׳${w.notes ? `\n${w.notes}` : ""}`,
      start: wallPlus(w.date, time, 0),
      end: wallPlus(w.date, time, w.duration_min),
      reminderMinutes: profile.reminder_minutes_before,
    }, w.google_event_id);
    if (eventId && eventId !== w.google_event_id) await supabase.from("scheduled_workouts").update({ google_event_id: eventId }).eq("id", id);
    return NextResponse.json({ eventId });
  }

  const { data: l } = await supabase.from("workout_logs").select("*").eq("id", id).single();
  if (!l) return NextResponse.json({ error: "not found" }, { status: 404 });
  const start = new Date(l.performed_at);
  const eventId = await upsertEvent(user.id, {
    summary: l.title,
    description: `${vibeLabel(l.vibe)} · ${l.duration_min} דק׳ · ${l.calories} קק״ל${l.notes ? `\n${l.notes}` : ""}`,
    start: wallClock(start),
    end: wallClock(new Date(start.getTime() + l.duration_min * 60_000)),
    reminderMinutes: 0,
  }, l.google_event_id);
  if (eventId && eventId !== l.google_event_id) await supabase.from("workout_logs").update({ google_event_id: eventId }).eq("id", id);
  return NextResponse.json({ eventId });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { eventId } = (await request.json()) as { eventId: string };
  if (eventId) await deleteEvent(user.id, eventId);
  return NextResponse.json({ ok: true });
}
