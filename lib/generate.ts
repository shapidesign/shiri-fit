import { addDays, differenceInCalendarDays, format } from "date-fns";
import type { Difficulty, Exercise, ExerciseDone, Profile, Vibe } from "./types";

export type Focus = "lower" | "upper" | "full";
export const FOCUS_LABEL: Record<Focus, string> = { lower: "פלג גוף תחתון", upper: "פלג גוף עליון", full: "כל הגוף" };

/** Vibes the exercise pool can build; the rest (run, walk, cycle...) are a timed session without exercises. */
export const GENERATED_VIBES: Vibe[] = ["strength", "pilates", "yoga", "hiit", "stretch"];

export const CORE_MUSCLES = ["abdominals", "obliques"];

// ponytail: ~3 s per rep and 30 s to switch exercise are rough averages; `pace` corrects them per user from logs.
const SEC_PER_REP = 3;
const SWITCH_SEC = 30;
/** Warm-up (2 × 45 s) and cool-down (2 × 30 s) plus switching. */
const WARM_COOL_SEC = 2 * 45 + 2 * 30 + 4 * SWITCH_SEC;

/** Work part of one exercise, in seconds: what `pace` scales. Rest is fixed because the timer enforces it. */
const workSec = (sets: number, reps: number | null, durationSec: number | null) =>
  sets * (reps ? reps * SEC_PER_REP : durationSec ?? 40) + SWITCH_SEC;

export type MainCountOpts = { sets?: number; reps?: number | null; durationSec?: number | null; rest?: number; pace?: number; bias?: number };

/** Main-block size that fills the session: each exercise is its sets' work (× pace) plus rest between sets. */
export function mainCount(minutes: number, o: MainCountOpts = {}) {
  const sets = o.sets ?? 3;
  const per = workSec(sets, o.reps === undefined ? 12 : o.reps, o.durationSec ?? null) * (o.pace ?? 1) + sets * (o.rest ?? 60);
  return Math.min(10, Math.max(2, Math.round((minutes * 60 - WARM_COOL_SEC) / per) + (o.bias ?? 0)));
}

/**
 * How fast this user works vs. the model, from one log: (actual − rest − warm-up/cool-down) / modelled work.
 * Main = exercises with reps or more than one set. Kept to 0.6–1.5 so one odd session can't swing it far.
 */
export function logPace(log: { duration_min: number; exercises_done: ExerciseDone[] }, rest: number): number | null {
  let work = 0;
  let other = 0;
  let mainSets = 0;
  for (const e of log.exercises_done) {
    const done = (e.sets ?? []).filter((s) => s.done);
    if (!done.length) continue;
    const isMain = done.some((s) => s.reps) || done.length > 1;
    if (!isMain) { other += (e.duration_sec ?? 30) * done.length + SWITCH_SEC; continue; }
    mainSets += done.length;
    work += done.reduce((n, s) => n + (s.reps ? s.reps * SEC_PER_REP : e.duration_sec ?? 40), 0) + SWITCH_SEC;
  }
  if (!work) return null;
  const actual = log.duration_min * 60 - Math.max(0, mainSets - 1) * rest - other;
  return Math.min(1.5, Math.max(0.6, actual / work));
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 1;
};

/** Pace (median of recent logs) and difficulty bias (+1 too easy, −1 too hard) from the newest logs first. */
export function trainingSignals(logs: { duration_min: number; exercises_done: ExerciseDone[]; difficulty: Difficulty | null; is_external: boolean }[], rest: number) {
  const paces = logs.filter((l) => !l.is_external).map((l) => logPace(l, rest)).filter((p): p is number => p !== null).slice(0, 5);
  const rated = logs.filter((l) => l.difficulty).slice(0, 3);
  const score = rated.filter((l) => l.difficulty === "easy").length - rated.filter((l) => l.difficulty === "hard").length;
  return { pace: paces.length ? median(paces) : 1, bias: Math.sign(score) };
}

export const WARMUP = /jumping jack|jog|march|arm circle|high knee|butt kick|inchworm|leg swing|cat.?cow/i;
export const STRETCH = /stretch/i;
export const cooldownCount = (goals: string[]) => (goals.includes("flexibility") ? 3 : 2);

/** Sets/reps for week 0-3 of a plan: reps first (+2), then a set (+1), then reps again. */
export function volumeFor(week: number, goals: string[]) {
  const w = Math.min(3, Math.max(0, week));
  const base = goals[0] === "strength" ? 8 : goals[0] === "endurance" ? 15 : 12;
  return { sets: w < 2 ? 3 : 4, reps: base + (w % 2) * 2, durationSec: 40 + 5 * w };
}

/** Whether to suggest heavier weights: strength/tone programs, not on light days. Too easy lately overrides light; too hard holds. */
export const progressFor = (intensity: string, vibe: string, goals: string[], bias: number) =>
  bias < 0 ? false : (bias > 0 || intensity !== "light") && (vibe === "strength" || goals.some((g) => g === "strength" || g === "tone"));

/** Rest between sets, in seconds. The first goal decides, like the reps. */
export const restFor = (goals: string[]) => (goals[0] === "strength" ? 90 : goals[0] === "endurance" ? 45 : 60);

const DIFFICULTY = ["novice", "intermediate", "advanced"];
/** Unknown difficulty counts as novice. */
export const fitsLevel = (e: Pick<Exercise, "difficulty">, level: number) => Math.max(0, DIFFICULTY.indexOf(e.difficulty ?? "novice")) <= level;

/** Next plan's level: up one (max 2) when at least 75% of the previous plan's target was done. */
export const nextLevel = (prev: { level: number; target: number; done: number } | null) =>
  !prev ? 0 : prev.done >= prev.target * 0.75 ? Math.min(2, prev.level + 1) : prev.level;

