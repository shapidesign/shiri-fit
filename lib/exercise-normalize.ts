import type { Exercise } from "./types";

/** `gif` is left out so re-seeding never wipes the ExerciseDB matches. */
export type ExerciseInsert = Omit<Exercise, "id" | "created_at" | "created_by" | "bodymap" | "gif" | "steps_he"> & { bodymap?: unknown; steps_he?: string[] | null };

const MUSCLE_ALIAS: Record<string, string> = {
  quadriceps: "quads",
  "middle back": "traps",
  abs: "abdominals",
  "long head bicep": "biceps",
  "short head bicep": "biceps",
  "lateral deltoid": "shoulders",
  "anterior deltoid": "shoulders",
  "posterior deltoid": "shoulders",
  "upper chest": "chest",
  "lower chest": "chest",
  "mid chest": "chest",
  "gluteus maximus": "glutes",
  "gluteus medius": "glutes",
  "medial hamstrings": "hamstrings",
  "lateral hamstrings": "hamstrings",
  "inner quadriceps": "quads",
  "outer quadriceps": "quads",
  "rectus femoris": "quads",
  "upper traps": "traps",
  "lower traps": "traps",
  "lower abdominals": "abdominals",
  "upper abdominals": "abdominals",
  "hip flexors": "quads",
  "lower back": "lower back",
};
export const normMuscle = (m: string) => {
  const k = m.trim().toLowerCase();
  return MUSCLE_ALIAS[k] ?? k;
};

const CATEGORY_ALIAS: Record<string, string> = {
  "body only": "bodyweight",
  dumbbell: "dumbbells",
  cable: "cables",
  band: "bands",
  "e-z curl bar": "barbell",
  "smith machine": "machine",
  "smith-machine": "machine",
  kettlebell: "kettlebells",
  stretches: "mat",
  yoga: "mat",
  recovery: "mat",
  "foam roll": "mat",
};
export const normCategory = (c: string | null | undefined) => {
  if (!c) return "other";
  const k = c.trim().toLowerCase();
  return CATEGORY_ALIAS[k] ?? k;
};

// ---- free-exercise-db (public domain, no key) ----
export type FedExercise = {
  id: string; name: string; force: string | null; level: string | null; mechanic: string | null;
  equipment: string | null; primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[];
  category: string; images: string[];
};
const FED_IMG = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export function fromFed(e: FedExercise): ExerciseInsert {
  return {
    source: "free-exercise-db",
    source_id: e.id,
    name: e.name,
    name_he: null,
    muscles: dedupe(e.primaryMuscles.map(normMuscle)),
    secondary_muscles: dedupe(e.secondaryMuscles.map(normMuscle)),
    category: normCategory(e.equipment),
    difficulty: e.level === "beginner" ? "novice" : e.level === "expert" ? "advanced" : e.level,
    force: e.force,
    mechanic: e.mechanic,
    steps: e.instructions,
    videos: [],
    images: e.images.map((i) => FED_IMG + i),
  };
}

// ---- MuscleWiki ----
export type MwExercise = {
  id: number; name: string; primary_muscles: string[]; secondary_muscles?: string[] | null;
  category: string; force?: string | null; mechanic?: string | null; difficulty?: string | null;
  steps: string[]; videos: { url: string | null; angle?: string; gender?: string; og_image?: string | null }[];
  bodymap_male?: string | null; bodymap_female?: string | null;
};

export function fromMw(e: MwExercise): ExerciseInsert {
  const videos = e.videos.filter((v) => v.url).map((v) => ({ url: v.url!, angle: v.angle, gender: v.gender }));
  // Prefer female model videos for Shiri; fall back to whatever exists.
  const female = videos.filter((v) => v.gender?.toLowerCase() === "female");
  return {
    source: "musclewiki",
    source_id: String(e.id),
    name: e.name,
    name_he: null,
    muscles: dedupe(e.primary_muscles.map(normMuscle)),
    secondary_muscles: dedupe((e.secondary_muscles ?? []).map(normMuscle)),
    category: normCategory(e.category),
    difficulty: e.difficulty?.toLowerCase() ?? null,
    force: e.force?.toLowerCase() ?? null,
    mechanic: e.mechanic?.toLowerCase() ?? null,
    steps: e.steps,
    videos: female.length ? female : videos,
    images: e.videos.map((v) => v.og_image).filter((x): x is string => !!x).slice(0, 2),
    bodymap: { female: e.bodymap_female ?? null, male: e.bodymap_male ?? null },
  };
}

const dedupe = <T,>(a: T[]) => Array.from(new Set(a));

// ---- ExerciseDB (GIFs only, matched to existing rows by name) ----
const FILLER = new Set(["with", "on", "the", "a", "an", "and", "to", "of", "version", "bodyweight", "body", "only"]);
/** Order- and plural-insensitive name key, ignoring "(male)" / "v. 2" tags: "Pushups" = "push-up (male)", "Dumbbell Goblet Squat" = "goblet squat dumbbell". */
export const nameKey = (name: string) =>
  name.toLowerCase()
    .replace(/\([^)]*\)|\bv\. ?\d+/g, " ")
    .replace(/push[- ]?ups?/g, "push up").replace(/pull[- ]?ups?/g, "pull up").replace(/sit[- ]?ups?/g, "sit up").replace(/chin[- ]?ups?/g, "chin up")
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !FILLER.has(w))
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))
    .sort()
    .join(" ");
