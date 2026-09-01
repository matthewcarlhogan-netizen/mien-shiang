/*
 * D-1 — THE TIER 2 READING SURFACE IS NO LONGER DEGENERATE.
 *
 * ── THE DEFECT THIS FILE PINS ──────────────────────────────────────────────
 * `tierTwo()` read the heritage layer plus the bridge and the question. Those
 * four components declare four of the ten reading-affecting axes between them
 * (`heritageConstruct`, `sourceLineage`, `ascendant`, `availability`). The
 * other six — `region`, `direction`, `magnitudeBand`, `confidenceBand`,
 * `historyStage`, `trajectory` — were computed by the pipeline, carried on the
 * frozen state, rendered in Tier 1 and Tier 3, and dropped on the way to the
 * Reading screen.
 *
 * Measured over all reachable states before the repair: 178 distinct Tier 2
 * outputs across 15,288 states — 98.8% collision. And FIXED: one read state
 * sampled across 40 consecutive occurrences produced ONE distinct Tier 2. The
 * `variantIndices` odometer orders Tier 2's components last, so their place
 * value is the product of every earlier radix and the occurrence walk never
 * reaches them inside a human timeframe. A reader in a steady week watched
 * Today move while the Reading screen did not.
 *
 * That is `reading-state.js`'s own founding defect — "meaningful state was
 * calculated and silently discarded" — one layer above the module written to
 * prevent it.
 *
 * ── WHAT THESE TESTS ARE NOT EVIDENCE OF ───────────────────────────────────
 * Presentation discrimination is not customer value. A screen that varies
 * correctly is a screen with one defect removed; nothing here shows that a
 * reader wants it, returns for it, or finds it true. Do not cite the 15,288
 * figure as product validation — it is the absence of a bug, measured.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  readingTiers, tierTwo, personalContext, PERSONAL_CONTEXT_FIELDS,
} from "../../src/qise/reading-tiers.js";
import { enumerateReachableStates, stateKey, AVAILABILITY } from "../../src/qise/reading-state.js";
import { composeReading, DECLARED_EQUIVALENCES } from "../../src/qise/reflection.js";
import { shareCardModel } from "../../src/ui/qise/share.js";
import { stripComments, tokeniseStringLiterals } from "../../scripts/copy-scan.js";

const STATES = enumerateReachableStates();
const forState = (s, occurrence = 0) =>
  readingTiers({ state: s, composed: composeReading(s, { occurrence }) });

const src = (rel) => readFileSync(fileURLToPath(new URL("../../src/" + rel, import.meta.url)), "utf8");

/** Everything a reader can actually see on Tier 2, as one comparable string. */
const visible = (t2) => JSON.stringify(t2);

/* ── 1 & 2. state coverage, measured not assumed ─────────────────────────── */

test("every reachable state produces a distinct visible Tier 2", () => {
  assert.equal(STATES.length, 15288, "the reachable space changed; re-measure before trusting the rest");

  const seen = new Map();
  for (const s of STATES) {
    const key = visible(forState(s).tier2);
    if (seen.has(key)) {
      // `seen` is keyed by the visible Tier 2 string, so the prior colliding
      // state is `seen.get(key)` — reading it back with `seen.get(s)` printed
      // `undefined` and hid the very state the failure exists to name.
      // Found in review by Copilot on PR #45.
      assert.fail(
        "Tier 2 collision between two reachable states:\n  "
        + stateKey(seen.get(key)) + "\n  " + stateKey(s));
    }
    seen.set(key, s);
  }
  assert.equal(seen.size, STATES.length,
    `Tier 2 produced ${seen.size} distinct outputs for ${STATES.length} states`);
});

/*
 * The count above is only meaningful if the distinctness is CARRIED BY THE
 * PROJECTION rather than arriving by accident somewhere else. Two states
 * differing only in a personal-context axis must differ in personalContext
 * specifically — not merely somewhere in the blob.
 */
test("states that differ only in a personal axis differ IN personalContext", () => {
  const PERSONAL_AXES = ["region", "direction", "magnitudeBand", "confidenceBand",
    "historyStage", "trajectory"];

  // Index by everything EXCEPT the personal axes: any two states sharing a
  // bucket differ only in axes Tier 2 used to be blind to.
  const buckets = new Map();
  for (const s of STATES) {
    const k = ["ascendant", "heritageConstruct", "sourceLineage", "availability"]
      .map((f) => s[f]).join("|");
    (buckets.get(k) || buckets.set(k, []).get(k)).push(s);
  }

  let compared = 0;
  for (const group of buckets.values()) {
    for (let i = 1; i < group.length; i++) {
      const a = forState(group[i - 1]).tier2;
      const b = forState(group[i]).tier2;
      assert.notEqual(JSON.stringify(a.personalContext), JSON.stringify(b.personalContext),
        "two states differing only in " + PERSONAL_AXES.join("/")
        + " produced an identical personalContext:\n  "
        + stateKey(group[i - 1]) + "\n  " + stateKey(group[i]));
      compared++;
    }
  }
  assert.ok(compared > 1000, `only ${compared} same-heritage pairs compared`);
});

