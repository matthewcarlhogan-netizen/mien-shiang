/*
 * PHASE 8 gate, second half — findPatterns returns [] for any tag with n < 5.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  findPatterns, describePattern, usualRange, PATTERN_METRICS,
  MIN_TAGGED_READINGS, MIN_CONFIDENCE_TO_COUNT,
} from "../../src/qise/patterns.js";

/** A reading with a given lustre, tags and confidence. */
const reading = (i, { ming = 1.10, run = 21, tags = [], confidence = 0.9, valid = true } = {}) => ({
  timestampIso: new Date(Date.UTC(2026, 6, 1 + i)).toISOString(),
  tags, confidence, valid,
  metrics: { corrected: { ming, run }, raw: { ming, run } },
});

/** Twenty ordinary readings, so the user's own range is well defined. */
const backdrop = () => Array.from({ length: 20 }, (_, i) =>
  reading(i, { ming: 1.08 + (i % 5) * 0.01, run: 20 + (i % 5) * 0.5 }));

/* ────────────────────────────────────────────────────────────── the gate ── */

test("a tag with fewer than five readings produces nothing at all", () => {
  assert.equal(MIN_TAGGED_READINGS, 5);
  for (let n = 0; n < 5; n++) {
    const history = [
      ...backdrop(),
      ...Array.from({ length: n }, (_, i) => reading(30 + i, { ming: 0.9, tags: ["poor sleep"] })),
    ];
    const found = findPatterns(history).filter((p) => p.tag === "poor sleep");
    assert.deepEqual(found, [], `a tag with n=${n} appeared`);
  }
});

test("at exactly five it appears — the floor is a floor, not a barrier", () => {
  // The paired control. "Returns nothing" is worthless if it returns nothing
  // for everything, which is precisely the false-green shape this repo has
  // shipped before.
  const history = [
    ...backdrop(),
    ...Array.from({ length: 5 }, (_, i) => reading(30 + i, { ming: 0.85, tags: ["poor sleep"] })),
  ];
  const found = findPatterns(history).filter((p) => p.tag === "poor sleep" && p.metric === "ming");
  assert.equal(found.length, 1);
  assert.equal(found[0].n, 5);
  assert.equal(found[0].belowRange, 5);
});

test("low-confidence readings do not count toward n", () => {
  // A low-confidence reading is one where the measurement is in doubt.
  // Counting it buys volume with exactly the readings least able to support a
  // statement.
  const history = [
    ...backdrop(),
    ...Array.from({ length: 4 }, (_, i) => reading(30 + i, { ming: 0.85, tags: ["poor sleep"] })),
    reading(40, { ming: 0.85, tags: ["poor sleep"], confidence: MIN_CONFIDENCE_TO_COUNT - 0.1 }),
  ];
  assert.deepEqual(findPatterns(history).filter((p) => p.tag === "poor sleep"), []);

  // Lift that one reading over the line and the tag appears.
  history[history.length - 1].confidence = MIN_CONFIDENCE_TO_COUNT;
  assert.ok(findPatterns(history).some((p) => p.tag === "poor sleep"));
});

test("invalid readings are excluded entirely", () => {
  const history = [
    ...backdrop(),
    ...Array.from({ length: 4 }, (_, i) => reading(30 + i, { ming: 0.85, tags: ["poor sleep"] })),
    reading(40, { ming: 0.85, tags: ["poor sleep"], valid: false }),
  ];
  assert.deepEqual(findPatterns(history).filter((p) => p.tag === "poor sleep"), []);
});

/* ────────────────────────────────────────────────────────── the frequencies ── */

test("the counts are frequencies against the reader's OWN range, and they add up", () => {
  const history = [
    ...backdrop(),
    ...Array.from({ length: 4 }, (_, i) => reading(30 + i, { ming: 0.80, tags: ["poor sleep"] })),
    ...Array.from({ length: 3 }, (_, i) => reading(40 + i, { ming: 1.09, tags: ["poor sleep"] })),
  ];
  const p = findPatterns(history).find((x) => x.tag === "poor sleep" && x.metric === "ming");
  assert.equal(p.n, 7);
  assert.equal(p.belowRange, 4);
  assert.equal(p.inRange, 3);
  assert.equal(p.aboveRange, 0);
  assert.equal(p.aboveRange + p.belowRange + p.inRange, p.n, "the three counts must partition n");
  assert.ok(p.range.low < p.range.high);
});

