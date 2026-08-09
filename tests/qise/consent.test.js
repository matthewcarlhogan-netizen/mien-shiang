/*
 * PHASE 0 gates.
 *
 * Gate 0a is the one that matters: a test asserting the camera module throws
 * if invoked without consent. It lives in consent-precedes-inference.test.js
 * because it needs the camera module too; what is pinned here is the record
 * itself — the shape, the version re-prompt, and the fact that withdrawal
 * cannot be performed without an eraser.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createConsent, memoryStorage, assertConsentGranted, ConsentRequiredError,
  CONSENT_VERSION, CONSENT_STORAGE_KEY,
} from "../../src/qise/consent.js";

test("nothing is granted until it is granted", () => {
  const c = createConsent(memoryStorage());
  assert.equal(c.isGranted(), false);
  assert.equal(c.read(), null);
});

test("a grant records granted, version and an ISO timestamp", () => {
  const storage = memoryStorage();
  const fixed = new Date("2026-08-09T02:30:00.000Z");
  const c = createConsent(storage, { now: () => fixed });

  const record = c.grant();
  assert.deepEqual(record, {
    granted: true,
    version: CONSENT_VERSION,
    timestampIso: "2026-08-09T02:30:00.000Z",
  });
  assert.equal(c.isGranted(), true);

  // And it is genuinely persisted, not held in a closure.
  assert.deepEqual(JSON.parse(storage.getItem(CONSENT_STORAGE_KEY)), record);
  assert.equal(createConsent(storage).isGranted(), true);
});

test("a grant against a superseded processing version re-prompts", () => {
  // The whole point of the version field. A record that says `granted: true`
  // for processing we no longer do is not consent to the processing we do now.
  const storage = memoryStorage(JSON.stringify({
    granted: true,
    version: "qise-consent-v0",
    timestampIso: "2026-01-01T00:00:00.000Z",
  }));
  const c = createConsent(storage);

  assert.equal(c.isGranted(), false, "a stale version must not read as granted");
  assert.equal(c.isStale(), true, "and the UI must be able to tell it apart from no record");
});

test("a corrupt record fails CLOSED", () => {
  const c = createConsent(memoryStorage("{not json"));
  assert.equal(c.isGranted(), false);
  assert.equal(c.read(), null);
});

test("a record missing any required field is not a grant", () => {
  for (const partial of [
    { granted: true, version: CONSENT_VERSION },                       // no timestamp
    { granted: true, timestampIso: "2026-08-09T00:00:00.000Z" },       // no version
    { version: CONSENT_VERSION, timestampIso: "2026-08-09T00:00:00.000Z" }, // no flag
    { granted: "yes", version: CONSENT_VERSION, timestampIso: "2026-08-09T00:00:00.000Z" },
    { granted: true, version: CONSENT_VERSION, timestampIso: "not a date" },
  ]) {
    const c = createConsent(memoryStorage(JSON.stringify(partial)));
    assert.equal(c.isGranted(), false, `accepted a malformed record: ${JSON.stringify(partial)}`);
  }
});

test("withdrawal REQUIRES an eraser and runs it before clearing the flag", async () => {
  const storage = memoryStorage();
  const c = createConsent(storage);
  c.grant();

  // Without one it throws, and — this is the part that matters — the grant is
  // left intact rather than half-revoked.
  await assert.rejects(() => c.withdraw({}), TypeError);
  await assert.rejects(() => c.withdraw(), TypeError);
  assert.equal(c.isGranted(), true, "a failed withdrawal must not clear the record");

  const order = [];
  await c.withdraw({
    deleteAll: () => {
      // Ordering is asserted, not assumed: the readings must be gone before
      // the flag that authorised them is.
      order.push("erased");
      assert.equal(c.isGranted(), true, "erase runs while the grant is still standing");
    },
  });
  order.push("revoked");

  assert.deepEqual(order, ["erased", "revoked"]);
  assert.equal(c.isGranted(), false);
  assert.equal(storage.getItem(CONSENT_STORAGE_KEY), null);
});

test("withdrawal awaits an async eraser", async () => {
  const c = createConsent(memoryStorage());
  c.grant();
  let done = false;
  await c.withdraw({
    deleteAll: async () => {
      await new Promise((r) => setTimeout(r, 5));
      done = true;
    },
  });
  assert.equal(done, true, "an async delete-all must complete before consent is cleared");
  assert.equal(c.isGranted(), false);
});

test("assertConsentGranted throws, rather than returning false", () => {
  // A boolean can be ignored by a caller that forgot to check it. Throwing is
  // what makes this an enforcement point instead of a suggestion.
  const denied = createConsent(memoryStorage());
  assert.throws(() => assertConsentGranted(denied, "getUserMedia"), ConsentRequiredError);
  assert.throws(() => assertConsentGranted(denied, "getUserMedia"), /CONSENT_REQUIRED|consent/i);
  assert.throws(() => assertConsentGranted(null), ConsentRequiredError);
  assert.throws(() => assertConsentGranted({}), ConsentRequiredError);

  const granted = createConsent(memoryStorage());
  granted.grant();
  assert.equal(assertConsentGranted(granted, "getUserMedia"), true);
});

test("the error carries a machine-readable code, so no caller matches on prose", () => {
  const err = new ConsentRequiredError("the camera");
  assert.equal(err.code, "CONSENT_REQUIRED");
  assert.equal(err.name, "ConsentRequiredError");
  assert.ok(err instanceof Error);
});
