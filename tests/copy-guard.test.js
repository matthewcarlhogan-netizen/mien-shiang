/* Class-level guard on user-facing copy.
 *
 * tests/rules.test.js already has "referral never names a disease", but it
 * only exercises ONE fired path (the malar gate) and only screens the
 * lupus family of terms. That is why a disease name sitting in a *wellness
 * advice* payload survived it: the advice path was never inspected.
 *
 * This walks EVERY rule in RULES rather than whatever one scenario happens to
 * fire, so a new rule cannot introduce a disease name without tripping it.
 * See CLAUDE.md: "No user-facing string may name a disease." */
import { test } from "node:test";
import assert from "node:assert/strict";

import { RULES } from "../src/rules.js";

// Unambiguous disease/condition names only. Deliberately NOT included:
// "ulcer" (a lesion/symptom, not a disease) and the organ-system
// correspondences such as "Heart — cardiovascular", which are framed as
// tradition rather than asserted as clinical findings. If you widen this
// list, widen it on purpose.
const DISEASE_TERMS = [
  "anaemia", "anemia", "thyroid", "lupus", "sle", "autoimmune",
  "rosacea", "diabetes", "diabetic", "jaundice", "melanoma",
  "carcinoma", "psoriasis", "eczema", "dermatitis", "cancer",
];

/** Every string reachable inside a rule payload, with its key path. */
function stringsIn(rule) {
  const found = [];
  JSON.stringify(rule, (key, value) => {
    if (typeof value === "string") found.push([key, value]);
    return value;
  });
  return found;
}

test("no rule payload names a disease, on any path", () => {
  const offenders = [];

  for (const rule of RULES) {
    const id = rule.id ?? rule.name ?? "(unidentified rule)";
    for (const [key, str] of stringsIn(rule)) {
      for (const term of DISEASE_TERMS) {
        // \b so "sle" cannot match inside "vessel" and "cancer" not "cancelled".
        if (new RegExp(`\\b${term}\\b`, "i").test(str)) {
          offenders.push(`${id} .${key} contains "${term}": ${JSON.stringify(str)}`);
        }
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "user-facing rule copy names a disease — this voids the TGA exclusion 14B " +
    "posture the whole product is built around:\n  " + offenders.join("\n  "),
  );
});