test("the usual range is taken over ALL readings, not over the tagged subset", () => {
  // Taken over the tagged subset it would be the range of the very thing being
  // described, and roughly half of them would sit inside it by construction.
  const history = [
    ...backdrop(),
    ...Array.from({ length: 6 }, (_, i) => reading(30 + i, { ming: 0.60 + i * 0.001, tags: ["fasting"] })),
  ];
  const p = findPatterns(history).find((x) => x.tag === "fasting" && x.metric === "ming");
  assert.equal(p.belowRange, 6,
    "all six sit below the overall range; against their own range they would split");
});

test("both reportable metrics are covered, and the risky ones are not", () => {
  assert.deepEqual(PATTERN_METRICS.map((m) => m.key), ["ming", "run"]);
  const labels = PATTERN_METRICS.map((m) => m.label);
  assert.deepEqual(labels, ["lustre", "moisture"]);
  // `xue`'s classical name refers to something this product must never claim
  // to observe, so it has no user-facing label at all.
  assert.ok(!PATTERN_METRICS.some((m) => m.key === "xue" || m.key === "han"));
});

test("a metric that was never measured is skipped rather than counted as zero", () => {
  const history = backdrop().map((r) => ({ ...r, metrics: { corrected: { ming: r.metrics.corrected.ming, run: null } } }));
  for (let i = 0; i < 6; i++) history.push(reading(30 + i, { ming: 0.8, tags: ["x"] }));
  history.forEach((r) => { if (r.metrics.corrected.run === undefined) r.metrics.corrected.run = null; });
  const found = findPatterns(history);
  assert.ok(found.some((p) => p.metric === "ming"));
});

test("an empty or tiny history yields no patterns and does not throw", () => {
  assert.deepEqual(findPatterns([]), []);
  assert.deepEqual(findPatterns(null), []);
  assert.deepEqual(findPatterns([reading(0, { tags: ["x"] })]), []);
  assert.equal(usualRange([], "ming"), null);
});

test("results lead with whatever actually departed", () => {
  const history = [
    ...backdrop(),
    ...Array.from({ length: 6 }, (_, i) => reading(30 + i, { ming: 1.09, run: 20.5, tags: ["quiet day"] })),
    ...Array.from({ length: 6 }, (_, i) => reading(40 + i, { ming: 0.5, run: 5, tags: ["big day"] })),
  ];
  const found = findPatterns(history);
  assert.equal(found[0].tag, "big day");
});

/* ───────────────────────────────────────────────────────────── the wording ── */

test("the sentence is the permitted form, and always carries n", () => {
  const p = {
    tag: "poor sleep", n: 7, metric: "ming", label: "lustre",
    aboveRange: 0, belowRange: 5, inRange: 2, range: { low: 1, high: 1.2 },
  };
  assert.equal(describePattern(p),
    "Across 7 readings you tagged 'poor sleep', your lustre sat below your usual range 5 times.");
});

test("the sentence carries no cause, no p-value, no prediction and no health framing", () => {
  const history = [
    ...backdrop(),
    ...Array.from({ length: 8 }, (_, i) => reading(30 + i, { ming: 0.7, run: 10, tags: ["poor sleep", "long flight"] })),
  ];
  const sentences = findPatterns(history).map(describePattern);
  assert.ok(sentences.length > 0, "nothing to check");

  for (const s of sentences) {
    // Thirty self-tagged readings from one person cannot separate a cause from
    // a coincidence, whatever hedge precedes the claim.
    assert.doesNotMatch(s, /\b(because|causes?|caused|due to|leads? to|linked to|associated with|when you)\b/i, s);
    // The tags are chosen after the fact, the metrics are correlated, and
    // every tag is tested at once. A p-value on that has a respectable name
    // and no meaning.
    assert.doesNotMatch(s, /\b(p\s*[<=]|significant|correlat|probability|likelihood)\b/i, s);
    assert.doesNotMatch(s, /\b(will|expect|predict|forecast|likely|tend to)\b/i, s);
    assert.doesNotMatch(s, /\b(diagnos|disease|symptom|treat|cure|healthy|unhealthy|deficien|organ|medical|illness)/i, s);
    // n is not optional.
    assert.match(s, /Across \d+ readings/);
    assert.match(s, /\d+ times\./);
  }
});

test("the sentence reports the larger side, so it never understates a departure", () => {
  const base = { tag: "t", n: 10, metric: "ming", label: "lustre", range: { low: 1, high: 2 } };
  assert.match(describePattern({ ...base, aboveRange: 7, belowRange: 1, inRange: 2 }), /above your usual range 7 times/);
  assert.match(describePattern({ ...base, aboveRange: 1, belowRange: 7, inRange: 2 }), /below your usual range 7 times/);
});
