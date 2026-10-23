// Run: node --experimental-strip-types lib/allowlist.test.ts
import assert from "node:assert/strict";
import { bearerOk, isAllowedEmail } from "./allowlist.ts";
import { exerciseOr } from "./exercise-or.ts";

delete process.env.ALLOWED_EMAILS;
assert.equal(isAllowedEmail("a@b.com"), false);

process.env.ALLOWED_EMAILS = "a@b.com, C@D.com";
assert.equal(isAllowedEmail("c@d.com"), true);
assert.equal(isAllowedEmail("nope@x.com"), false);
assert.equal(isAllowedEmail(null), false);

assert.equal(bearerOk("Bearer secret", "secret"), true);
assert.equal(bearerOk("Bearer secret", "secreT"), false);
assert.equal(bearerOk("Bearer secret", ""), false);
assert.equal(bearerOk(null, "secret"), false);

assert.equal(exerciseOr("squat"), "name.ilike.%squat%,name_he.ilike.%squat%");
assert.equal(exerciseOr("a,b(c).d"), "name.ilike.%abcd%,name_he.ilike.%abcd%");
assert.equal(exerciseOr("%,()"), null);

console.log("allowlist.test.ts ok");
