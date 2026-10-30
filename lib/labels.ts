import { Activity, BatteryLow, Flame, Leaf, Lock, Smile, TriangleAlert, Wind, type LucideIcon } from "lucide-react";
import type { BodyState, Difficulty, Feeling, Intensity, Phase, Profile, Status, Vibe } from "./types";

/** Copy addressed to the user: feminine by default (null = not answered), masculine for men. */
export const g = (gender: Profile["gender"], f: string, m: string) => (gender === "male" ? m : f);

export const VIBES: { id: Vibe; label: string }[] = [
  { id: "strength", label: "כוח" },
  { id: "pilates", label: "פילאטיס" },
  { id: "yoga", label: "יוגה" },
  { id: "cardio", label: "אירובי" },
  { id: "hiit", label: "HIIT" },
  { id: "walk", label: "הליכה" },
  { id: "run", label: "ריצה" },
  { id: "cycle", label: "אופניים" },
  { id: "stretch", label: "מתיחות" },
  { id: "other", label: "אחר" },
];
// "swim" is no longer offered but may exist on old rows.
export const vibeLabel = (v: string) => VIBES.find((x) => x.id === v)?.label ?? (v === "swim" ? "שחייה" : v);

export const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: "light", label: "קל" },
  { id: "moderate", label: "בינוני" },
  { id: "hard", label: "קשה" },
];
export const intensityLabel = (i: string) => INTENSITIES.find((x) => x.id === i)?.label ?? i;

export const STATUS_LABEL: Record<Status, string> = { planned: "מתוכנן", done: "בוצע", skipped: "דולג" };

export const PHASE_LABEL: Record<Phase, string> = { warmup: "חימום", main: "אימון", cooldown: "שחרור" };

type Tone = Status | "missed" | "offPlan";
const TONE_DOT: Record<Tone, string> = { done: "bg-success", offPlan: "bg-info", planned: "bg-accent", missed: "bg-danger", skipped: "bg-muted/40" };
const TONE_BORDER: Record<Tone, string> = { done: "border-success", offPlan: "border-info", planned: "border-accent", missed: "border-danger", skipped: "border-muted/40" };
const TONE_LABEL: Record<Tone, string> = { ...STATUS_LABEL, missed: "פוספס", offPlan: "בוצע מחוץ לתוכנית" };
export const TONE_LEGEND = (["done", "offPlan", "planned", "missed", "skipped"] as const).map((t) => ({ dot: TONE_DOT[t], label: t === "planned" ? "לביצוע" : t === "offPlan" ? "מחוץ לתוכנית" : TONE_LABEL[t] }));

/** Calendar colors: a planned workout whose date (yyyy-MM-dd) is before `today` counts as missed. */
export function statusTone(w: { status: Status; date: string; off_plan?: boolean }, today: string) {
  const t: Tone = w.status === "planned" && w.date < today ? "missed" : w.status === "done" && w.off_plan ? "offPlan" : w.status;
  return { dot: TONE_DOT[t], border: TONE_BORDER[t], label: TONE_LABEL[t] };
}

export const FEELINGS: { id: Feeling; label: string; Icon: LucideIcon }[] = [
  { id: "great", label: "היה מעולה", Icon: Flame },
  { id: "good", label: "היה טוב", Icon: Smile },
  { id: "hard", label: "היה קשה", Icon: Wind },
  { id: "exhausted", label: "גמורה", Icon: BatteryLow },
];
export const feelingLabel = (id: Feeling, gender: Profile["gender"]) =>
  id === "exhausted" ? g(gender, "גמורה", "גמור") : FEELINGS.find((f) => f.id === id)?.label ?? id;
export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "קל מדי" },
  { id: "right", label: "בדיוק" },
  { id: "hard", label: "קשה מדי" },
];
export const BODY_STATES: { id: BodyState; label: string; Icon: LucideIcon }[] = [
  { id: "fresh", label: "הגוף רענן", Icon: Leaf },
  { id: "tight", label: "הגוף תפוס", Icon: Lock },
  { id: "sore", label: "כאבי שרירים", Icon: Activity },
  { id: "pain", label: "משהו כואב", Icon: TriangleAlert },
];

