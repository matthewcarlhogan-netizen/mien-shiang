/*
 * Module boundary tests.
 *
 * The boundary is structural, so these assert structure, not wording:
 *   - Module A's output carries NO clinical vocabulary, anywhere in the object
 *   - both adapters consume the SAME raw scalar object
 *   - neither adapter owns the measurement functions
 *   - Module B produces nothing when the feature flag is off
 *   - an unmeasurable colour channel is DROPPED by both, never zeroed
 *
 * The last one matters most. Substituting 0 for "not measured" would make the
 * app report a worse complexion reading for darker skin and a silent
 * all-clear on the safety path — two different failures from the same mistake.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { readComplexion, GLOW_WEIGHTS, GLOW_SCALES } from "../src/adapters/entertainment.js";
import { evaluateSafety, SAFETY_THRESHOLDS, isSafetyEnabled, SAFETY_IS_NEVER_BILLED }
  from "../src/adapters/safety.js";
import { MODULE_B_SAFETY_REFERRALS, BUILD_FLAVOUR } from "../src/flags.js";
import { SAFETY_THRESHOLDS as VIA_RULES } from "../src/adapters/safety.js";
import { RULES, runRules } from "../src/rules.js";

const src = (rel) =>
  readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), "utf8");

/** A raw-scalar object shaped exactly like rawScalars() output. */
function makeRaw({ deltaEi = 0, regime = "full", zones: over = {} } = {}) {
  const keys = ["cheek_left", "cheek_right", "nose_bridge", "nasolabial_left",
    "nasolabial_right", "center_forehead", "chin"];
  const zones = {};
  for (const k of keys) {
    zones[k] = {
      deltaEi: regime === "low" ? null : deltaEi,
      deltaMi: 0, deltaContrast: 0, ridge: 0.01, ridgeDelta: 0,
      ridgeAxis: "horizontal", L: 60, b: 15, pixels: 4000,
      ...(over[k] ?? {}),
    };
  }
  return { baseline: { regime, band: regime === "low" ? "dark" : "light", n: 9000 }, zones };
}

/**
 * Input that genuinely trips the malar gate: redness on both cheeks and the
 * bridge, with the smile lines SPARED.
 *
 * Raising deltaEi uniformly across every zone does NOT trip it — the smile
 * lines rise too and the sparing condition correctly blocks it. That is the
 * gate working, and a fixture that ignores it tests nothing.
 */
const trippingRaw = () => makeRaw({
  deltaEi: 0,
  zones: {
    cheek_left: { deltaEi: 7 }, cheek_right: { deltaEi: 7 }, nose_bridge: { deltaEi: 7 },
    nasolabial_left: { deltaEi: 0 }, nasolabial_right: { deltaEi: 0 },
  },
});

// ───────────────────────────────────── Module A: no clinical vocabulary ────

const CLINICAL = ["erythema", "pallor", "hyperpigmentation", "xerosis", "rhytide",
  "lesion", "acne", "rosacea", "dermatitis", "eczema", "melanoma", "cancer",
  "diagnos", "symptom", "disease", "condition", "treat", "cure", "disorder",
  "clinical", "clinician", "doctor", "dermatolog", "referral", "medical",
  "severity", "wellness", "health", "anaemia", "thyroid"];

test("Module A output carries no clinical vocabulary, in keys OR values", () => {
  const outputs = [
    readComplexion(makeRaw({})),
    readComplexion(makeRaw({ regime: "low" })),
    readComplexion({ baseline: {}, zones: {} }),
    readComplexion(makeRaw({ deltaEi: 7 })),
  ];

  const offenders = [];
  const walk = (node, path) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        for (const term of CLINICAL) {
          if (k.toLowerCase().includes(term)) offenders.push(`key ${path}.${k}`);
        }
        walk(v, `${path}.${k}`);
      }
      return;
    }
    if (typeof node === "string") {
      for (const term of CLINICAL) {
        if (node.toLowerCase().includes(term)) offenders.push(`value ${path} = ${JSON.stringify(node)}`);
      }
    }
  };
  outputs.forEach((o, i) => walk(o, `output[${i}]`));

  assert.deepEqual(offenders, [],
    "Module A leaked clinical vocabulary — the boundary exists to prevent exactly this:\n  "
    + offenders.join("\n  "));
});

