// Run: npx tsx lib/generate.check.ts
import assert from "node:assert/strict";
import { fitsLevel, mainCount, nextLevel, pickExercises, planDates, planFocuses, usableWithGear, volumeFor, weekIndex } from "./generate";
import { needsWeight } from "./labels";
import type { Exercise } from "./types";

assert.equal(mainCount(10), 2);
assert.equal(mainCount(45), 5);
assert.equal(mainCount(120), 10);

// Volume climbs week to week; the first goal sets the reps.
assert.deepEqual([0, 1, 2, 3].map((w) => volumeFor(w, ["strength"])), [
  { sets: 3, reps: 8, durationSec: 40 }, { sets: 3, reps: 10, durationSec: 45 }, { sets: 4, reps: 8, durationSec: 50 }, { sets: 4, reps: 10, durationSec: 55 },
]);
assert.equal(volumeFor(0, ["endurance", "strength"]).reps, 15);
assert.equal(volumeFor(0, ["tone"]).reps, 12);

assert.equal(nextLevel(null), 0);
assert.equal(nextLevel({ level: 0, target: 12, done: 9 }), 1);
assert.equal(nextLevel({ level: 0, target: 12, done: 8 }), 0);
assert.equal(nextLevel({ level: 2, target: 12, done: 12 }), 2);
assert.equal(fitsLevel({ difficulty: "intermediate" }, 0), false);
assert.equal(fitsLevel({ difficulty: "intermediate" }, 1), true);
assert.equal(fitsLevel({ difficulty: null }, 0), true);

const ex = (id: number, name: string, category: string, muscle: string) => ({ id, name, category, muscles: [muscle], images: ["x"] }) as Exercise;
assert.equal(usableWithGear(ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), false), false);
assert.equal(usableWithGear(ex(2, "Single Arm Dumbbell Row", "dumbbells", "lats"), false), true);
assert.equal(usableWithGear(ex(3, "Goblet Squat", "dumbbells", "quads"), false), true);
assert.equal(usableWithGear(ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), true), true);
assert.equal(usableWithGear(ex(4, "Barbell Squat", "barbell", "quads"), false), true);

const pool = [ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), ex(2, "Single Arm Row", "dumbbells", "lats"), ex(5, "Push Up", "bodyweight", "chest"), ex(6, "Squat", "bodyweight", "quads")];
const picked = pickExercises(pool, 3, ["chest", "lats", "quads"], false);
assert.deepEqual(picked.map((e) => e.muscles[0]), ["chest", "lats", "quads"]);
assert.ok(!picked.some((e) => e.id === 1), "two-dumbbell exercise picked for a single dumbbell");

assert.equal(needsWeight("bodyweight"), false);
assert.equal(needsWeight("mat"), false);
assert.equal(needsWeight("dumbbells"), true);
assert.equal(needsWeight("other"), true);
assert.equal(needsWeight(null), true);

// Fri 23 Oct 2026, Sun/Tue/Thu for 4 weeks → 12 dates, first one Sun 25 Oct.
const dates = planDates(new Date("2026-10-23T00:00"), [0, 2, 4]);
assert.equal(dates.length, 12);
assert.equal(dates[0], "2026-10-25");
assert.equal(dates.at(-1), "2026-11-19");
assert.deepEqual(planFocuses(3), ["lower", "upper", "full"]);
assert.deepEqual(dates.map((d) => weekIndex(new Date("2026-10-23T00:00"), d)), [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);

console.log("generate checks ok");
