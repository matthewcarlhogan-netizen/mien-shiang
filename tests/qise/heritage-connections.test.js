/*
 * Stage 3 — the actual integration point between the heritage connector
 * graph and the Qi Se reading path (src/qise/heritage-connections.js).
 *
 * Connector-graph SEMANTICS (shen, heritageQiSe, disagreements, participant
 * gates, source eligibility) are tested exhaustively at the resolver level
 * (tests/heritage/resolver.test.js) and the composition-boundary level
 * (tests/heritage/composition.test.js). This file proves the things that are
 * only true AT the tier layer: gate precedence reaches Tier 2/Tier 3
 * identically; occurrence is read from the shared Reflection Engine rotation
 * and cannot be overridden by a second, independent one; Tier 1 genuinely
 * never imports connector architecture (a real import-graph check, not a
 * function-body text search); Tier 2 never carries editorial content it
 * cannot fully attribute; and the actual production reading path
 * (src/ui/qise/app.js) calls the integrated function.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  tierTwoHeritageConnections,
  tierThreeHeritageConnections,
  readingTiersWithHeritage,
  deriveTier2FromComposition,
  captureAuthorizationFromReading,
  composeHeritageOnceForReading,
  tier2VisibleDisagreements,
} from "../../src/qise/heritage-connections.js";
import { readingTiers } from "../../src/qise/reading-tiers.js";
import { deriveReadingState } from "../../src/qise/reading-state.js";
import { composeReading } from "../../src/qise/reflection.js";

const srcPath = (relative) => fileURLToPath(new URL(`../../src/${relative}`, import.meta.url));
const readSrc = (relative) => readFileSync(srcPath(relative), "utf8");

function makeReflection(stateOverrides = {}, occurrence = 0) {
  const state = deriveReadingState({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    ...stateOverrides,
  });
  return { state, composed: composeReading(state, { occurrence }), occurrence };
}

const PASSED = { captureQualityPassed: true, safetyPassed: true };

/*
 * A hand-built composition result — a stable, documented contract in its own
 * right (src/heritage/composition.js's `mapResolverResult`/`suppressedResult`
 * shape) — used to test `deriveTier2FromComposition`'s selection logic
 * directly. The real corpus does not currently contain two ACTIVE connectors
 * for any one construct (see docs/HERITAGE_CONNECTOR_STAGE_STATUS.md's
 * Stage 3 limitations), so this is the only way to exercise rotation
 * selection and sourcePanelOnly isolation today without waiting for the
 * corpus to grow.
 */
const fakeActiveEntry = (connectorId) => Object.freeze({
  connectorId, relationshipType: "CORRESPONDS_TO", prohibitedForUserInference: true,
});

