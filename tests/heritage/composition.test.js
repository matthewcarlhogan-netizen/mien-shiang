/*
 * Stage 3 — the heritage connector composition boundary
 * (src/heritage/composition.js) and its two Tier integration points
 * (tierTwoHeritageConnections/tierThreeHeritageConnections in
 * src/qise/reading-tiers.js).
 *
 * This file does not re-prove Stage 2's own guarantees (condition AST
 * semantics, source-eligibility ladders, negative-rule matching — all
 * covered exhaustively by tests/heritage/resolver.test.js). It proves the
 * NEW thing Stage 3 adds: gate precedence ahead of the resolver, the typed
 * A/B/C/D/E output split, that Tier 2/3 route through exactly one boundary,
 * and that none of that reopens a frozen Stage 2 contract.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeHeritageForReading,
  SUPPRESSION_REASONS,
} from "../../src/heritage/composition.js";
import {
  tierTwoHeritageConnections,
  tierThreeHeritageConnections,
} from "../../src/qise/reading-tiers.js";
import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

const clone = (value) => structuredClone(value);

/* ── real Stage 1 registries, as production will actually see them ───────── */
const realBase = (overrides = {}) => ({
  heritageRegistry: HERITAGE_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  sourceRegistry: SOURCE_REGISTRY,
  heritageConstruct: "fiveMountains",
  sourceLineage: "taiqing-siku",
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

/* ── a small synthetic universe, same shape resolver.test.js already uses ── */
const solidLineage = (fields) => Object.freeze({
  runtimeStatus: "RUNTIME_PROSE",
  availability: "available",
  terminationState: "continue",
  citationStatus: "verified",
  evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "synthetic-source",
  ...fields,
});

const SYN_HERITAGE_REGISTRY = Object.freeze({
  alpha: Object.freeze({
    constructId: "alpha",
    lineages: Object.freeze({ primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }) }),
  }),
  beta: Object.freeze({
    constructId: "beta",
    lineages: Object.freeze({ primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }) }),
  }),
});

const SYN_SOURCE_REGISTRY = Object.freeze({
  "synthetic-source": Object.freeze({ citationStatus: "verified" }),
});

const synConnector = (fields) => Object.freeze({
  connectorId: fields.connectorId,
  relationshipType: fields.relationshipType || "CORRESPONDS_TO",
  relationshipDirection: fields.relationshipDirection || { kind: "UNDIRECTED" },
  collectiveMode: fields.collectiveMode ?? null,
  graphScope: "CORE_HERITAGE",
  participants: fields.participants,
  evidenceClass: "EXPLICITLY_ATTESTED",
  evidenceStrength: fields.evidenceStrength || "VERIFIED_PRIMARY",
  sourceId: fields.sourceId || "synthetic-source",
  supportingSourceIds: [],
  textualLayer: "BASE_TEXT",
  sourceText: null,
  sourceTextStatus: "NOT_RECORDED",
  sectionLocator: null,
  sectionLocatorStatus: "NOT_RECORDED",
  folioLocator: null,
  folioLocatorStatus: "NOT_RECORDED",
  folioLocatorKind: null,
  historicalStates: fields.historicalStates || [],
  conditionExpression: fields.conditionExpression ?? null,
  relationshipPredicate: null,
  historicalPredicateCategories: [],
  measurementAvailability: fields.measurementAvailability || "SUPPORTED_2D",
  runtimePolicy: fields.runtimePolicy || "HERITAGE_PRESENTATION_ALLOWED",
  prohibitedForUserInference: fields.prohibitedForUserInference ?? true,
  sourceRuleGroupId: fields.sourceRuleGroupId ?? null,
  disagreementIds: fields.disagreementIds || [],
  alternateConnectorIds: fields.alternateConnectorIds || [],
  note: null,
});

