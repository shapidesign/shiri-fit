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

export type GearCover = "push" | "pull" | "legs" | "glutes" | "arms" | "core" | "cardio" | "mobility";
export type Gear = {
  id: string;
  label: string;
  group: "cardio" | "weights" | "stations" | "machines";
  /** Exercise-db category this piece unlocks. Null = a station, not its own category. */
  category: string | null;
  /** Name gate. ponytail: regex over exercise names; tag a column if it misses. */
  match?: RegExp;
  covers: GearCover[];
};

/** What Shiri's gym actually has, in picker order. */
export const EQUIPMENT: Gear[] = [
  { id: "bike", label: "אופני כושר", group: "cardio", category: null, covers: ["cardio"] },
  { id: "treadmill", label: "הליכון", group: "cardio", category: null, covers: ["cardio"] },
  { id: "elliptical", label: "אליפטיקל", group: "cardio", category: null, covers: ["cardio"] },
  { id: "stairmaster", label: "Stairmaster", group: "cardio", category: null, covers: ["cardio", "legs"] },
  { id: "dumbbells", label: "משקולות יד", group: "weights", category: "dumbbells", covers: ["push", "pull", "legs", "glutes", "arms", "core"] },
  { id: "kettlebells", label: "קטלבל", group: "weights", category: "kettlebells", covers: ["push", "legs", "glutes", "core"] },
  { id: "barbell", label: "מוט", group: "weights", category: "barbell", covers: ["push", "pull", "legs", "glutes", "arms"] },
  { id: "ez-bar", label: "מוט W", group: "weights", category: "barbell", match: /ez|e-z|curl bar/i, covers: ["arms"] },
  { id: "bench", label: "ספסל רגיל", group: "stations", category: null, match: /bench/i, covers: [] },
  { id: "bench-press", label: "ספסל bench press", group: "stations", category: null, covers: ["push"] },
  { id: "pullup", label: "מתח", group: "stations", category: null, match: /pull-?ups?|chin-?ups?|pullups?/i, covers: ["pull"] },
  { id: "mat", label: "מזרן", group: "stations", category: "mat", covers: ["mobility", "core"] },
  { id: "step", label: "מדרגה", group: "stations", category: null, match: /step-?ups?/i, covers: ["legs", "glutes"] },
  { id: "trx", label: "TRX", group: "stations", category: "trx", covers: ["push", "pull", "core"] },
  { id: "hip-thruster", label: "Hip thruster", group: "machines", category: "machine", match: /hip thrust/i, covers: ["glutes"] },
  { id: "cables", label: "Cable machine", group: "machines", category: "cables", covers: ["push", "pull", "legs", "glutes", "arms", "core"] },
  { id: "lat-pulldown", label: "Lat pulldown", group: "machines", category: "cables", match: /pulldown|lat pull/i, covers: ["pull"] },
  { id: "leg-press", label: "Leg press", group: "machines", category: "machine", match: /leg press/i, covers: ["legs", "glutes"] },
  { id: "preacher", label: "מכונת preacher curls", group: "machines", category: "machine", match: /preacher/i, covers: ["arms"] },
  { id: "leg-extension", label: "מכונת leg extension", group: "machines", category: "machine", match: /leg extension/i, covers: ["legs"] },
  { id: "hamstring-curl", label: "מכונת hamstring curls", group: "machines", category: "machine", match: /leg curl|hamstring curl/i, covers: ["legs"] },
  { id: "chest-press", label: "מכונת לחיצת חזה (פרפר)", group: "machines", category: "machine", match: /pec deck|butterfly|chest press|pec fly|machine fly/i, covers: ["push"] },
  { id: "shoulder-press", label: "מכונת לחיצת כתפיים", group: "machines", category: "machine", match: /shoulder press/i, covers: ["push"] },
  { id: "smith", label: "Smith machine", group: "machines", category: "machine", match: /smith/i, covers: ["push", "legs", "glutes"] },
  { id: "leg-raise", label: "Leg raise tower", group: "machines", category: null, match: /hanging leg|captain/i, covers: ["core"] },
  { id: "hip-machine", label: "מכונת מקרבי/מרחיקי ירך", group: "machines", category: "machine", match: /hip adduction|hip abduction|adductor|abductor/i, covers: ["legs"] },
];

export const GEAR_GROUPS: { id: Gear["group"]; label: string }[] = [
  { id: "cardio", label: "אירובי" },
  { id: "weights", label: "משקלים חופשיים" },
  { id: "stations", label: "ספסלים ומתח" },
  { id: "machines", label: "מכונות" },
];

const CATEGORY_LABEL: Record<string, string> = {
  bodyweight: "משקל גוף",
  dumbbells: "משקולות יד",
  kettlebells: "קטלבל",
  barbell: "מוט",
  bands: "גומיות",
  machine: "מכשיר",
  cables: "כבלים",
  mat: "מזרן",
  trx: "TRX",
  "pilates reformer": "רפורמר",
  "exercise ball": "כדור פיזיו",
  "medicine ball": "כדור כוח",
  other: "ציוד אחר",
};

/** Old profile values → current ids. "machine" is too coarse to guess, so it drops. */
export function normalizeEquipment(ids: string[]): string[] {
  const known = new Set(EQUIPMENT.map((e) => e.id));
  const out: string[] = [];
  for (const id of ids) {
    const next = id === "cable" ? "cables" : id;
    if (known.has(next) && !out.includes(next)) out.push(next);
  }
  return out;
}

/** DB categories to query for a selection. Bodyweight is always in, stretches add "other" at the call site. */
export function gearCategories(ids: string[]): string[] {
  const selected = new Set(normalizeEquipment(ids));
  const cats = new Set<string>(["bodyweight"]);
  for (const g of EQUIPMENT) if (selected.has(g.id) && g.category) cats.add(g.category);
  return [...cats];
}

// "other" (unknown gear) keeps the kg field, so only categories known to be weight-free are listed.
const NO_WEIGHT = new Set(["bodyweight", "mat", "bands", "trx", "pilates reformer", "exercise ball"]);
/** Whether to log kg for an exercise; null = custom exercise, weight optional. */
export const needsWeight = (category: string | null) => !category || !NO_WEIGHT.has(category);
export const equipmentLabel = (e: string) => EQUIPMENT.find((x) => x.id === e)?.label ?? CATEGORY_LABEL[e] ?? e;

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
