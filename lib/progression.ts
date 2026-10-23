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
export function suggestWeight(history: LoggedSet[][], targetReps: number | null, progress: boolean, category: string | null): Suggestion | null {
  const [last, prev] = history.filter((s) => top(s) > 0);
  if (!last) return null;
  const kg = top(last);
  if (hit(last, targetReps)) {
    if (!progress) return { kg, why: "שומרים על המשקל" };
    const step = /dumbbell|kettlebell/.test(category ?? "") ? (kg < 10 ? 1 : 2) : 2.5;
    return { kg: kg + step, why: `השלמת הכל בפעם הקודמת · +${step} ק״ג` };
  }
  if (prev && top(prev) === kg && !hit(prev, targetReps)) return { kg: round(kg * 0.9), why: "פעמיים קשה ברצף · יורדים קצת ובונים מחדש" };
  return { kg, why: "אותו משקל עד שכל הסטים יושלמו" };
}