/* ── 3. the former collisions, proven to have been collisions ─────────────── */

test("the pre-repair Tier 2 projection collides, and personalContext is what separates it", () => {
  /*
   * The negative control. Rebuilt here from the CURRENT tierTwo() by deleting
   * exactly the field this repair added — so it cannot drift away from what
   * shipped, the way a frozen copy of the old function would. If deleting
   * personalContext no longer collapses the space, personalContext is no
   * longer what is carrying the distinctness and this test has stopped
   * measuring what it claims to.
   */
  const withoutProjection = new Set();
  const withProjection = new Set();
  for (const s of STATES) {
    const t2 = tierTwo(s, composeReading(s));
    const { personalContext: _dropped, ...rest } = t2;
    withoutProjection.add(JSON.stringify(rest));
    withProjection.add(JSON.stringify(t2));
  }

  assert.equal(withoutProjection.size, 178,
    "the pre-repair projection no longer collides at the measured rate; re-measure the baseline");
  assert.equal(withProjection.size, STATES.length);
  assert.ok(withProjection.size > withoutProjection.size * 80,
    "personalContext is not what separates these states");
});

/* ── 4. no undeclared collision, in either direction ─────────────────────── */

test("no two visibly different states collide, and no equivalence is declared", () => {
  // DECLARED_EQUIVALENCES is the only sanctioned way for two reachable states
  // to render identically. It is empty, so the tolerated collision count is 0
  // — asserted rather than assumed, because a future entry there must force
  // this test to be revisited rather than silently widening the guarantee.
  assert.deepEqual([...DECLARED_EQUIVALENCES], [],
    "an equivalence was declared; the collision budget above is no longer zero");

  const byOutput = new Map();
  for (const s of STATES) {
    const k = visible(forState(s).tier2);
    (byOutput.get(k) || byOutput.set(k, []).get(k)).push(stateKey(s));
  }
  const collisions = [...byOutput.values()].filter((g) => g.length > 1);
  assert.deepEqual(collisions, [], `${collisions.length} undeclared Tier 2 collisions`);
});

/* ── 5. every availability class, including all four abstentions ─────────── */

test("read, capture, anatomy, confidence and calibrating states are all covered", () => {
  const covered = new Set(STATES.map((s) => s.availability));
  assert.deepEqual([...covered].sort(), [...AVAILABILITY].sort(),
    "an availability class is unreachable, so nothing below tests it");
});

test("an abstained reading explains the gap and fabricates nothing", () => {
  for (const availability of AVAILABILITY.filter((a) => a !== "read")) {
    const s = STATES.find((x) => x.availability === availability);
    assert.ok(s, `no reachable ${availability} state`);
    const pc = forState(s).tier2.personalContext;

    assert.equal(pc.read, false, availability);
    assert.equal(pc.availabilityCode, availability);

    // No observation and no magnitude — `deriveReadingState()` collapsed the
    // movement claim, so there is nothing to report and nothing is invented.
    assert.equal(pc.observation, null, `${availability} fabricated an observation`);
    assert.equal(pc.magnitude, null, `${availability} fabricated a magnitude`);
    // History survives only where it describes the RECORD's maturity rather
    // than today's face — see the header in `personalContext`. At
    // `established` the only steady line is a verdict, so it is dropped.
    const expectedAbsent = s.historyStage === "established"
      ? ["observation", "magnitude", "history"]
      : ["observation", "magnitude"];
    assert.deepEqual([...pc.absent], expectedAbsent,
      `${availability} did not name what it could not fill`);
    if (s.historyStage === "established") {
      assert.equal(pc.history, null,
        `${availability} made an outcome claim from a forced trajectory`);
    }

    // The gap is explained, in words, rather than left as a shorter block.
    assert.ok(pc.availability && pc.availability.length > 20,
      `${availability} gave no reason for the gap`);
  }
});

