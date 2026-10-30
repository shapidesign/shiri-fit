// Run: npx tsx lib/generate.check.ts
import assert from "node:assert/strict";
import { fitsLevel, logPace, mainCount, nextLevel, partsOrder, pickExercises, pickMain, pickWarmup, planDates, planFocuses, progressFor, trainingSignals, usableWithGear, volumeFor, warmupBucket, weekIndex, weekRow } from "./generate";
import { nameKey } from "./exercise-normalize";
import { needsWeight } from "./labels";
import type { Exercise, ExerciseDone } from "./types";

// One exercise = 3 × (12 reps × 3 s) + 30 s switch + 3 × 60 s rest ≈ 5.3 min.
assert.equal(mainCount(10), 2);
assert.equal(mainCount(40), 7);
assert.equal(mainCount(45), 8);
assert.equal(mainCount(120), 10);

// The 26.10 log: 4 main exercises, 40 minutes asked, done in 19 minutes without rest.
const timed = (n: number): ExerciseDone => ({ name: "t", duration_sec: n, sets: [{ done: true }] });
const lifted = (...reps: number[]): ExerciseDone => ({ name: "l", sets: reps.map((r) => ({ reps: r, done: true })) });
const realLog = { duration_min: 19, exercises_done: [timed(45), timed(45), lifted(12, 12, 12), lifted(12, 12, 12), lifted(12, 10, 8), lifted(10, 10, 12), timed(30), timed(30)] };
const pace = logPace(realLog, 60)!;
assert.equal(pace, 0.6, "faster than the model, clamped");
assert.equal(mainCount(40, { pace }), 8, "a fast pace fits more exercises");
assert.equal(mainCount(40, { bias: 1 }), 8, "too easy adds one");
assert.equal(mainCount(40, { bias: -1 }), 6, "too hard drops one");
assert.equal(logPace({ duration_min: 30, exercises_done: [timed(45)] }, 60), null, "no main work, no pace");

const sig = trainingSignals([
  { ...realLog, difficulty: "easy", is_external: false },
  { ...realLog, difficulty: null, is_external: false },
  { duration_min: 60, exercises_done: [], difficulty: "right", is_external: true },
], 60);
assert.equal(sig.pace, 0.6);
assert.equal(sig.bias, 1);
assert.equal(trainingSignals([], 60).pace, 1);
assert.equal(progressFor("light", "strength", [], 1), true, "too easy pushes even on a light day");
assert.equal(progressFor("moderate", "strength", [], -1), false, "too hard holds the weight");

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

const one = { dumbbells: false, kettlebells: null };
const two = { dumbbells: true, kettlebells: null };
const oneBell = { dumbbells: null, kettlebells: false };
const ex = (id: number, name: string, category: string, muscle: string) => ({ id, name, category, muscles: [muscle], images: ["x"] }) as Exercise;
assert.equal(usableWithGear(ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), one), false);
assert.equal(usableWithGear(ex(2, "Single Arm Dumbbell Row", "dumbbells", "lats"), one), true);
assert.equal(usableWithGear(ex(3, "Goblet Squat", "dumbbells", "quads"), one), true);
assert.equal(usableWithGear(ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), two), true);
assert.equal(usableWithGear(ex(4, "Barbell Squat", "barbell", "quads"), one), true);
assert.equal(usableWithGear(ex(8, "Double Kettlebell Press", "kettlebells", "shoulders"), oneBell), false);
assert.equal(usableWithGear(ex(9, "Two Arm Kettlebell Swing", "kettlebells", "glutes"), oneBell), true);
assert.equal(usableWithGear(ex(10, "Kettlebell Swing", "kettlebells", "glutes"), oneBell), true);
assert.equal(usableWithGear(ex(8, "Double Kettlebell Press", "kettlebells", "shoulders"), { dumbbells: null, kettlebells: true }), true);

const pool = [ex(1, "Dumbbell Bench Press", "dumbbells", "chest"), ex(2, "Single Arm Row", "dumbbells", "lats"), ex(5, "Push Up", "bodyweight", "chest"), ex(6, "Squat", "bodyweight", "quads")];
const picked = pickExercises(pool, 3, ["chest", "lats", "quads"], one);
assert.deepEqual(picked.map((e) => e.muscles[0]), ["chest", "lats", "quads"]);
assert.ok(!picked.some((e) => e.id === 1), "two-dumbbell exercise picked for a single dumbbell");

