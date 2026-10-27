import { db } from "@/lib/db";
import type { LoggedSet } from "@/lib/progression";

/** In-progress workout on this phone. ponytail: localStorage only; a profiles jsonb column is the upgrade for a second device. */
export type ActiveSession = {
  templateId: string | null;
  scheduledId: string | null;
  title: string;
  href: string;
  sets: Record<string, LoggedSet[]>;
};

const key = (userId: string) => `shiri-draft:${userId}`;

export function readDraft(userId: string): ActiveSession | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const d = JSON.parse(raw) as ActiveSession;
    if (!d || typeof d.href !== "string" || typeof d.title !== "string" || !d.sets) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeDraft(userId: string, draft: ActiveSession) {
  try { localStorage.setItem(key(userId), JSON.stringify(draft)); } catch { /* private mode */ }
}

export function clearDraft(userId: string) {
  try { localStorage.removeItem(key(userId)); } catch { /* private mode */ }
}

/** Drop the draft. Delete the template only when nothing on the calendar or in the log points at it. */
export async function discardDraft(userId: string) {
  const draft = readDraft(userId);
  clearDraft(userId);
  if (draft?.templateId) await deleteIfOrphan(draft.templateId);
}

/** Start a different workout. The previous template goes away if it was never scheduled or logged. */
export async function replaceDraft(userId: string, next: ActiveSession) {
  const prev = readDraft(userId);
  writeDraft(userId, next);
  if (prev?.templateId && prev.templateId !== next.templateId) await deleteIfOrphan(prev.templateId);
}

async function deleteIfOrphan(templateId: string) {
  const supabase = db();
  const [{ count: scheduled }, { count: logs }] = await Promise.all([
    supabase.from("scheduled_workouts").select("id", { count: "exact", head: true }).eq("template_id", templateId),
    supabase.from("workout_logs").select("id", { count: "exact", head: true }).eq("template_id", templateId),
  ]);
  if ((scheduled ?? 1) === 0 && (logs ?? 1) === 0) await supabase.from("workout_templates").delete().eq("id", templateId);
}