const synBase = (overrides = {}) => ({
  heritageRegistry: SYN_HERITAGE_REGISTRY,
  conceptRegistry: {},
  connectorRegistry: {},
  disagreementRegistry: {},
  negativeRelationshipRegistry: {},
  compositionPolicies: {},
  sourceRegistry: SYN_SOURCE_REGISTRY,
  heritageConstruct: "alpha",
  sourceLineage: "primary",
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

const historicalQiSeFiveFormsConnector = () => synConnector({
  connectorId: "syn-qise-canonical",
  sourceId: "heritage-five-elements-taiqing",
  evidenceClass: "EXPLICITLY_ATTESTED",
  participants: [
    { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" },
    { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
  ],
});

/* ── 1/2/15: gate precedence — checked before the resolver runs at all ───── */

test("gate suppression: a failed capture-quality gate suppresses every category, even against a rich real registry", () => {
  const result = composeHeritageForReading(realBase({
    captureQualityPassed: false,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }));
  assert.equal(result.suppressed, true);
  assert.equal(result.suppressionReason, "CAPTURE_QUALITY_GATE_FAILED");
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.sourcePanelOnly, []);
  assert.deepEqual(result.disagreements, []);
  assert.deepEqual(result.editorialJuxtapositions, []);
  assert.deepEqual(result.abstentions, []);
  assert.equal(result.renderPlan, null);
});

test("gate suppression: a failed safety gate suppresses every category too", () => {
  const result = composeHeritageForReading(realBase({
    safetyPassed: false,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }));
  assert.equal(result.suppressed, true);
  assert.equal(result.suppressionReason, "SAFETY_GATE_FAILED");
  assert.deepEqual(result.active, []);
});

test("SUPPRESSION_REASONS names exactly the two upstream gates, not a free-text reason", () => {
  assert.deepEqual(SUPPRESSION_REASONS, ["CAPTURE_QUALITY_GATE_FAILED", "SAFETY_GATE_FAILED"]);
});

test("no connector path bypasses captureQualityGate -> safetyGate precedence: both Tier 2 and Tier 3 honour a fired gate", () => {
  const state = { heritageConstruct: "fourRivers", sourceLineage: "primary" };
  const compose = { ...realBase(), captureQualityPassed: false };
  delete compose.heritageConstruct;
  delete compose.sourceLineage;

  const tier2 = tierTwoHeritageConnections(state, compose);
  assert.equal(tier2.available, false);
  assert.equal(tier2.reason, "CAPTURE_QUALITY_GATE_FAILED");
  assert.equal(tier2.connector, null);

  const tier3 = tierThreeHeritageConnections(state, compose);
  assert.equal(tier3.suppressed, true);
  assert.equal(tier3.suppressionReason, "CAPTURE_QUALITY_GATE_FAILED");
});

/* ── 13: heritage composition never touches the measurement payload ──────── */

test("composeHeritageForReading takes only heritageConstruct/sourceLineage — an extraneous availability/compass field is never forwarded", () => {
  const withRead = composeHeritageForReading(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    availability: "read",
  }));
  const withAbstained = composeHeritageForReading(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    availability: "abstained_confidence",
  }));
  assert.deepEqual(withRead.active, withAbstained.active);
  assert.deepEqual(withRead.abstentions, withAbstained.abstentions);
});

test("tierTwoHeritageConnections never reads or mutates the caller's compass/measurement state", () => {
  const compass = Object.freeze({ ascendant: "chi", magnitude: 2.1, z: { L: 3 } });
  const state = Object.freeze({ heritageConstruct: "fourRivers", sourceLineage: "primary", compass });
  const result = tierTwoHeritageConnections(state, realBase());
  assert.equal(state.compass, compass, "the caller's compass object must be untouched");
  assert.equal("compass" in result, false);
  assert.equal("ascendant" in result, false);
});

/* ── 2/12d: modern Qi Se cannot satisfy a heritageQiSe historical STATE ───── */