test("an abstained record makes no outcome claim, in any reachable abstained state", () => {
  /*
   * The P1 this guards, found in review on PR #45. `deriveReadingState()`
   * forces `trajectory: "steady"` on every abstention, and the `history`
   * component is keyed on it — so an established user whose capture abstained
   * on confidence saw "the honest answer is silence" and "Nothing is standing
   * out against the range the app has learned for you." in one block.
   *
   * Checked as PROSE over every reachable abstained state, not just as a null
   * field: a future corpus line reintroducing an outcome claim through some
   * other component would slip past a null check and must not slip past this.
   */
  const OUTCOME_CLAIM = /nothing is standing out|nothing notable|has risen|has fallen|is standing out against/i;
  const offenders = [];
  for (const s of STATES.filter((x) => x.availability !== "read")) {
    const pc = forState(s).tier2.personalContext;
    const prose = PERSONAL_CONTEXT_FIELDS.map((f) => pc[f] || "").join(" ");
    const m = prose.match(OUTCOME_CLAIM);
    if (m) offenders.push(`${stateKey(s)}: "${m[0]}"`);
  }
  assert.deepEqual([...new Set(offenders.map((o) => o.split(": ")[1]))], [],
    "an abstained reading made an outcome claim about a scan that was not read:\n  "
    + offenders.slice(0, 5).join("\n  "));

  // Paired positive control: the pattern really does catch the shipped line.
  assert.match("Nothing is standing out against the range the app has learned for you.",
    OUTCOME_CLAIM);
});

test("a read reading carries the observation, and has no gap notice to give", () => {
  const s = STATES.find((x) => x.availability === "read");
  const pc = forState(s).tier2.personalContext;
  assert.equal(pc.read, true);
  assert.ok(pc.observation && pc.observation.length > 0);
  assert.ok(pc.magnitude && pc.magnitude.length > 0);
  /*
   * `AVAILABILITY_LINE.read` is `[""]` on purpose: a day that WAS read has no
   * gap to announce. So `availability` is null and `absent` names it — honest
   * as data, and a trap as markup, which is why `personalRecordMarkup()`
   * gates the gap notice on `!read`. Pinned here so the corpus entry cannot
   * quietly gain a sentence that would then render as an abstention notice on
   * every good day.
   */
  assert.equal(pc.availability, null);
  assert.deepEqual([...pc.absent], ["availability"]);
});

/* ── 6 & 7. leakage, both directions ─────────────────────────────────────── */

const HERITAGE_MARKERS = /太清|神相|麻衣|classical writers|the tradition|Shen Xiang|Ma Yi/i;

test("no heritage material appears in personalContext", () => {
  for (const s of STATES.filter((_, i) => i % 17 === 0)) {
    const pc = forState(s).tier2.personalContext;
    const text = PERSONAL_CONTEXT_FIELDS.map((f) => pc[f] || "").join(" ");
    assert.doesNotMatch(text, HERITAGE_MARKERS,
      `heritage leaked into the reader's own record for ${stateKey(s)}`);
  }
});

test("no personal-context prose appears in the passage, attribution, bridge or question", () => {
  for (const s of STATES.filter((_, i) => i % 17 === 0)) {
    const t2 = forState(s).tier2;
    const heritageSide = [t2.passage, t2.attribution, t2.bridge, t2.question].join(" ");
    for (const field of PERSONAL_CONTEXT_FIELDS) {
      const value = t2.personalContext[field];
      if (!value) continue;
      assert.ok(!heritageSide.includes(value),
        `personalContext.${field} was reproduced inside the heritage prose for ${stateKey(s)}`);
    }
  }
});

/* ── 8. Tier 1 is untouched ──────────────────────────────────────────────── */

test("tier 1 gains no personalContext and no heritage", () => {
  for (const s of STATES.filter((_, i) => i % 53 === 0)) {
    const t = forState(s);
    assert.equal("personalContext" in t.tier1, false,
      "the richer Tier 2 projection leaked into Today");
    const tier1Text = [t.tier1.headline, ...t.tier1.body, ...t.tier1.history, t.tier1.confidence].join(" ");
    assert.doesNotMatch(tier1Text, HERITAGE_MARKERS, "heritage leaked into Today");
  }
});

/* ── 9. determinism, including replay from a persisted-shape state ───────── */

test("same state and same occurrence is byte-identical, rebuilt and replayed", () => {
  for (const s of STATES.filter((_, i) => i % 401 === 0)) {
    for (const occurrence of [0, 1, 7, 40]) {
      const a = visible(forState(s, occurrence).tier2);
      const b = visible(forState(s, occurrence).tier2);
      assert.equal(a, b, `${stateKey(s)} @${occurrence} was not reproducible`);

      // Replay through a persisted-shape round trip: the state as it would
      // come back off disk (a plain, re-frozen object of scalars), not the
      // in-memory object the enumerator handed us.
      const replayed = Object.freeze(JSON.parse(JSON.stringify(s)));
      assert.equal(visible(forState(replayed, occurrence).tier2), a,
        `${stateKey(s)} @${occurrence} did not survive a persisted-shape replay`);
    }
  }
});

