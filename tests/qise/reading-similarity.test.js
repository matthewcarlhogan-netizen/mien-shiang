/*
 * SEMANTIC NEAR-DUPLICATE AUDIT.
 *
 * The collision sweep compares strings exactly, which is the right primitive
 * and the wrong stopping point. Exact comparison is satisfied by ten thousand
 * readings that differ by a synonym and communicate nothing new — contract §4
 * item 3, and §17's warning against inflating combination counts with weak
 * fragments. Distinctness that a reader cannot perceive is not distinctness.
 *
 * There is no semantic model in this repository and there is not going to be
 * one in a PWA with no network, so "semantic" here means lexical overlap, which
 * is a proxy. It is a good proxy for the failure that actually happens —
 * someone writes a fifth trajectory line that is the third one reworded — and a
 * poor one for genuine paraphrase. Two guards, honest about which is which:
 *
 *   COMPONENT AUDIT   no two variants within one slot may overlap heavily.
 *                     Exhaustive, cheap, and the place duplication is authored.
 *
 *   MATERIALITY AUDIT changing one dimension must change more than a word.
 *                     Sampled across single-field pairs, because the full
 *                     pairwise space is O(n²) over 15,000 readings and the
 *                     interesting pairs are the adjacent ones anyway.
 *
 * Thresholds are editorial, declared here rather than buried, and deliberately
 * loose enough that they fire on duplication rather than on a shared idiom.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ASCENDANT_SUBJECT, REGION_PLACE, DIRECTION_VERB, MAGNITUDE_QUALIFIER,
  HISTORY_LINE, CONFIDENCE_VOICE, AVAILABILITY_LINE, HERITAGE, REFLECTION,
} from "../../src/qise/reflection-corpus.js";
import {
  enumerateReachableStates, isReachable, stateKey, READING_AFFECTING,
  REGIONS, ASCENDANTS, DIRECTIONS, MAGNITUDE_BANDS, CONFIDENCE_BANDS,
  HISTORY_STAGES, TRAJECTORIES, HERITAGE_CONSTRUCTS, SOURCE_LINEAGES, AVAILABILITY,
} from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";

/** Overlap above this within one slot is duplication, not variation. */
export const COMPONENT_MAX_JACCARD = 0.55;
/** Two readings one dimension apart must differ by more than this. */
export const READING_MAX_JACCARD = 0.97;
/** ...and by at least this many distinct words, so a synonym is not enough. */
export const MIN_DISTINCT_WORDS = 3;

const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9一-鿿 ]+/g, " ")
  .split(/\s+/).filter(Boolean);

/** Word bigrams; falls back to the word set for strings too short to shingle. */
function shingles(s) {
  const w = words(s);
  if (w.length < 3) return new Set(w);
  const out = new Set();
  for (let i = 0; i < w.length - 1; i++) out.add(`${w[i]} ${w[i + 1]}`);
  return out;
}

