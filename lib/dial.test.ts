// Run: node --experimental-strip-types lib/dial.test.ts
import assert from "node:assert/strict";
import { dialMinutes } from "./dial.ts";

const bounds = [5, 300] as const;

// A tap moves the hand and keeps the hour.
assert.equal(dialMinutes(19, 19 / 60, 0.5, false, ...bounds), 30);
assert.equal(dialMinutes(19, 19 / 60, 0.9, false, ...bounds), 54);

// Dragging across 12 adds or drops an hour.
assert.equal(dialMinutes(50, 50 / 60, 5 / 60, true, ...bounds), 65);
assert.equal(dialMinutes(65, 5 / 60, 55 / 60, true, ...bounds), 55);

// A small move inside the hour does not wrap.
assert.equal(dialMinutes(30, 0.5, 0.52, true, ...bounds), 31);

// The top of the dial stays on the near side instead of snapping to 0.
assert.equal(dialMinutes(19, 0.9, 0.992, false, ...bounds), 59);

// Clamp at both ends.
assert.equal(dialMinutes(5, 5 / 60, 0.95, true, ...bounds), 5);
assert.equal(dialMinutes(295, 55 / 60, 10 / 60, true, ...bounds), 300);

console.log("dial.test.ts ok");