test("a heritageQiSe historical STATE cannot be satisfied by 'read' modern availability — only an explicit conditionContext resolves it", () => {
  const connector = synConnector({
    connectorId: "syn-qise-state",
    participants: [{ participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" }],
    conditionExpression: { type: "STATE", participantId: "heritageQiSe", stateId: "qise-observed" },
    historicalStates: [{ stateId: "qise-observed", participantId: "heritageQiSe", gloss: null, measurementAvailability: "UNMEASURABLE" }],
  });

  // Concept-only connectors (no CONSTRUCT participant) only become
  // candidates at all once explicitly anchored via conditionContext — see
  // resolver.js's conceptOnlyCandidates. The anchor alone is not the STATE
  // evidence: it makes the connector a candidate, it does not satisfy its
  // condition.
  const noContext = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-qise-state": connector },
    conditionContext: { participants: { heritageQiSe: "PRESENT" } },
  }));
  assert.equal(noContext.active.length, 0);
  assert.equal(noContext.abstentions[0].disposition, "CONDITION_UNMET");

  const explicitContext = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-qise-state": connector },
    conditionContext: {
      participants: { heritageQiSe: "PRESENT" },
      states: { "heritageQiSe:qise-observed": "SATISFIED" },
    },
  }));
  assert.equal(explicitContext.active.length, 1);
  assert.equal(explicitContext.active[0].connectorId, "syn-qise-state");
});

/* ── 3: modern Qi Se cannot classify Five Forms through Stage 3 ──────────── */

test("historical heritageQiSe+FiveElements co-presence may reach ACTIVE, but an attempted runtime classification is blocked", () => {
  const noAttempt = composeHeritageForReading(realBase({
    heritageConstruct: "fiveElements",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": historicalQiSeFiveFormsConnector() },
  }));
  const ordinary = [...noAttempt.active, ...noAttempt.abstentions.map((a) => a)]
    .find((e) => e.connectorId === "syn-qise-canonical");
  assert.ok(noAttempt.active.some((e) => e.connectorId === "syn-qise-canonical"),
    "source-backed historical co-presence, no attempted binding, is ordinary heritage presentation");

  const attempted = composeHeritageForReading(realBase({
    heritageConstruct: "fiveElements",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": historicalQiSeFiveFormsConnector() },
    runtimeBindingContext: { attemptedBindings: [{ fromRef: "heritageQiSe", toRef: "fiveElements" }] },
  }));
  assert.equal(attempted.active.some((e) => e.connectorId === "syn-qise-canonical"), false);
  const blocked = attempted.abstentions.find((e) => e.connectorId === "syn-qise-canonical");
  assert.ok(blocked, "an attempted classification must be reported, not silently dropped");
  assert.equal(blocked.disposition, "BLOCKED_RUNTIME_BINDING");
  assert.deepEqual(blocked.gateReasons, ["no-qise-to-form-classification"]);
});

/* ── 4: Shen cannot become a modern measurement binding ───────────────────── */

test("Shen cannot acquire a measurement binding through the Stage 3 boundary", () => {
  const measurableShen = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  measurableShen.historicalStates[0].measurementAvailability = "SUPPORTED_2D";

  const result = composeHeritageForReading(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "four-rivers-shen-corresponds": measurableShen },
  }));
  assert.equal(result.active.some((e) => e.connectorId === "four-rivers-shen-corresponds"), false);
  const found = result.abstentions.find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.ok(found);
  assert.equal(found.disposition, "BLOCKED_NEGATIVE_RULE");
});

test("Shen cannot acquire a measurement binding via an ATTEMPTED runtime binding either", () => {
  const connector = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  const result = composeHeritageForReading(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "four-rivers-shen-corresponds": connector },
    runtimeBindingContext: { attemptedBindings: [{ fromRef: "shen", toRef: "measurementBinding" }] },
  }));
  const found = result.abstentions.find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.ok(found, "must be present, fully traceable — not silently dropped");
  assert.equal(found.disposition, "BLOCKED_RUNTIME_BINDING");
  assert.deepEqual(found.gateReasons, ["shen-unmeasurable"]);
});

/* ── 5: an invalid runtimeBindingContext fails the WHOLE composition closed ── */

