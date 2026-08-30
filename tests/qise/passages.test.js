/*
 * PHASE 8 gate, first half — the passages.
 *
 * Every constraint is checked against EVERY realisation, not a sample. There
 * are twelve thousand of them and they run in well under a second, so there is
 * no reason to spot-check the one surface of this app whose whole job is to
 * say something to a person.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CORE, BAND, COURSE, ATTRIBUTION, passageFor, passageOccurrenceFor, courseKey, seededIndex, wordCount,
} from "../../src/qise/passages.js";

/** Every passage the corpus can produce. */
function* everyPassage() {
  for (const ascendant of Object.keys(CORE)) {
    const bands = ascendant === "ping" ? ["level"] : ["slight", "clear", "marked"];
    for (const band of bands) {
      for (const course of Object.keys(COURSE)) {
        for (const core of CORE[ascendant]) {
          for (const b of BAND[band]) {
            for (const c of COURSE[course]) {
              yield { ascendant, band, course, text: `${ATTRIBUTION} ${core}. ${b} ${c}` };
            }
          }
        }
      }
    }
  }
}

const ALL = [...everyPassage()];

test("the corpus is large enough to be worth checking exhaustively", () => {
  assert.ok(ALL.length > 5000, `only ${ALL.length} realisations`);
});

/* ────────────────────────────────────────────────────────── the four rules ── */

test("every passage opens with the attribution, and none says `this means`", () => {
  assert.equal(ATTRIBUTION, "The tradition reads it this way —");
  for (const p of ALL) {
    assert.ok(p.text.startsWith(ATTRIBUTION), `missing attribution: ${p.text.slice(0, 60)}`);
    assert.doesNotMatch(p.text, /\bthis means\b/i, p.text);
    assert.doesNotMatch(p.text, /\bmeans (that )?you\b/i, p.text);
  }
});

test("every passage is 40 to 70 words", () => {
  let min = Infinity, max = 0;
  for (const p of ALL) {
    const w = wordCount(p.text);
    min = Math.min(min, w); max = Math.max(max, w);
    assert.ok(w >= 40 && w <= 70,
      `${w} words for ${p.ascendant}/${p.band}/${p.course}: ${p.text}`);
  }
  assert.ok(min >= 40 && max <= 70, `range ${min}..${max}`);
});

test("no passage carries health vocabulary or names a part of the body", () => {
  // The Phase 10 blocklist, applied at the source rather than only in the
  // lint, so a bad line fails the moment it is written.
  const banned = /\b(diagnos|disease|symptom|treat|cure|healthy|unhealthy|deficien|organ|liver|kidney|spleen|lung|heart|predict|forecast|illness|medical|patient|therapy)/i;
  for (const p of ALL) {
    const m = p.text.match(banned);
    assert.equal(m, null, `"${m && m[0]}" in: ${p.text}`);
  }
});

