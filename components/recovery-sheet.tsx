"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { db, userId } from "@/lib/db";
import { BODY_STATES, FEELINGS } from "@/lib/labels";
import type { BodyState, Feeling, WorkoutLog } from "@/lib/types";

type Props = { open: boolean; onClose: () => void; onSaved?: () => void; log?: WorkoutLog | null };

/** Separate "how did it feel?" entry — deliberately decoupled from the workout log so it can be filled later. */
export function RecoverySheet({ open, onClose, onSaved, log }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={log ? `איך היה ב${log.title}?` : "איך את מרגישה?"}>
      {open && <Form log={log} onDone={() => { onSaved?.(); onClose(); }} />}
    </Sheet>
  );
}

function Form({ log, onDone }: { log?: WorkoutLog | null; onDone: () => void }) {
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [body, setBody] = useState<BodyState | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!feeling || !body) return;
    setSaving(true);
    await db().from("recovery_logs").insert({ user_id: await userId(), log_id: log?.id ?? null, feeling, body_state: body, notes: notes || null });
    setSaving(false);
    onDone();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">האימון</p>
        <div className="grid grid-cols-2 gap-2">
          {FEELINGS.map((f) => (
            <button key={f.id} type="button" aria-pressed={feeling === f.id} onClick={() => setFeeling(f.id)} className={`flex h-16 items-center gap-3 rounded-2xl border px-4 text-start font-semibold transition-transform active:scale-95 ${feeling === f.id ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2"}`}>
              <span className="text-2xl" aria-hidden>{f.emoji}</span>{f.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">הגוף</p>
        <div className="grid grid-cols-2 gap-2">
          {BODY_STATES.map((b) => (
            <button key={b.id} type="button" aria-pressed={body === b.id} onClick={() => setBody(b.id)} className={`h-14 rounded-2xl border px-4 font-semibold transition-transform active:scale-95 ${body === b.id ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">משהו לציין? (איפה תפוס, מה כאב)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 outline-none" />
      </label>
      <Button size="lg" className="w-full" disabled={!feeling || !body} loading={saving} onClick={save}>שמירה</Button>
    </div>
  );
}