// MuscleWiki muscle ids → Hebrew. Keys are lowercase API values.
export const MUSCLES: { id: string; label: string }[] = [
  { id: "chest", label: "חזה" },
  { id: "shoulders", label: "דלתא" },
  { id: "biceps", label: "דו-ראשי" },
  { id: "triceps", label: "תלת-ראשי" },
  { id: "forearms", label: "אמות" },
  { id: "abdominals", label: "ישר הבטן" },
  { id: "obliques", label: "אלכסוני הבטן" },
  { id: "lower back", label: "זוקפי גב" },
  { id: "lats", label: "רחב גבי" },
  { id: "traps", label: "טרפז" },
  { id: "glutes", label: "עכוז" },
  { id: "quads", label: "ארבע-ראשי" },
  { id: "hamstrings", label: "מיתר הברך" },
  { id: "calves", label: "תאומים" },
  { id: "adductors", label: "מקרבים" },
  { id: "abductors", label: "מרחיקים" },
  { id: "neck", label: "צוואר" },
  { id: "full body", label: "כל הגוף" },
];
export const muscleLabel = (m: string) => MUSCLES.find((x) => x.id === m.toLowerCase())?.label ?? m;

/** 45 שנ׳ stays in seconds; a whole number of minutes is shown as minutes. */
export const durationLabel = (sec: number) => (sec >= 60 && sec % 60 === 0 ? `${sec / 60} דק׳` : `${sec} שנ׳`);

export const EQUIPMENT: { id: string; label: string }[] = [
  { id: "bodyweight", label: "משקל גוף" },
  { id: "dumbbells", label: "משקולות יד" },
  { id: "kettlebells", label: "קטלבל" },
  { id: "barbell", label: "מוט" },
  { id: "bands", label: "גומיות" },
  { id: "machine", label: "מכשירים" },
  { id: "cables", label: "כבלים" },
  { id: "mat", label: "מזרן" },
  { id: "trx", label: "TRX" },
  { id: "pilates reformer", label: "רפורמר" },
  { id: "exercise ball", label: "כדור פיזיו" },
  { id: "medicine ball", label: "כדור כוח" },
];
// "other" (unknown gear) keeps the kg field, so only categories known to be weight-free are listed.
const NO_WEIGHT = new Set(["bodyweight", "mat", "bands", "trx", "pilates reformer", "exercise ball"]);
/** Whether to log kg for an exercise; null = custom exercise, weight optional. */
export const needsWeight = (category: string | null) => !category || !NO_WEIGHT.has(category);
export const equipmentLabel = (e: string) => EQUIPMENT.find((x) => x.id === e)?.label ?? (e === "other" ? "ציוד אחר" : e);

export const GOALS: { id: string; label: string }[] = [
  { id: "strength", label: "להתחזק" },
  { id: "tone", label: "חיטוב" },
  { id: "flexibility", label: "גמישות" },
  { id: "endurance", label: "סיבולת" },
  { id: "posture", label: "יציבה וגב בריא" },
  { id: "energy", label: "אנרגיה ומצב רוח" },
  { id: "consistency", label: "פשוט להתמיד" },
];

export const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export const EXPERIENCE: { id: NonNullable<Profile["training_experience"]>; f: string; m: string; level: number }[] = [
  { id: "new", f: "חדשה לגמרי", m: "חדש לגמרי", level: 0 },
  { id: "some", f: "כמה חודשים", m: "כמה חודשים", level: 1 },
  { id: "years", f: "כבר שנים", m: "כבר שנים", level: 2 },
];
export const experienceLevel = (id: string | null | undefined) => EXPERIENCE.find((e) => e.id === id)?.level;

export const CONDITIONING: { id: NonNullable<Profile["conditioning"]>; f: string; m: string }[] = [
  { id: "low", f: "מתעייפת מהר", m: "מתעייף מהר" },
  { id: "moderate", f: "בינוני", m: "בינוני" },
  { id: "high", f: "יכולה לדחוף", m: "יכול לדחוף" },
];
export const intensityFor = (id: Profile["conditioning"]): Intensity => (id === "low" ? "light" : id === "high" ? "hard" : "moderate");

export const OWNED_PRESETS = [4, 6, 8, 10, 12, 16, 20, 24, 32];
