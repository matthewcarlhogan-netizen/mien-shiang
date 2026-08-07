/*
 * The reading receipt.
 *
 * A summary is where an honest app most easily becomes a dishonest one: the
 * format wants one confident value and the readings underneath are routinely
 * partial. These tests exist to make that failure impossible to ship quietly —
 * they assert that the summary can only ever repeat what was measured.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildSummary, NOT_READ_LABEL, SECTION_IDS } from "../src/reading/summary.js";
import { renderSummary, renderReading, sourcesNote, PALACE_SCOPE_NOTE } from "../src/readingview.js";
import { buildShareModel, chooseDelivery, wrapText, SIZES } from "../src/sharecard.js";

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

/** A reading with everything read. */
const full = () => ({
  qiSe: {
    available: true, glowIndex: 50, band: "steady",
    reading: "In Mian Xiang, qi se reads the weather of a face.",
    basisNote: null, basisComplete: true,
    signalsUsed: ["warmth", "luminosity", "evenness"], signalsMissing: [],
    sourcesDiffer: "Sources differ on this — qi se.",
  },
  fiveElements: {
    available: true, name: "Metal", hanzi: "金", element: "metal",
    reading: "In Mian Xiang the Metal type is read through clear edges.",
    alternates: [{ name: "Fire", hanzi: "火" }], residualShape: false,
    sourcesDiffer: "Sources differ on this — the diamond face.",
  },
  threeCourts: {
    available: true, balanced: false, dominant: "lower",
    court: { name: "Lower Court", hanzi: "下停" },
    fractions: { upper: 0.199, middle: 0.384, lower: 0.417 },
    reading: "In Mian Xiang the lower court is read as the later years.",
    measurementCaveat: "The upper court is measured from the top of the face oval.",
    sourcesDiffer: "Sources differ on this — where the middle court ends.",
  },
  twelvePalaces: {
    measuredCount: 5, totalCount: 12,
    palaces: [
      { key: "life", hanzi: "命宮", name: "Life Palace", location: "between the brows",
        measured: true, reading: "In Mian Xiang the Life Palace is the gate.",
        toneGloss: "The texts read this palace as even in this photo." },
      { key: "siblings", hanzi: "兄弟宮", name: "Siblings Palace", location: "the eyebrows",
        measured: false, reading: "In Mian Xiang the brows are the Siblings Palace.",
        notMeasuredNote: "This palace sits on a part of the face this reading doesn't sample." },
    ],
    sourcesDiffer: "Sources differ on this — the number of palaces.",
  },
});

// ─────────────────────────────────────────────────────── invents nothing ─

test("the summary names only constructs that were actually read", () => {
  const r = full();
  r.fiveElements = { available: false, why: "headTurned", note: "The head is turned." };
  const s = buildSummary(r);

  const labels = s.headline.map((h) => h.label);
  assert.ok(!labels.some((l) => /metal|wood|fire|earth|water/i.test(l)),
    "an unread construct must never reach the headline");
  assert.ok(labels.includes("Lower Court") && labels.includes("Glow 50"));
});

test("an unread construct gets a neutral not-read chip, never a value", () => {
  const r = full();
  r.qiSe = { available: false, why: "notEnoughSkinVisible", note: "Not enough skin." };
  const chip = buildSummary(r).chips.find((c) => c.key === "qiSe");

  assert.equal(chip.available, false);
  assert.equal(chip.value, NOT_READ_LABEL);
  assert.ok(!/\d/.test(chip.value), "a not-read chip must carry no number to mistake for a result");
});

test("a partial colour basis is stated as scope, never rounded up", () => {
  const r = full();
  r.qiSe.signalsUsed = ["luminosity", "evenness"];
  r.qiSe.signalsMissing = ["warmth"];
  r.qiSe.basisComplete = false;
  const s = buildSummary(r);

  assert.ok(s.coverage.includes("2 of 3 colour signals"),
    `coverage must state the partial basis, got ${JSON.stringify(s.coverage)}`);
  assert.ok(s.coverage.some((c) => /complexion warmth not measurable/.test(c)),
    "the MISSING signal must be named, not just counted");
});