const fakeCompositionResult = (overrides = {}) => ({
  suppressed: false,
  suppressionReason: null,
  abstained: false,
  abstentionReasonCode: null,
  primaryConstruct: "fourRivers",
  primaryLineage: "primary",
  active: [fakeActiveEntry("connector-a"), fakeActiveEntry("connector-b")],
  sourcePanelOnly: [],
  disagreements: [],
  editorialJuxtapositions: [],
  abstentions: [],
  renderPlan: {
    relationshipOrder: ["connector-b", "connector-a"],
    componentSlots: [], wordingVariantIndices: {}, connectorSelectionKey: "x", presentationMode: "STANDARD",
  },
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

/* ── gate precedence reaches both tiers, and neither can be bypassed ─────── */

test("tierTwoHeritageConnections fails closed when gate flags are entirely omitted", () => {
  const tier2 = tierTwoHeritageConnections(makeReflection(), {});
  assert.equal(tier2.available, false);
  assert.equal(tier2.reason, "CAPTURE_QUALITY_GATE_UNKNOWN");
  assert.equal(tier2.connector, null);
});

test("tierThreeHeritageConnections fails closed when gate flags are entirely omitted", () => {
  const tier3 = tierThreeHeritageConnections(makeReflection(), {});
  assert.equal(tier3.suppressed, true);
  assert.equal(tier3.suppressionReason, "CAPTURE_QUALITY_GATE_UNKNOWN");
});

test("a failed safety gate suppresses both tiers identically", () => {
  const compose = { captureQualityPassed: true, safetyPassed: false };
  const tier2 = tierTwoHeritageConnections(makeReflection(), compose);
  const tier3 = tierThreeHeritageConnections(makeReflection(), compose);
  assert.equal(tier2.reason, "SAFETY_GATE_FAILED");
  assert.equal(tier3.suppressionReason, "SAFETY_GATE_FAILED");
});

test("readingTiersWithHeritage: tier1 is untouched, tier2/tier3 gain connectors, and a fired gate suppresses only the connector fields", () => {
  const reflection = makeReflection();
  const base = readingTiers(reflection);
  const withHeritage = readingTiersWithHeritage(reflection, {});

  assert.deepEqual(withHeritage.tier1, base.tier1);
  assert.deepEqual({ ...withHeritage.tier2, connectors: undefined }, { ...base.tier2, connectors: undefined });
  assert.deepEqual({ ...withHeritage.tier3, connectors: undefined }, { ...base.tier3, connectors: undefined });
  assert.equal(withHeritage.tier2.connectors.available, false);
  assert.equal(withHeritage.tier2.connectors.reason, "CAPTURE_QUALITY_GATE_UNKNOWN");
  assert.equal(withHeritage.tier3.connectors.suppressed, true);
});

test("readingTiersWithHeritage returns null exactly when readingTiers itself would, without throwing", () => {
  assert.equal(readingTiersWithHeritage(null), null);
  assert.equal(readingTiersWithHeritage({}), null);
});

/* ── occurrence is the SHARED Reflection Engine rotation, never a second one ── */

test("tierTwoHeritageConnections reads occurrence from the reflection, and ignores any occurrence on compose", () => {
  const reflection = makeReflection({}, 5);
  const withoutOverride = tierTwoHeritageConnections(reflection, { ...PASSED });
  const withBogusOverride = tierTwoHeritageConnections(reflection, { ...PASSED, occurrence: 999 });
  assert.equal(withoutOverride.occurrence, 5);
  assert.equal(withBogusOverride.occurrence, 5, "compose.occurrence must never override reflection.occurrence");
});

test("different reflection.occurrence values genuinely propagate through, one lifecycle only", () => {
  const a = tierTwoHeritageConnections(makeReflection({}, 0), { ...PASSED });
  const b = tierTwoHeritageConnections(makeReflection({}, 5), { ...PASSED });
  assert.equal(a.occurrence, 0);
  assert.equal(b.occurrence, 5);
});

test("tierThreeHeritageConnections's occurrence also comes from the reflection, not from compose", () => {
  const reflection = makeReflection({}, 7);
  const result = tierThreeHeritageConnections(reflection, { ...PASSED, occurrence: 1 });
  assert.equal(result.occurrence, 7);
});

/* ── Tier 1 module isolation: a real import-graph check, not a text search ── */

test("reading-tiers.js's source contains no reference to the connector architecture at all", () => {
  const source = readSrc("qise/reading-tiers.js");
  assert.doesNotMatch(source, /composition\.js/);
  assert.doesNotMatch(source, /heritage-connections\.js/);
  assert.doesNotMatch(source, /composeHeritageForReading/);
  assert.doesNotMatch(source, /from ["']\.\.\/heritage\//);
});

test("reading-tiers.js is unchanged from the frozen Stage 2 baseline — Stage 3 lives in heritage-connections.js instead", () => {
  const source = readSrc("qise/reading-tiers.js");
  assert.match(source, /export function readingTiers\(reflection\)/);
  assert.equal(source.includes("tierTwoHeritageConnections"), false);
  assert.equal(source.includes("tierThreeHeritageConnections"), false);
});

/* ── Tier 2 never carries editorial content it cannot fully attribute ────── */

test("tierTwoHeritageConnections never returns an 'editorial' field at all", () => {
  const tier2 = tierTwoHeritageConnections(makeReflection(), { ...PASSED });
  assert.equal("editorial" in tier2, false);
  const suppressed = tierTwoHeritageConnections(makeReflection(), {});
  assert.equal("editorial" in suppressed, false);
});

/*
 * ── SOURCE_PANEL_CEILING material never reaches Tier 2 ─────────────────────
 *
 * Note: `reflection.state.sourceLineage` can only ever be "primary" or
 * "variant" (reading-state.js's `SOURCE_LINEAGES`) — the specific named
 * witness lineages that actually carry SOURCE_PANEL_CEILING content today
 * (e.g. fiveMountains' "taiqing-siku") are not reachable through a real
 * interpreted state at all. That end-to-end case is proven with a raw
 * `sourceLineage` string at the composition-boundary level instead — see
 * "SOURCE_PANEL_CEILING material surfaces only in sourcePanelOnly..." in
 * tests/heritage/composition.test.js. What belongs HERE is the tier layer's
 * own, corpus-independent guarantee: it structurally never reads from
 * `sourcePanelOnly` when picking a Tier 2 connector, even when that array is
 * non-empty and `active` is not.
 */
test("deriveTier2FromComposition never reads sourcePanelOnly when selecting a connector, even when active is empty", () => {
  const tier2 = deriveTier2FromComposition(fakeCompositionResult({
    active: [],
    sourcePanelOnly: [fakeActiveEntry("ceilinged-connector")],
    renderPlan: { ...fakeCompositionResult().renderPlan, relationshipOrder: [] },
  }));
  assert.equal(tier2.available, false);
  assert.equal(tier2.connector, null);
});

test("tierThreeHeritageConnections always requests SOURCE_DEEP — the only depth sourcePanelOnly is ever populated at", () => {
  const reflection = makeReflection({ heritageConstruct: "fiveMountains", sourceLineage: "primary" });
  const tier3 = tierThreeHeritageConnections(reflection, { ...PASSED, depthMode: "SUMMARY" });
  assert.equal(tier3.depthMode, "SOURCE_DEEP", "Tier 3 must not honour a caller-requested depthMode override");
});

/*
 * ── single connector-selection lifecycle: Tier 2 and Tier 3 share ONE
 *    composeHeritageForReading call, not two at different depthModes ────────
 * A fresh review found that Tier 2 (STANDARD) and Tier 3 (SOURCE_DEEP) used
 * to call composeHeritageForReading SEPARATELY. Stage 2's own rotation seed
 * includes depthMode, so two such calls could rotate `relationshipOrder`
 * differently whenever a construct has 2+ ACTIVE connectors and
 * occurrence > 0 — Tier 2's top pick could then genuinely differ from
 * Tier 3's presentation order for the SAME reading. Fixed by funnelling both
 * tiers, and `readingTiersWithHeritage`, through ONE shared helper,
 * `composeHeritageOnceForReading`, which is the only place `depthMode` is
 * chosen. For the behavioural proof that this actually prevents the
 * divergence (the real corpus has no multi-connector construct yet, so the
 * proof necessarily uses `composeHeritageConnectionsWithRegistries` with a
 * synthetic registry), see
 * "the ordering hazard is real, and the fixed architecture cannot exhibit
 * it" in tests/heritage/composition.test.js.
 */
test("composeHeritageOnceForReading hardcodes depthMode: SOURCE_DEEP after spreading compose, so a caller-supplied depthMode cannot win", () => {
  const source = readSrc("qise/heritage-connections.js");
  const fn = source.slice(
    source.indexOf("export function composeHeritageOnceForReading"),
    source.indexOf("export function tier2VisibleDisagreements"),
  );
  assert.match(fn, /\.\.\.compose,[\s\S]*depthMode:\s*"SOURCE_DEEP"/,
    "depthMode must be the literal SOURCE_DEEP, placed AFTER ...compose in object-literal order, so it always wins");
});

test("tierTwoHeritageConnections and tierThreeHeritageConnections both funnel through composeHeritageOnceForReading — neither calls composeHeritageForReading with its own depthMode", () => {
  const source = readSrc("qise/heritage-connections.js");
  const tierTwoBody = source.slice(
    source.indexOf("export function tierTwoHeritageConnections"),
    source.indexOf("/**\n * Tier 3 —"),
  );
  const tierThreeBody = source.slice(
    source.indexOf("export function tierThreeHeritageConnections"),
    source.indexOf("/**\n * THE Stage 3 integration point"),
  );
  for (const [name, body] of [["tierTwoHeritageConnections", tierTwoBody], ["tierThreeHeritageConnections", tierThreeBody]]) {
    assert.match(body, /composeHeritageOnceForReading\(reflection, compose\)/,
      `${name} must call the single shared composition helper`);
    // A direct composeHeritageForReading call is only permitted as the
    // no-reflection fallback (tierThreeHeritageConnections), and even then
    // it must request the same SOURCE_DEEP depth, never a different one.
    const directCalls = body.match(/composeHeritageForReading\(\{[^}]*\}\)/g) || [];
    for (const call of directCalls) {
      assert.match(call, /depthMode:\s*"SOURCE_DEEP"/,
        `${name}'s direct composeHeritageForReading fallback must still request SOURCE_DEEP: ${call}`);
    }
  }
});

test("readingTiersWithHeritage computes the composition exactly once and shares it between tier2 and tier3", () => {
  const source = readSrc("qise/heritage-connections.js");
  const fn = source.slice(
    source.indexOf("export function readingTiersWithHeritage"),
  );
  const calls = fn.match(/composeHeritageOnceForReading\(/g) || [];
  assert.equal(calls.length, 1,
    "readingTiersWithHeritage must call composeHeritageOnceForReading exactly once, sharing the result with both tiers");
  assert.doesNotMatch(fn, /tierTwoHeritageConnections\(|tierThreeHeritageConnections\(/,
    "readingTiersWithHeritage must derive both tiers from its own single composition, not call the two per-tier wrappers (which would recompute)");
});

test("composeHeritageOnceForReading: null with no reflection state, otherwise a real SOURCE_DEEP composition read from reflection", () => {
  assert.equal(composeHeritageOnceForReading(null, PASSED), null);
  assert.equal(composeHeritageOnceForReading({}, PASSED), null);

  const reflection = makeReflection({}, 3);
  const result = composeHeritageOnceForReading(reflection, PASSED);
  assert.equal(result.depthMode, "SOURCE_DEEP");
  assert.equal(result.occurrence, 3);
  assert.equal(result.primaryConstruct, reflection.state.heritageConstruct);
});

test("deriveTier2FromComposition picks exactly the resolver's own top pick, never a second selection mechanism", () => {
  const tier2 = deriveTier2FromComposition(fakeCompositionResult());
  assert.equal(tier2.available, true);
  assert.equal(tier2.connector.connectorId, "connector-b", "must match renderPlan.relationshipOrder[0]");
  assert.equal(typeof tier2.rotationDisclosure, "string");
  assert.ok(tier2.rotationDisclosure.length > 0);
});

test("deriveTier2FromComposition returns no connector and no disclosure when nothing is active", () => {
  const tier2 = deriveTier2FromComposition(fakeCompositionResult({
    active: [], renderPlan: { ...fakeCompositionResult().renderPlan, relationshipOrder: [] },
  }));
  assert.equal(tier2.available, false);
  assert.equal(tier2.connector, null);
  assert.equal(tier2.rotationDisclosure, null);
});

test("deriveTier2FromComposition surfaces a suppressed/abstained composition without ever inventing a connector", () => {
  const suppressed = deriveTier2FromComposition({
    suppressed: true, suppressionReason: "SAFETY_GATE_FAILED", abstained: false, abstentionReasonCode: null, occurrence: 0,
  });
  assert.equal(suppressed.available, false);
  assert.equal(suppressed.reason, "SAFETY_GATE_FAILED");
  assert.equal(suppressed.connector, null);

  const abstained = deriveTier2FromComposition({
    suppressed: false, suppressionReason: null, abstained: true, abstentionReasonCode: "UNKNOWN_HERITAGE_CONSTRUCT", occurrence: 0,
  });
  assert.equal(abstained.available, false);
  assert.equal(abstained.reason, "UNKNOWN_HERITAGE_CONSTRUCT");
});

/*
 * ── disagreements that only concern a SOURCE_DEEP-only connector must not
 *    reach Tier 2, even though Tier 2 now reuses a SOURCE_DEEP result ───────
 * Reusing one SOURCE_DEEP composition for both tiers (the ordering-lifecycle
 * fix above) means `result.disagreements` may include a CONNECTOR-targeted
 * disagreement about a connector that is only in `sourcePanelOnly` — Stage
 * 2's own `visibleConnectorIds` only includes `sourcePanelOnly` at
 * SOURCE_DEEP. `tier2VisibleDisagreements` must filter that back out.
 */
test("tier2VisibleDisagreements drops a CONNECTOR-targeted disagreement about a connector that is only in sourcePanelOnly", () => {
  const result = {
    active: [{ connectorId: "connector-a" }],
    abstentions: [{ connectorId: "connector-blocked" }],
    disagreements: [
      { disagreementId: "d-construct", target: { targetType: "CONSTRUCT", targetRef: "fourRivers" } },
      { disagreementId: "d-active-connector", target: { targetType: "CONNECTOR", targetRef: "connector-a" } },
      { disagreementId: "d-unavailable-connector", target: { targetType: "CONNECTOR", targetRef: "connector-blocked" } },
      { disagreementId: "d-source-panel-only-connector", target: { targetType: "CONNECTOR", targetRef: "connector-ceilinged" } },
    ],
  };
  const visible = tier2VisibleDisagreements(result).map((d) => d.disagreementId);
  assert.deepEqual(visible.sort(), ["d-active-connector", "d-construct", "d-unavailable-connector"]);
  assert.ok(!visible.includes("d-source-panel-only-connector"),
    "a disagreement naming a SOURCE_DEEP-only connector must not reach Tier 2");
});

test("deriveTier2FromComposition applies tier2VisibleDisagreements — an unfiltered pass-through would leak the connector's existence", () => {
  const result = {
    suppressed: false, abstained: false, occurrence: 0,
    active: [{ connectorId: "connector-a" }],
    abstentions: [],
    renderPlan: { relationshipOrder: ["connector-a"] },
    disagreements: [
      { disagreementId: "d-visible", target: { targetType: "CONNECTOR", targetRef: "connector-a" } },
      { disagreementId: "d-ceilinged", target: { targetType: "CONNECTOR", targetRef: "connector-only-in-source-panel" } },
    ],
  };
  const tier2 = deriveTier2FromComposition(result);
  assert.deepEqual(tier2.disagreements.map((d) => d.disagreementId), ["d-visible"]);
});

/* ── the actual production reading path calls the integrated function ────── */

test("src/ui/qise/app.js calls readingTiersWithHeritage, not bare readingTiers, at the reflection render site", () => {
  const source = readSrc("ui/qise/app.js");
  assert.match(source, /readingTiersWithHeritage\(/, "app.js must call the Stage 3-integrated function");
  assert.doesNotMatch(source, /\breadingTiers\(reflection\)/, "the bare, non-heritage-aware call must be gone from app.js");
  // Round 10 (Codex, PR #40 discussion r3856061462): this module is loaded
  // via a dynamic import(), deferred behind reflectionMode(), instead of a
  // static import — see tests/qise/heritage-lazy-load.test.js for the full
  // load-boundary proof.
  assert.match(source, /import\(\s*["']\.\.\/\.\.\/qise\/heritage-connections\.js["']\s*\)/,
    "app.js must dynamically import heritage-connections.js");
});

test("src/ui/qise/app.js derives captureQualityPassed from captureAuthorizationFromReading, not from Boolean(reading)", () => {
  const source = readSrc("ui/qise/app.js");
  assert.match(source, /captureAuthorizationFromReading\(reading\)/);
  assert.doesNotMatch(source, /captureQualityPassed:\s*Boolean\(reading\)/,
    "object existence must not stand in for proven capture-quality authorization");
});

/*
 * ── connector payload actually reaches the renderer (Codex P1) ──────────────
 * A fresh review found that app.js computed `tier2.connectors`/
 * `tier3.connectors` (via readingTiersWithHeritage) but the renderer below
 * that call never consumed either property — so even a fully-authorised
 * composition would never reach the reader. The render FUNCTIONS themselves
 * (`heritageConnectorTier2Markup`/`heritageConnectorTier3Markup`) now live in
 * src/ui/qise/heritage-view.js and are behaviourally tested there (this file
 * cannot import app.js at all — CLAUDE.md item 44) — what THIS test proves,
 * that the view-model tests cannot, is that app.js actually calls those
 * specific imported functions on the actual tier2/tier3 connector data and
 * assigns the result into the DOM nodes real users see, not into a variable
 * that is computed and discarded.
 */
test("src/ui/qise/app.js imports the heritage-view render functions and actually assigns their output into storyNode/whyNode", () => {
  const source = readSrc("ui/qise/app.js");
  // Round 10: heritage-view.js is loaded via the same dynamic-import() Stage-3
  // loader as heritage-connections.js (see tests/qise/heritage-lazy-load.test.js)
  // rather than a static import.
  assert.match(source, /import\(\s*["']\.\/heritage-view\.js["']\s*\)/,
    "app.js must dynamically import heritage-view.js");
  assert.match(source, /tier2ConnectorModel\(tier2\.connectors\)/,
    "app.js must build Tier 2's view model from the actual computed tier2.connectors");
  assert.match(source, /tier3ConnectorModel\(tier3\.connectors\)/,
    "app.js must build Tier 3's view model from the actual computed tier3.connectors");

  const storyAssignment = source.slice(
    source.indexOf("storyNode.innerHTML = `"),
    source.indexOf("`;", source.indexOf("storyNode.innerHTML = `")),
  );
  assert.match(storyAssignment, /\$\{heritageConnectorTier2Markup\(heritageTier2\)\}/,
    "storyNode's innerHTML template must interpolate heritageConnectorTier2Markup's actual return value, not merely reference it");

  const whyAssignment = source.slice(
    source.indexOf("whyNode.innerHTML = `"),
    source.lastIndexOf("`;"),
  );
  assert.match(whyAssignment, /\$\{heritageConnectorTier3Markup\(heritageTier3\)\}/,
    "whyNode's innerHTML template must interpolate heritageConnectorTier3Markup's actual return value, not merely reference it");
});

test("src/ui/qise/app.js no longer owns the connector markup-building logic itself — it is imported, not redeclared", () => {
  const source = readSrc("ui/qise/app.js");
  assert.doesNotMatch(source, /function heritageConnectorTier2Markup|function heritageConnectorTier3Markup|function heritageConnectorCardMarkup/,
    "the render functions must live in heritage-view.js (testable), not be redeclared in app.js (untestable)");
});

/*
 * ── PR #40 disclosure-ownership correction: ONE reading-level disclosure,
 *    TWO mutually exclusive surfaces, ZERO connector-markup emissions ──────
 * A fresh review found the Story surface duplicated the rotation disclosure:
 * app.js already rendered `tier2.rotationDisclosure` unconditionally, and
 * `heritageConnectorTier2Markup` ALSO rendered its own copy whenever a
 * connector was selected, so Story showed the sentence twice. A bounded
 * self-review of the same surface, before pushing that fix, found a second,
 * broader gap: the Why tab's `tier3.byLayer.heritage` trace is ITSELF
 * day-rotated heritage content — a projection of the exact same `composed`
 * reading Tier 2's passage is built from (see `reading-tiers.js`'s frozen
 * `tierThree()`/`tierTwo()`) — and had no disclosure anywhere, on any
 * authorized reading, independent of Stage-3 connector authorization.
 *
 * Both are fixed the same way: `renderReflection()` binds ONE
 * `rotationDisclosure` value from `tier2.rotationDisclosure` and renders it
 * exactly once per surface — Story where it already was, Why as the very
 * first thing in the tab, before the heritage trace and before the connector
 * block. Neither connector-markup function renders a disclosure of its own
 * (proven behaviourally in heritage-view.test.js's "13:" tests). This test
 * proves the SURFACE half of that invariant together, scoped to
 * `renderReflection()` specifically so an unrelated match elsewhere in
 * app.js cannot make it pass or fail for the wrong reason.
 */
test("surface owns disclosure exactly once; connector markup owns none", () => {
  const appSource = readSrc("ui/qise/app.js");
  const renderReflectionSrc = appSource.slice(
    appSource.indexOf("function renderReflection(reading, history) {"),
    appSource.indexOf("async function renderReading(reading) {"),
  );
  assert.ok(renderReflectionSrc.length > 0, "fixture assumption: renderReflection must be found in app.js");

  // 1. Exactly one binding of the reading-level disclosure.
  const bindings = renderReflectionSrc.match(/const rotationDisclosure = tier2\.rotationDisclosure;/g) || [];
  assert.equal(bindings.length, 1,
    "renderReflection must bind rotationDisclosure from tier2.rotationDisclosure exactly once");

  // 2. Story renders it exactly once.
  const storySlice = renderReflectionSrc.slice(
    renderReflectionSrc.indexOf("storyNode.innerHTML = `"),
    renderReflectionSrc.indexOf("`;", renderReflectionSrc.indexOf("storyNode.innerHTML = `")),
  );
  const storyRenders = storySlice.match(/\$\{esc\(rotationDisclosure\)\}/g) || [];
  assert.equal(storyRenders.length, 1, "Story must render the bound disclosure exactly once");

  // 3 & 6. Neither connector-markup function references rotationDisclosure
  // at all — sliced precisely so Tier 3's own JSDoc (which discusses the
  // metadata field by name) cannot be mistaken for Tier 2's function body.
  const viewSource = readSrc("ui/qise/heritage-view.js");
  const tier2Body = viewSource.slice(
    viewSource.indexOf("export function heritageConnectorTier2Markup(model) {"),
    viewSource.indexOf("/**\n * Tier 3's expanded contract:"),
  );
  assert.ok(tier2Body.length > 0, "fixture assumption: heritageConnectorTier2Markup must be found");
  assert.doesNotMatch(tier2Body, /rotationDisclosure/,
    "heritageConnectorTier2Markup must not reference rotationDisclosure at all");

  const tier3Body = viewSource.slice(
    viewSource.indexOf("export function heritageConnectorTier3Markup(model) {"),
  );
  assert.ok(tier3Body.length > 0, "fixture assumption: heritageConnectorTier3Markup must be found");
  assert.doesNotMatch(tier3Body, /rotationDisclosure/,
    "heritageConnectorTier3Markup must not reference rotationDisclosure at all");

  // 4 & 5. Why renders the SAME bound disclosure exactly once, before both
  // the heritage-layer trace and the connector block — and never renders
  // heritageTier3.rotationDisclosure (the second-source-of-truth defect the
  // ownership invariant forbids).
  const whySlice = renderReflectionSrc.slice(
    renderReflectionSrc.indexOf("whyNode.innerHTML = `"),
    renderReflectionSrc.lastIndexOf("`;"),
  );
  const whyRenders = whySlice.match(/\$\{esc\(rotationDisclosure\)\}/g) || [];
  assert.equal(whyRenders.length, 1, "Why must render the bound disclosure exactly once");
  assert.doesNotMatch(whySlice, /heritageTier3\.rotationDisclosure/,
    "Why must not render the connector-payload metadata field directly — that would be a second source of truth");

  const disclosureIndex = whySlice.indexOf("${esc(rotationDisclosure)}");
  const byLayerIndex = whySlice.indexOf("byLayer");
  const connectorMarkupIndex = whySlice.indexOf("heritageConnectorTier3Markup(heritageTier3)");
  assert.ok(disclosureIndex >= 0 && byLayerIndex > disclosureIndex && connectorMarkupIndex > disclosureIndex,
    "the disclosure must render before both the heritage-layer trace and the connector block");
});

test("src/ui/qise/app.js contains no hardcoded copy of the rotation-disclosure sentence — it always reads the bound field, never a second literal", () => {
  const source = readSrc("ui/qise/app.js");
  assert.doesNotMatch(source, /Today's passage comes from the rotation/,
    "app.js must never hardcode ROTATION_DISCLOSURE's wording; it must always read it from the tier data");
});

/*
 * ── falsification: omission at the finish() boundary cannot produce "clean" ──
 *
 * `captureTier` is the field `captureAuthorizationFromReading` trusts as
 * PROOF the capture-quality gates ran (see the tests above). That proof is
 * only as good as the writer: `src/ui/qise/app.js`'s `finish()` used to
 * default an omitted `captureTier` to `"clean"`, and the `lastCaptureTier`
 * variable it is normally fed from used to default the same way — either
 * one would manufacture an authorised-looking tier for a call site that
 * forgot to derive it from `gates.js`'s real gate evidence. `finish()` is
 * not importable under `node --test` (it lives in the file no test can
 * import — see CLAUDE.md item 44), so this is necessarily a static check on
 * its source, the same technique the two tests above already use.
 */
test("src/ui/qise/app.js's finish() declares no permissive default for captureTier", () => {
  const source = readSrc("ui/qise/app.js");
  const sig = source.slice(
    source.indexOf("async function finish("),
    source.indexOf("{", source.indexOf("async function finish(")),
  );
  assert.doesNotMatch(sig, /captureTier\s*=\s*["']/,
    "the captureTier parameter must have no default — omission must not manufacture a tier");
});

test("src/ui/qise/app.js no longer seeds lastCaptureTier with a permissive default", () => {
  const source = readSrc("ui/qise/app.js");
  assert.doesNotMatch(source, /lastCaptureTier\s*=\s*["']clean["']/,
    "lastCaptureTier must not default to an authorised-looking tier before any gate has run");
});

test("src/ui/qise/app.js's finish() fails closed on a captureTier that is not an explicit clean/assisted/waiting", () => {
  const source = readSrc("ui/qise/app.js");
  const fn = source.slice(
    source.indexOf("async function finish("),
    source.indexOf("\n}\n", source.indexOf("async function finish(")),
  );
  assert.match(fn, /VALID_CAPTURE_TIERS\.includes\(captureTier\)/,
    "finish() must validate captureTier against the explicit gate-derived set before proceeding");
  assert.match(fn, /throw new Error/,
    "an invalid/omitted captureTier must throw, not silently proceed as if gated");
});

/*
 * ── Blocker 1: capture-quality authorization, derived from captureTier ────
 *
 * `captureTier` is written ONLY by src/qise/gates.js's evaluateGates() and
 * persisted verbatim by src/qise/store.js's toRecord() — no new field is
 * added here; this proves the EXISTING field is a strict enough signal on
 * its own.
 */

test("captureAuthorizationFromReading: a 'clean' or 'assisted' captureTier is the only thing that authorizes", () => {
  assert.equal(captureAuthorizationFromReading({ captureTier: "clean" }), true);
  assert.equal(captureAuthorizationFromReading({ captureTier: "assisted" }), true);
});

test("captureAuthorizationFromReading: an explicit 'waiting' captureTier fails closed as a known negative", () => {
  assert.equal(captureAuthorizationFromReading({ captureTier: "waiting" }), false);
});

test("captureAuthorizationFromReading: object existence alone is NOT enough — a reading with no captureTier is unknown, not authorized", () => {
  assert.equal(captureAuthorizationFromReading({}), undefined);
  assert.equal(captureAuthorizationFromReading({ compass: { ascendant: "chi" }, confidence: 0.95 }), undefined,
    "rich measurement data on the object must not stand in for proof the capture-quality gates passed");
});

test("captureAuthorizationFromReading: missing/null reading, or a malformed captureTier value, is unknown", () => {
  assert.equal(captureAuthorizationFromReading(null), undefined);
  assert.equal(captureAuthorizationFromReading(undefined), undefined);
  assert.equal(captureAuthorizationFromReading({ captureTier: "not-a-real-tier" }), undefined);
  assert.equal(captureAuthorizationFromReading({ captureTier: true }), undefined);
});

test("captureAuthorizationFromReading: changing Qi Se measurement values cannot fabricate or change capture authorization", () => {
  const base = { captureTier: "clean", compass: { ascendant: "ping", magnitude: 0 } };
  const differentMeasurement = { captureTier: "clean", compass: { ascendant: "chi", magnitude: 3.4 }, confidence: 0.99 };
  assert.equal(captureAuthorizationFromReading(base), captureAuthorizationFromReading(differentMeasurement));

  const sameMeasurementDifferentTier = { captureTier: "waiting", compass: base.compass };
  assert.notEqual(captureAuthorizationFromReading(base), captureAuthorizationFromReading(sameMeasurementDifferentTier));
});

test("a missing/unknown capture authorization suppresses connector output end to end; an actually gate-approved one does not", () => {
  const reflection = makeReflection();
  const unauthorized = tierTwoHeritageConnections(reflection, {
    captureQualityPassed: captureAuthorizationFromReading({}), // no captureTier at all
    safetyPassed: true,
  });
  assert.equal(unauthorized.available, false);
  assert.equal(unauthorized.reason, "CAPTURE_QUALITY_GATE_UNKNOWN");

  const waiting = tierTwoHeritageConnections(reflection, {
    captureQualityPassed: captureAuthorizationFromReading({ captureTier: "waiting" }),
    safetyPassed: true,
  });
  assert.equal(waiting.available, false);
  assert.equal(waiting.reason, "CAPTURE_QUALITY_GATE_FAILED");

  const authorized = tierThreeHeritageConnections(reflection, {
    captureQualityPassed: captureAuthorizationFromReading({ captureTier: "clean" }),
    safetyPassed: true,
  });
  assert.equal(authorized.suppressed, false, "an actually gate-approved reading must not be suppressed");
});

test("no biometric or raw gate payload is required by captureAuthorizationFromReading — it reads exactly one scalar field", () => {
  const source = readSrc("qise/heritage-connections.js");
  const fn = source.slice(
    source.indexOf("export function captureAuthorizationFromReading"),
    source.indexOf("export function captureAuthorizationFromReading") + 400,
  );
  assert.match(fn, /reading\.captureTier/);
  assert.doesNotMatch(fn, /pixel|landmark|image|embedding|mesh/i);
});

/*
 * ── PR #40 technical closeout: same reading, same occurrence, one shared
 *    composition — and the canonical docs say so ────────────────────────────
 */

test("readingTiersWithHeritage: tier2 and tier3 report the SAME occurrence for the same reading, through the real production path", () => {
  const reflection = makeReflection({}, 3);
  const tiers = readingTiersWithHeritage(reflection, { captureQualityPassed: true, safetyPassed: true });
  assert.ok(tiers.tier2.connectors);
  assert.ok(tiers.tier3.connectors);
  assert.equal(tiers.tier2.connectors.occurrence, 3);
  assert.equal(tiers.tier3.connectors.occurrence, 3);
  assert.equal(tiers.tier2.connectors.occurrence, tiers.tier3.connectors.occurrence,
    "Tier 2 and Tier 3 must report the occurrence of the SAME shared composition, never two independently-driven ones");
});

test("current documentation: 'What was built (current state)' does not claim Tier 2/Tier 3 independently request separate STANDARD/SOURCE_DEEP compositions", () => {
  const docPath = fileURLToPath(new URL("../../docs/HERITAGE_CONNECTOR_STAGE_STATUS.md", import.meta.url));
  const doc = readFileSync(docPath, "utf8");
  const sectionStart = doc.indexOf("### What was built (current state)");
  assert.notEqual(sectionStart, -1, "the canonical current-state section must exist");
  const sectionEnd = doc.indexOf("\n### ", sectionStart + 1);
  const section = doc.slice(sectionStart, sectionEnd === -1 ? undefined : sectionEnd);

  assert.doesNotMatch(section, /hardcode their `depthMode` \(`STANDARD` \/ `SOURCE_DEEP`\)/,
    "the current-state summary must not describe Tier 2/Tier 3 as two separately-depthed compositions");
  // A mention of STANDARD/SOURCE_DEEP together is fine when explicitly framed
  // as the earlier, now-fixed shape (e.g. "An earlier revision had Tier 2
  // request..."/"used to call...SEPARATELY") -- only an UNQUALIFIED present-
  // tense claim that the two tiers currently request different depths is the
  // defect this test guards against, and that exact phrasing is covered by
  // the assertion above.
  assert.match(section, /composeHeritageOnceForReading/,
    "the current-state summary must name the single shared composition helper");
  assert.match(section, /exactly once/,
    "the current-state summary must state the composition happens exactly once per reading");
});