const withGif = { ...ex(7, "Push-Up", "bodyweight", "chest"), gif: "g" };
assert.equal(pickExercises([...pool, withGif], 1, ["chest"], two)[0].id, 7, "GIF exercise should win the tie");

// Core question: yes always includes abs (two from 45 min), no never does. Spare slots get a second exercise.
const big = [
  ex(20, "Crunch", "bodyweight", "abdominals"), ex(21, "Side Plank", "bodyweight", "obliques"),
  ex(22, "Push Up", "bodyweight", "chest"), ex(23, "Row", "bodyweight", "lats"), ex(24, "Squat", "bodyweight", "quads"),
  ex(25, "Lunge", "bodyweight", "quads"), ex(26, "Pike Press", "bodyweight", "shoulders"),
];
const order = ["chest", "lats", "shoulders", "quads", "abdominals"];
for (let i = 0; i < 20; i++) {
  const yes = pickMain(big, 4, order, two, true, 40);
  assert.equal(yes.filter((e) => e.muscles[0] === "abdominals" || e.muscles[0] === "obliques").length, 1);
  assert.equal(pickMain(big, 5, order, two, true, 45).filter((e) => ["abdominals", "obliques"].includes(e.muscles[0])).length, 2);
  assert.ok(!pickMain(big, 6, order, two, false, 60).some((e) => ["abdominals", "obliques"].includes(e.muscles[0])), "no abs when declined");
}
assert.equal(pickExercises(big.filter((e) => e.muscles[0] !== "abdominals" && e.muscles[0] !== "obliques"), 5, order, two).length, 5, "second quads exercise fills the gap");

const pinned = weekRow({ phase: "main", exercise_id: 1, reps: 10, sets: 3, duration_sec: null }, 1, ["tone"], new Set([1]));
const fresh = weekRow({ phase: "main", exercise_id: 2, reps: 12, sets: 3, duration_sec: null }, 1, ["tone"], new Set([1]));
assert.equal(pinned.reps, 10, "remembered reps stay");
assert.equal(pinned.sets, 3);
assert.equal(fresh.reps, 14, "new exercises take the week's reps");

const warm = [
  ex(1, "Inchworm", "bodyweight", "hamstrings"),
  ex(2, "Double Leg Butt Kick", "bodyweight", "hamstrings"),
  ex(3, "Jogging, Treadmill", "machine", "quads"),
  ex(4, "Medicine Ball Chest Pass", "medicine ball", "chest"),
];
const pairs = new Set<string>();
for (let i = 0; i < 40; i++) {
  const picked = pickWarmup(warm);
  assert.equal(picked.length, 2);
  assert.notEqual(warmupBucket(picked[0].name), warmupBucket(picked[1].name));
  assert.ok(!picked.some((e) => e.id === 4), "med-ball throws are not a warm-up");
  pairs.add(picked.map((e) => e.id).sort().join(","));
}
assert.ok(pairs.size >= 2, "warm-ups are not always inchworm + butt kicks");
const cardioOnly = pickWarmup([ex(3, "Jogging, Treadmill", "machine", "quads"), ex(5, "Walking, Treadmill", "machine", "quads")]);
assert.equal(cardioOnly.length, 2);
assert.ok(cardioOnly.every((e) => warmupBucket(e.name) === "cardio"));

assert.equal(partsOrder(["chest"], "female").single, "chest");
assert.deepEqual(partsOrder(["chest", "glutes"], "female").order, ["chest", "glutes"]);
assert.equal(partsOrder(["chest", "glutes"], "female").single, undefined);
assert.equal(partsOrder(["upper"], "female").order[0], "chest");
assert.ok(partsOrder(["full"], "female").order.includes("glutes"));
assert.equal(partsOrder(["upper", "glutes"], "female").order[0], "glutes");
assert.deepEqual(partsOrder(["upper", "lower"], "female").order, partsOrder(["full"], "female").order);

assert.equal(nameKey("Pushups"), nameKey("push-up (male)"));
assert.equal(nameKey("Dumbbell Goblet Squats"), nameKey("goblet squat with dumbbell v. 2"));
assert.notEqual(nameKey("Cable Crunch"), nameKey("Crunch"));

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