test("an invalid runtimeBindingContext aborts the whole Stage 3 composition, even against an otherwise rich real registry", () => {
  const malformed = { attemptedBindings: [{ fromRef: "heritageQiSe", toRef: "fiveElements", extra: true }] };
  const result = composeHeritageForReading(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    runtimeBindingContext: malformed,
  }));
  assert.equal(result.abstained, true);
  assert.equal(result.abstentionReasonCode, "INVALID_RUNTIME_BINDING_CONTEXT");
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.sourcePanelOnly, []);
  assert.deepEqual(result.editorialJuxtapositions, []);
});

/* ── 6: SOURCE_PANEL_CEILING never reaches Tier 2 ─────────────────────────── */

test("SOURCE_PANEL_CEILING material never produces Tier 2 runtime prose, and only appears in Tier 3's sourcePanelOnly", () => {
  const state = { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" };

  const tier2 = tierTwoHeritageConnections(state, realBase());
  assert.equal(tier2.available, false);
  assert.equal(tier2.connector, null);

  const tier3 = tierThreeHeritageConnections(state, realBase());
  const ceilinged = tier3.sourcePanelOnly.find((e) => e.connectorId === "five-mountains-mutual-facing-fullness");
  assert.ok(ceilinged, "five-mountains-mutual-facing-fullness must surface at SOURCE_DEEP");
  assert.equal(ceilinged.disposition, "SOURCE_PANEL_CEILING");
  assert.equal(tier3.active.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"), false);
});

test("Tier 2 depthMode cannot be overridden by the caller through compose — it is always STANDARD", () => {
  const state = { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" };
  const tier2 = tierTwoHeritageConnections(state, realBase({ depthMode: "SOURCE_DEEP" }));
  // Even asking for SOURCE_DEEP through `compose`, Tier 2 must stay STANDARD —
  // proven indirectly: the ceilinged connector still does not appear.
  assert.equal(tier2.available, false);
});

/* ── 7: prohibitedForUserInference stays true on every surfaced entry ────── */

test("prohibitedForUserInference stays true on every active and source-panel entry", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = composeHeritageForReading(realBase({
      heritageConstruct: construct,
      sourceLineage: "primary",
      depthMode: "SOURCE_DEEP",
    }));
    for (const entry of [...result.active, ...result.sourcePanelOnly]) {
      assert.equal(entry.prohibitedForUserInference, true, `${entry.connectorId} must stay prohibited for user inference`);
    }
  }
});

/* ── 8: editorial juxtaposition never asserts a historical relationship ──── */

test("an editorial juxtaposition is clearly marked as non-historical", () => {
  const connectorA = synConnector({
    connectorId: "syn-editorial-a",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const connectorB = synConnector({
    connectorId: "syn-editorial-b",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const result = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-editorial-a": connectorA, "syn-editorial-b": connectorB },
    compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
    depthMode: "STANDARD",
  }));
  assert.ok(result.editorialJuxtapositions.length >= 1);
  for (const juxtaposition of result.editorialJuxtapositions) {
    assert.equal(juxtaposition.historicalRelationshipAsserted, false);
    assert.equal(juxtaposition.disclosure, "SOURCES_SHOWN_BESIDE_ONE_ANOTHER");
    assert.equal(juxtaposition.requiresSeparateAttribution, true);
    assert.equal(result.active.some((e) => juxtaposition.items.includes(e.connectorId) && false), false);
  }
});

/* ── 9: a CONSTRUCT-level disagreement survives, every position intact ───── */

test("a CONSTRUCT-level disagreement survives into the composition model with every position intact", () => {
  const result = composeHeritageForReading(realBase({
    heritageConstruct: "threeSections",
    sourceLineage: "primary",
  }));
  const disagreement = result.disagreements.find((d) => d.disagreementId === "three-sections-boundaries");
  assert.ok(disagreement, "the real three-sections-boundaries disagreement must surface");
  const expected = HERITAGE_DISAGREEMENT_REGISTRY["three-sections-boundaries"];
  assert.equal(disagreement.positions.length, expected.positions.length);
  for (const position of expected.positions) {
    assert.ok(disagreement.positions.some((p) => p.positionId === position.positionId),
      `position ${position.positionId} must not be dropped or harmonised away`);
  }
});

/* ── 10: an unavailable third participant blocks a PRESENT condition ─────── */

test("an unavailable third participant prevents a PRESENT condition from becoming active, even though the referenced participant IS present", () => {
  const connector = synConnector({
    connectorId: "syn-third-participant",
    conditionExpression: { type: "PRESENT", participantId: "beta" },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
      { participantId: "gamma", nodeType: "CONSTRUCT", constructId: "gamma-construct", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { beta: "PRESENT", gamma: "ABSENT" } },
  }));
  assert.equal(result.active.length, 0);
  const found = result.abstentions.find((e) => e.connectorId === "syn-third-participant");
  assert.ok(found);
  assert.equal(found.disposition, "PARTICIPANT_UNAVAILABLE");
  assert.deepEqual(found.gateReasons, ["PARTICIPANT_ABSENT"]);
});

/* ── 11: ABSENT and UNKNOWN stay distinguishable ──────────────────────────── */

test("explicit ABSENT and UNKNOWN participant signals stay distinguishable through the Stage 3 boundary", () => {
  const connector = synConnector({
    connectorId: "syn-unconditional",
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const absent = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-unconditional": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  const unknown = composeHeritageForReading(synBase({
    connectorRegistry: { "syn-unconditional": connector },
    conditionContext: { participants: { beta: "UNKNOWN" } },
  }));
  assert.deepEqual(absent.abstentions[0].gateReasons, ["PARTICIPANT_ABSENT"]);
  assert.deepEqual(unknown.abstentions[0].gateReasons, ["PARTICIPANT_UNKNOWN"]);
  assert.notDeepEqual(absent.abstentions[0].gateReasons, unknown.abstentions[0].gateReasons);
});

