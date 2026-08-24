/*
 * Reading view + science screen.
 *
 * Pure renderers, so the two structural guarantees are assertable on the
 * output string with no browser and no face photo:
 *   1. a disagreement note renders wherever one exists
 *   2. Module B never renders inside Module A
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { renderReading, renderReadingGated, sourcesNote } from "../src/readingview.js";
import { renderAdvisories as renderModuleB } from "../src/modulebview.js";
import { renderScienceLink, renderScienceScreen } from "../src/scienceview.js";
import { MODULE_B_DISCLAIMER } from "../src/rules-b.js";
import { composeReading } from "../src/reading/index.js";
import { geometryReport, LM } from "../src/geometry.js";
import { readComplexion } from "../src/adapters/entertainment.js";
import { SCIENCE_POINTS } from "../src/reading/science.js";

function makeFace({ length = 115, cheekW = 100, jawW = 95, foreheadW = 90, cx = 200 } = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: length / 2 }));
  const Y = (f) => f * length, at = (i, x, y) => { pts[i] = { x, y }; };
  at(LM.OVAL_APEX, cx, Y(0)); at(LM.MENTON, cx, Y(1));
  at(LM.GLABELLA, cx, Y(0.30)); at(LM.SUBNASALE, cx, Y(0.62));
  at(LM.LABIALE_SUPERIUS, cx, Y(0.72));
  at(LM.ZYGION_A, cx - cheekW / 2, Y(0.45)); at(LM.ZYGION_B, cx + cheekW / 2, Y(0.45));
  at(LM.GONION_A, cx - jawW / 2, Y(0.75)); at(LM.GONION_B, cx + jawW / 2, Y(0.75));
  at(LM.FRONTOTEMPORAL_A, cx - foreheadW / 2, Y(0.15));
  at(LM.FRONTOTEMPORAL_B, cx + foreheadW / 2, Y(0.15));
  at(33, cx - cheekW * 0.40, Y(0.42)); at(263, cx + cheekW * 0.40, Y(0.42));
  at(133, cx - cheekW * 0.14, Y(0.42)); at(362, cx + cheekW * 0.14, Y(0.42));
  at(LM.UPPER_LID_A, cx - cheekW * 0.27, Y(0.40));
  at(LM.UPPER_LID_B, cx + cheekW * 0.27, Y(0.40));
  return pts;
}

function makeRaw({ regime = "full" } = {}) {
  const keys = ["glabella", "center_forehead", "nose_bridge", "nose_apex",
    "periorbital_left", "periorbital_right", "cheek_left", "cheek_right", "chin"];
  const zones = {};
  for (const k of keys) {
    zones[k] = {
      deltaEi: regime === "low" ? null : 2, deltaMi: 0, deltaContrast: 0,
      ridge: 0.01, ridgeDelta: 0, ridgeAxis: "horizontal", L: 60, b: 15, pixels: 4000,
    };
  }
  return { baseline: { regime, band: "light", n: 9000 }, zones };
}

const fullReading = (regime = "full") => {
  const raw = makeRaw({ regime });
  return composeReading(geometryReport(makeFace()), readComplexion(raw), raw);
};

// ───────────────────────────────────────── disagreements always visible ─────

test("a disagreement note renders for every reading that has one", () => {
  const html = renderReading(fullReading());
  const reading = fullReading();

  for (const note of [
    reading.fiveElements.sourcesDiffer,
    reading.threeCourts.sourcesDiffer,
    reading.twelvePalaces.sourcesDiffer,
    reading.qiSe.sourcesDiffer,
  ]) {
    assert.ok(html.includes(note.slice(0, 50)),
      `a sources-differ note was computed but not rendered: ${note.slice(0, 60)}…`);
  }
  // One consistent pattern, used four times. Now a collapsible disclosure —
  // collapsed is not deleted, and tests/summary.test.js pins that exactly one
  // starts open so the honesty is visible without interaction.
  assert.equal((html.match(/class="differ-disclosure"/g) ?? []).length, 4);
});

test("the Five Elements alternates are shown, not just the primary", () => {
  const html = renderReading(fullReading());
  assert.match(html, /Other texts would read this shape as/);
  assert.match(html, /Metal/, "the square face's competing Metal reading must be visible");
});

test("sourcesNote returns nothing when there is no disagreement to report", () => {
  assert.equal(sourcesNote(null), "");
  assert.equal(sourcesNote(""), "");
  assert.match(sourcesNote("Sources differ on this — x versus y."), /class="differ-disclosure"/);
});

// ───────────────────────────────────────── Module B stays outside Module A ──

test("Module A's rendered reading contains no Module B content", () => {
  const html = renderReading(fullReading());
  assert.ok(!html.includes(MODULE_B_DISCLAIMER));
  for (const term of ["circulation", "iron levels", "doctor", "diagnosis", "clinician"]) {
    assert.ok(!html.toLowerCase().includes(term.toLowerCase()),
      `Module A's reading leaked "${term}"`);
  }
});

test("Module B renders only under its own disclaimer", () => {
  const advisories = [{
    rule: "SG-010-PERSISTENT-PATTERN", module: "B",
    message: "Some complexion patterns like this are sometimes associated with changes in circulation or iron levels.",
    recommend: [],
  }];
  const html = renderModuleB(advisories);
  assert.ok(html.includes(MODULE_B_DISCLAIMER),
    "an advisory must never appear without the Module B disclaimer above it");
  assert.ok(html.indexOf(MODULE_B_DISCLAIMER) < html.indexOf("Some complexion patterns"),
    "the disclaimer must come BEFORE the advisory it governs");
  assert.match(html, /class="module-b"/);
});

test("Module B renders nothing at all when there are no advisories", () => {
  // This is also the entertainment-only case: the rules were never composed
  // in, so there is nothing to render and no orphan disclaimer either.
  assert.equal(renderModuleB([]), "");
  assert.equal(renderModuleB(undefined), "");
});

// ─────────────────────────────────────────────────── qi se partial basis ────

test("a reduced qi se basis is rendered, not dropped", () => {
  const html = renderReading(fullReading("low"));
  assert.match(html, /class="basis-note"/);
  assert.match(html, /two of three colour signals/);
  assert.match(html, /complexion warmth wasn't measurable/);
});

test("a complete basis renders no basis note", () => {
  assert.ok(!renderReading(fullReading("full")).includes("basis-note"));
});

// ───────────────────────────────────────────────────── the science screen ───

test("the science screen is reachable in one tap from the results", () => {
  const link = renderScienceLink();
  assert.match(link, /id="science-open"/);
  assert.match(link, /What the science says/);
});

test("the science screen renders every required finding", () => {
  const html = renderScienceScreen();
  for (const p of SCIENCE_POINTS) {
    assert.ok(html.includes(p.heading), `missing heading: ${p.heading}`);
    assert.ok(html.includes(p.body.slice(0, 60)), `missing body: ${p.heading}`);
  }
  assert.match(html, /0\.10/);
  assert.match(html, /Willis/);
  assert.match(html, /id="science-close"/);
});

test("the science screen is not framed apologetically", () => {
  const html = renderScienceScreen();
  assert.doesNotMatch(html, /\b(sorry|unfortunately|just a bit of fun|only a game|don't worry)\b/i);
});

/* The encoding guard and the parse check live in tests/source-integrity.test.js,
 * which covers the whole source tree rather than only what this file imports. */

