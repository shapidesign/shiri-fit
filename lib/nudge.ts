import type { Profile } from "./types";

const g = (gender: Profile["gender"], f: string, m: string) => (gender === "male" ? m : f);

const NUDGES: ((name: string | null) => { f: string; m: string })[] = [
  (name) => name
    ? { f: `${name} יא אלופה, בואי נתאמן`, m: `${name} יא אלוף, בוא נתאמן` }
    : { f: "יא אלופה, בואי נתאמן", m: "יא אלוף, בוא נתאמן" },
  () => ({ f: "תותחית! בואי נתאמן ביחד", m: "תותח! בוא נתאמן ביחד" }),
  (name) => name
    ? { f: `${name}, היום הזה שלך. בואי נזיז את הגוף`, m: `${name}, היום הזה שלך. בוא נזיז את הגוף` }
    : { f: "היום הזה שלך. בואי נזיז את הגוף", m: "היום הזה שלך. בוא נזיז את הגוף" },
  () => ({ f: "יאללה אלופה, כמה דקות ואת בפנים", m: "יאללה אלוף, כמה דקות ואתה בפנים" }),
  () => ({ f: "הכול מוכן? בקבוק מים, מזרן, ויאללה.", m: "הכול מוכן? בקבוק מים, מזרן, ויאללה." }),
];

/** Stable line for one workout, so a retry of the same reminder doesn't change the sentence. */
export function reminderCopy(workoutId: string, gender: Profile["gender"], displayName: string | null) {
  const name = displayName?.trim().split(/\s+/)[0] || null;
  let n = 0;
  for (let i = 0; i < workoutId.length; i++) n = (n + workoutId.charCodeAt(i)) % NUDGES.length;
  const line = NUDGES[n](name);
  return g(gender, line.f, line.m);
}
