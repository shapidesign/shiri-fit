// Run: node --experimental-strip-types lib/progression.test.ts
import assert from "node:assert/strict";
import { chosenWork, suggestWeight } from "./progression.ts";

const ok = (kg: number) => [{ reps: 10, weight_kg: kg, done: true }, { reps: 10, weight_kg: kg, done: true }];
const miss = (kg: number) => [{ reps: 10, weight_kg: kg, done: true }, { reps: 7, weight_kg: kg, done: true }];

assert.equal(suggestWeight([], 10, true, "barbell"), null);
assert.equal(suggestWeight([[{ reps: 10, done: true }]], 10, true, null), null); // bodyweight only
assert.equal(suggestWeight([ok(40)], 10, true, "barbell")?.kg, 42.5);
assert.equal(suggestWeight([ok(8)], 10, true, "dumbbells")?.kg, 9);
assert.equal(suggestWeight([ok(12)], 10, true, "dumbbells")?.kg, 14);
assert.equal(suggestWeight([ok(40)], 10, false, "barbell")?.kg, 40);
assert.equal(suggestWeight([miss(40)], 10, true, "barbell")?.kg, 40);
assert.equal(suggestWeight([miss(40), miss(40)], 10, true, "barbell")?.kg, 36);
assert.equal(suggestWeight([miss(40), ok(37.5)], 10, true, "barbell")?.kg, 40);
// unweighted sessions are skipped, newest weighted one counts
assert.equal(suggestWeight([[{ reps: 10, done: true }], ok(20)], 10, true, "machine")?.kg, 22.5);
// 12 + 2 = 14, which they don't own, so the next bell is 16. Nothing above 12 stays at 12.
assert.equal(suggestWeight([ok(12)], 10, true, "dumbbells", [12, 16])?.kg, 16);
assert.equal(suggestWeight([ok(12)], 10, true, "dumbbells", [12])?.kg, 12);
assert.equal(suggestWeight([miss(12)], 10, true, "dumbbells", [12, 16])?.kg, 12);
assert.equal(chosenWork([ok(12)])?.reps, 10);
assert.equal(chosenWork([ok(12)])?.kg, 12);

console.log("progression.test.ts ok");
