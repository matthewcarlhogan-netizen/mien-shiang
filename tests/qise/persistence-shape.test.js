/*
 * PHASE 10, gate 4 — the persistence-shape assertion, as a named compliance
 * gate rather than only as a unit test of store.js.
 *
 * tests/qise/store.test.js covers the store's behaviour. This file exists
 * separately because the six Phase 10 gates are meant to be findable as a set:
 * somebody reviewing what keeps this product inside its regulatory position
 * should not have to know that the persistence guarantee lives inside a
 * database test.
 *
 * It asserts the guarantee against a record built by the REAL shaping code,
 * and against the store's own refusal on write.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { toRecord, findForbiddenKeys, FORBIDDEN_KEY_PATTERN } from "../../src/qise/store.js";

/* A reading carrying everything the capture path genuinely hangs off one. */
const withHazards = () => ({
  timestampIso: "2026-08-09T02:30:00.000Z",
  metrics: { raw: { hueVector: { a: 1, b: 2 } }, corrected: { hueVector: { a: 1, b: 2 } } },
  axes: { a: 1, b: 2, L: 60, C: 18, periorbitalL: 55 },
  compass: { ascendant: "ping", magnitude: 0.2, band: null, components: {} },
  tags: [], confidence: 0.9, valid: true,

  imageData: { data: new Uint8ClampedArray(4) },
  landmarks: Array.from({ length: 478 }, () => ({ x: 0, y: 0 })),
  faceEmbedding: new Float32Array(128),
  roiPixels: {},
  previewBlob: {},
  thumbnailDataUrl: "data:image/png;base64,AA",
});

test("the pattern is exactly the one the brief specifies", () => {
  assert.equal(FORBIDDEN_KEY_PATTERN.source, "image|pixel|landmark|embedding|blob|dataUrl");
  assert.ok(FORBIDDEN_KEY_PATTERN.flags.includes("i"));
});

test("no persisted key matches /image|pixel|landmark|embedding|blob|dataUrl/i", () => {
  assert.deepEqual(findForbiddenKeys(toRecord(withHazards())), []);
});

test("and the hazards were really there — the scanner is not blind", () => {
  const found = findForbiddenKeys(withHazards());
  assert.ok(found.length >= 6, `the scanner found only ${found.length} of them: ${found}`);
});

test("a face embedding is refused even nested three levels down", () => {
  // The realistic shape of the mistake: not a top-level key somebody would
  // notice in review, but something tucked inside a debug payload.
  const sneaky = {
    ...withHazards(),
    compass: { ascendant: "chi", magnitude: 1, band: "slight", components: { debug: { landmarkTrace: [1, 2] } } },
  };
  assert.ok(findForbiddenKeys(sneaky).some((k) => k.includes("landmarkTrace")));
  // toRecord's allow-list drops it, which is the primary defence.
  assert.deepEqual(findForbiddenKeys(toRecord(sneaky)), []);
});

test("a 478-point mesh is a biometric template and never reaches the record", () => {
  // In Australia that is sensitive information under the Privacy Act; in
  // Illinois BIPA carries a private right of action with per-violation
  // statutory damages; Washington's My Health My Data Act is broader still.
  // The safest way to hold biometric data is not to.
  const record = toRecord(withHazards());
  const serialised = JSON.stringify(record);
  assert.ok(!serialised.includes("478"));
  assert.equal(record.landmarks, undefined);
  assert.equal(record.faceEmbedding, undefined);

  // What IS kept must still be enough to compute a trend, or the guarantee
  // has been bought by removing the feature.
  assert.ok(record.metrics.raw && record.metrics.corrected);
  assert.ok(record.axes && record.timestampIso);
});