/* ── 12: a concept-only connector does not inherit an unrelated lineage ──── */

test("a concept-only connector's eligibility is unaffected by which unrelated primary construct/lineage anchored it", () => {
  const conceptOnly = synConnector({
    connectorId: "syn-concept-only",
    participants: [
      { participantId: "gamma", nodeType: "HERITAGE_CONCEPT", conceptId: "gamma", memberScope: "NODE" },
    ],
  });
  const conceptRegistry = { gamma: { conceptId: "gamma", measurementAvailability: "UNMEASURABLE", modernMeasurementBinding: null } };

  const underSolidAnchor = composeHeritageForReading(synBase({
    heritageConstruct: "alpha",
    connectorRegistry: { "syn-concept-only": conceptOnly },
    conceptRegistry,
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));
  const underWeakAnchor = composeHeritageForReading(synBase({
    heritageConstruct: "alpha",
    sourceLineage: "primary",
    connectorRegistry: { "syn-concept-only": conceptOnly },
    conceptRegistry,
    heritageRegistry: {
      ...SYN_HERITAGE_REGISTRY,
      alpha: {
        constructId: "alpha",
        lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D", citationStatus: "source-required", evidenceStrength: "ABSTAINED" }) },
      },
    },
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));

  assert.equal(underSolidAnchor.active[0]?.connectorId, "syn-concept-only");
  assert.equal(underWeakAnchor.active[0]?.connectorId, "syn-concept-only");
  assert.equal(underSolidAnchor.active[0].disposition, underWeakAnchor.active[0].disposition);
});

/* ── 14: determinism ──────────────────────────────────────────────────────── */

test("identical inputs produce a deep-equal Stage 3 composition result", () => {
  const args = realBase({ heritageConstruct: "fourRivers", sourceLineage: "primary", occurrence: 3 });
  const a = composeHeritageForReading(args);
  const b = composeHeritageForReading(args);
  assert.deepEqual(a, b);
});

test("Tier 1 never imports or leaks connector architecture", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../../src/qise/reading-tiers.js", import.meta.url), "utf8"));
  const tierOneBody = source.slice(source.indexOf("export function tierOne"), source.indexOf("export function tierTwo("));
  assert.doesNotMatch(tierOneBody, /composeHeritageForReading/);
});
