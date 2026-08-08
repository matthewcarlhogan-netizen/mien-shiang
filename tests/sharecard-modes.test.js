import { test } from "node:test";
import assert from "node:assert/strict";

import { buildShareModel, drawShareCard, wrapText, drawPadlock, SIZES }
  from "../src/sharecard.js";

// ---------------------------------------------------------------- fixtures --

const CAVEAT = "Entertainment only. Not a clinical reading.";

const reading = (over = {}) => ({
  fiveElements: {
    available: true, shape: "square", name: "Metal", hanzi: "金",
    reading: "In Mian Xiang, a square face is associated with Metal, and the "
      + "classical association is with resolve rather than with any trait of "
      + "the person reading this.",
  },
  threeCourts: { available: true, balanced: true },
  qiSe: { available: true, glowIndex: 71, signalsUsed: ["a", "b"], signalsMissing: [] },
  twelvePalaces: { measuredCount: 9, totalCount: 12 },
  harmony: {
    value: 82,
    basis: "canon+jaw+symmetry",
    components: [{
      key: "canon",
      reads: "Measured against the proportions named below, each from its own tradition.",
    }],
  },
  ...over,
});

/**
 * Recording 2D context. The card is drawn with vector calls and text, so what
 * reaches the image can be asserted without a canvas implementation.
 */
function recordingCtx() {
  const calls = { text: [], fills: 0, strokes: 0, arcs: 0, rects: 0 };
  return {
    calls,
    canvas: { width: 1080, height: 1920 },
    textBaseline: "", fillStyle: "", strokeStyle: "", font: "", lineWidth: 0,
    fillText: (t) => calls.text.push(String(t)),
    measureText: (t) => ({ width: String(t).length * 18 }),
    fillRect: () => { calls.fills++; },
    rect: () => { calls.rects++; },
    arc: () => { calls.arcs++; },
    beginPath() {}, stroke() { calls.strokes++; }, fill() { calls.fills++; },
    save() {}, restore() {}, drawImage() {},
  };
}

const drawnText = (model, variant = "story") => {
  const ctx = recordingCtx();
  drawShareCard(ctx, model, SIZES[variant]);
  return ctx.calls.text.join("\n");
};

// ------------------------------------------------------------ locked mode ---

test("locked is the default — a card is not unlocked by omission", () => {
  const m = buildShareModel(reading(), CAVEAT);
  assert.equal(m.mode, "locked");
  assert.deepEqual(m.readings, []);
});

test("the locked card carries shape, value, teaser, CTA and the caveat", () => {
  const m = buildShareModel(reading(), CAVEAT, { unlocked: false, url: "https://example.com" });
  const text = drawnText(m);

  assert.match(text, /Square — Metal Element/);
  assert.match(text, /82\/100/);
  assert.match(text, /Full TCM Report \+ Aesthetic Analysis/);
  assert.match(text, /Scan your face → https:\/\/example\.com/);
  assert.match(text, /Entertainment only/);
});

test("the padlock is vector, so it cannot rasterise as a missing glyph", () => {
  // This file loads no fonts by design. An emoji is the same hazard wearing
  // different clothes: where the codepoint is absent the card renders a tofu
  // box in the middle of an image nobody can inspect after the fact.
  const m = buildShareModel(reading(), CAVEAT, { url: "https://example.com" });
  const ctx = recordingCtx();
  drawShareCard(ctx, m, SIZES.story);

  assert.ok(!/\p{Extended_Pictographic}/u.test(ctx.calls.text.join("")),
    "no pictographic character may be drawn as text");
  assert.ok(ctx.calls.arcs > 0 && ctx.calls.strokes > 0, "the shackle is stroked");

  const solo = recordingCtx();
  drawPadlock(solo, 0, 0, 80, "#fff");
  assert.ok(solo.calls.arcs === 1 && solo.calls.fills === 1);
});

test("the locked card does not leak the gated reading text", () => {
  // The whole point of the locked variant. If the prose reached the image the
  // gate would be decorative.
  const r = reading();
  const text = drawnText(buildShareModel(r, CAVEAT, { url: "https://example.com" }));
  assert.ok(!text.includes(r.fiveElements.reading));
  assert.ok(!text.includes(r.harmony.components[0].reads));
});

// ---------------------------------------------------------- unlocked mode ---

