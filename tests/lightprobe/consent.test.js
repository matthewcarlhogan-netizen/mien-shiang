import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  createConsent, assertConsentGranted, memoryStorage, ConsentRequiredError,
} from "../../src/qise/consent.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

/*
 * requirement 4.7: the probe must use the REAL createConsent()/
 * assertConsentGranted() from the production module, not a hand-made
 * {granted:true} stand-in that would make the gate decorative. Two halves:
 * a static check that lightprobe.html actually imports the real functions
 * (rather than defining its own), and a behavioural check that those real
 * functions genuinely block an ungranted run.
 */

test("lightprobe.html imports createConsent and assertConsentGranted from the production consent module", () => {
  const html = readFileSync(join(REPO, "lightprobe", "lightprobe.html"), "utf8");
  assert.match(html, /import\s*\{\s*createConsent,\s*assertConsentGranted\s*\}\s*from\s*"\.\.\/src\/qise\/consent\.js"/);
});

test("the real assertConsentGranted throws ConsentRequiredError before any grant exists", () => {
  const consent = createConsent(memoryStorage(null));
  assert.throws(() => assertConsentGranted(consent, "lightprobe getUserMedia"), ConsentRequiredError);
});

test("the real assertConsentGranted passes once the real grant() has been called", () => {
  const consent = createConsent(memoryStorage(null));
  consent.grant();
  assert.doesNotThrow(() => assertConsentGranted(consent, "lightprobe getUserMedia"));
});

test("a hand-made {granted:true} object is NOT sufficient -- assertConsentGranted only trusts isGranted()", () => {
  const fake = { granted: true }; // exactly the shortcut requirement 4.7 forbids
  assert.throws(() => assertConsentGranted(fake, "lightprobe getUserMedia"), ConsentRequiredError);
});
