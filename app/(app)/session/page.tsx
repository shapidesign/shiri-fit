import { FOCUS_LABEL, type Focus } from "@/lib/generate";
import { EQUIPMENT, MUSCLES, VIBES } from "@/lib/labels";
import type { Vibe } from "@/lib/types";
import { SessionScreen, type QuickParams } from "./session-screen";

export default async function SessionPage({ searchParams }: PageProps<"/session">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const min = Number(str("min"));
  const vibe = str("vibe");
  const focus = str("focus");
  const muscle = str("muscle");
  const quick: QuickParams | null = sp.quick === "1" ? {
    minutes: min >= 10 && min <= 180 ? min : undefined,
    vibe: VIBES.some((v) => v.id === vibe) ? (vibe as Vibe) : undefined,
    equipment: str("eq")?.split(",").filter((e) => EQUIPMENT.some((x) => x.id === e)),
    focus: focus && focus in FOCUS_LABEL ? (focus as Focus) : undefined,
    muscle: MUSCLES.some((m) => m.id === muscle) ? muscle! : undefined,
  } : null;
  return <SessionScreen scheduledId={str("scheduled")} templateId={str("template")} quick={quick} />;
}
