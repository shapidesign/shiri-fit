// Run: node --experimental-strip-types lib/date-parts.test.ts
import assert from "node:assert/strict";
import { isoFromParts, partsFromIso } from "./date-parts.ts";

assert.equal(isoFromParts("13", "11", "26"), "2026-11-13");
assert.equal(isoFromParts("29", "02", "24"), "2024-02-29");
assert.equal(isoFromParts("29", "02", "26"), null);
assert.equal(isoFromParts("31", "02", "26"), null);
assert.equal(isoFromParts("00", "01", "26"), null);
assert.equal(isoFromParts("3", "11", "26"), null);
assert.deepEqual(partsFromIso("2026-11-13"), ["13", "11", "26"]);
assert.deepEqual(partsFromIso("2026-11-13T08:00"), ["13", "11", "26"]);
assert.deepEqual(partsFromIso(""), ["", "", ""]);

console.log("date-parts.test.ts ok");