// ─────────────────────────────────────────────── share-gate reading view ───

test("renderReadingGated locked=false produces the same structure as renderReading", () => {
  const reading = fullReading();
  const gated   = renderReadingGated(reading, { locked: false });
  const plain   = renderReading(reading);
  // Both must include all four section IDs.
  for (const phrase of ["Five Elements", "Three Sections", "Twelve Palaces", "Qi se"]) {
    assert.ok(gated.includes(phrase), `gated unlocked missing: ${phrase}`);
    assert.ok(plain.includes(phrase), `plain missing: ${phrase}`);
  }
  // Neither should contain a lock overlay when unlocked.
  assert.ok(!gated.includes("reading-gate-overlay"), "no overlay when unlocked");
});

test("renderReadingGated locked=true shows Five Elements and hides the rest behind an overlay", () => {
  const reading = fullReading();
  const html = renderReadingGated(reading, { locked: true, overlayHtml: "<p>GATE</p>" });
  // Five Elements is OUTSIDE the gate-wrap — always visible.
  const gateWrapStart = html.indexOf("reading-gate-wrap");
  const fiveElemStart = html.indexOf("Five Elements");
  assert.ok(fiveElemStart < gateWrapStart,
    "Five Elements must appear before the gate wrapper");
  // The overlay is present.
  assert.ok(html.includes("reading-gate-overlay"), "overlay div present");
  assert.ok(html.includes("GATE"), "overlay content injected");
  // The blurred region is aria-hidden.
  assert.ok(html.includes("aria-hidden=\"true\""), "blurred region is aria-hidden");
});

test("renderReadingGated locked=true still contains gated section text (for search / a11y)", () => {
  const reading = fullReading();
  const html = renderReadingGated(reading, { locked: true, overlayHtml: "" });
  // Content is in the DOM (aria-hidden blur layer) even when visually obscured.
  assert.ok(html.includes("Three Sections") || html.includes("Twelve Palaces"),
    "gated section text present in the DOM even when locked");
});

test("renderReadingGated with null reading returns empty string", () => {
  assert.equal(renderReadingGated(null, { locked: true }), "");
  assert.equal(renderReadingGated(null, { locked: false }), "");
});
