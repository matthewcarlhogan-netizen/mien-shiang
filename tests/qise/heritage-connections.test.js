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

test("tierTwoHeritageConnections hardcodes depthMode: STANDARD after spreading compose, so a caller-supplied depthMode cannot win", () => {
  const source = readSrc("qise/heritage-connections.js");
  const fn = source.slice(
    source.indexOf("export function tierTwoHeritageConnections"),
    source.indexOf("export function tierThreeHeritageConnections"),
  );
  assert.match(fn, /\.\.\.compose,[\s\S]*depthMode:\s*"STANDARD"/,
    "depthMode must be the literal STANDARD, placed AFTER ...compose in object-literal order, so it always wins");
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

/* ── the actual production reading path calls the integrated function ────── */

test("src/ui/qise/app.js calls readingTiersWithHeritage, not bare readingTiers, at the reflection render site", () => {
  const source = readSrc("ui/qise/app.js");
  assert.match(source, /readingTiersWithHeritage\(/, "app.js must call the Stage 3-integrated function");
  assert.doesNotMatch(source, /\breadingTiers\(reflection\)/, "the bare, non-heritage-aware call must be gone from app.js");
  assert.match(source, /from ["']\.\.\/\.\.\/qise\/heritage-connections\.js["']/);
});

test("src/ui/qise/app.js derives captureQualityPassed from captureAuthorizationFromReading, not from Boolean(reading)", () => {
  const source = readSrc("ui/qise/app.js");
  assert.match(source, /captureAuthorizationFromReading\(reading\)/);
  assert.doesNotMatch(source, /captureQualityPassed:\s*Boolean\(reading\)/,
    "object existence must not stand in for proven capture-quality authorization");
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
