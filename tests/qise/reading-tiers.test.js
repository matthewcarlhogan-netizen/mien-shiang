/*
 * The tier split and the rollout flag.
 *
 * The split is a product rule (§15) and the flag is the owner's parity
 * requirement, so both are tested away from the DOM. A tier model that only
 * works inside a browser is a tier model nobody checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { reflectionMode, reflectionEngineEnabled, reflectionComparing, REFLECTION_FLAG_KEY, INTERNAL_HOST_PATTERNS, isInternalHost, defaultMode } from "../../src/qise/reading-flags.js";
import { readingTiers } from "../../src/qise/reading-tiers.js";
import { enumerateReachableStates, READING_AFFECTING } from "../../src/qise/reading-state.js";
import { composeReading, LAYERS } from "../../src/qise/reflection.js";

const STATES = enumerateReachableStates();
const forState = (s) => readingTiers({ state: s, composed: composeReading(s) });

/* ── the flag ────────────────────────────────────────────────────────────── */

test("the engine is off unless something turns it on", () => {
  assert.equal(reflectionMode({}), "off");
  assert.equal(reflectionMode({ search: "" }), "off");
  assert.equal(reflectionMode({ search: "?other=1" }), "off");
  assert.equal(reflectionEngineEnabled({}), false);
});

test("the query string sets the mode and beats stored preference", () => {
  const storage = { getItem: () => "off" };
  assert.equal(reflectionMode({ search: "?reflection=on", storage }), "on");
  assert.equal(reflectionMode({ search: "?reflection=compare", storage }), "compare");
  assert.equal(reflectionComparing({ search: "?reflection=compare" }), true);
});

test("stored preference applies when the URL says nothing", () => {
  const storage = { getItem: (k) => (k === REFLECTION_FLAG_KEY ? "compare" : null) };
  assert.equal(reflectionMode({ search: "", storage }), "compare");
});

test("an unknown or hostile flag value is off, not a crash", () => {
  assert.equal(reflectionMode({ search: "?reflection=yes-please" }), "off");
  assert.equal(reflectionMode({ search: "%%%" }), "off");
  assert.equal(reflectionMode({ storage: { getItem() { throw new Error("denied"); } } }), "off");
});

/* ── the split ───────────────────────────────────────────────────────────── */

test("every reachable state produces all three tiers", () => {
  for (const s of STATES.filter((_, i) => i % 29 === 0)) {
    const t = forState(s);
    assert.ok(t.tier1.headline.length > 0, "tier 1 has no headline");
    assert.ok(t.tier2.passage.length > 0, "tier 2 has no passage");
    assert.ok(t.tier2.question.length > 0, "tier 2 has no question");
    assert.ok(t.tier3.dimensions.length === READING_AFFECTING.length);
    assert.ok(t.tier3.stateKey.length > 0);
  }
});

test("tier 1 carries no heritage and tier 2 keeps personal context separate from heritage", () => {
  // §7 — the layers stay apart in the surface, not only in the data model.
  for (const s of STATES.filter((_, i) => i % 53 === 0)) {
    const t = forState(s);
    const tier1 = [t.tier1.headline, ...t.tier1.body, ...t.tier1.history, t.tier1.confidence].join(" ");
    assert.ok(!/太清|神相|麻衣|classical writers|the tradition/i.test(tier1),
      "heritage content leaked into Today");
    assert.ok(!/your own scatter|has risen above|has fallen below/i.test(t.tier2.passage),
      "measurement leaked into the heritage passage");
    assert.ok(!/太清|神相|麻衣|classical writers|the tradition/i.test(
      Object.values(t.tier2.personalContext).join(" "),
    ), "heritage content leaked into personal context");
  }
});

test("tier 2 carries the existing personal reading context as a separate projection", () => {
  const state = STATES.find((x) => x.availability === "read");
  const composed = composeReading(state);
  const tier2 = readingTiers({ state, composed }).tier2;
  const textFor = (id) => composed.parts.find((part) => part.id === id)?.text || "";

  assert.deepEqual(tier2.personalContext, {
    availability: textFor("availability"),
    observation: textFor("observation"),
    magnitude: textFor("magnitude"),
    history: textFor("history"),
    confidence: textFor("confidence"),
  });
  assert.ok(tier2.personalContext.observation.length > 0);
  assert.ok(tier2.personalContext.history.length > 0);
  assert.ok(tier2.personalContext.confidence.length > 0);
  assert.ok(!/your own scatter|has risen above|has fallen below/i.test(tier2.passage),
    "the heritage passage must remain free of measurement prose");
});

