/*
 * Debug view tests.
 *
 * This view is what satisfies "no black box": every shape label must be
 * traceable to the ratio that produced it. A view that quietly dropped the
 * trace would still look fine on screen, so the trace is asserted here on the
 * rendered output rather than trusted.
 *
 * Runs with no browser and no face photo, because renderGeometry is pure.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { renderGeometry, esc, num } from "../src/debugview.js";
import { geometryReport, LM } from "../src/geometry.js";

function makeFace({ length = 115, cheekW = 100, jawW = 95, foreheadW = 90, cx = 200,
  yawZygionA = null } = {}) {
  const pts = Array.from({ length: 478 }, () => ({ x: cx, y: length / 2 }));
  const Y = (f) => f * length, at = (i, x, y) => { pts[i] = { x, y }; };
  at(LM.OVAL_APEX, cx, Y(0)); at(LM.MENTON, cx, Y(1));
  at(LM.GLABELLA, cx, Y(0.30)); at(LM.SUBNASALE, cx, Y(0.62));
  at(LM.LABIALE_SUPERIUS, cx, Y(0.72));
  at(LM.ZYGION_A, yawZygionA ?? cx - cheekW / 2, Y(0.45));
  at(LM.ZYGION_B, cx + cheekW / 2, Y(0.45));
  at(LM.GONION_A, cx - jawW / 2, Y(0.75)); at(LM.GONION_B, cx + jawW / 2, Y(0.75));
  at(LM.FRONTOTEMPORAL_A, cx - foreheadW / 2, Y(0.15));
  at(LM.FRONTOTEMPORAL_B, cx + foreheadW / 2, Y(0.15));
  at(33, cx - cheekW * 0.40, Y(0.42)); at(263, cx + cheekW * 0.40, Y(0.42));
  at(133, cx - cheekW * 0.14, Y(0.42)); at(362, cx + cheekW * 0.14, Y(0.42));
  at(LM.UPPER_LID_A, cx - cheekW * 0.27, Y(0.40));
  at(LM.UPPER_LID_B, cx + cheekW * 0.27, Y(0.40));
  return pts;
}

const square = () => geometryReport(makeFace({ length: 115, jawW: 95, foreheadW: 90 }));
const oval = () => geometryReport(makeFace({ length: 135, jawW: 88, foreheadW: 90 }));

test("renders nothing when there is no geometry", () => {
  assert.equal(renderGeometry(null, null, null), "");
  assert.equal(renderGeometry(undefined, null, "GPU"), "");
});

test("every triggering ratio appears in the rendered trace", () => {
  const g = square();
  const html = renderGeometry(g, null, "GPU");

  assert.ok(g.shape.because.length > 0, "precondition: this face fires a rule");
  for (const t of g.shape.because) {
    assert.ok(html.includes(t.label), `trace row missing from the view: ${t.label}`);
    assert.ok(html.includes(t.value.toFixed(3)),
      `measured value missing from the view: ${t.label} = ${t.value.toFixed(3)}`);
    assert.ok(html.includes(t.threshold.toFixed(3)),
      `threshold missing from the view: ${t.label} needs ${t.threshold}`);
  }
});

test("the residual class is labelled as residual, not as a finding", () => {
  const g = oval();
  assert.equal(g.shape.residual, true, "precondition: this face is the residual class");
  const html = renderGeometry(g, null, "CPU");
  assert.match(html, /residual class/i);
  assert.match(html, /not that the face was measured as/i);
});

test("a turned head carries a retake warning in the view", () => {
  const turned = geometryReport(makeFace({ yawZygionA: 185 }));
  assert.equal(turned.shapeReliable, false, "precondition: this face is not frontal");
  const html = renderGeometry(turned, null, "GPU");
  assert.match(html, /shouldn't be relied on/i);
  assert.match(html, /retake/i);
});

test("the fWHR definition and its neutrality caveat are both rendered", () => {
  const html = renderGeometry(square(), null, "GPU");
  // The definition must travel with the number, so the value can never be read
  // as the other (nasion-based) convention.
  assert.match(html, /eyelid-based/);
  assert.match(html, /not nasion-based/);
  // And it must never read as a dominance/character signal.
  assert.match(html, /not a measure of character/i);
});

test("the trichion limitation is shown next to the Three Courts figures", () => {
  const html = renderGeometry(square(), null, "GPU");
  assert.match(html, /Three Courts/);
  assert.match(html, /hairline/i);
});

test("expression is framed as a momentary state, never as a trait", () => {
  const expression = {
    neutral: 0.2, smile: 0.7, eyesClosed: 0.9, asymmetryIndex: 0.05,
    flags: { eyesClosed: true, strongExpression: true },
  };
  const html = renderGeometry(square(), expression, "GPU");
  // Reworded from "says nothing about who you are": the assertive-phrasing
  // guard rejects "you are" outside a tradition-attributed string, and the
  // denial form still trips it. The meaning is unchanged.
  assert.match(html, /says nothing about character/i);
  assert.match(html, /eyes look closed/i);
  assert.match(html, /mid-expression/i);
});

test("the expression block is omitted entirely when blendshapes are absent", () => {
  const html = renderGeometry(square(), null, "GPU");
  assert.ok(!/Expression at the moment/.test(html));
});

test("the view names the compute path that was actually used", () => {
  assert.match(renderGeometry(square(), null, "CPU"), /CPU/);
  assert.match(renderGeometry(square(), null, "GPU"), /GPU/);
});

test("the view contains no rating, rank or attractiveness language", () => {
  const expression = {
    neutral: 0.9, smile: 0.1, eyesClosed: 0.0, asymmetryIndex: 0.01,
    flags: { eyesClosed: false, strongExpression: false },
  };
  for (const html of [
    renderGeometry(square(), expression, "GPU"),
    renderGeometry(oval(), null, "CPU"),
    renderGeometry(geometryReport(makeFace({ yawZygionA: 185 })), null, "GPU"),
  ]) {
    assert.doesNotMatch(html, /\b(attractive|attractiveness|beauty|rating|ranking|out of ten|percentile|looksmax)\b/i);
    // "score" is the one most likely to creep in via a blendshape field name.
    assert.doesNotMatch(html, /\bscore\b/i);
  }
});

test("the view contains no medical vocabulary", () => {
  const html = renderGeometry(square(), null, "GPU");
  for (const term of ["diagnose", "diagnosis", "clinical", "clinician", "symptom",
    "disease", "treatment", "condition", "disorder"]) {
    assert.doesNotMatch(html, new RegExp(String.raw`\b${term}`, "i"),
      `debug view must not use medical vocabulary, found: ${term}`);
  }
});

test("esc neutralises HTML metacharacters", () => {
  assert.equal(esc(`<img src="x">&`), "&lt;img src=&quot;x&quot;&gt;&amp;");
});

test("num renders a placeholder rather than NaN or Infinity", () => {
  assert.equal(num(NaN), "—");
  assert.equal(num(Infinity), "—");
  assert.equal(num(1.23456, 3), "1.235");
});

test("a NaN-bearing report still renders instead of throwing", () => {
  // Degenerate geometry: zero-size face. Ratios go non-finite; the view must
  // degrade to placeholders rather than crash the whole result screen.
  const flat = Array.from({ length: 478 }, () => ({ x: 100, y: 100 }));
  const g = geometryReport(flat);
  const html = renderGeometry(g, null, "GPU");
  assert.ok(html.includes("—"), "non-finite values should render as a placeholder");
  assert.ok(html.length > 0);
});
