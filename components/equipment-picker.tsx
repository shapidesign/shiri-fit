"use client";

import { Chip } from "@/components/ui/chip";
import { db } from "@/lib/db";
import { gearAdvice } from "@/lib/generate";
import { EQUIPMENT, GEAR_GROUPS } from "@/lib/labels";
import type { Profile } from "@/lib/types";

type Props = {
  equipment: string[];
  onEquipment: (e: string[]) => void;
  pairs: boolean | null;
  onPairs: (p: boolean) => void;
  kbPairs: boolean | null;
  onKbPairs: (p: boolean) => void;
};

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

function Count({ label, value, onChange, one, two }: { label: string; value: boolean | null; onChange: (p: boolean) => void; one: string; two: string }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{label}</p>
      <div role="group" aria-label={label} className="grid grid-cols-2 gap-2">
        {([[false, one], [true, two]] as const).map(([id, text]) => (
          <Chip key={text} selected={value === id} onClick={() => onChange(id)} className="h-12 w-full justify-center">{text}</Chip>
        ))}
      </div>
    </div>
  );
}

/** Gym pieces, grouped so the list stays scannable. One-or-two only after dumbbells or kettlebells are picked. */
export function EquipmentPicker({ equipment, onEquipment, pairs, onPairs, kbPairs, onKbPairs }: Props) {
  return (
    <div className="space-y-4">
      {GEAR_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-bold text-muted">{group.label}</p>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT.filter((e) => e.group === group.id).map((e) => (
              <Chip key={e.id} selected={equipment.includes(e.id)} onClick={() => onEquipment(toggle(equipment, e.id))} className="h-auto min-h-12 w-full justify-center whitespace-normal px-3 py-2 text-center">
                {e.label}
              </Chip>
            ))}
          </div>
          {group.id === "weights" && equipment.includes("dumbbells") && <div className="mt-3"><Count label="כמה משקולות יד יש מכל משקל?" value={pairs} onChange={onPairs} one="משקולת אחת" two="זוג" /></div>}
          {group.id === "weights" && equipment.includes("kettlebells") && <div className="mt-3"><Count label="כמה קטלבלים יש מכל משקל?" value={kbPairs} onChange={onKbPairs} one="קטלבל אחד" two="זוג" /></div>}
        </div>
      ))}
    </div>
  );
}

/** Verdict after the picker. Tapping a suggestion adds it and the verdict updates immediately. */
export function GearCheck({ vibe, target, equipment, onAdd }: { vibe: string; target?: string; equipment: string[]; onAdd: (id: string) => void }) {
  const a = gearAdvice(vibe, target, equipment);
  return (
    <div key={`${a.headline}-${a.suggest.length}`} className="ask space-y-3">
      <p className={`rounded-2xl px-4 py-4 text-xl font-black ${a.ok ? "bg-success/15" : "bg-warn/15"}`}>{a.headline}</p>
      <p className="text-sm leading-relaxed text-muted">{a.detail}</p>
      {a.suggest.length > 0 && (
        <ul className="space-y-2">
          {a.suggest.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => onAdd(s.id)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface-2 px-4 text-start transition-transform duration-150 active:scale-[0.98]">
                <span className="min-w-0">
                  <span className="block font-bold">{s.label}</span>
                  <span className="block text-xs text-muted">{s.why}</span>
                </span>
                <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-sm font-bold text-accent-ink">הוספה</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Saves a newly answered one-or-two (and the gym list) so the next workout starts from it. */
export async function persistGear(profile: Profile, setProfile: (p: Profile) => void, gear: { equipment?: string[]; dumbbell_pairs: boolean | null; kettlebell_pairs: boolean | null }) {
  const patch: Partial<Profile> = {};
  if (gear.equipment && gear.equipment.join() !== profile.equipment.join()) patch.equipment = gear.equipment;
  if (gear.dumbbell_pairs !== profile.dumbbell_pairs) patch.dumbbell_pairs = gear.dumbbell_pairs;
  if (gear.kettlebell_pairs !== profile.kettlebell_pairs) patch.kettlebell_pairs = gear.kettlebell_pairs;
  if (!Object.keys(patch).length) return;
  setProfile({ ...profile, ...patch });
  await db().from("profiles").update(patch).eq("id", profile.id);
}

export const equipmentValid = (equipment: string[], pairs: boolean | null, kbPairs: boolean | null) =>
  (!equipment.includes("dumbbells") || pairs !== null) && (!equipment.includes("kettlebells") || kbPairs !== null);
