/*
 * Class-level guard on user-facing copy, now MODULE-AWARE.
 *
 * The two modules have different permissions, so one blocklist cannot serve
 * both:
 *
 *   Module A (rules-a.js) — entertainment. NO health vocabulary at all, and
 *     every trait mapping must name the tradition it comes from.
 *   Module B (rules-b.js) — health-adjacent. Clinical vocabulary is allowed.
 *     Naming a DISEASE is not, in either module: TGA exclusion 14B does not
 *     apply to software making claims about a serious disease, and every
 *     function must qualify or the exclusion is void for the whole product.
 *
 * This walks EVERY rule rather than whatever one scenario happens to fire,
 * because the defect that shipped was in an *advice* payload that no
 * referral-path test ever inspected — and ui.js renders `recommend[]`
 * verbatim into innerHTML, so advice is exactly as user-facing as a referral.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { RULES_A, ZONE_READINGS } from "../src/rules-a.js";
import { RULES_B, MODULE_B_DISCLAIMER } from "../src/rules-b.js";

/* Disease names. Banned in BOTH modules. Deliberately excludes "ulcer" (a
 * lesion, not a disease). Widen on purpose, not by accident. */
const DISEASE_TERMS = [
  "anaemia", "anemia", "thyroid", "lupus", "sle", "autoimmune",
  "rosacea", "diabetes", "diabetic", "jaundice", "melanoma",
  "carcinoma", "psoriasis", "eczema", "dermatitis", "cancer",
];

/* Health vocabulary. Banned in MODULE A only. "circulation", "iron" and
 * "blood" are on this list precisely because Module B's relocated advisory
 * uses them — they are the marker of content that belongs on the other side
 * of the boundary. */
const MODULE_A_BLOCKLIST = [
  "acne", "rosacea", "dermatitis", "eczema", "melanoma", "cancer", "lesion",
  "diagnose", "diagnosis", "treat", "treatment", "symptom", "condition",
  "cure", "disorder", "disease", "pathology", "severity", "referral",
  "medical", "clinical", "anaemia", "thyroid", "iron", "circulation", "blood",
];

/** Every string reachable inside a payload, with its key path. */
function stringsIn(obj) {
  const found = [];
  JSON.stringify(obj, (key, value) => {
    if (typeof value === "string") found.push([key, value]);
    return value;
  });
  return found;
}

const scan = (subject, id, terms) => {
  const hits = [];
  for (const [key, str] of stringsIn(subject)) {
    for (const term of terms) {
      // \b so "sle" cannot match inside "vessel", "iron" not inside "ironic",
      // and "cancer" not inside "cancelled".
      if (new RegExp(String.raw`\b${term}\b`, "i").test(str)) {
        hits.push(`${id} .${key} contains "${term}": ${JSON.stringify(str)}`);
      }
    }
  }
  return hits;
};

// ─────────────────────────────────────────────── disease names, both sides ──

test("no rule payload names a disease, on any path, in EITHER module", () => {
  const offenders = [];
  for (const rule of [...RULES_A, ...RULES_B]) {
    offenders.push(...scan(rule, rule.id ?? "(unidentified rule)", DISEASE_TERMS));
  }
  offenders.push(...scan(ZONE_READINGS, "ZONE_READINGS", DISEASE_TERMS));
  offenders.push(...scan({ MODULE_B_DISCLAIMER }, "MODULE_B_DISCLAIMER", DISEASE_TERMS));

  assert.deepEqual(offenders, [],
    "user-facing rule copy names a disease — this voids the TGA exclusion 14B "
    + "posture the whole product is built around:\n  " + offenders.join("\n  "));
});

// ──────────────────────────────────────────── Module A: no health vocabulary ─

test("Module A carries no health vocabulary anywhere", () => {
  const offenders = [];
  for (const rule of RULES_A) {
    offenders.push(...scan(rule, rule.id ?? "(unidentified rule)", MODULE_A_BLOCKLIST));
  }
  offenders.push(...scan(ZONE_READINGS, "ZONE_READINGS", MODULE_A_BLOCKLIST));

  assert.deepEqual(offenders, [],
    "Module A is the entertainment module and must contain no health "
    + "vocabulary. If a line genuinely needs these words it belongs in "
    + "rules-b.js, under the Module B disclaimer:\n  " + offenders.join("\n  "));
});