test("Module A does not import the labelled path", () => {
  const text = src("adapters/entertainment.js");
  // Consuming analyse() would pull condition names ("erythema", "pallor", …)
  // straight into Module A and make the boundary paper-only.
  assert.doesNotMatch(text, /\bimport\b[^\n]*\banalyse\b/,
    "entertainment.js must consume rawScalars(), never analyse()");
  assert.doesNotMatch(text, /from\s+["']\.\.\/rules\.js["']/,
    "entertainment.js must not reach into the rule engine");
});

test("Module A emits no sentences — copy lives in the copy layer", () => {
  const out = readComplexion(makeRaw({ regime: "low" }));
  // Note keys are machine-readable tokens, not prose, so the copy lint has
  // exactly one surface to scan later.
  assert.equal(out.note, "colourNotMeasurableFromThisPhoto");
  assert.ok(!/ /.test(out.note), "note must be a token, not a sentence");
});

// ─────────────────────────────── structural drop, not a zero substitute ────

test("Module A DROPS warmth when colour is unmeasurable — it does not score it 0", () => {
  const full = readComplexion(makeRaw({ regime: "full", deltaEi: 0 }));
  const low = readComplexion(makeRaw({ regime: "low" }));

  assert.equal(full.warmthAvailable, true);
  assert.equal(low.warmthAvailable, false);
  assert.equal(low.components.warmth, null, "warmth must be null, never 0");
  assert.ok(low.componentsUnavailable.includes("warmth"));
  assert.ok(!low.componentsUsed.includes("warmth"));

  // The decisive assertion: a face that is otherwise identical must NOT score
  // lower merely because colour could not be measured. Scoring the missing
  // component 0 would systematically penalise darker skin.
  assert.equal(low.glowIndex, full.glowIndex,
    "dropping an unavailable component must rescale the weights, not penalise");
});

test("glowIndex is tagged with its basis, because rescaling makes regimes incomparable", () => {
  // Warmth below the average of the other components. Dropping it RAISES the
  // index — correct (a 0 would penalise deeper skin) but it means the two
  // numbers are not on the same scale.
  const full = readComplexion(makeRaw({ regime: "full", deltaEi: 7 }));
  const low = readComplexion(makeRaw({ regime: "low" }));

  assert.ok(full.components.warmth < 1, "precondition: warmth drags the average down");
  assert.ok(low.glowIndex > full.glowIndex,
    "precondition: dropping a below-average component raises the rescaled index");

  // The guard: the basis differs, so a history feature can refuse to compare.
  assert.notEqual(low.basis, full.basis);
  assert.equal(full.basis, "clarity+evenness+luminosity+smoothness+warmth");
  assert.equal(low.basis, "clarity+evenness+luminosity+smoothness");

  // Same basis => same scale, so like-for-like comparison is well defined.
  const otherFull = readComplexion(makeRaw({ regime: "full", deltaEi: 2 }));
  assert.equal(otherFull.basis, full.basis);
});

test("the dropped weight is redistributed, not silently lost", () => {
  const low = readComplexion(makeRaw({ regime: "low" }));
  const presentWeight = low.componentsUsed.reduce((s, k) => s + GLOW_WEIGHTS[k], 0);
  assert.ok(presentWeight < 1, "precondition: a component really is missing");
  assert.ok(low.glowIndex >= 0 && low.glowIndex <= 100);
});

test("Module B REFUSES to assess when colour is unmeasurable, rather than finding nothing", () => {
  const low = evaluateSafety(makeRaw({ regime: "low" }));
  assert.equal(low.assessable, false);
  assert.equal(low.reason, "colourNotMeasurable");
  assert.deepEqual(low.referrals, []);

  // A gate that quietly failed to fire on null input would read to the user as
  // "nothing found" — a clinical claim with nothing behind it.
  const clear = evaluateSafety(makeRaw({ regime: "full", deltaEi: 0 }));
  assert.equal(clear.assessable, true);
  assert.deepEqual(clear.referrals, []);
  assert.notEqual(low.assessable, clear.assessable,
    "'could not assess' and 'assessed, found nothing' must be distinguishable");
});

// ───────────────────────────────────────────── shared, unowned measurement ─

test("both adapters consume the SAME raw object and neither mutates it", () => {
  const raw = makeRaw({ deltaEi: 6 });
  const before = JSON.stringify(raw);

  const a = readComplexion(raw);
  const b = evaluateSafety(raw);

  assert.equal(JSON.stringify(raw), before, "adapters must not mutate shared input");
  assert.ok(a.glowIndex !== null);
  assert.equal(b.enabled, MODULE_B_SAFETY_REFERRALS);
});

test("neither adapter re-implements a measurement function", () => {
  for (const f of ["adapters/entertainment.js", "adapters/safety.js"]) {
    const text = src(f);
    for (const fn of ["shadesOfGray", "erythemaIndex", "melaninIndex", "rgbToLab",
      "glcmContrast", "ridgeResponse", "trimmedMedian", "itaDegrees"]) {
      assert.doesNotMatch(text, new RegExp(String.raw`function\s+${fn}\b`),
        `${f} must not own the measurement function ${fn} — it stays in engine.js`);
    }
  }
});

// ────────────────────────────────────────────────────── the feature flag ───

test("the build flavour is derivable without running the app", () => {
  assert.equal(BUILD_FLAVOUR, MODULE_B_SAFETY_REFERRALS ? "wellness" : "entertainment-only");
  assert.equal(isSafetyEnabled(), MODULE_B_SAFETY_REFERRALS);
});

test("with the flag OFF, Module B produces nothing at all", async () => {
  // Re-import the adapter with the flag stubbed off, proving the gate is in the
  // module rather than in whatever happens to call it.
  const stub = "data:text/javascript," + encodeURIComponent(`
    export const MODULE_B_SAFETY_REFERRALS = false;
    export const BUILD_FLAVOUR = "entertainment-only";
    export const MODULE_B_IS_NEVER_MONETISED = true;
  `);
  const engineUrl = new URL("../src/engine.js", import.meta.url).href;
  const safetySrc = src("adapters/safety.js")
    .replace('from "../flags.js"', `from "${stub}"`)
    .replace('from "../engine.js"', `from "${engineUrl}"`);
  const mod = await import("data:text/javascript," + encodeURIComponent(safetySrc));

  // A face that WOULD trip the malar gate when enabled.
  const tripping = trippingRaw();
  assert.ok(evaluateSafety(tripping).referrals.length > 0,
    "precondition: this input trips the gate when the flag is on");

  const off = mod.evaluateSafety(tripping);
  assert.equal(off.enabled, false);
  assert.equal(off.assessable, false);
  assert.deepEqual(off.referrals, [], "flag off must yield no referral to render");
});

test("the flag gates the LEGACY rule path too, not only the adapter", () => {
  // Module B is reachable by two doors. Gating only the adapter left runRules()
  // still emitting referrals while the flag read as "off", which would make the
  // entertainment-only flavour a label with nothing behind it.
  // Asserted as booleans, not assert.match on the file: a failed match would
  // dump all of rules.js into the output and bury the reason.
  const text = src("rules.js");
  assert.ok(text.includes("MODULE_B_SAFETY_REFERRALS"),
    "rules.js must consult the flag");
  assert.ok(/\.filter\([\s\S]{0,160}?safety_gate/.test(text),
    "runRules must drop safety_gate rules when Module B is disabled");

  // And with the flag ON the gate is genuinely reachable, so the filter above
  // is not passing by removing everything.
  const facts = ["cheek_left", "cheek_right", "nose_bridge"].map((z) => ({
    fact: "observation", zone: z, condition: "erythema",
    severity: 7 / 12, confidence: 0.8, tone: "light", measured: { delta_ei: 7 },
  }));
  const out = runRules(facts);
  assert.equal(out.referrals.length, MODULE_B_SAFETY_REFERRALS ? 1 : 0);
  assert.equal(out.halted, MODULE_B_SAFETY_REFERRALS);
});

test("flags.js stays pure ASCII", () => {
  // Build scripts flip the constant in this file. A PowerShell 5.1
  // Get-Content/Set-Content round-trip reads non-ASCII as ANSI and writes it
  // back double-encoded — it corrupted this file once already.
  const text = src("flags.js");
  const bad = [...text].filter((c) => c.charCodeAt(0) > 127);
  assert.deepEqual(bad, [],
    `flags.js must be ASCII-only so a build-script round-trip cannot corrupt it; found: ${bad.join(" ")}`);
});

test("referrals are never billable, in either flavour", () => {
  assert.equal(SAFETY_IS_NEVER_BILLED, true);
  const r = evaluateSafety(trippingRaw()).referrals[0];
  assert.equal(r.billable, false);

  // No pricing/entitlement surface may exist in the safety adapter at all.
  const text = src("adapters/safety.js");
  for (const term of ["price", "paywall", "subscription", "entitlement", "tier", "purchase"]) {
    assert.doesNotMatch(text, new RegExp(String.raw`\b${term}\s*[:=]`, "i"),
      `safety.js must carry no ${term} parameter`);
  }
});

// ──────────────────────────────────────────── one source for the numbers ───

test("rules.js uses the adapter's thresholds rather than repeating literals", () => {
  const malar = RULES.find((r) => r.id === "SG-001-MALAR");
  const cheek = malar.all.find((c) => c.zone === "cheek_left");
  assert.equal(cheek.severity[">="], VIA_RULES.MALAR_CHEEK_SEVERITY);

  // And the file must not have gone back to hardcoded numbers.
  const text = src("rules.js");
  assert.match(text, /SAFETY_THRESHOLDS\.MALAR_CHEEK_SEVERITY/);
  assert.doesNotMatch(text, /condition:\s*"erythema",\s*severity:\s*\{\s*">=":\s*0\.45\s*\}/,
    "threshold literals must not be reintroduced alongside the imported constants");
});

test("the malar gate fires on the same input through both paths", () => {
  const viaAdapter = evaluateSafety(trippingRaw());
  assert.equal(viaAdapter.referrals.length, 1);
  assert.equal(viaAdapter.referrals[0].id, "SG-001-MALAR");
});

test("smile-line involvement stops the gate, through the adapter too", () => {
  const spared = makeRaw({
    deltaEi: 0,
    zones: {
      cheek_left: { deltaEi: 7 }, cheek_right: { deltaEi: 7 }, nose_bridge: { deltaEi: 7 },
      nasolabial_left: { deltaEi: 7 }, nasolabial_right: { deltaEi: 7 },
    },
  });
  assert.deepEqual(evaluateSafety(spared).referrals, []);
});

// ──────────────────────────────────────────────── not a rating, not a rank ─

test("Module A exposes no ranking, percentile or cross-person comparison", () => {
  const out = readComplexion(makeRaw({}));
  for (const k of ["rank", "percentile", "rating", "attractiveness", "beauty", "overall"]) {
    assert.equal(out[k], undefined, `Module A must not expose ${k}`);
  }
  const text = src("adapters/entertainment.js");
  assert.doesNotMatch(text, /\bfunction\s+\w*(rank|percentile|compare)\w*/i,
    "no comparison API may exist — glowIndex describes a photo, not a person");
});

test("glowIndex stays within 0..100 across degenerate inputs", () => {
  const cases = [
    makeRaw({ deltaEi: 0 }),
    makeRaw({ deltaEi: 40 }),
    makeRaw({ deltaEi: -40 }),
    makeRaw({ regime: "low" }),
    { baseline: {}, zones: {} },
  ];
  for (const raw of cases) {
    const g = readComplexion(raw).glowIndex;
    assert.ok(g === null || (g >= 0 && g <= 100), `glowIndex out of range: ${g}`);
  }
});

test("glow scales are declared constants, not inline magic numbers", () => {
  for (const [k, v] of Object.entries(GLOW_SCALES)) {
    assert.equal(typeof v, "number", `${k} must be a number`);
  }
  const total = Object.values(GLOW_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-9, `weights must sum to 1, got ${total}`);
});
