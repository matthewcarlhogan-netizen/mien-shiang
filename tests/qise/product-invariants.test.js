/*
 * The invariants are only permanent if something checks they are still there.
 *
 * `docs/PRODUCT_INVARIANTS.md` lists nine properties and the test file that
 * enforces each. The obvious failure is silent: someone deletes a suite in a
 * refactor, the table still claims coverage, and the invariant is unguarded for
 * a year before anyone notices. So the table is parsed, not trusted.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (rel) => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const DOC = readFileSync(root("docs/PRODUCT_INVARIANTS.md"), "utf8");

const rows = [...DOC.matchAll(/^\|\s*(I\d+)\s*\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gm)]
  .map((m) => ({ id: m[1], text: m[2], enforcedBy: m[3] }));

test("every invariant in the table names a test file that exists", () => {
  assert.equal(rows.length, 9, `expected nine invariants, parsed ${rows.length}`);
  for (const r of rows) {
    assert.ok(existsSync(root(r.enforcedBy)),
      `${r.id} claims enforcement by ${r.enforcedBy}, which does not exist`);
  }
});

test("the invariant ids are contiguous and unique", () => {
  const ids = rows.map((r) => r.id);
  assert.deepEqual(ids, ids.map((_, i) => `I${i + 1}`));
});

test("each enforcing suite contains at least one test", () => {
  for (const r of rows) {
    const src = readFileSync(root(r.enforcedBy), "utf8");
    assert.ok(/\btest\(/.test(src), `${r.enforcedBy} contains no tests`);
  }
});

test("the contract and the invariants agree on what is permanent", () => {
  const contract = readFileSync(root("docs/READING_EXPERIENCE_CONTRACT.md"), "utf8");
  for (const phrase of [
    "materially different readings",
    "Observation",
    "Heritage",
    "Reflection",
  ]) {
    assert.ok(contract.includes(phrase), `the contract no longer mentions "${phrase}"`);
  }
});