/** Which plan week (0-3) a yyyy-MM-dd date falls in. */
export const weekIndex = (start: Date, date: string) =>
  Math.min(3, Math.floor(differenceInCalendarDays(new Date(`${date}T00:00`), start) / 7));

/** Ties go to exercises with an animated demo. */
const byGif = (a: Pick<Exercise, "gif">, b: Pick<Exercise, "gif">) => Number(!!b.gif) - Number(!!a.gif);

/** `n` exercises from `pool`, preferring ones that hit `muscles`, then ones with a GIF, random within that. */
export const pickPreferring = (pool: Exercise[], n: number, muscles: string[]) =>
  [...pool]
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => Number(b.muscles.some((m) => muscles.includes(m))) - Number(a.muscles.some((m) => muscles.includes(m))) || byGif(a, b))
    .slice(0, n);

export function muscleOrder(focus: Focus, gender: Profile["gender"]) {
  if (focus === "lower") return ["glutes", "quads", "hamstrings", "calves", "adductors", "abdominals"];
  if (focus === "upper") return ["chest", "lats", "shoulders", "biceps", "triceps", "traps"];
  return gender === "male"
    ? ["chest", "lats", "shoulders", "quads", "hamstrings", "glutes", "triceps", "biceps", "abdominals"]
    : ["glutes", "hamstrings", "quads", "abdominals", "lats", "shoulders", "chest", "triceps"];
}

/** Core exercises in a workout: none, one, or two from 45 minutes. */
export const coreCount = (core: boolean | undefined, minutes: number) => (core ? (minutes >= 45 ? 2 : 1) : 0);

/** A plan of N days a week rotates these focuses. */
export const planFocuses = (days: number): Focus[] => (days <= 1 ? ["full"] : days === 2 ? ["lower", "upper"] : ["lower", "upper", "full"]);

export type GearCounts = { dumbbells: boolean | null; kettlebells: boolean | null };

// ponytail: one-dumbbell / two-kettlebell is a name heuristic; tag exercises in the DB if it misses too many.
const ONE_DUMBBELL = /single|one[- ]arm|1[- ]arm|goblet/i;
// "two arm" is one bell in both hands, so it must not match.
const TWO_KETTLEBELLS = /double|dual|(two|2)[- ]kettlebells?/i;
export const usableWithGear = (e: Pick<Exercise, "name" | "category">, gear: GearCounts) => {
  if (gear.dumbbells === false && e.category === "dumbbells" && !ONE_DUMBBELL.test(e.name)) return false;
  if (gear.kettlebells === false && e.category === "kettlebells" && TWO_KETTLEBELLS.test(e.name)) return false;
  return true;
};

/** Week volume for one row. Pinned exercises keep the reps the user already does; sets still climb. */
export function weekRow<T extends { phase: string; exercise_id: number | null; sets: number | null; reps: number | null; duration_sec: number | null }>(
  row: T, week: number, goals: string[], pinned: ReadonlySet<number>,
): T {
  if (row.phase !== "main") return row;
  const v = volumeFor(week, goals);
  const keep = row.exercise_id != null && pinned.has(row.exercise_id);
  return { ...row, sets: v.sets, reps: row.reps == null ? null : keep ? row.reps : v.reps, duration_sec: row.duration_sec == null ? null : v.durationSec };
}

/** One exercise per primary muscle, in `order` first; spare slots get a second exercise for the leading muscles. */
export function pickExercises(pool: Exercise[], count: number, order: string[], gear: GearCounts) {
  const seen = new Set<string>();
  const rank = (e: Exercise) => {
    const i = order.indexOf(e.muscles[0]);
    return i < 0 ? order.length : i;
  };
  // ponytail: random shuffle + first-per-muscle; no balancing of push/pull or difficulty.
  const sorted = pool
    .filter((e) => e.images.length && usableWithGear(e, gear))
    .sort(() => Math.random() - 0.5)
    .sort((a, b) => rank(a) - rank(b) || byGif(a, b));
  const first = sorted.filter((e) => e.muscles[0] && !seen.has(e.muscles[0]) && seen.add(e.muscles[0])).slice(0, count);
  if (first.length >= count) return first;
  const used = new Set(first.map((e) => e.id));
  const extra = sorted.filter((e) => e.muscles[0] && !used.has(e.id) && order.includes(e.muscles[0])).slice(0, count - first.length);
  // Group the second exercise next to the first one for the same muscle.
  return [...first, ...extra].sort((a, b) => rank(a) - rank(b));
}

/** Main block with the core question applied: `core` adds `coreCount` ab exercises, `false` keeps abs out. */
export function pickMain(pool: Exercise[], count: number, order: string[], gear: GearCounts, core: boolean | undefined, minutes: number) {
  if (core === undefined) return pickExercises(pool, count, order, gear);
  const isCore = (e: Exercise) => CORE_MUSCLES.includes(e.muscles[0]);
  const rest = order.filter((m) => !CORE_MUSCLES.includes(m));
  const nCore = Math.min(count - 1, coreCount(core, minutes));
  const abs = nCore ? pickExercises(pool.filter(isCore), nCore, CORE_MUSCLES, gear) : [];
  const others = pickExercises(pool.filter((e) => !isCore(e)), count - abs.length, rest, gear);
  return [...others, ...abs];
}

/** Every date (yyyy-MM-dd) from `start` for `weeks` weeks that falls on one of `weekdays` (0 = Sunday). */
export function planDates(start: Date, weekdays: number[], weeks = 4) {
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
    .filter((d) => weekdays.includes(d.getDay()))
    .map((d) => format(d, "yyyy-MM-dd"));
}
