/*
 * PHASE 9 — everything about the interface that can be wrong in a way a
 * screenshot would not reveal.
 *
 * Layout and colour are not asserted here; a test that pins pixel positions
 * only stops the design changing. What IS asserted is the seal's determinism,
 * the gauge's statistic, what the sparkline refuses to join, and the fact that
 * a low-confidence reading declares itself.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PALETTE, GROUND, COLOUR_ORDER, TYPE, paletteCss,
} from "../../src/ui/qise/palette.js";
import {
  sealModel, sealSvg, mulberry32, hashSeed, AXIS_ANGLE, SEAL_SIZE,
} from "../../src/ui/qise/seal.js";
import {
  readingScreenModel, historyColumnModel, gaugeModel, courtsStrip,
  sparklineModel, verdictFor, READING_SCREEN_ORDER, THREE_COURTS,
} from "../../src/ui/qise/screens.js";
import { LOW_CONFIDENCE } from "../../src/qise/baseline.js";

/* ───────────────────────────────────────────────────────────── the palette ── */

test("five accents, five colours, no sixth", () => {
  assert.equal(Object.keys(PALETTE).length, 5);
  assert.deepEqual([...COLOUR_ORDER].sort(), Object.keys(PALETTE).sort());
  // `ground` is paper, not a sixth accent.
  assert.ok(!Object.keys(PALETTE).includes("ground"));
});