test("palace coverage in the summary matches the section exactly", () => {
  const s = buildSummary(full());
  assert.ok(s.coverage.includes("5 of 12 palaces read"));
  const chip = s.chips.find((c) => c.key === "twelvePalaces");
  assert.equal(chip.value, "5 of 12 read");
  assert.equal(chip.partial, true, "partial coverage must be marked as partial");
});

test("when nothing was read the summary offers no headline at all", () => {
  const s = buildSummary({
    qiSe: { available: false, note: "n" },
    fiveElements: { available: false, note: "n" },
    threeCourts: null,
    twelvePalaces: null,
  });
  assert.equal(s.anyRead, false);
  assert.deepEqual(s.headline, []);
  assert.equal(s.emphasis, null, "no measured construct means no sentence about one");
  assert.ok(s.nothingReadNote);
});

test("the emphasis sentence is attributed and mentions only measured constructs", () => {
  const r = full();
  r.fiveElements = { available: false, note: "n" };
  const s = buildSummary(r);

  assert.match(s.emphasis, /Mian Xiang/, "must name the tradition, not assert a fact");
  assert.ok(!/Metal/.test(s.emphasis));
  assert.match(s.emphasis, /Lower Court/);
});

test("the summary never excerpts a reading paragraph", () => {
  // The previous implementation truncated `reading` at 90 chars or split on
  // the first ".". Both can strand the attribution that opens every Module A
  // string, turning tradition into assertion through a path the copy guards
  // do not scan. The summary must repeat VALUES, not prose.
  const r = full();
  r.fiveElements.reading =
    "In Mian Xiang the Metal type is read through clear edges and defined structure, " +
    "and the texts associate it with precision rather than with coldness in a person.";
  const html = renderSummary(r);

  assert.ok(!html.includes("clear edges"), "a reading paragraph leaked into the summary");
  assert.ok(!html.includes("…"), "no truncated prose in the summary");
});

// ──────────────────────────────────────────────────────────── the view ─

test("the summary renders a jump link for every construct", () => {
  const html = renderSummary(full());
  for (const id of Object.values(SECTION_IDS)) {
    assert.ok(html.includes(`href="#${id}"`), `no jump link to ${id}`);
  }
  const body = renderReading(full());
  for (const id of Object.values(SECTION_IDS)) {
    assert.ok(body.includes(`id="${id}"`), `no anchor rendered for ${id}`);
  }
});

test("the caveat is injected, not invented, and the summary works without it", () => {
  const withCaveat = renderSummary(full(), { caveatHtml: '<p class="summary-caveat">X</p>' });
  assert.ok(withCaveat.includes('class="summary-caveat"'));
  // Pure function, so it must not depend on a DOM template being present.
  assert.ok(renderSummary(full()).includes("summary-card"));
});

test("index.html carries the caveat as a disclaimer, with the exact wording", () => {
  // It lives in HTML because "diagnosis" is on the Module A blocklist and the
  // copy lint buckets every .js prose string as Module A copy. If this moves
  // into a module, `npm run lint:bundle` fails — which is the intended alarm.
  const html = fs.readFileSync(path.join(SRC, "index.html"), "utf8");
  const m = html.match(/<template id="tpl-summary-caveat">([\s\S]*?)<\/template>/);
  assert.ok(m, "the summary caveat template is missing from index.html");
  assert.match(m[1], /data-copy="disclaimer"/,
    "the caveat must be marked as a disclaimer or the copy lint will reject it");
  assert.match(m[1],
    /Entertainment, not diagnosis\. Everything here describes a tradition, not you\./);
});

// ────────────────────────────────────────────── caveats are not deleted ─

