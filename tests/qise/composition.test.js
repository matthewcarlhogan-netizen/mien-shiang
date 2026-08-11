import { test } from "node:test";
import assert from "node:assert/strict";

import { compositionOf, COMPOSITION_COLOURS } from "../../src/qise/composition.js";

const firstReading = () => ({
  metrics: {
    corrected: {
      hueVector: { a: 14, b: 20 }, meanL: 58, meanChroma: 24, periorbitalL: 53,
    },
  },
  compass: null,
});

test("day one gets a stable five-colour impression without inventing a comparison", () => {
  const first = compositionOf(firstReading());
  const again = compositionOf(firstReading());
  assert.deepEqual(first, again);
  assert.equal(first.basis, "capture-impression");
  assert.deepEqual(Object.keys(first.segments), [...COMPOSITION_COLOURS]);
  assert.ok(Math.abs(Object.values(first.segments).reduce((sum, value) => sum + value, 0) - 100) < 1e-9);
  assert.ok(COMPOSITION_COLOURS.includes(first.lead));
  assert.notEqual(first.lead, first.support);
});

test("a real personal compass replaces the capture impression", () => {
  const result = compositionOf({
    ...firstReading(),
    compass: { ascendant: "qing", components: { chi: 0, huang: 0.2, qing: 2.5, bai: 0.4, hei: 0.1 } },
  });
  assert.equal(result.basis, "personal-shift");
  assert.equal(result.lead, "qing");
});

test("persisted bounded composition reopens identically", () => {
  const original = compositionOf(firstReading());
  assert.deepEqual(compositionOf({ composition: original }), original);
});
