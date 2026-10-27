"use client";

import { Chip, ChipRow } from "@/components/ui/chip";
import { db } from "@/lib/db";
import { EQUIPMENT } from "@/lib/labels";
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
      <div role="group" aria-label={label} className="grid grid-cols-2 gap-3">
        {([[false, one], [true, two]] as const).map(([id, text]) => (
          <Chip key={text} selected={value === id} onClick={() => onChange(id)} className="justify-center">{text}</Chip>
        ))}
      </div>
    </div>
  );
}

/** Equipment chips, plus one-or-two when dumbbells or kettlebells are picked. */
export function EquipmentPicker({ equipment, onEquipment, pairs, onPairs, kbPairs, onKbPairs }: Props) {
  return (
    <div className="space-y-5">
      <ChipRow>
        {EQUIPMENT.map((e) => (
          <Chip key={e.id} selected={equipment.includes(e.id)} onClick={() => onEquipment(toggle(equipment, e.id))}>{e.label}</Chip>
        ))}
      </ChipRow>
      {equipment.includes("dumbbells") && <Count label="כמה משקולות יד יש מכל משקל?" value={pairs} onChange={onPairs} one="משקולת אחת" two="זוג" />}
      {equipment.includes("kettlebells") && <Count label="כמה קטלבלים יש מכל משקל?" value={kbPairs} onChange={onKbPairs} one="קטלבל אחד" two="זוג" />}
    </div>
  );
}

/** "Include core/abs?" Asked every time a workout is built, nothing preselected. */
export function CoreQuestion({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">לשלב בטן / ליבה?</p>
      <div role="group" aria-label="לשלב בטן / ליבה?" className="grid grid-cols-2 gap-3">
        {([[true, "כן"], [false, "לא"]] as const).map(([id, text]) => (
          <Chip key={text} selected={value === id} onClick={() => onChange(id)} className="justify-center">{text}</Chip>
        ))}
      </div>
    </div>
  );
}

/** Saves a newly answered one-or-two question so the generator (which reads the profile) sees it. */
export async function persistGear(profile: Profile, setProfile: (p: Profile) => void, gear: { dumbbell_pairs: boolean | null; kettlebell_pairs: boolean | null }) {
  const patch: Partial<Profile> = {};
  if (gear.dumbbell_pairs !== profile.dumbbell_pairs) patch.dumbbell_pairs = gear.dumbbell_pairs;
  if (gear.kettlebell_pairs !== profile.kettlebell_pairs) patch.kettlebell_pairs = gear.kettlebell_pairs;
  if (!Object.keys(patch).length) return;
  setProfile({ ...profile, ...patch });
  await db().from("profiles").update(patch).eq("id", profile.id);
}

export const equipmentValid = (equipment: string[], pairs: boolean | null, kbPairs: boolean | null) =>
  (!equipment.includes("dumbbells") || pairs !== null) && (!equipment.includes("kettlebells") || kbPairs !== null);