test("the unlocked card adds whole attributed readings", () => {
  const r = reading();
  const m = buildShareModel(r, CAVEAT, { unlocked: true });
  assert.equal(m.mode, "unlocked");

  const text = drawnText(m);
  assert.match(text, /Square — Metal Element/);
  assert.match(text, /82\/100/);
  assert.match(text, /In Mian Xiang/, "the attribution must survive to the image");
  assert.match(text, /Entertainment only/);
  assert.ok(!text.includes("Full TCM Report"), "no teaser once unlocked");
});

/**
 * The defect CLAUDE.md item 24 records, guarded on this surface too.
 *
 * The brief asked for "the first line of the narrative". Every Module A string
 * opens with its attribution, so cutting at a line, a sentence or a character
 * count can strand that opening and turn a statement about a tradition into a
 * statement about the reader. The copy guards never see it — they scan source
 * strings, not what a view does to them afterwards.
 */
test("readings are carried whole, never excerpted", () => {
  const r = reading();
  const m = buildShareModel(r, CAVEAT, { unlocked: true });

  for (const line of m.readings) {
    assert.ok(r.fiveElements.reading === line || r.harmony.components[0].reads === line,
      "every reading on the card must be a complete source string");
  }
  assert.ok(m.readings.includes(r.fiveElements.reading));
});

test("a reading that does not fit is DROPPED, not trimmed", () => {
  const long = "In Mian Xiang, " + "this sentence continues at length ".repeat(60);
  const r = reading({
    fiveElements: { available: true, shape: "square", name: "Metal", hanzi: "金", reading: long },
  });
  const m = buildShareModel(r, CAVEAT, { unlocked: true });
  const text = drawnText(m, "square");   // the tighter of the two canvases

  // Either it is present in full, or it is absent. A partial copy — the
  // opening without the end, or the end without the attribution — is the
  // failure this test exists to catch.
  const wrapped = wrapText({ measureText: (t) => ({ width: String(t).length * 18 }) },
                           long, SIZES.square.w - 2 * Math.round(SIZES.square.w * 0.085));
  const firstChunk = wrapped[0];
  if (text.includes(firstChunk)) {
    for (const chunk of wrapped) {
      assert.ok(text.includes(chunk), "a partially drawn reading is a changed meaning");
    }
  }
  // The caveat survives regardless of how much was dropped above it.
  assert.match(text, /Entertainment only/);
});

// ------------------------------------------------------------- both modes ---

test("the canon value never appears without what it is a match to", () => {
  // A bare "82/100" beside a face shape, on an image about to be posted
  // publicly, reads as a rating of a person — the one thing this number is
  // not, and what consent clause 04 promises the app does not do.
  for (const unlocked of [false, true]) {
    for (const variant of ["story", "square"]) {
      const m = buildShareModel(reading(), CAVEAT, { unlocked, url: "https://example.com" });
      const text = drawnText(m, variant);
      assert.match(text, /82\/100/);
      assert.match(text, /MATCH TO THE CLASSICAL CANONS/,
        `${variant}/${unlocked ? "unlocked" : "locked"} drew a bare figure`);
    }
  }
});

test("both modes carry the caveat at both sizes", () => {
  for (const unlocked of [false, true]) {
    for (const variant of ["story", "square"]) {
      const m = buildShareModel(reading(), CAVEAT, { unlocked, url: "https://example.com" });
      assert.match(drawnText(m, variant), /Entertainment only\. Not a clinical reading\./);
    }
  }
});

test("the caveat is injected, never a literal in the module", () => {
  // It says "clinical", which is on the Module A blocklist, and lint-bundle
  // buckets every prose string in a .js file as Module A copy with no
  // disclaimer bucket for JS. It can only live in the marked HTML block.
  const m = buildShareModel(reading(), undefined);
  assert.equal(m.caveat, "", "absent rather than substituted from inside the module");
});

test("an unread face reports no shape and no value rather than zero", () => {
  const m = buildShareModel({
    fiveElements: { available: false, why: "headTurned" },
    twelvePalaces: { measuredCount: 0, totalCount: 12 },
    harmony: { value: null, basis: "", components: [] },
  }, CAVEAT, { unlocked: true });

  assert.equal(m.shapeLine, null);
  assert.equal(m.canon, null, "a refused reading is not a value of zero");
  const text = drawnText(m);
  assert.ok(!text.includes("/100"));
  assert.match(text, /Entertainment only/);
});
