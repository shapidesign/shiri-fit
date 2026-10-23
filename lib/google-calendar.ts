import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const TZ = "Asia/Jerusalem";

/** Exchange the stored refresh token for a short-lived access token. */
async function accessToken(userId: string): Promise<string | null> {
  const { data } = await createAdminClient().from("google_tokens").select("refresh_token").eq("user_id", userId).maybeSingle();
  if (!data) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null; // revoked / expired (OAuth app in "Testing" mode expires tokens after 7 days)
  return (await res.json()).access_token as string;
}

/** start/end are Israel wall-clock strings "YYYY-MM-DDTHH:mm:ss" (Google accepts no-offset dateTime when timeZone is set). */
export type CalendarEvent = {
  summary: string;
  description?: string;
  start: string;
  end: string;
  reminderMinutes?: number | null;
};

/** Wall-clock in TZ for an absolute instant. */
export function wallClock(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .format(d).replace(" ", "T");
}

/** Wall-clock from a date + "HH:mm[:ss]" + offset in minutes (no timezone math: treat the wall time as UTC, add, strip Z). */
export function wallPlus(date: string, time: string, minutes: number): string {
  return new Date(new Date(`${date}T${time.slice(0, 5)}:00Z`).getTime() + minutes * 60_000).toISOString().slice(0, 19);
}

async function gcal(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  return res;
}

const body = (e: CalendarEvent) => ({
  summary: `🏋️ ${e.summary}`,
  description: e.description ?? "Shiri Fit",
  start: { dateTime: e.start, timeZone: TZ },
  end: { dateTime: e.end, timeZone: TZ },
  reminders: e.reminderMinutes != null
    ? { useDefault: false, overrides: e.reminderMinutes > 0 ? [{ method: "popup", minutes: e.reminderMinutes }] : [] }
    : { useDefault: true },
  colorId: "2", // sage — close to the app's lime
});

/** Create or update (if eventId given). Returns the event id, or null if the user has no usable token. */
export async function upsertEvent(userId: string, event: CalendarEvent, eventId?: string | null): Promise<string | null> {
  const token = await accessToken(userId);
  if (!token) return null;
  if (eventId) {
    const res = await gcal(token, `/${encodeURIComponent(eventId)}`, { method: "PATCH", body: JSON.stringify(body(event)) });
    if (res.ok) return eventId;
    if (res.status !== 404 && res.status !== 410) return null; // deleted in Google → recreate below
  }
  const res = await gcal(token, "", { method: "POST", body: JSON.stringify(body(event)) });
  if (!res.ok) return null;
  return (await res.json()).id as string;
}

export async function deleteEvent(userId: string, eventId: string) {
  const token = await accessToken(userId);
  if (!token) return;
  await gcal(token, `/${encodeURIComponent(eventId)}`, { method: "DELETE" });
}