test("every colour carries its Su Wen simile, and the CSS keeps it as a comment", () => {
  // Without the simile the next person has five arbitrary hex values and every
  // reason to "improve" them.
  for (const [name, c] of Object.entries(PALETTE)) {
    assert.match(c.hex, /^#[0-9A-F]{6}$/i, name);
    assert.ok(c.simile.includes(", not "), `${name}: the simile must name its contrast`);
  }
  const css = paletteCss();
  for (const name of COLOUR_ORDER) {
    assert.ok(css.includes(`--${name}: ${PALETTE[name].hex}`), `${name} missing from the CSS`);
    assert.ok(css.includes(PALETTE[name].simile), `${name}'s simile was dropped from the CSS`);
  }
  assert.ok(css.includes(`--ground: ${GROUND.hex}`));
});

test("the exact palette values from the brief are what ship", () => {
  assert.equal(PALETTE.qing.hex, "#4A6E67");
  assert.equal(PALETTE.chi.hex, "#B0392A");
  assert.equal(PALETTE.huang.hex, "#C09A2B");
  assert.equal(PALETTE.bai.hex, "#EDE8DC");
  assert.equal(PALETTE.hei.hex, "#1B1917");
  assert.equal(GROUND.hex, "#DCDBD3");
});

test("no gradient is emitted anywhere in the generated CSS", () => {
  assert.doesNotMatch(paletteCss(), /gradient/i);
});

test("the type stack records the intended families and falls back to system", () => {
  // No @font-face is emitted and no woff2 is committed: pointing at files that
  // do not exist would fire four 404s per load and precache four missing
  // entries. The gap is recorded in docs/QISE_NOTES.md, not hidden.
  for (const face of Object.values(TYPE)) {
    assert.ok(face.intended && face.stack.includes(face.intended));
    assert.ok(face.stack.split(",").length > 1, `${face.intended} has no fallback`);
  }
  assert.doesNotMatch(paletteCss(), /@font-face|\.woff2?/i);
});

/* ──────────────────────────────────────────────────────────────── the seal ── */

const reading = (over = {}) => ({
  timestampIso: "2026-08-09T02:30:00.000Z",
  compass: { ascendant: "chi", magnitude: 2.2, band: "clear", components: { chi: 2.2, huang: 0.4 } },
  confidence: 0.9,
  roiValidity: { tian: true, yintang: true, shangen: true, zhuntou: true, quan_l: true, quan_r: true, dige: true },
  metrics: { corrected: { ming: 1.12, run: 21, basis: "a+b" } },
  tags: ["poor sleep"],
  ...over,
});

test("the same reading always presses the same seal", () => {
  // The irregularity is what makes it read as a pressed seal. Regenerated on
  // every paint it would be an animation nobody asked for, and the record of
  // a day would look different each time it was opened.
  const a = sealModel(reading());
  const b = sealModel(reading());
  assert.deepEqual(a, b);
  assert.equal(sealSvg(a), sealSvg(b));

  const other = sealModel(reading({ timestampIso: "2026-08-10T02:30:00.000Z" }));
  assert.notDeepEqual(a.border, other.border, "two different days pressed identically");
});

test("the seal is irregular, but only by a tool mark", () => {
  const m = sealModel(reading());
  for (const p of m.border) {
    const offAxis = Math.min(
      Math.abs(p.x - 8), Math.abs(p.x - (SEAL_SIZE - 8)),
      Math.abs(p.y - 8), Math.abs(p.y - (SEAL_SIZE - 8)));
    assert.ok(offAxis <= 1.3, `a corner wandered ${offAxis}px — that reads as a mistake, not a carve`);
  }
  assert.equal(m.dot.bleed.length, 14);
  for (const p of m.dot.bleed) {
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
});

test("`ping` presses at the centre, because nothing is pulling", () => {
  const m = sealModel(reading({ compass: { ascendant: "ping", magnitude: 0.4, components: {} } }));
  assert.ok(Math.abs(m.dot.x - SEAL_SIZE / 2) < 1e-9);
  assert.ok(Math.abs(m.dot.y - SEAL_SIZE / 2) < 1e-9);
});

test("huang is the centre, not a fifth spoke", () => {
  // The classical compass has four directions and a centre. Drawing huang as a
  // spoke would point it somewhere the tradition does not.
  assert.equal(AXIS_ANGLE.huang, null);
  assert.equal(AXIS_ANGLE.chi, -90, "south is at the top, per the Chinese convention");
  assert.equal(AXIS_ANGLE.hei, 90);

  const m = sealModel(reading({
    compass: { ascendant: "huang", magnitude: 3, components: { huang: 3 } },
  }));
  const huang = m.axes.find((a) => a.name === "huang");
  assert.equal(huang.kind, "ring");
  assert.ok(huang.radius > 2);
  // A huang-only reading presses at the centre: a ring has no direction.
  assert.ok(Math.abs(m.dot.x - SEAL_SIZE / 2) < 1e-9);
});

test("a low-confidence reading renders HOLLOW, visibly, not as a badge", () => {
  // It has to be legible at a glance in a column of thirty, so it is the fill
  // that changes.
  const solid = sealSvg(sealModel(reading(), { lowConfidence: false }));
  const hollow = sealSvg(sealModel(reading(), { lowConfidence: true }));
  assert.match(solid, /data-dot="pressed"/);
  assert.match(hollow, /data-dot="hollow"/);
  assert.match(hollow, /fill="none"/);
});

test("the SVG is self-contained, labelled, and carries no script", () => {
  const svg = sealSvg(sealModel(reading()), { title: "Reading for 2026-08-09" });
  assert.match(svg, /role="img"/);
  assert.match(svg, /aria-label="Reading for 2026-08-09"/);
  assert.doesNotMatch(svg, /<script|onload=|href=|url\(/i);
  assert.match(svg, /viewBox="0 0 100 100"/);
});

test("reduced motion is carried into the markup so the ink-bleed can be stilled", () => {
  assert.match(sealSvg(sealModel(reading()), { reducedMotion: true }), /data-reduced-motion="true"/);
  assert.doesNotMatch(sealSvg(sealModel(reading())), /data-reduced-motion/);
});

test("the PRNG is deterministic and stays in range", () => {
  const a = mulberry32(hashSeed("x")), b = mulberry32(hashSeed("x"));
  for (let i = 0; i < 50; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
  assert.notEqual(mulberry32(hashSeed("x"))(), mulberry32(hashSeed("y"))());
});

/* ────────────────────────────────────────────────────────────── the gauges ── */

const history = (n = 30, ming = (i) => 1.08 + (i % 5) * 0.01) =>
  Array.from({ length: n }, (_, i) => ({
    timestampIso: new Date(Date.UTC(2026, 6, 1 + i)).toISOString(),
    confidence: 0.9,
    compass: { ascendant: "ping", magnitude: 0.3, components: {} },
    metrics: { corrected: { ming: ming(i), run: 20 + (i % 4) * 0.4, basis: "a+b" } },
  }));

test("the gauge band is the IQR of the trailing thirty, not the full range", () => {
  // A full range is set by its two most extreme readings, so one bad capture
  // widens it until nothing ever looks unusual again.
  const h = history();
  h[3].metrics.corrected.ming = 5;      // one wild capture
  const g = gaugeModel(h, 1.10, "ming", "明 lustre");

  assert.equal(g.measured, true);
  assert.ok(g.band.high < 1.2, `the outlier widened the band to ${g.band.high}`);
  assert.ok(g.band.from >= 0 && g.band.to <= 1 && g.band.from < g.band.to);
  assert.ok(g.mark >= 0 && g.mark <= 1);
});

test("the gauge says whether today sits outside the band, and which side", () => {
  const h = history();
  assert.equal(gaugeModel(h, 1.10, "ming", "l").outside, null);
  assert.equal(gaugeModel(h, 2.00, "ming", "l").outside, "above");
  assert.equal(gaugeModel(h, 0.50, "ming", "l").outside, "below");
});

test("a gauge with too little history says so rather than drawing a band of one point", () => {
  const g = gaugeModel(history(2), 1.1, "ming", "l");
  assert.equal(g.measured, false);
  assert.equal(g.band, undefined);
});

/* ────────────────────────────────────────────────────────── the courts strip ── */

test("the courts strip reports coverage, never a verdict about the reader", () => {
  const strip = courtsStrip({ tian: true, yintang: true, shangen: true, zhuntou: false, quan_l: true, quan_r: true, dige: true });
  assert.equal(strip.length, 3);
  assert.deepEqual(strip.map((c) => c.key), ["upper", "middle", "lower"]);

  const middle = strip.find((c) => c.key === "middle");
  assert.equal(middle.read, 3);
  assert.equal(middle.total, 4);
  assert.equal(middle.complete, false);
  assert.equal(strip.find((c) => c.key === "upper").complete, true);

  // The model must contain nothing that could be rendered as a judgement.
  const blob = JSON.stringify(strip).toLowerCase();
  for (const term of ["good", "poor", "weak", "strong", "score", "verdict"]) {
    assert.ok(!blob.includes(term), `the courts strip carries "${term}"`);
  }
});

test("every region belongs to exactly one court", () => {
  const all = THREE_COURTS.flatMap((c) => c.rois);
  assert.equal(new Set(all).size, all.length, "a region is in two courts");
  // periorbital is deliberately in none: it is not one of the three courts.
  assert.ok(!all.includes("periorbital"));
});

/* ──────────────────────────────────────────────────────────── the sparkline ── */

test("the sparkline flags a basis change rather than joining across it", () => {
  // CLAUDE.md item 18: rescaling over a different component set makes two
  // values incomparable, and dropping a below-average one makes the composite
  // go UP — a step change in the chart that is not in the person.
  const same = sparklineModel(history());
  assert.equal(same.basisChanged, false);
  assert.equal(same.bases.length, 1);

  const mixed = history();
  for (let i = 20; i < 30; i++) mixed[i].metrics.corrected.basis = "a+b+c";
  const changed = sparklineModel(mixed);
  assert.equal(changed.basisChanged, true);
  assert.deepEqual(changed.bases.sort(), ["a+b", "a+b+c"]);
});

test("the sparkline marks low-confidence points instead of dropping them", () => {
  const h = history();
  h[5].confidence = LOW_CONFIDENCE - 0.1;
  const s = sparklineModel(h);
  assert.equal(s.points.length, 30);
  assert.equal(s.points[5].lowConfidence, true);
  assert.equal(s.points[6].lowConfidence, false);
});

test("an unmeasured day is a null point, not a zero", () => {
  const h = history();
  h[7].metrics.corrected.ming = null;
  const s = sparklineModel(h);
  assert.equal(s.points[7].value, null);
  assert.equal(s.n, 29);
  assert.ok(s.min > 0, "a null must not drag the minimum to zero");
});

/* ───────────────────────────────────────────────── the reading screen ── */

test("the reading screen is in the order the brief specifies", () => {
  assert.deepEqual([...READING_SCREEN_ORDER],
    ["seal", "verdict", "gauges", "courts", "passage", "tags", "sparkline"]);
  const m = readingScreenModel(reading(), history());
  assert.deepEqual(m.order, READING_SCREEN_ORDER);
  for (const part of READING_SCREEN_ORDER) {
    assert.ok(m[part] !== undefined || part === "seal", `${part} is missing from the model`);
  }
});

test("the verdict is one sentence, names the colour, and never the reader", () => {
  const v = verdictFor({ ascendant: "chi", band: "clear" });
  assert.equal(v.split(".").filter((s) => s.trim()).length, 1);
  assert.match(v, /chi/);
  assert.doesNotMatch(v, /\byou\b/i);
  assert.equal(verdictFor({ ascendant: "ping" }), "Level today — 平.");
  assert.equal(verdictFor(null), "Level today — 平.");
  assert.equal(verdictFor({ ascendant: "nonsense" }), "Level today — 平.");
});

test("a low-confidence reading is hollow all the way through the model", () => {
  const m = readingScreenModel(reading({ confidence: LOW_CONFIDENCE - 0.1 }), history());
  assert.equal(m.lowConfidence, true);
  assert.equal(m.seal.hollow, true);
  assert.match(m.sealSvg, /data-dot="hollow"/);
});

/* ───────────────────────────────────────────────────── the history column ── */

test("the history column stacks newest first, one per day", () => {
  const col = historyColumnModel(history(40));
  assert.equal(col.n, 30, "the column is capped at thirty");
  assert.ok(col.rows[0].timestampIso > col.rows[1].timestampIso, "not newest-first");
  assert.match(col.rows[0].date, /^\d{4}-\d{2}-\d{2}$/);
  for (const row of col.rows) assert.match(row.svg, /<svg /);
});

test("the column is stable, so the share card and the screen agree", () => {
  // The column IS the share card. If the two renders disagreed, the image
  // somebody posted would not be the thing they looked at.
  const h = history();
  assert.deepEqual(historyColumnModel(h), historyColumnModel(h));
});

test("an empty history renders an empty column rather than throwing", () => {
  assert.deepEqual(historyColumnModel([]), { rows: [], n: 0, colours: COLOUR_ORDER });
  assert.deepEqual(historyColumnModel(null).rows, []);
});