function jaccard(a, b) {
  const A = shingles(a), B = shingles(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/* ── 1. the component audit ──────────────────────────────────────────────── */

const SLOTS = [
  ["ASCENDANT_SUBJECT", Object.values(ASCENDANT_SUBJECT)],
  ["REGION_PLACE", Object.values(REGION_PLACE)],
  ["DIRECTION_VERB", Object.values(DIRECTION_VERB)],
  ["MAGNITUDE_QUALIFIER", Object.values(MAGNITUDE_QUALIFIER).filter(Boolean)],
  ["CONFIDENCE_VOICE", Object.values(CONFIDENCE_VOICE)],
  ["AVAILABILITY_LINE", Object.values(AVAILABILITY_LINE).filter(Boolean)],
  ...Object.entries(HISTORY_LINE).map(([stage, v]) => [`HISTORY_LINE.${stage}`, Object.values(v)]),
  ...Object.entries(REFLECTION).map(([c, v]) => [`REFLECTION.${c}`, Object.values(v)]),
  ["HERITAGE.text", Object.values(HERITAGE).flatMap((c) => Object.values(c).map((e) => e.text))],
  ["HERITAGE.note", Object.values(HERITAGE).flatMap((c) => Object.values(c).map((e) => e.note))],
];

test("the similarity audit is looking at the whole corpus", () => {
  const counted = SLOTS.reduce((n, [, v]) => n + v.length, 0);
  assert.ok(SLOTS.length >= 12, `only ${SLOTS.length} slots audited`);
  assert.ok(counted >= 60, `only ${counted} components audited`);
});

test("no two components in the same slot are near-duplicates of each other", () => {
  const offenders = [];
  for (const [slot, variants] of SLOTS) {
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        const score = jaccard(variants[i], variants[j]);
        if (score > COMPONENT_MAX_JACCARD) {
          offenders.push(`${slot}: ${score.toFixed(2)}\n    ${variants[i]}\n    ${variants[j]}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [],
    `components saying the same thing twice:\n  ${offenders.join("\n  ")}`);
});

test("no component is a near-duplicate of a component in a DIFFERENT slot", () => {
  // Cross-slot duplication is the subtler failure: a history line and an
  // availability line that both say "there is not enough to go on" read as one
  // sentence stuttered, and the reading gets longer without getting richer.
  const flat = SLOTS.flatMap(([slot, v]) => v.map((text) => ({ slot, text })));
  const offenders = [];
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i].slot === flat[j].slot) continue;
      const score = jaccard(flat[i].text, flat[j].text);
      if (score > COMPONENT_MAX_JACCARD) {
        offenders.push(`${flat[i].slot} ≈ ${flat[j].slot} (${score.toFixed(2)})\n    ${flat[i].text}\n    ${flat[j].text}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `cross-slot duplication:\n  ${offenders.join("\n  ")}`);
});

/* ── 2. the materiality audit ────────────────────────────────────────────── */

const VALUES = {
  region: REGIONS, ascendant: ASCENDANTS, direction: DIRECTIONS,
  magnitudeBand: MAGNITUDE_BANDS, confidenceBand: CONFIDENCE_BANDS,
  historyStage: HISTORY_STAGES, trajectory: TRAJECTORIES,
  heritageConstruct: HERITAGE_CONSTRUCTS, sourceLineage: SOURCE_LINEAGES,
  availability: AVAILABILITY,
};

test("a one-dimension change is felt, not merely detectable", () => {
  const states = enumerateReachableStates();
  const offenders = [];
  let compared = 0;

  for (const field of READING_AFFECTING) {
    // A stride rather than the full space: adjacent pairs are what matters and
    // the full cross-product buys nothing but minutes.
    for (let i = 0; i < states.length; i += 37) {
      const state = states[i];
      for (const value of VALUES[field]) {
        if (value === state[field]) continue;
        const candidate = { ...state, [field]: value };
        if (!isReachable(candidate)) continue;

        const a = composeReading(state).text;
        const b = composeReading(candidate).text;
        compared++;

        const score = jaccard(a, b);
        const aw = new Set(words(a)), bw = new Set(words(b));
        let distinct = 0;
        for (const w of aw) if (!bw.has(w)) distinct++;
        for (const w of bw) if (!aw.has(w)) distinct++;

        if (score > READING_MAX_JACCARD || distinct < MIN_DISTINCT_WORDS) {
          offenders.push(`${field}: ${state[field]} → ${value} (jaccard ${score.toFixed(3)}, ${distinct} distinct words)\n    ${stateKey(state)}`);
        }
        break; // one witness per state per field is enough
      }
    }
  }

  assert.ok(compared > 1000, `only ${compared} pairs compared`);
  assert.deepEqual(offenders.slice(0, 8), [],
    `${offenders.length} one-dimension changes produce a cosmetically different reading:\n  ${offenders.slice(0, 8).join("\n  ")}`);
});

/* ── 3. the audit can fail ───────────────────────────────────────────────── */

test("the similarity measure actually separates duplication from variation", () => {
  // A guard whose threshold is wrong passes everything. Pinned against known
  // pairs so a bad threshold is caught here rather than by shipping mush.
  assert.ok(jaccard("the movement is easing back toward your usual range",
                    "the movement is easing back towards your usual range") > COMPONENT_MAX_JACCARD,
    "a reworded duplicate scored as distinct: the threshold is too loose");
  assert.ok(jaccard("There is warmth through the centre of your face.",
                    "The sources agree on the cheekbones and disagree on the chin.") < COMPONENT_MAX_JACCARD,
    "two unrelated sentences scored as duplicates: the threshold is too tight");
});