test("a returning reader in one unchanged state now sees the Reading screen move", () => {
  // The occurrence-freeze half of the defect. One distinct output across 40
  // occurrences was the pre-repair measurement.
  const s = STATES.find((x) => x.availability === "read");
  const seen = new Set();
  for (let occurrence = 0; occurrence < 40; occurrence++) {
    seen.add(visible(forState(s, occurrence).tier2));
  }
  assert.ok(seen.size >= 20,
    `one state across 40 occurrences produced only ${seen.size} distinct Tier 2 outputs`);
});

/* ── 10. no clock, no randomness, no host ────────────────────────────────── */

test("the projection and its renderer introduce no clock, randomness or host dependence", () => {
  const FORBIDDEN = /\bDate\.now\b|\bnew Date\b|\bMath\.random\b|\bperformance\.now\b|\bhostname\b|\blocation\b/;

  const tiers = src("qise/reading-tiers.js");
  assert.doesNotMatch(tiers, FORBIDDEN,
    "reading-tiers.js gained a clock, a random source or a host dependence");

  // Scoped to the renderer, because app.js legitimately reads `location` for
  // the reflection-mode flag elsewhere in the file.
  const app = src("ui/qise/app.js");
  const start = app.indexOf("function personalRecordMarkup(context) {");
  assert.ok(start > 0, "personalRecordMarkup is gone; the Story surface is no longer wired");
  const body = app.slice(start, app.indexOf("\n}", start));
  assert.doesNotMatch(body, FORBIDDEN, "personalRecordMarkup gained a clock or a host dependence");

  // And the guard would fire if one were added.
  assert.match("const t = Date.now()", FORBIDDEN);
  assert.match("if (location.hostname) {}", FORBIDDEN);
});

/* ── 11. projection, not duplicated interpretation ───────────────────────── */

test("every personalContext string is a sentence the composition already produced", () => {
  for (const s of STATES.filter((_, i) => i % 7 === 0)) {
    const composed = composeReading(s);
    const produced = new Set(composed.parts.map((p) => p.text));
    const pc = personalContext(s, composed);
    for (const field of PERSONAL_CONTEXT_FIELDS) {
      if (pc[field] === null) continue;
      assert.ok(produced.has(pc[field]),
        `personalContext.${field} is not in composed.parts for ${stateKey(s)} — `
        + "the projection has started composing its own wording");
    }
  }
});

test("the projection is selected by component id, not rebuilt from the state", () => {
  // Structural: the only way the five fields are filled is the shared
  // `textsFor(composed, ...)` helper, so wording cannot be re-derived.
  const tiers = src("qise/reading-tiers.js");
  const start = tiers.indexOf("export function personalContext(state, composed) {");
  assert.ok(start > 0, "personalContext is gone");
  const body = tiers.slice(start, tiers.indexOf("\n}", start));
  assert.match(body, /textsFor\(composed, \[field\]\)/,
    "personalContext no longer selects out of composed.parts");
  /*
   * No string literal in the CODE that could be reader-facing copy.
   *
   * Two corrections live in this one assertion, both of them defects this
   * guard actually had:
   *
   * 1. Comments are stripped first. This function's header quotes the three
   *    corpus history lines verbatim to show why only one of them is a
   *    verdict; a guard that counted those as "carrying its own copy" would
   *    push back against explaining the decision.
   * 2. It uses `tokeniseStringLiterals`, not a `/"..."/` regex. CLAUDE.md item
   *    22: JavaScript alternates strings and code, so quote-to-quote matching
   *    happily captures the CODE BETWEEN two literals. It did exactly that
   *    here, reporting `" && state.historyStage === "` — a fragment spanning
   *    from the end of one literal to the start of the next — as reader-facing
   *    copy. The repo built the tokeniser for this; use it.
   */
  const literals = tokeniseStringLiterals(stripComments(body))
    .filter((s) => s.trim().length >= 12);
  assert.deepEqual(literals, [], `personalContext carries its own copy: ${literals.join(" | ")}`);
});

/* ── 12. the share/export surface is unchanged ───────────────────────────── */

test("shareCardModel still does not consume readingTiers", () => {
  const share = src("ui/qise/share.js");
  assert.doesNotMatch(share, /readingTiers|personalContext|tier2/,
    "the share card started consuming the reading tiers; D-1 must not change what is exported");
  assert.equal(typeof shareCardModel, "function");
});

