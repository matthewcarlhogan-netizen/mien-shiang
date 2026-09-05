/* Every beta string, against the medical blocklist and the claim structure.
 *
 * The beta is the same product served from /beta/, so exclusion 14B has to
 * survive it: every function must independently meet the criteria, and one
 * non-conforming surface voids the exclusion for the whole product.
 *
 * The strings are reached through the real module (VOICE) and through the real
 * markup, not through a hand-maintained copy of them — a registry that has to
 * be updated by hand is a registry that goes stale.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { VOICE, BOUNDARY_TAG, NOISE_TAG } from "../../src/beta/beta-model.js";

const BETA_DIR = fileURLToPath(new URL("../../src/beta", import.meta.url));

/* Disease names are rejected on EVERY surface — no bucket is exempt. */
const DISEASE_TERMS = [
  "anaemia", "anemia", "thyroid", "lupus", "sle", "autoimmune", "rosacea",
  "diabetes", "diabetic", "jaundice", "melanoma", "carcinoma", "psoriasis",
  "eczema", "dermatitis", "cancer",
];

/* Health vocabulary. The beta is entertainment-side copy and carries none. */
const BLOCKLIST = [
  "acne", "lesion", "diagnose", "diagnosis", "treat", "treatment", "symptom",
  "cure", "disorder", "disease", "pathology", "severity", "referral",
  "medical", "clinical", "iron", "circulation", "blood",
];

const CLAIM_STRUCTURE = /\byou\s+(are|will|feel|look|seem|have)\b/i;

/** Every string VOICE can produce, including the ones behind functions. */
function voiceStrings() {
  const out = [];
  for (const [key, value] of Object.entries(VOICE)) {
    if (typeof value === "string") out.push([key, value]);
    // A template function's output is user-facing too; a guard that only reads
    // the literals never sees the sentence the reader actually gets.
    else if (typeof value === "function") out.push([key, String(value(1, 3))]);
  }
  out.push(["BOUNDARY_TAG", BOUNDARY_TAG], ["NOISE_TAG", NOISE_TAG]);
  return out;
}

/** Visible text from the beta's markup, tags and scripts removed. */
function markupStrings() {
  const out = [];
  for (const name of readdirSync(BETA_DIR).filter((n) => n.endsWith(".html"))) {
    const html = readFileSync(join(BETA_DIR, name), "utf8");
    const text = html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    out.push([name, text]);
  }
  return out;
}

const ALL = [...voiceStrings(), ...markupStrings()];

test("the guard is scanning a real corpus", () => {
  // A guard that passes by scanning nothing is the false-green this repo has
  // shipped twice.
  assert.ok(ALL.length >= 12, `only ${ALL.length} beta strings found`);
  assert.ok(ALL.some(([id]) => id === "qise.html"), "the tracker markup must be scanned");
  assert.ok(ALL.some(([id]) => id === "study.html"), "the study markup must be scanned");
});

test("no beta string names a disease", () => {
  const offenders = [];
  for (const [id, str] of ALL) {
    for (const term of DISEASE_TERMS) {
      if (new RegExp(String.raw`\b${term}\b`, "i").test(str)) {
        offenders.push(`${id}: "${term}"`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    "a disease claim on any surface voids TGA exclusion 14B for the whole "
    + "product:\n  " + offenders.join("\n  "));
});

test("no beta string carries health vocabulary", () => {
  const offenders = [];
  for (const [id, str] of ALL) {
    for (const term of BLOCKLIST) {
      if (new RegExp(String.raw`\b${term}\b`, "i").test(str)) {
        offenders.push(`${id}: "${term}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], "beta copy is entertainment-side:\n  " + offenders.join("\n  "));
});

test("no beta string makes a claim about the reader", () => {
  const offenders = [];
  for (const [id, str] of ALL) {
    if (CLAIM_STRUCTURE.test(str)) offenders.push(`${id}: ${JSON.stringify(str)}`);
  }
  assert.deepEqual(offenders, [],
    "the beta describes an instrument and a tradition, never the reader:\n  "
    + offenders.join("\n  "));
});

test("the canary proves the scan can fail", () => {
  // The scan is only worth what it can catch. Two strings that MUST trip it.
  const canary = "you are showing signs of rosacea";
  assert.ok(DISEASE_TERMS.some((t) => new RegExp(String.raw`\b${t}\b`, "i").test(canary)));
  assert.ok(CLAIM_STRUCTURE.test(canary));
});
