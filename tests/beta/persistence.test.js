/* The beta writes to the production store, so it writes production's shape.
 *
 * Same origin, same IndexedDB, same person — that is what "everything the
 * final scanner will" means, and it is also why the record matters more here
 * than it would in a sandbox: a field shape that drifts corrupts a SHARED
 * baseline, not a private one.
 *
 * persistence-shape.test.js constrains store.js and cannot fail from a beta
 * change, so it is not a beta gate. This is.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReading, readingStateLabel } from "../../src/beta/beta-model.js";
import { toRecord, findForbiddenKeys, FORBIDDEN_KEY_PATTERN } from "../../src/qise/store.js";

const metrics = {
  corrected: { lab: { cheek_l: { L: 60, a: 8, b: 13 } } },
  raw: { lab: { cheek_l: { L: 61, a: 8.2, b: 13.4 } } },
};

const interpreted = {
  state: "calibrating",
  readingsSoFar: 1,
  needed: 3,
  deltas: { L: 0.2, a: -0.1, b: 0.5 },
  compass: null,
  z: null,
};

function reading(extra = {}) {
  return buildReading({
    timestampIso: "2026-09-05T09:00:00.000Z",
    canonicalDay: "2026-09-05",
    captureClass: "locked",
    metrics,
    axes: { L: 60, a: 8, b: 13 },
    interpreted,
    captureTier: "clean",
    consentVersion: "qise-consent-v3",
    roiValidity: { cheek_l: true },
    frameJitter: 0.4,
    confidence: 0.81,
    valid: true,
    baselineVersion: "v2",
    ...extra,
  });
}

test("the beta's record holds no image, pixel, landmark or embedding", () => {
  const found = findForbiddenKeys(reading());
  assert.deepEqual(found, [],
    "the beta must not persist anything biometric:\n  " + found.join("\n  "));
});

test("the record survives the store's allow-list unchanged in substance", () => {
  const record = toRecord(reading());
  assert.equal(record.timestampIso, "2026-09-05T09:00:00.000Z");
  assert.equal(record.captureClass, "locked");
  assert.equal(record.captureTier, "clean");
  assert.equal(record.readingState, "calibrating");
  assert.equal(record.baselineVersion, "v2");
  // The delta is what every later comparison is made of; losing it here would
  // make the beta's rows unreadable to the baseline they feed.
  assert.ok(record.deltas, "within-person deltas must survive the write");
  assert.deepEqual(findForbiddenKeys(record), []);
});

test("a payload welded onto the reading does not reach the disk", () => {
  // CLAUDE.md item 39: an allow-list at the top level with a spread one level
  // down is not an allow-list. The beta must not be the hole.
  const smuggled = reading({
    integrated: { twelvePalaces: {}, landmarkPixels: [1, 2, 3] },
  });
  const record = toRecord(smuggled);
  const found = findForbiddenKeys(record);
  assert.deepEqual(found, [],
    "a nested biometric payload survived the write:\n  " + found.join("\n  "));
});

test("the forbidden-key guard can actually fail", () => {
  // A negative control needs a positive control in the same run.
  assert.ok(FORBIDDEN_KEY_PATTERN.test("landmark"));
  const found = findForbiddenKeys({ metrics: { imageData: [1, 2] } });
  assert.ok(found.length > 0, "findForbiddenKeys must catch a planted key");
});

test("readings 1-3 are recorded as calibrating, never as a finished compass", () => {
  const record = toRecord(reading());
  assert.equal(record.readingState, "calibrating");
  assert.equal(record.compass, null,
    "a compass built from no baseline would be a reading of nothing");
});

test("the calibrating label counts to the baseline's real target", () => {
  /* `needed` from qise/baseline.js is already the target — CALIBRATING_READINGS,
   * or one more once a baseline exists but is not ready. Only the current
   * reading gets the +1; adding it to both put the finish line one further out
   * than the baseline actually requires. */
  const first = readingStateLabel({ state: "calibrating", readingsSoFar: 0, needed: 3 });
  assert.equal(first.calibrating, true);
  assert.match(first.text, /reading 1 of 3\b/);

  const last = readingStateLabel({ state: "calibrating", readingsSoFar: 2, needed: 3 });
  assert.match(last.text, /reading 3 of 3\b/);

  // The second calibrating branch: a baseline exists but is not ready yet.
  const notReady = readingStateLabel({ state: "calibrating", readingsSoFar: 3, needed: 4 });
  assert.match(notReady.text, /reading 4 of 4\b/);

  const read = readingStateLabel({ state: "read" });
  assert.equal(read.calibrating, false);
  assert.equal(read.text, "");
});
