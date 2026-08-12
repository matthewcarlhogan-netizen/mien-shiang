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
  sparklineModel, verdictFor, hookFor, READING_HOOKS, READING_SCREEN_ORDER, THREE_COURTS,
  palaceFocusModel, nextScanModel, calibrationModel,
} from "../../src/ui/qise/screens.js";
import { LOW_CONFIDENCE } from "../../src/qise/baseline.js";
import { PALACES, TONE_GLOSS } from "../../src/reading/twelve-palaces.js";

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

test("the verdict speaks to the reader but makes no claim about their traits", () => {
  const v = verdictFor({ ascendant: "chi", band: "clear" });
  assert.equal(v.split(".").filter((s) => s.trim()).length, 1);
  assert.match(v, /chi/);
  assert.match(v, /your reading/i);
  assert.doesNotMatch(v, /personality|health|future|will happen/i);
  assert.equal(verdictFor({ ascendant: "ping" }), "Today, your reading is level — 平.");
  assert.equal(verdictFor(null), "Today, your reading is level — 平.");
  assert.equal(verdictFor({ ascendant: "nonsense" }), "Today, your reading is level — 平.");
});

test("every compass point has a concise hook and reflection prompt", () => {
  assert.deepEqual(Object.keys(READING_HOOKS).sort(), ["bai", "chi", "hei", "huang", "ping", "qing"]);
  for (const [ascendant, hook] of Object.entries(READING_HOOKS)) {
    assert.equal(hookFor({ ascendant }), hook);
    assert.match(hook.title, /\.$/);
    assert.match(hook.reflection, /\?$/);
  }
  assert.equal(hookFor(null), READING_HOOKS.ping);
  assert.equal(hookFor({ ascendant: "unknown" }), READING_HOOKS.ping);
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

/* ────────────────────────────────────── the lead palace and the return hook ── */

/** Twelve palaces as the store holds them, with a controllable delta. */
const palaceSet = (deltas = {}) => ({
  measuredCount: 12,
  supportedCount: 12,
  totalCount: 12,
  sourcesDiffer: "Sources differ on the placement of the palaces.",
  palaces: PALACES.map((p) => {
    const deltaMi = deltas[p.key] ?? 2;
    const tone = deltaMi > 1.5 ? "shadowed" : (deltaMi < -1.5 ? "clear" : "even");
    return {
      key: p.key, hanzi: p.hanzi, name: p.name, location: p.location,
      supported: true, measured: true, tone, deltaMi,
      toneGloss: TONE_GLOSS[tone], reading: p.reading,
      translationNote: p.translationNote ?? null, notMeasuredNote: null,
    };
  }),
});

test("the focus model names one palace and hides none of the others", () => {
  // The whole risk of a "highlight" is that it becomes a filter. The
  // twelve-palace contract is that no branch may hide a palace, so the model
  // flags a key and leaves the list alone.
  const set = palaceSet({ career: -9 });
  const focus = palaceFocusModel(set);

  assert.equal(focus.available, true);
  assert.equal(focus.leadKey, "career");
  assert.equal(focus.lead.distance, 9);
  assert.equal(set.palaces.length, 12, "the focus model must not filter the set");
  assert.ok(!("rest" in focus) && !("visible" in focus),
    "the model must not expose a reduced palace list that a view could render instead");
});

test("the lead carries the palace's own reading, never the shared tone gloss", () => {
  const focus = palaceFocusModel(palaceSet({ wealth: 8 }));
  const wealth = PALACES.find((p) => p.key === "wealth");
  assert.equal(focus.lead.reading, wealth.reading);
  assert.notEqual(focus.lead.reading, focus.lead.toneGloss);
  assert.match(focus.lead.reading, /Mian Xiang|Classical Chinese face reading/,
    "the hook still has to name the tradition it reads from");
});

test("a flat frame names no lead, and says so rather than picking one", () => {
  const focus = palaceFocusModel(palaceSet(
    Object.fromEntries(PALACES.map((p) => [p.key, 0])),
  ));
  assert.equal(focus.available, false);
  assert.equal(focus.leadKey, null);
  assert.equal(focus.lead, null);
  assert.ok(focus.noneNote.length > 40);
  assert.equal(palaceFocusModel(null).available, false);
});

test("the return prompt states a mechanism and never promises new content", () => {
  const building = nextScanModel(
    { active: true, remaining: 3, current: 1, required: 4 },
    { available: true },
  );
  assert.equal(building.building, true);
  assert.match(building.headline, /^3 more comparable scans/);
  assert.ok(building.leadNote, "a named lead is allowed to be described as moving");

  const ready = nextScanModel(
    { active: false, remaining: 0, current: 4, required: 4 },
    { available: true },
  );
  assert.equal(ready.building, false);
  assert.match(ready.body, /your own earlier scans|already in your column/i);

  // The footer already says "Scan again" on every tab. Two buttons with one
  // label, a thumb apart, is a decision the reader should not have to make.
  assert.equal(building.cta, "Add anchor 2 of 4");
  assert.equal(ready.cta, "Take the next scan");
  for (const m of [building, ready]) {
    assert.notEqual(m.cta, "Scan again");
  }

  // No promise of content that does not vary, on either branch.
  for (const m of [building, ready]) {
    for (const s of [m.headline, m.body, m.leadNote || ""]) {
      assert.doesNotMatch(s, /\b(unlock a deeper|new reading|more accurate|come back tomorrow)\b/i,
        `the return prompt promised content rather than a mechanism: ${JSON.stringify(s)}`);
    }
  }
});

test("movement is only promised where a lead was actually measured", () => {
  // "The lead palace moves between scans" is a statement about something that
  // was measured. With no lead there is nothing to make that claim about.
  const none = nextScanModel({ active: false, remaining: 0, current: 4, required: 4 },
    { available: false });
  assert.equal(none.leadNote, null);
  assert.equal(nextScanModel({ active: false, remaining: 0, current: 4, required: 4 },
    undefined).leadNote, null);
});

test("one scan reads as one scan — the singular is not '1 more comparable scans'", () => {
  const m = nextScanModel({ active: true, remaining: 1, current: 3, required: 4 }, null);
  assert.match(m.headline, /^One more comparable scan\b/);
  assert.doesNotMatch(m.headline, /1 more/);
});

test("the reading screen model carries the focus and the return prompt", () => {
  const m = readingScreenModel(reading(), history());
  assert.ok(m.nextScan, "the return prompt must reach the screen model");
  assert.equal(typeof m.nextScan.building, "boolean");
  // No integrated reading on this fixture: the model must degrade, not throw.
  assert.equal(m.integrated.available, false);
  assert.equal(m.nextScan.leadNote, null);
});

test("calibration and the return prompt agree on how many scans remain", () => {
  // Two surfaces reading the same counter. They drifted apart once already,
  // when the Pattern tab held the only copy of the anchor count.
  const h = history(2);
  const c = calibrationModel(reading({ compass: null }), h);
  const n = nextScanModel(c, null);
  assert.equal(n.remaining, c.remaining);
  assert.equal(n.current, c.current);
  assert.equal(n.building, c.active && c.remaining > 0);
});