test("exactly one 'sources differ' notice starts open, and none are dropped", () => {
  const html = renderReading(full());
  const total = (html.match(/<details class="differ-disclosure"/g) ?? []).length;
  const open = (html.match(/<details class="differ-disclosure" open>/g) ?? []).length;

  assert.equal(total, 4, "all four disagreement notices must still render");
  assert.equal(open, 1, "the first must be visible without interaction; the rest collapse");

  // Collapsed is not deleted — the wording stays in the document either way.
  assert.ok(html.includes("Sources differ on this — where the middle court ends."));
  assert.ok(html.includes("Sources differ on this — the number of palaces."));
});

test("a disclosure is still a disclosure when there is nothing to disclose", () => {
  assert.equal(sourcesNote(null), "");
  assert.equal(sourcesNote(""), "");
});

test("the Three Courts bar keeps the exact percentages and works without colour", () => {
  const html = renderReading(full());
  // Unrounded, to the same decimal the section always used.
  for (const pct of ["19.9%", "38.4%", "41.7%"]) {
    assert.ok(html.includes(pct), `${pct} missing from the proportion bar`);
  }
  // Text alternative for the bar as a whole...
  assert.match(html, /role="img"\s+aria-label="Facial thirds by proportion:[^"]+"/);
  // ...and a text label per segment, so meaning never rests on colour alone.
  for (const name of ["Upper Court", "Middle Court", "Lower Court"]) {
    assert.ok(html.includes(name), `${name} must be labelled in text`);
  }
  // The hairline caveat still sits with the bar.
  assert.ok(html.includes("The upper court is measured from the top of the face oval."));
});

test("palaces are grouped as scope, with a reason, and none are fabricated", () => {
  const html = renderReading(full());
  assert.ok(html.includes("Read from this photo (1)"));
  assert.ok(html.includes("Not read from this photo (1)"));
  assert.ok(html.includes(PALACE_SCOPE_NOTE), "the reason seven go unread must be stated");
  // The unread palace keeps its name, hanzi and location, and gains no reading.
  assert.ok(html.includes("兄弟宮") && html.includes("the eyebrows"));
  assert.ok(html.includes("not read"));
});

// ───────────────────────────────────────────────────────── share card ─

test("the share card carries the caveat and only measured values", () => {
  const r = full();
  r.fiveElements = { available: false, note: "n" };
  const m = buildShareModel(r, "Entertainment, not diagnosis.");

  assert.equal(m.caveat, "Entertainment, not diagnosis.");
  assert.ok(!m.headline.some((h) => /Metal/.test(h)), "unread construct on the share image");
  assert.ok(m.coverage.includes("5 of 12 palaces read"));
  assert.equal(m.wordmark, "面相");
});

test("share falls back to download rather than dead-ending", () => {
  const file = { name: "x.png", type: "image/png" };

  // Modern Android Chrome.
  assert.equal(chooseDelivery(
    { share: () => {}, canShare: () => true }, file), "share");
  // Desktop Firefox: no share at all.
  assert.equal(chooseDelivery({}, file), "download");
  // Share exists but refuses files — the common iOS/desktop Safari gap.
  assert.equal(chooseDelivery(
    { share: () => {}, canShare: () => false }, file), "download");
  // Some in-app browsers THROW from canShare instead of returning false.
  assert.equal(chooseDelivery(
    { share: () => {}, canShare: () => { throw new Error("nope"); } }, file), "download");
});

test("the share card offers a 9:16 and a 1:1 variant", () => {
  assert.deepEqual(SIZES.story, { w: 1080, h: 1920 });
  assert.deepEqual(SIZES.square, { w: 1080, h: 1080 });
});

test("canvas text wrapping breaks on width and never loses a word", () => {
  // Canvas has no text layout, so the wrap is ours and can silently drop text.
  const ctx = { measureText: (s) => ({ width: s.length * 10 }) };
  const lines = wrapText(ctx, "one two three four five six", 70);
  assert.ok(lines.length > 1, "expected the text to wrap");
  assert.equal(lines.join(" "), "one two three four five six");
});