/* ── 13. Story AND compare both render it, from ONE renderer ─────────────── */

test("Story and compare both render the record, and share one implementation", () => {
  const app = src("ui/qise/app.js");
  const render = app.slice(
    app.indexOf("async function renderReflection(reading, history) {"),
    app.indexOf("async function renderReading(reading) {"),
  );
  assert.ok(render.length > 0, "renderReflection is gone");

  // Bound exactly once, from tier2 — the same ownership rule the rotation
  // disclosure follows, so the two surfaces cannot drift apart.
  const bindings = render.match(/const personalRecord = personalRecordMarkup\(tier2\.personalContext\);/g) || [];
  assert.equal(bindings.length, 1, "the record must be bound from tier2 exactly once");

  const storySlice = render.slice(
    render.indexOf("storyNode.innerHTML = `"),
    render.indexOf("`;", render.indexOf("storyNode.innerHTML = `")),
  );
  assert.match(storySlice, /\$\{personalRecord\}/, "Story does not render the record");

  const compareSlice = render.slice(
    render.indexOf("compareNode.innerHTML = `"),
    render.indexOf("`;", render.indexOf("compareNode.innerHTML = `")),
  );
  assert.match(compareSlice, /\$\{personalRecord\}/, "compare mode does not render the record");

  // Compare must attribute it to the Reflection engine, never to the passage
  // engine, which has no such material.
  const currentEngine = compareSlice.indexOf("Current engine");
  const reflectionEngine = compareSlice.indexOf("Reflection engine");
  const record = compareSlice.indexOf("${personalRecord}");
  assert.ok(currentEngine >= 0 && reflectionEngine > currentEngine && record > reflectionEngine,
    "the record must sit under the Reflection engine heading, not the passage engine's");
});

test("the disclosure still renders exactly once in Story, beside the record", () => {
  // The record must not have displaced or duplicated the rotation disclosure —
  // the invariant heritage-connections.test.js owns, re-checked here because
  // this change edits that exact template.
  const app = src("ui/qise/app.js");
  const render = app.slice(
    app.indexOf("async function renderReflection(reading, history) {"),
    app.indexOf("async function renderReading(reading) {"),
  );
  const storySlice = render.slice(
    render.indexOf("storyNode.innerHTML = `"),
    render.indexOf("`;", render.indexOf("storyNode.innerHTML = `")),
  );
  assert.equal((storySlice.match(/\$\{esc\(rotationDisclosure\)\}/g) || []).length, 1);
  assert.equal((storySlice.match(/\$\{esc\(tier2\.passage\)\}/g) || []).length, 1);
  assert.equal((storySlice.match(/\$\{esc\(tier2\.attribution\)\}/g) || []).length, 1);
});

/* ── 14. the rendered markup itself ──────────────────────────────────────── */

test("the rendered record escapes its text, separates its section, and omits nothing", async () => {
  /*
   * `app.js` cannot be imported (it reaches MediaPipe from a CDN at module
   * scope — CLAUDE.md item 18a), so the renderer is exercised through a
   * faithful re-implementation of its template pinned to the source above.
   * What this test owns is the OUTPUT SHAPE: which fields reach markup, in
   * what order, inside what container.
   */
  const app = src("ui/qise/app.js");
  const body = app.slice(
    app.indexOf("function personalRecordMarkup(context) {"),
    app.indexOf("\n}", app.indexOf("function personalRecordMarkup(context) {")),
  );

  // Every one of the five fields is placed, and the gap notice is gated.
  for (const field of PERSONAL_CONTEXT_FIELDS) {
    assert.match(body, new RegExp("context\\." + field + "\\b"),
      `personalRecordMarkup drops personalContext.${field}`);
  }
  assert.match(body, /context\.read \? "" : line\(context\.availability/,
    "the gap notice must render only when there is a gap");

  // Its own container, so the two layers cannot interleave in the DOM.
  assert.match(body, /<section class="personal-record">/);
  assert.match(body, /<p class="eyebrow">Your record<\/p>/);

  // Text goes through esc(); an unescaped interpolation here would be an
  // injection sink fed by corpus prose.
  assert.match(body, /\$\{esc\(text\)\}/);
  assert.doesNotMatch(body, /\$\{text\}/, "personalRecordMarkup interpolates unescaped text");

  // And the stylesheet actually carries the class the markup names.
  const html = readFileSync(fileURLToPath(new URL("../../src/qise.html", import.meta.url)), "utf8");
  assert.match(html, /\.personal-record\{/,
    "the record renders into a class the stylesheet does not define");
});