test("the relocated advisory really is in Module B, and Module A did not replace it", () => {
  // The line that caused the long-standing failure now lives in Module B.
  const advisory = RULES_B.find((r) => r.id === "SG-010-PERSISTENT-PATTERN");
  assert.ok(advisory, "the relocated advisory must exist in Module B");
  assert.match(advisory.then.message, /circulation or iron levels/);
  assert.match(advisory.then.message, /not as a diagnosis/);
  assert.equal(advisory.category, "safety_advisory",
    "an advisory, not a gate — it must not halt the reading");

  // And Module A must NOT have grown a softened substitute. The absence is the
  // correct outcome; a replacement would recreate the health claim in gentler
  // words and put it back on the wrong side of the boundary.
  const damp = RULES_A.find((r) => r.id === "TCM-202-DAMP-HEAT");
  assert.equal(damp.then.recommend.length, 1,
    "Module A must keep exactly the one remaining recommendation, with no substitute");
  for (const s of stringsIn(damp).map(([, v]) => v)) {
    assert.doesNotMatch(s, /\b(doctor|bloods?|test|levels)\b/i,
      `Module A recreated the relocated health advice: ${JSON.stringify(s)}`);
  }
});

// ────────────────────────────────────────── Module A: framing and attribution ─

/** Named traditions. A generic "tradition" alone does not satisfy this. */
const ATTRIBUTION = /Mian Xiang|Classical Chinese face reading|Chinese (and Western )?tradition|Lavater|Western physiognomy|Ming-era|classical texts?|the texts|classical commentaries|classical (pairing|suggestion|reading|advice|form)|Mian Xiang reads/i;

test("every Module A reading names the tradition it comes from", () => {
  for (const rule of RULES_A) {
    assert.match(rule.then.message, ATTRIBUTION,
      `${rule.id}: message must name its source tradition, not assert a fact`);
  }
  for (const [zone, r] of Object.entries(ZONE_READINGS)) {
    assert.match(r.correspondence, ATTRIBUTION,
      `ZONE_READINGS.${zone}: correspondence must name its source tradition`);
  }
});

test("Module A never asserts a fact about the person", () => {
  // "You are X" / "your personality is X" phrasing. The reading describes what
  // a tradition says, never what the reader is.
  const ASSERTIVE = [
    /\byou are\b/i,
    /\byou have\b/i,
    /\byou tend to\b/i,
    /\byou will\b/i,
    /\byour (personality|character|nature|temperament|future)\b/i,
    /\bthis means you\b/i,
    /\bpeople like you\b/i,
  ];
  const offenders = [];
  for (const rule of RULES_A) {
    for (const [key, str] of stringsIn(rule)) {
      for (const pattern of ASSERTIVE) {
        if (pattern.test(str)) offenders.push(`${rule.id} .${key}: ${JSON.stringify(str)}`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    "Module A asserted a fact about the reader. Rewrite as tradition:\n  "
    + offenders.join("\n  "));
});

test("Module A never delivers a negative verdict", () => {
  const NEGATIVE = [
    /\b(weak|weakness|flaw|flawed|poor|bad|ugly|unattractive|failure|doomed)\b/i,
    /\byou (should worry|need to worry)\b/i,
  ];
  const offenders = [];
  for (const rule of RULES_A) {
    for (const [key, str] of stringsIn(rule)) {
      for (const p of NEGATIVE) {
        if (p.test(str)) offenders.push(`${rule.id} .${key}: ${JSON.stringify(str)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], "Module A copy must never be a verdict:\n  " + offenders.join("\n  "));
});

test("where classical sources disagree, Module A says so", () => {
  // Not optional decoration: the mappings genuinely conflict between texts,
  // and picking one silently presents a contested reading as settled.
  for (const rule of RULES_A) {
    assert.ok(typeof rule.then.sourcesDiffer === "string" && rule.then.sourcesDiffer.length > 30,
      `${rule.id}: must carry a sourcesDiffer note naming both positions`);
    assert.match(rule.then.sourcesDiffer, /differ|part on|while|whereas|others?\b/i,
      `${rule.id}: sourcesDiffer must actually describe a disagreement`);
  }
});

// ─────────────────────────────────────────────────────── scanner self-check ──

test("the scanner can find a term that is definitely present", () => {
  // Without this, a broken regex reports "clean" instead of "broken" — which
  // is exactly how an earlier framing scan returned a false all-clear.
  const canary = { then: { message: "this line mentions rosacea deliberately" } };
  assert.equal(scan(canary, "CANARY", DISEASE_TERMS).length, 1);
  assert.equal(scan(canary, "CANARY", MODULE_A_BLOCKLIST).length, 1);
  assert.equal(scan({ then: { message: "nothing to see" } }, "CLEAN", DISEASE_TERMS).length, 0);
});
