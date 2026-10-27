export type LoggedSet = { reps?: number; weight_kg?: number; done: boolean };
export type Suggestion = { kg: number; why: string };

const top = (sets: LoggedSet[]) => Math.max(...sets.map((s) => s.weight_kg ?? 0));
const hit = (sets: LoggedSet[], reps: number | null) => sets.every((s) => s.done && (!reps || (s.reps ?? 0) >= reps));
const round = (kg: number) => Math.round(kg * 2) / 2;

/**
 * Double progression. `history` = this exercise's sets per past session, newest first.
 * All sets done at target reps → add weight (if the program wants progress); missed → repeat; missed twice at the same weight → drop 10%.
 * ponytail: no RPE / e1RM model; add one if users log RIR.
 */
/** Newest logged session: the reps and load they actually used. */
export function chosenWork(history: LoggedSet[][] | undefined): { reps?: number; kg?: number } {
  const last = history?.[0];
  if (!last?.length) return {};
  const reps = last.find((s) => s.reps)?.reps;
  const kg = Math.max(0, ...last.map((s) => s.weight_kg ?? 0));
  return { reps, kg: kg || undefined };
}

/** Next owned weight at or above `kg`. No list leaves `kg` alone. Nothing heavier stays on the heaviest they own. */
export function snapWeight(kg: number, owned: number[]): number {
  const list = [...new Set(owned.map(Number).filter((n) => n > 0))].sort((a, b) => a - b);
  if (!list.length) return kg;
  return list.find((w) => w >= kg) ?? list[list.length - 1];
}

export function suggestWeight(history: LoggedSet[][], targetReps: number | null, progress: boolean, category: string | null, owned: number[] = []): Suggestion | null {
  const [last, prev] = history.filter((s) => top(s) > 0);
  if (!last) return null;
  const kg = top(last);
  if (hit(last, targetReps)) {
    if (!progress) return { kg, why: "שומרים על המשקל" };
    const step = /dumbbell|kettlebell/.test(category ?? "") ? (kg < 10 ? 1 : 2) : 2.5;
    const next = snapWeight(kg + step, owned);
    if (owned.length && next <= kg) return { kg, why: "זה המשקל הכי כבד שיש לך" };
    return { kg: next, why: next === kg + step ? `השלמת הכל בפעם הקודמת · +${step} ק״ג` : `המשקל הבא שיש לך · ${next} ק״ג` };
  }
  if (prev && top(prev) === kg && !hit(prev, targetReps)) return { kg: round(kg * 0.9), why: "פעמיים קשה ברצף · יורדים קצת ובונים מחדש" };
  return { kg, why: "אותו משקל עד שכל הסטים יושלמו" };
}
