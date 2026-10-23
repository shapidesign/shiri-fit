import type { BodyState, Feeling, Intensity, Profile, Status, Vibe } from "./types";

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

export const FEELINGS: { id: Feeling; label: string; emoji: string }[] = [
  { id: "great", label: "היה מעולה", emoji: "🔥" },
  { id: "good", label: "היה טוב", emoji: "🙂" },
  { id: "hard", label: "היה קשה", emoji: "😮‍💨" },
  { id: "exhausted", label: "גמורה", emoji: "🫠" },
];
export const feelingLabel = (id: Feeling, gender: Profile["gender"]) =>
  id === "exhausted" ? g(gender, "גמורה", "גמור") : FEELINGS.find((f) => f.id === id)?.label ?? id;
export const BODY_STATES: { id: BodyState; label: string }[] = [
  { id: "fresh", label: "הגוף רענן" },
  { id: "tight", label: "הגוף תפוס" },
  { id: "sore", label: "כאבי שרירים" },
  { id: "pain", label: "משהו כואב" },
];

// MuscleWiki muscle ids → Hebrew. Keys are lowercase API values.
export const MUSCLES: { id: string; label: string }[] = [
  { id: "chest", label: "חזה" },
  { id: "shoulders", label: "כתפיים" },
  { id: "biceps", label: "יד קדמית" },
  { id: "triceps", label: "יד אחורית" },
  { id: "forearms", label: "אמות" },
  { id: "abdominals", label: "בטן" },
  { id: "obliques", label: "אלכסונים" },
  { id: "lower back", label: "גב תחתון" },
  { id: "lats", label: "גב רחב" },
  { id: "traps", label: "טרפז" },
  { id: "glutes", label: "ישבן" },
  { id: "quads", label: "ירך קדמית" },
  { id: "hamstrings", label: "ירך אחורית" },
  { id: "calves", label: "שוקיים" },
  { id: "adductors", label: "מקרבים" },
  { id: "abductors", label: "מרחיקים" },
  { id: "neck", label: "צוואר" },
  { id: "full body", label: "כל הגוף" },
];
export const muscleLabel = (m: string) => MUSCLES.find((x) => x.id === m.toLowerCase())?.label ?? m;

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
