// Run: node --experimental-strip-types lib/met.test.ts
import assert from "node:assert/strict";
import { estimateCalories } from "./met.ts";

// Plan example: an hour of yoga at ~60 kg ≈ 170–200 kcal
const yoga = estimateCalories({ vibe: "yoga", minutes: 60, weightKg: 60 });
assert.ok(yoga >= 160 && yoga <= 200, `yoga hour = ${yoga}`);

// Intensity scales, hard > moderate > light
const base = { vibe: "strength" as const, minutes: 45, weightKg: 62 };
assert.ok(estimateCalories({ ...base, intensity: "hard" }) > estimateCalories(base));
assert.ok(estimateCalories({ ...base, intensity: "light" }) < estimateCalories(base));

// Missing weight falls back to 60 kg, zero/negative minutes → 0
assert.equal(estimateCalories({ vibe: "walk", minutes: 60, weightKg: null }), estimateCalories({ vibe: "walk", minutes: 60, weightKg: 60 }));
assert.equal(estimateCalories({ vibe: "run", minutes: -5, weightKg: 60 }), 0);

console.log("met.test.ts ok");