test("no passage makes a prediction or an assertion about the reader", () => {
  for (const p of ALL) {
    assert.doesNotMatch(p.text, /\byou will\b|\byou'll\b/i, p.text);
    assert.doesNotMatch(p.text, /\byou (are|have|were|feel|need)\b/i, p.text);
    assert.doesNotMatch(p.text, /\byour (personality|character|mood|energy)\b/i, p.text);
    assert.doesNotMatch(p.text, /\btomorrow\b/i, p.text);
  }
});

test("no passage compares the reader to anybody else", () => {
  // There is no population in this repository to be average against.
  for (const p of ALL) {
    assert.doesNotMatch(p.text, /\b(percentile|average person|most people|other people|than others|ranked?)\b/i, p.text);
  }
  // "usual" must always be the reader's OWN usual.
  for (const p of ALL) {
    if (/\busual\b/.test(p.text)) {
      assert.match(p.text, /(usual (place|spread|range)|these readings|its usual|their usual|the usual)/i, p.text);
    }
  }
});

/* ────────────────────────────────────────────────────────────── the cells ── */

test("every cell offers at least five variants, as the brief requires", () => {
  // Composed rather than flat: a cell is (ascendant, band, course), and each
  // realises 5 x 5 x 5. The deviation from a flat corpus is documented in
  // docs/QISE_NOTES.md.
  for (const [k, v] of Object.entries(CORE)) assert.ok(v.length >= 5, `CORE.${k} has ${v.length}`);
  for (const [k, v] of Object.entries(BAND)) assert.ok(v.length >= 5, `BAND.${k} has ${v.length}`);
  for (const [k, v] of Object.entries(COURSE)) assert.ok(v.length >= 5, `COURSE.${k} has ${v.length}`);

  const seen = new Map();
  for (const p of ALL) {
    const cell = `${p.ascendant}/${p.band}/${p.course}`;
    if (!seen.has(cell)) seen.set(cell, new Set());
    seen.get(cell).add(p.text);
  }
  for (const [cell, texts] of seen) {
    assert.ok(texts.size >= 5, `${cell} realises only ${texts.size} distinct passages`);
  }
});

test("all five colours and the level state are covered", () => {
  assert.deepEqual(Object.keys(CORE).sort(), ["bai", "chi", "hei", "huang", "ping", "qing"]);
});

test("no two variants inside a list are identical", () => {
  for (const [name, group] of [["CORE", CORE], ["BAND", BAND], ["COURSE", COURSE]]) {
    for (const [k, v] of Object.entries(group)) {
      assert.equal(new Set(v).size, v.length, `${name}.${k} contains a duplicate`);
    }
  }
});

/* ──────────────────────────────────────────────────────── course selection ── */

test("courseKey names the shape of the lustre/moisture pair", () => {
  assert.equal(courseKey(0.2, -0.3), "level");
  assert.equal(courseKey(2, 2), "bothUp");
  assert.equal(courseKey(-2, -2), "bothDown");
  assert.equal(courseKey(2, -2), "divergent",
    "one up and one down is its own observation, not a kind of 'mixed'");
  assert.equal(courseKey(-2, 2), "divergent");
  assert.equal(courseKey(2, 0.1), "lustreLed");
  assert.equal(courseKey(0.1, -2), "moistureLed");
  // Missing inputs read as "did not move", never as a movement of unknown size.
  assert.equal(courseKey(null, null), "level");
});

/* ───────────────────────────────────────────────────────────── determinism ── */

test("the same reading always renders the same passage regardless of its timestamp", () => {
  // A date-derived pick rewrites the words when the same semantic record is
  // imported with a different timestamp. The occurrence is the only novelty
  // input; timestamps remain metadata.
  const compass = { ascendant: "chi", band: "clear" };
  const z = { ming: 2, run: 2 };
  const a = passageFor(compass, z, 0);
  const b = passageFor(compass, z, 0);
  assert.deepEqual(a, b);

  const movedTimestamp = passageFor(compass, z, "2026-08-10T02:30:00.000Z");
  assert.deepEqual(movedTimestamp, a, "a timestamp must not become a hidden variation seed");
});

test("passage occurrence comes from the reader's real preceding cell history", () => {
  const cell = { ascendant: "chi", band: "clear" };
  const z = { ming: 2, run: 2 };
  const first = { timestampIso: "2026-08-01T09:00:00.000Z", valid: true, compass: cell, z };
  const other = { timestampIso: "2026-08-02T09:00:00.000Z", valid: true,
    compass: { ascendant: "hei", band: "slight" }, z: { ming: 0, run: 0 } };
  const third = { timestampIso: "2026-08-03T09:00:00.000Z", valid: true, compass: cell, z };
  const history = [first, other, third];
  assert.equal(passageOccurrenceFor(first, history), 0);
  assert.equal(passageOccurrenceFor(third, history), 1);
  assert.equal(passageOccurrenceFor({ ...third, timestampIso: "2026-08-04T09:00:00.000Z" }, history), 2,
    "an appended record counts the prior matching rows even when it is not stored yet");
  assert.equal(passageOccurrenceFor({ ...third, valid: false }, history), 1,
    "invalid prior rows do not create a presentation occurrence");
});

test("the three parts vary independently across seeds", () => {
  // Seeded from one string, so a naive implementation marches all three in
  // lockstep and the corpus collapses to five passages per cell.
  const seen = { core: new Set(), band: new Set(), course: new Set() };
  for (let i = 0; i < 200; i++) {
    seen.core.add(seededIndex(`${i}|core`, 5));
    seen.band.add(seededIndex(`${i}|band`, 5));
    seen.course.add(seededIndex(`${i}|course`, 5));
  }
  for (const k of Object.keys(seen)) assert.equal(seen[k].size, 5, `${k} does not use all five slots`);

  const pairs = new Set();
  for (let i = 0; i < 200; i++) {
    pairs.add(`${seededIndex(`${i}|core`, 5)}-${seededIndex(`${i}|band`, 5)}`);
  }
  assert.ok(pairs.size > 5, `core and band move in lockstep: only ${pairs.size} pairings`);
});

test("an unknown ascendant falls back to the level reading rather than throwing", () => {
  const p = passageFor({ ascendant: "nonsense", band: "clear" }, { ming: 0, run: 0 }, 0);
  assert.equal(p.ascendant, "nonsense");
  assert.ok(p.text.startsWith(ATTRIBUTION));
  assert.equal(passageFor(null, null, 0).ascendant, "ping");
});

test("ping never renders an intensity band, because nothing is showing", () => {
  const p = passageFor({ ascendant: "ping", band: "marked" }, { ming: 0, run: 0 }, 0);
  assert.equal(p.band, "level");
  assert.doesNotMatch(p.text, /pronounced|strong|far clear/i);
});
