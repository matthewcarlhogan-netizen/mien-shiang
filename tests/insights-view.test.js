/*
 * The insights narrative, as it reaches the screen.
 *
 * insights.js shipped unwired in the salvage from PR #5, which meant its
 * strings were scanned by the copy guards and its RENDERING was covered by
 * nothing. That is item 18a's rule in miniature: coverage is what the tests
 * can reach, and a module nothing imports is a module nothing tests. These
 * assert on the HTML `readingview.js` actually produces.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { renderReading, renderReadingGated } from "../src/readingview.js";
import { generateInsights, CANON_NOT_MEASURED } from "../src/utils/insights.js";

// ---------------------------------------------------------------- helpers ---

/**
 * A reading with Five Elements available, which is what insightsFor() needs
 * before it will produce anything at all. Shaped like composeReading() output.
 */
function makeReading({ shape = "square", canon = 0.7, available = true } = {}) {
  return {
    module: "A",
    fiveElements: available
      ? {
          available: true, shape, element: "earth", hanzi: "土", name: "Earth",
          reading: "Classical Mian Xiang reads this shape as Earth.",
          alternates: [{ name: "Metal", hanzi: "金" }],
          sourcesDiffer: "Texts differ: many read the square face as Earth while others read it as Metal.",
        }
      : { available: false, why: "headTurned", note: "The head is turned too far to type this face." },
    threeCourts: null,
    twelvePalaces: null,
    qiSe: null,
    harmony: canon === null
      ? { module: "A", value: null, basis: "", components: [] }
      : { module: "A", value: 70, basis: "canon", components: [{ key: "canon", value: canon, weight: 40 }] },
  };
}

// ------------------------------------------------------------------ tests ---

test("the insights teaser renders on the free side of the gate", () => {
  const reading = makeReading();
  const expected = generateInsights("square", 0.7).teaserLines;

  assert.ok(expected.length >= 2, "fixture assumption: there are teaser lines to find");

  const locked = renderReadingGated(reading, { locked: true });

  // Present at all...
  assert.match(locked, /class="insights-teaser"/,
    "the teaser must render even when the reading is locked");
  for (const line of expected) {
    assert.ok(locked.includes(line), `teaser line missing from the locked render: ${line}`);
  }

  // ...and on the FREE side, not inside the blurred container. The blurred
  // half starts at reading-gate-wrap, so a teaser that appears only after it
  // has been gated by accident — which is the failure this pins.
  const gateStart = locked.indexOf('class="reading-gate-wrap"');
  assert.ok(gateStart > -1, "fixture assumption: the locked render has a gate wrapper");
  assert.ok(locked.indexOf('class="insights-teaser"') < gateStart,
    "the teaser must sit BEFORE the gate wrapper, not inside it");

  // Ungated render still carries it.
  assert.match(renderReading(reading), /class="insights-teaser"/);
});

test("the insights full report is gated, and its prose never leaks while locked", () => {
  const reading = makeReading();
  const report = generateInsights("square", 0.7).fullReport;

  const locked = renderReadingGated(reading, { locked: true });
  const unlocked = renderReadingGated(reading, { locked: false });

  // Unlocked shows it.
  assert.match(unlocked, /class="insights-report"/);
  assert.ok(unlocked.includes(report.summary), "the unlocked report must carry its summary");

  // Locked renders it only INSIDE the blurred container. The section exists in
  // the markup (that is what makes the gate visible as a gate) but must not
  // appear before the wrapper, where it would be plainly readable.
  const gateStart = locked.indexOf('class="reading-gate-wrap"');
  const reportAt = locked.indexOf('class="insights-report"');
  assert.ok(reportAt > gateStart,
    "the full report must render inside the gate wrapper, never above it");

  // The strengths and tendencies are the substance being sold. Assert each one
  // lands on the gated side rather than trusting the container.
  for (const line of [...report.strengths, ...report.tendencies]) {
    const at = locked.indexOf(line);
    assert.ok(at > gateStart, `gated prose rendered above the gate: ${line}`);
  }
});

test("a face whose shape was not established gets no narrative at all", () => {
  // generateInsights() falls back to SHAPE_COPY.oval for an unknown shape.
  // Rendering that when Five Elements refused would present the RESIDUAL class
  // as a finding — item 13's defect arriving through the view. The view must
  // refuse instead, exactly as the summary gives an unread construct no value.
  const turned = makeReading({ available: false });

  const locked = renderReadingGated(turned, { locked: true });
  assert.doesNotMatch(locked, /class="insights-teaser"/);
  assert.doesNotMatch(locked, /class="insights-report"/);
  assert.doesNotMatch(renderReading(turned), /class="insights-(teaser|report)"/);
});

test("an unmeasured canon proportion is stated as not measured, never as a low value", () => {
  // Absence of measurement and a measurement of absence are different objects.
  // The lowest band ("diverge from the classical Mian Xiang figure") is a
  // statement about proportions that WERE measured; null must not reach it.
  const noCanon = makeReading({ canon: null });
  const unlocked = renderReadingGated(noCanon, { locked: false });

  assert.ok(unlocked.includes(CANON_NOT_MEASURED),
    "a reading with no canon component must say so");
  assert.ok(!unlocked.includes("diverge from the classical Mian Xiang figure"),
    "not-measured must not be rendered as the lowest band");
});
