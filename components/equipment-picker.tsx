"use client";

import { Chip, ChipRow } from "@/components/ui/chip";
import { db } from "@/lib/db";
import { EQUIPMENT } from "@/lib/labels";
import type { Profile } from "@/lib/types";

type Props = { equipment: string[]; onEquipment: (e: string[]) => void; pairs: boolean | null; onPairs: (p: boolean) => void };

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** Equipment chips + "one dumbbell or a pair of each weight?" when dumbbells are picked. */
export function EquipmentPicker({ equipment, onEquipment, pairs, onPairs }: Props) {
  return (
    <div className="space-y-5">
      <ChipRow>
        {EQUIPMENT.map((e) => (
          <Chip key={e.id} selected={equipment.includes(e.id)} onClick={() => onEquipment(toggle(equipment, e.id))}>{e.label}</Chip>
        ))}
      </ChipRow>
      {equipment.includes("dumbbells") && (
        <div>
          <p className="mb-2 text-sm font-semibold">כמה משקולות יד יש מכל משקל?</p>
          <div role="group" aria-label="כמות משקולות" className="grid grid-cols-2 gap-3">
            {([[false, "משקולת אחת"], [true, "זוג"]] as const).map(([id, label]) => (
              <Chip key={label} selected={pairs === id} onClick={() => onPairs(id)} className="justify-center">{label}</Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Saves a newly answered dumbbell question so the generator (which reads the profile) sees it. */
export async function persistPairs(profile: Profile, setProfile: (p: Profile) => void, pairs: boolean | null) {
  if (pairs === profile.dumbbell_pairs) return;
  setProfile({ ...profile, dumbbell_pairs: pairs });
  await db().from("profiles").update({ dumbbell_pairs: pairs }).eq("id", profile.id);
}

export const equipmentValid = (equipment: string[], pairs: boolean | null) => !equipment.includes("dumbbells") || pairs !== null;
