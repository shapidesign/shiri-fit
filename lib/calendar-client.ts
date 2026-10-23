"use client";

/** Fire-and-forget Google Calendar sync. Failures never block the UI — the DB is the source of truth. */
export async function syncCalendar(kind: "scheduled" | "log", id: string) {
  try {
    await fetch("/api/calendar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id }) });
  } catch { /* offline — fine */ }
}

export async function removeCalendarEvent(eventId: string | null | undefined) {
  if (!eventId) return;
  try {
    await fetch("/api/calendar", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ eventId }) });
  } catch { /* offline — fine */ }
}
