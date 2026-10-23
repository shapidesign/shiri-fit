"use client";

import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { db, userId } from "@/lib/db";
import { useProfile } from "@/components/profile-provider";
import { BODY_STATES, FEELINGS, feelingLabel, g } from "@/lib/labels";
import type { BodyState, Feeling, WorkoutLog } from "@/lib/types";

type Props = { open: boolean; onClose: () => void; onSaved?: () => void; log?: WorkoutLog | null };
type LogPick = Pick<WorkoutLog, "id" | "title" | "performed_at">;

/** Separate "how did it feel?" entry — can be filled later and tied to any recent workout (or none). */
export function RecoverySheet({ open, onClose, onSaved, log }: Props) {
  const { profile } = useProfile();
  return (
    <Sheet open={open} onClose={onClose} title={log ? `איך היה ב${log.title}?` : g(profile.gender, "איך את מרגישה?", "איך אתה מרגיש?")}>
      {open && <Form log={log} onDone={() => { onSaved?.(); onClose(); }} />}
    </Sheet>
  );
}

function Form({ log, onDone }: { log?: WorkoutLog | null; onDone: () => void }) {
  const { profile } = useProfile();
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [body, setBody] = useState<BodyState | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<LogPick[] | null>(null);
  const [logId, setLogId] = useState<string | null>(log?.id ?? null);

  useEffect(() => {
    (async () => {
      const { data } = await db().from("workout_logs").select("id, title, performed_at").order("performed_at", { ascending: false }).limit(10);
      const list = (data ?? []) as LogPick[];
      if (!log && list.length) {
        const { data: rec } = await db().from("recovery_logs").select("log_id").in("log_id", list.map((l) => l.id));
        const done = new Set((rec ?? []).map((r) => r.log_id));
        setLogId(list.find((l) => !done.has(l.id))?.id ?? null);
      }
      setLogs(log && !list.some((l) => l.id === log.id) ? [log, ...list] : list);
    })();
  }, [log]);

  async function save() {
    if (!feeling || !body) return;
    setSaving(true);
    const { error } = await db().from("recovery_logs").insert({ user_id: await userId(), log_id: logId, feeling, body_state: body, notes: notes || null });
    setSaving(false);
    if (error) return alert("השמירה נכשלה");
    onDone();
  }

  const option = (selected: boolean) => `flex h-16 items-center gap-3 rounded-2xl border px-4 text-start font-semibold transition-transform active:scale-95 ${selected ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface-2"}`;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">על איזה אימון?</p>
        {logs === null ? (
          <div className="h-11 animate-pulse rounded-full bg-surface" />
        ) : (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {logs.map((l) => (
              <Chip key={l.id} selected={logId === l.id} onClick={() => setLogId(l.id)}>
                {l.title} · {format(new Date(l.performed_at), "EEEEEE d.M", { locale: he })}
              </Chip>
            ))}
            <Chip selected={logId === null} onClick={() => setLogId(null)}>לא קשור לאימון</Chip>
          </div>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">האימון</p>
        <div className="grid grid-cols-2 gap-2">
          {FEELINGS.map((f) => (
            <button key={f.id} type="button" aria-pressed={feeling === f.id} onClick={() => setFeeling(f.id)} className={option(feeling === f.id)}>
              <f.Icon className="h-6 w-6 shrink-0" aria-hidden />{feelingLabel(f.id, profile.gender)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">הגוף</p>
        <div className="grid grid-cols-2 gap-2">
          {BODY_STATES.map((b) => (
            <button key={b.id} type="button" aria-pressed={body === b.id} onClick={() => setBody(b.id)} className={option(body === b.id)}>
              <b.Icon className="h-5 w-5 shrink-0" aria-hidden />{b.label}
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
