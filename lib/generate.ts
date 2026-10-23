import { addDays, differenceInCalendarDays, format } from "date-fns";
import type { Exercise, Profile, Vibe } from "./types";

export type Focus = "lower" | "upper" | "full";
export const FOCUS_LABEL: Record<Focus, string> = { lower: "פלג גוף תחתון", upper: "פלג גוף עליון", full: "כל הגוף" };

/** Vibes the exercise pool can build; the rest (run, walk, cycle...) are a timed session without exercises. */
export const GENERATED_VIBES: Vibe[] = ["strength", "pilates", "yoga", "hiit", "stretch"];

/** Main-block size; warm-up + cool-down take about 8 minutes of the session. */
export const mainCount = (minutes: number) => Math.min(10, Math.max(2, Math.round((minutes - 8) / 8)));

export const WARMUP = /jumping jack|jog|march|arm circle|high knee|butt kick|inchworm|leg swing|cat.?cow/i;
export const STRETCH = /stretch/i;
export const cooldownCount = (goals: string[]) => (goals.includes("flexibility") ? 3 : 2);

/** Sets/reps for week 0-3 of a plan: reps first (+2), then a set (+1), then reps again. */
export function volumeFor(week: number, goals: string[]) {
  const w = Math.min(3, Math.max(0, week));
  const base = goals[0] === "strength" ? 8 : goals[0] === "endurance" ? 15 : 12;
  return { sets: w < 2 ? 3 : 4, reps: base + (w % 2) * 2, durationSec: 40 + 5 * w };
}

const DIFFICULTY = ["novice", "intermediate", "advanced"];
/** Unknown difficulty counts as novice. */
export const fitsLevel = (e: Pick<Exercise, "difficulty">, level: number) => Math.max(0, DIFFICULTY.indexOf(e.difficulty ?? "novice")) <= level;

/** Next plan's level: up one (max 2) when at least 75% of the previous plan's target was done. */
export const nextLevel = (prev: { level: number; target: number; done: number } | null) =>
  !prev ? 0 : prev.done >= prev.target * 0.75 ? Math.min(2, prev.level + 1) : prev.level;

/** Which plan week (0-3) a yyyy-MM-dd date falls in. */
export const weekIndex = (start: Date, date: string) =>
  Math.min(3, Math.floor(differenceInCalendarDays(new Date(`${date}T00:00`), start) / 7));

/** `n` exercises from `pool`, preferring ones that hit `muscles`, random within that. */
export const pickPreferring = (pool: Exercise[], n: number, muscles: string[]) =>
  [...pool]
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => Number(b.muscles.some((m) => muscles.includes(m))) - Number(a.muscles.some((m) => muscles.includes(m))))
    .slice(0, n);

export function muscleOrder(focus: Focus, gender: Profile["gender"]) {
  if (focus === "lower") return ["glutes", "quads", "hamstrings", "calves", "adductors", "abdominals"];
  if (focus === "upper") return ["chest", "lats", "shoulders", "biceps", "triceps", "traps"];
  return gender === "male"
    ? ["chest", "lats", "shoulders", "quads", "triceps", "abdominals"]
    : ["glutes", "hamstrings", "quads", "abdominals", "lats", "shoulders"];
}

/** A plan of N days a week rotates these focuses. */
export const planFocuses = (days: number): Focus[] => (days <= 1 ? ["full"] : days === 2 ? ["lower", "upper"] : ["lower", "upper", "full"]);

// ponytail: "can do it with one dumbbell" is a name heuristic; tag exercises in the DB if it misses too many.
const ONE_DUMBBELL = /single|one[- ]arm|1[- ]arm|goblet/i;
export const usableWithGear = (e: Pick<Exercise, "name" | "category">, dumbbellPairs: boolean | null) =>
  dumbbellPairs !== false || e.category !== "dumbbells" || ONE_DUMBBELL.test(e.name);

/** One exercise per primary muscle, in `order` first, then random others to fill `count`. */
export function pickExercises(pool: Exercise[], count: number, order: string[], dumbbellPairs: boolean | null) {
  const seen = new Set<string>();
  const rank = (e: Exercise) => {
    const i = order.indexOf(e.muscles[0]);
    return i < 0 ? order.length : i;
  };
  // ponytail: random shuffle + first-per-muscle; no balancing of push/pull or difficulty.
  return pool
    .filter((e) => e.images.length && usableWithGear(e, dumbbellPairs))
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => rank(a) - rank(b))
    .filter((e) => e.muscles[0] && !seen.has(e.muscles[0]) && seen.add(e.muscles[0]))
    .slice(0, count);
}

/** Every date (yyyy-MM-dd) from `start` for `weeks` weeks that falls on one of `weekdays` (0 = Sunday). */
export function planDates(start: Date, weekdays: number[], weeks = 4) {
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
    .filter((d) => weekdays.includes(d.getDay()))
    .map((d) => format(d, "yyyy-MM-dd"));
}