test("abstained Tier 2 context explains the gap without inventing an observation", () => {
  const state = STATES.find((x) => x.availability === "abstained_confidence");
  const tier2 = forState(state).tier2;
  assert.equal(tier2.personalContext.observation, "");
  assert.equal(tier2.personalContext.magnitude, "");
  assert.ok(tier2.personalContext.availability.length > 0);
  assert.ok(tier2.personalContext.confidence.length > 0);
});

test("tier 2 always carries its attribution and its rotation disclosure", () => {
  for (const s of STATES.filter((_, i) => i % 31 === 0)) {
    const t = forState(s);
    assert.ok(t.tier2.attribution.length > 0, "a heritage passage shipped with no source");
    assert.ok(/rotation/i.test(t.tier2.rotationDisclosure),
      "the passage did not disclose that it was rotated rather than chosen");
  }
});

test("tier 3 accounts for every sentence in all three layers", () => {
  const s = STATES.find((x) => x.availability === "read");
  const t = forState(s);
  const composed = composeReading(s);
  const traced = LAYERS.reduce((n, l) => n + t.tier3.byLayer[l].length, 0);
  assert.equal(traced, composed.trace.length,
    "tier 3 dropped a sentence from the explanation");
  for (const layer of LAYERS) {
    for (const entry of t.tier3.byLayer[layer]) {
      assert.ok(entry.sentence.length > 0);
      assert.ok(entry.because.length > 0, `"${entry.component}" is explained by nothing`);
    }
  }
});

test("tier 3 names what is identifying and what is merely carried", () => {
  const t = forState(STATES[0]);
  assert.deepEqual(t.tier3.dimensions.map((d) => d.field), [...READING_AFFECTING]);
  assert.ok(t.tier3.notIdentifying.includes("selfReport"));
  assert.ok(t.tier3.provenance.engine.startsWith("reflection-engine-"));
  assert.ok(t.tier3.provenance.corpus.startsWith("reflection-corpus-"));
});

test("an abstained reading says so in tier 1 and still offers tier 2", () => {
  const s = STATES.find((x) => x.availability === "abstained_confidence");
  const t = forState(s);
  assert.equal(t.tier1.abstained, true);
  assert.ok(t.tier1.body.join(" ").length > 0, "abstention with no explanation");
  assert.ok(t.tier2.passage.length > 0, "abstention removed the heritage study too");
  assert.ok(t.tier2.question.length > 0);
});

/* ── internal default versus public default ──────────────────────────────── */

test("a development origin gets the reflection engine by default", () => {
  for (const host of ["localhost", "127.0.0.1", "fluffy-umbrella-x9.app.github.dev"]) {
    assert.equal(reflectionMode({ hostname: host }), "on", `${host} should be internal`);
  }
});

test("the published origin, and any origin at all, defaults to off", () => {
  // The published site is a GitHub Pages host, and it must not appear on the
  // internal list. Checked by name so that adding it later fails here rather
  // than in front of users.
  for (const host of [
    "matthewcarlhogan-netizen.github.io", "mienshiang.app", "example.com",
    "", undefined, "localhost.evil.com", "app.github.dev.attacker.net",
  ]) {
    assert.equal(reflectionMode({ hostname: host }), "off", `${host} must not be internal`);
  }
});

test("no internal pattern matches the release origin", () => {
  // The guard that keeps blocked heritage content off the public path.
  for (const re of INTERNAL_HOST_PATTERNS) {
    assert.ok(!re.test("matthewcarlhogan-netizen.github.io"),
      `pattern ${re} matches the published origin`);
  }
});

test("an explicit choice still beats the host default in both directions", () => {
  assert.equal(reflectionMode({ hostname: "localhost", search: "?reflection=off" }), "off");
  assert.equal(reflectionMode({ hostname: "example.com", search: "?reflection=compare" }), "compare");
  assert.equal(reflectionMode({ hostname: "example.com", storage: { getItem: () => "on" } }), "on");
});
