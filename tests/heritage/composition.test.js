/*
 * Stage 3 — the heritage connector composition boundary
 * (src/heritage/composition.js).
 *
 * This file does not re-prove Stage 2's own guarantees (condition AST
 * semantics, source-eligibility ladders, negative-rule matching — all
 * covered exhaustively by tests/heritage/resolver.test.js). It proves the
 * NEW thing Stage 3 adds at this boundary: gate precedence FAILS CLOSED on
 * missing/unknown evidence (not just on an explicit failure), gate
 * suppression is never reported as a Stage 2 resolver abstention, canonical
 * registries are bound internally and cannot be substituted by a caller, and
 * the typed A/B/C/D/E output split survives that rework unchanged.
 *
 * Tier 2/Tier 3 integration (src/qise/heritage-connections.js) has its own
 * suite: tests/qise/heritage-connections.test.js.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  composeHeritageForReading,
  composeHeritageConnectionsWithRegistries,
  resolveHeritageLineage,
  SUPPRESSION_REASONS,
} from "../../src/heritage/composition.js";
import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";
import { deriveTier2FromComposition } from "../../src/qise/heritage-connections.js";

const clone = (value) => structuredClone(value);

/* ── the injectable seam: real Stage 1 registries, explicit gates ────────── */
const realBase = (overrides = {}) => ({
  captureQualityPassed: true,
  safetyPassed: true,
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
  captureQualityPassed: true,
  safetyPassed: true,
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

/* ── 1: gate precedence fails closed on FAILED — checked before the resolver runs ── */

test("gate suppression: a failed capture-quality gate suppresses every category", () => {
  const result = composeHeritageConnectionsWithRegistries(realBase({
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
  const result = composeHeritageConnectionsWithRegistries(realBase({
    safetyPassed: false,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }));
  assert.equal(result.suppressed, true);
  assert.equal(result.suppressionReason, "SAFETY_GATE_FAILED");
  assert.deepEqual(result.active, []);
});

/* ── 2: gate precedence fails closed on MISSING/UNKNOWN, not just FAILED ──── */

test("a fully omitted gate flag suppresses — missing evidence is not a pass", () => {
  const noCapture = composeHeritageConnectionsWithRegistries(realBase({
    captureQualityPassed: undefined,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }));
  assert.equal(noCapture.suppressed, true);
  assert.equal(noCapture.suppressionReason, "CAPTURE_QUALITY_GATE_UNKNOWN");

  const noSafety = composeHeritageConnectionsWithRegistries(realBase({
    safetyPassed: undefined,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
  }));
  assert.equal(noSafety.suppressed, true);
  assert.equal(noSafety.suppressionReason, "SAFETY_GATE_UNKNOWN");
});

test("a non-boolean gate value (truthy or falsy) is UNKNOWN, never coerced to a pass", () => {
  for (const value of ["true", 1, "false", 0, null, "yes", {}, []]) {
    const result = composeHeritageConnectionsWithRegistries(realBase({
      captureQualityPassed: value,
      heritageConstruct: "fourRivers",
      sourceLineage: "primary",
    }));
    assert.equal(result.suppressed, true, `gate value ${JSON.stringify(value)} must not pass`);
    assert.equal(result.suppressionReason, "CAPTURE_QUALITY_GATE_UNKNOWN");
  }
});

test("SUPPRESSION_REASONS names exactly the four gate outcomes that suppress", () => {
  assert.deepEqual(SUPPRESSION_REASONS, [
    "CAPTURE_QUALITY_GATE_FAILED",
    "CAPTURE_QUALITY_GATE_UNKNOWN",
    "SAFETY_GATE_FAILED",
    "SAFETY_GATE_UNKNOWN",
  ]);
});

/* ── 3: gate suppression is never reported as a Stage 2 abstention ───────── */

test("gate suppression carries abstained:false — it is not a Stage 2 resolver verdict", () => {
  for (const overrides of [
    { captureQualityPassed: false },
    { captureQualityPassed: undefined },
    { safetyPassed: false },
    { safetyPassed: undefined },
  ]) {
    const result = composeHeritageConnectionsWithRegistries(realBase({
      heritageConstruct: "fourRivers", sourceLineage: "primary", ...overrides,
    }));
    assert.equal(result.suppressed, true);
    assert.equal(result.abstained, false, "a suppressed result must not also claim a Stage 2 abstention");
    assert.equal(result.abstentionReasonCode, null);
  }
});

test("a genuine Stage 2 abstention is NOT suppressed, and the two axes stay independent", () => {
  const malformed = { attemptedBindings: [{ fromRef: "heritageQiSe", toRef: "fiveElements", extra: true }] };
  const result = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    runtimeBindingContext: malformed,
  }));
  assert.equal(result.suppressed, false);
  assert.equal(result.suppressionReason, null);
  assert.equal(result.abstained, true);
  assert.equal(result.abstentionReasonCode, "INVALID_RUNTIME_BINDING_CONTEXT");
});

/* ── 4/9: canonical registries are bound internally and cannot be injected ── */

test("composeHeritageForReading throws if a caller tries to inject any registry", () => {
  const registryKeys = [
    "heritageRegistry", "conceptRegistry", "connectorRegistry",
    "disagreementRegistry", "negativeRelationshipRegistry",
    "compositionPolicies", "sourceRegistry",
  ];
  for (const key of registryKeys) {
    assert.throws(() => composeHeritageForReading({
      captureQualityPassed: true,
      safetyPassed: true,
      heritageConstruct: "fourRivers",
      sourceLineage: "primary",
      [key]: {},
    }), TypeError, `${key} must be rejected, not silently accepted`);
  }
});

test("composeHeritageForReading throws on any field outside the finite runtime contract", () => {
  assert.throws(() => composeHeritageForReading({
    captureQualityPassed: true,
    safetyPassed: true,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    availability: "read", // not part of the contract — see resolver.js RESOLVER_DEPENDS_ON
  }), TypeError);
});

test("composeHeritageForReading resolves against the REAL canonical registries with zero registries supplied", () => {
  const result = composeHeritageForReading({
    captureQualityPassed: true,
    safetyPassed: true,
    heritageConstruct: "fiveMountains",
    sourceLineage: "taiqing-siku",
    depthMode: "SOURCE_DEEP",
  });
  assert.equal(result.suppressed, false);
  // The real corpus's flagship SOURCE_PANEL_CEILING record (see
  // docs/HERITAGE_CONNECTOR_STAGE_STATUS.md) — present here with zero
  // registries injected proves canonical binding actually happened, not
  // just that the call didn't throw.
  assert.ok(result.sourcePanelOnly.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"),
    "the real five-mountains-mutual-facing-fullness connector must resolve with no registries injected");
});

test("composeHeritageForReading also fails closed exactly like the injectable seam", () => {
  const result = composeHeritageForReading({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    // both gate flags omitted entirely
  });
  assert.equal(result.suppressed, true);
  assert.equal(result.suppressionReason, "CAPTURE_QUALITY_GATE_UNKNOWN");
});

/* ── 13/1: heritage composition never touches the measurement payload ────── */

test("composeHeritageConnectionsWithRegistries takes only heritageConstruct/sourceLineage — an extraneous availability field is never forwarded", () => {
  const withRead = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "read",
  }));
  const withAbstained = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "abstained_confidence",
  }));
  assert.deepEqual(withRead.active, withAbstained.active);
  assert.deepEqual(withRead.abstentions, withAbstained.abstentions);
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
  const noContext = composeHeritageConnectionsWithRegistries(synBase({
    connectorRegistry: { "syn-qise-state": connector },
    conditionContext: { participants: { heritageQiSe: "PRESENT" } },
  }));
  assert.equal(noContext.active.length, 0);
  assert.equal(noContext.abstentions[0].disposition, "CONDITION_UNMET");

  const explicitContext = composeHeritageConnectionsWithRegistries(synBase({
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
  const noAttempt = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fiveElements",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": historicalQiSeFiveFormsConnector() },
  }));
  assert.ok(noAttempt.active.some((e) => e.connectorId === "syn-qise-canonical"),
    "source-backed historical co-presence, no attempted binding, is ordinary heritage presentation");

  const attempted = composeHeritageConnectionsWithRegistries(realBase({
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

  const result = composeHeritageConnectionsWithRegistries(realBase({
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
  const result = composeHeritageConnectionsWithRegistries(realBase({
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
  const result = composeHeritageConnectionsWithRegistries(realBase({
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

/* ── 6: SOURCE_PANEL_CEILING material is correctly categorised ───────────── */

test("SOURCE_PANEL_CEILING material surfaces only in sourcePanelOnly, at SOURCE_DEEP, never in active", () => {
  const standard = composeHeritageConnectionsWithRegistries(realBase({ depthMode: "STANDARD" }));
  assert.equal(standard.sourcePanelOnly.length, 0);

  const deep = composeHeritageConnectionsWithRegistries(realBase({ depthMode: "SOURCE_DEEP" }));
  const ceilinged = deep.sourcePanelOnly.find((e) => e.connectorId === "five-mountains-mutual-facing-fullness");
  assert.ok(ceilinged, "five-mountains-mutual-facing-fullness must surface at SOURCE_DEEP");
  assert.equal(ceilinged.disposition, "SOURCE_PANEL_CEILING");
  assert.equal(deep.active.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"), false);
});

/* ── 7: prohibitedForUserInference stays true on every surfaced entry ────── */

test("prohibitedForUserInference stays true on every active and source-panel entry", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = composeHeritageConnectionsWithRegistries(realBase({
      heritageConstruct: construct,
      sourceLineage: "primary",
      depthMode: "SOURCE_DEEP",
    }));
    for (const entry of [...result.active, ...result.sourcePanelOnly]) {
      assert.equal(entry.prohibitedForUserInference, true, `${entry.connectorId} must stay prohibited for user inference`);
    }
  }
});

test("prohibitedForUserInference also survives onto Category E (abstentions), not only active/source-panel entries", () => {
  const measurableShen = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  measurableShen.historicalStates[0].measurementAvailability = "SUPPORTED_2D";
  const result = composeHeritageConnectionsWithRegistries(realBase({
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "four-rivers-shen-corresponds": measurableShen },
  }));
  const found = result.abstentions.find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.equal(found.prohibitedForUserInference, true);
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
  const result = composeHeritageConnectionsWithRegistries(synBase({
    connectorRegistry: { "syn-editorial-a": connectorA, "syn-editorial-b": connectorB },
    compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
    depthMode: "STANDARD",
  }));
  assert.ok(result.editorialJuxtapositions.length >= 1);
  const detailedIds = new Set([...result.active, ...result.sourcePanelOnly].map((e) => e.connectorId));
  for (const juxtaposition of result.editorialJuxtapositions) {
    assert.equal(juxtaposition.historicalRelationshipAsserted, false);
    assert.equal(juxtaposition.disclosure, "SOURCES_SHOWN_BESIDE_ONE_ANOTHER");
    assert.equal(juxtaposition.requiresSeparateAttribution, true);
    // The P1 finding on the earlier draft: an editorial juxtaposition must
    // never name a connector the SAME result has no full detail for — that
    // makes `requiresSeparateAttribution` unmeetable. Every item here must
    // be resolvable against active/sourcePanelOnly at this same depth.
    for (const id of juxtaposition.items) {
      assert.ok(detailedIds.has(id), `editorial item ${id} must have full detail in this same result`);
    }
  }
});

/* ── 9: a CONSTRUCT-level disagreement survives, every position intact ───── */

test("a CONSTRUCT-level disagreement survives into the composition model with every position intact", () => {
  const result = composeHeritageConnectionsWithRegistries(realBase({
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
  const result = composeHeritageConnectionsWithRegistries(synBase({
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
  const absent = composeHeritageConnectionsWithRegistries(synBase({
    connectorRegistry: { "syn-unconditional": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  const unknown = composeHeritageConnectionsWithRegistries(synBase({
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

  const underSolidAnchor = composeHeritageConnectionsWithRegistries(synBase({
    heritageConstruct: "alpha",
    connectorRegistry: { "syn-concept-only": conceptOnly },
    conceptRegistry,
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));
  const underWeakAnchor = composeHeritageConnectionsWithRegistries(synBase({
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
  const a = composeHeritageConnectionsWithRegistries(args);
  const b = composeHeritageConnectionsWithRegistries(args);
  assert.deepEqual(a, b);

  const productArgs = { captureQualityPassed: true, safetyPassed: true, heritageConstruct: "fourRivers", sourceLineage: "primary", occurrence: 3 };
  const c = composeHeritageForReading(productArgs);
  const d = composeHeritageForReading(productArgs);
  assert.deepEqual(c, d);
});

/* ── Blocker 2: rotationState cannot be a second selection lifecycle ─────── */

test("composeHeritageForReading throws if a caller tries to inject rotationState", () => {
  assert.throws(() => composeHeritageForReading({
    captureQualityPassed: true,
    safetyPassed: true,
    heritageConstruct: "fourRivers",
    sourceLineage: "primary",
    rotationState: { recentConnectorIds: ["anything"] },
  }), TypeError);
});

test("arbitrary rotationState has no effect on the product-facing entry point at all — it is rejected, not silently accepted", () => {
  // Confirm the field genuinely isn't in the accepted contract, rather than
  // merely being ignored: the throw IS the proof it cannot influence
  // anything, since the call never completes.
  let threw = false;
  try {
    composeHeritageForReading({
      captureQualityPassed: true, safetyPassed: true,
      heritageConstruct: "fourRivers", sourceLineage: "primary",
      rotationState: { recentConnectorIds: ["four-rivers-flow-and-banks"] },
    });
  } catch {
    threw = true;
  }
  assert.equal(threw, true);
});

test("the same reflection-equivalent inputs (construct/lineage/occurrence) give identical ordering regardless of the (rejected) rotationState concept", () => {
  const args = { captureQualityPassed: true, safetyPassed: true, heritageConstruct: "fourRivers", sourceLineage: "primary", occurrence: 2 };
  const a = composeHeritageForReading(args);
  const b = composeHeritageForReading(args);
  assert.deepEqual(a.renderPlan, b.renderPlan);
});

test("no Math.random / Date.now / unstable ordering was introduced by the lineage adapter or gate changes", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../../src/heritage/composition.js", import.meta.url)), "utf8");
  assert.doesNotMatch(source, /Math\.random/);
  assert.doesNotMatch(source, /Date\.now/);
});

/* ── Blocker 3: the lineage adapter ───────────────────────────────────────── */

test("resolveHeritageLineage: the abstract 'primary' label resolves for every construct that declares one (all six today)", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const resolved = resolveHeritageLineage({ heritageConstruct: construct, sourceLineage: "primary" }, HERITAGE_REGISTRY);
    assert.equal(resolved, "primary", `${construct} must resolve its own "primary" lineage`);
  }
});

test("resolveHeritageLineage: 'variant' resolves only for fourRivers, the one construct that actually declares it", () => {
  assert.equal(
    resolveHeritageLineage({ heritageConstruct: "fourRivers", sourceLineage: "variant" }, HERITAGE_REGISTRY),
    "variant",
  );
  assert.equal(
    resolveHeritageLineage({ heritageConstruct: "fiveMountains", sourceLineage: "variant" }, HERITAGE_REGISTRY),
    null,
    "fiveMountains declares no 'variant' lineage — must abstain, never fall back to 'primary' or invent one",
  );
});

test("resolveHeritageLineage: an explicit canonical lineage id is reachable when it genuinely exists on that construct", () => {
  assert.equal(
    resolveHeritageLineage({ heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" }, HERITAGE_REGISTRY),
    "taiqing-siku",
  );
});

test("resolveHeritageLineage: no cross-construct inheritance — a lineage id real on one construct is not borrowed by another", () => {
  // "taiqing-siku" is a genuine fiveMountains lineage; fourRivers has no
  // lineage of that name at all.
  assert.equal(
    resolveHeritageLineage({ heritageConstruct: "fourRivers", sourceLineage: "taiqing-siku" }, HERITAGE_REGISTRY),
    null,
  );
});

test("resolveHeritageLineage: an unknown construct abstains rather than guessing", () => {
  assert.equal(
    resolveHeritageLineage({ heritageConstruct: "notARealConstruct", sourceLineage: "primary" }, HERITAGE_REGISTRY),
    null,
  );
});

test("resolveHeritageLineage: fourRivers primary vs variant are genuinely different, deliberate resolutions", () => {
  const primary = resolveHeritageLineage({ heritageConstruct: "fourRivers", sourceLineage: "primary" }, HERITAGE_REGISTRY);
  const variant = resolveHeritageLineage({ heritageConstruct: "fourRivers", sourceLineage: "variant" }, HERITAGE_REGISTRY);
  assert.equal(primary, "primary");
  assert.equal(variant, "variant");
  assert.notEqual(primary, variant);
});

test("an unsupported construct/lineage pairing fails closed as an abstention, before the resolver ever runs — never suppressed, never silently substituted", () => {
  const result = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fiveMountains", sourceLineage: "variant",
  });
  assert.equal(result.suppressed, false, "this is not a gate concern");
  assert.equal(result.abstained, true);
  assert.equal(result.abstentionReasonCode, "UNSUPPORTED_LINEAGE");
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.sourcePanelOnly, []);
});

test("an unresolvable lineage on a real construct never falls back to that construct's own 'primary' data — no silent substitution", () => {
  const explicit = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku", depthMode: "SOURCE_DEEP",
  });
  const unsupported = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fiveMountains", sourceLineage: "variant", depthMode: "SOURCE_DEEP",
  });
  // If "variant" had silently fallen back to "primary" (RESEARCH_ONLY) or to
  // "taiqing-siku" (SOURCE_PANEL_CEILING), this would show SOME content.
  // Failing closed means it shows none at all, and says so.
  assert.notDeepEqual(explicit.primaryLineage, unsupported.primaryLineage);
  assert.equal(unsupported.primaryLineage, null);
});

/*
 * ── NOT a production-path test ───────────────────────────────────────────
 * This drives `composeHeritageForReading` with the EXPLICIT canonical
 * lineage id "taiqing-siku" supplied directly by the caller. That is a
 * legitimate direct use of the product-facing entry point (the adapter
 * accepts an explicit canonical id as well as an abstract label — see
 * `resolveHeritageLineage`'s doc comment), but it is not what the real
 * Reflection Engine reading pipeline ever supplies: `heritageRotation()`
 * (reading-pipeline.js) and `reading-state.js`'s `SOURCE_LINEAGES` only ever
 * emit the ABSTRACT labels "primary"/"variant", never a construct-specific
 * canonical id. `ABSTRACT_LINEAGE_OVERRIDES` is deliberately empty (no
 * product-owner content decision has routed fiveMountains' abstract
 * "primary" to "taiqing-siku" — see composition.js's file header), so
 * nothing in the real reading path can currently reach this string. See
 * "fiveMountains/primary through the REAL reflectionFor()/
 * readingTiersWithHeritage() path does NOT reach taiqing-siku or
 * SOURCE_PANEL_CEILING today" below (tests/qise/reading-production-path.test.js)
 * for what the real path actually produces.
 */
test("fiveMountains -> taiqing-siku is reachable when the explicit canonical id is requested directly, with evidence unchanged (NOT the abstract Reflection Engine rotation)", () => {
  const result = composeHeritageForReading({
    captureQualityPassed: true, safetyPassed: true,
    heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku", depthMode: "SOURCE_DEEP",
  });
  assert.equal(result.primaryLineage, "taiqing-siku");
  const ceilinged = result.sourcePanelOnly.find((e) => e.connectorId === "five-mountains-mutual-facing-fullness");
  assert.ok(ceilinged, "must reach SOURCE_PANEL_CEILING through the product-facing entry point with zero registries injected");
  assert.equal(ceilinged.disposition, "SOURCE_PANEL_CEILING");
  // Evidence standing is exactly what the real connector record declares —
  // the adapter must not have upgraded or altered it.
  assert.equal(ceilinged.evidenceStrength, HERITAGE_CONNECTOR_REGISTRY["five-mountains-mutual-facing-fullness"].evidenceStrength);
  assert.equal(result.active.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"), false);
});

test("fiveMountains's registry-key 'primary' lineage is NOT the same claim as 'taiqing-siku' — routing the abstract label there would be a content substitution, not a bug fix", () => {
  // Documents, from the frozen registry data itself, why ABSTRACT_LINEAGE_OVERRIDES
  // cannot be populated by inference. "primary" (人倫大統賦, directional
  // naming: 南/北/東/西/中) and "taiqing-siku" (太清神鑑, mountain names
  // mapped to face regions) are two different sub-claims of the tradition,
  // not a weak witness and a strong witness of the same claim — so
  // preferring one over the other for the abstract rotation slot is an
  // editorial decision, not a correction the adapter can make on its own.
  const primary = HERITAGE_REGISTRY.fiveMountains.lineages.primary;
  const taiqingSiku = HERITAGE_REGISTRY.fiveMountains.lineages["taiqing-siku"];
  assert.notEqual(primary.sourceId, taiqingSiku.sourceId);
  assert.equal(primary.runtimeStatus, "RESEARCH_ONLY");
  assert.equal(taiqingSiku.runtimeStatus, "HERITAGE_ONLY");
});

test("five-mountains-mutual-facing-fullness never becomes Tier-2-eligible via any reachable lineage — it is SOURCE_PANEL_CEILING or fully blocked, never ACTIVE", () => {
  for (const lineage of Object.keys(HERITAGE_REGISTRY.fiveMountains.lineages)) {
    const result = composeHeritageForReading({
      captureQualityPassed: true, safetyPassed: true,
      heritageConstruct: "fiveMountains", sourceLineage: lineage, depthMode: "SOURCE_DEEP",
    });
    assert.equal(result.active.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"), false,
      `must never be ACTIVE under lineage "${lineage}"`);
  }
});

test("the lineage adapter does not change concept-only connector eligibility — no cross-construct inheritance introduced by the adapter itself", () => {
  const conceptOnly = synConnector({
    connectorId: "syn-concept-only-lineage-check",
    participants: [{ participantId: "gamma", nodeType: "HERITAGE_CONCEPT", conceptId: "gamma", memberScope: "NODE" }],
  });
  const conceptRegistry = { gamma: { conceptId: "gamma", measurementAvailability: "UNMEASURABLE", modernMeasurementBinding: null } };
  const result = composeHeritageConnectionsWithRegistries(synBase({
    heritageConstruct: "alpha",
    connectorRegistry: { "syn-concept-only-lineage-check": conceptOnly },
    conceptRegistry,
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));
  assert.equal(result.abstained, false);
  assert.equal(result.active[0]?.connectorId, "syn-concept-only-lineage-check");
});

/* ── single connector-selection lifecycle: the ordering hazard is real ───── */

/*
 * A fresh review found that src/qise/heritage-connections.js used to call
 * composeHeritageForReading TWICE per reading — once for Tier 2 at
 * depthMode "STANDARD", once for Tier 3 at "SOURCE_DEEP" — and Stage 2's own
 * rotation seed (resolver.js: `rotationSeed = "...|depthMode=${depthMode}"`)
 * includes depthMode by design. This is Stage 2's frozen contract, not a bug
 * this file may "fix" by changing resolver.js — but it means two SEPARATE
 * calls that differ only in depthMode CAN rotate `relationshipOrder`
 * differently whenever a construct has 2+ ACTIVE connectors and
 * occurrence > 0. The real corpus has no construct with two or more ACTIVE
 * connectors yet (see docs/HERITAGE_CONNECTOR_STAGE_STATUS.md), so this test
 * necessarily uses a synthetic multi-connector registry — the same
 * `synBase`/`synConnector` seam every other resolver-adjacent test in this
 * file already uses.
 */
const twoActiveConnectorsBase = (overrides = {}) => {
  const connA = synConnector({
    connectorId: "alpha-conn-a",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const connB = synConnector({
    connectorId: "alpha-conn-b",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  return synBase({
    connectorRegistry: { "alpha-conn-a": connA, "alpha-conn-b": connB },
    ...overrides,
  });
};

test("the ordering hazard is real: two composeHeritageForReading calls that differ only in depthMode can disagree on the top-pick connector", () => {
  let sawDivergence = false;
  for (let occurrence = 0; occurrence < 6; occurrence++) {
    const standard = composeHeritageConnectionsWithRegistries(
      twoActiveConnectorsBase({ depthMode: "STANDARD", occurrence }));
    const deep = composeHeritageConnectionsWithRegistries(
      twoActiveConnectorsBase({ depthMode: "SOURCE_DEEP", occurrence }));
    assert.equal(standard.active.length, 2, "fixture must actually produce two ACTIVE connectors");
    assert.deepEqual(
      new Set(standard.active.map((e) => e.connectorId)),
      new Set(deep.active.map((e) => e.connectorId)),
      "the ACTIVE set itself is depth-independent — only its presentation order may differ");
    if (standard.renderPlan.relationshipOrder[0] !== deep.renderPlan.relationshipOrder[0]) sawDivergence = true;
  }
  assert.ok(sawDivergence,
    "two depthMode-differing calls never disagreed on the top pick across occurrence 0-5 — " +
    "either the fixture stopped exercising the hazard, or resolver.js's rotation seed changed");
});

/*
 * The fix lives in src/qise/heritage-connections.js: `composeHeritageOnceForReading`
 * is the ONLY place `depthMode` is chosen, and both `tierTwoHeritageConnections`/
 * `tierThreeHeritageConnections` (and `readingTiersWithHeritage`, which calls
 * it exactly once and shares the result) funnel through it — see
 * "composeHeritageOnceForReading hardcodes depthMode: SOURCE_DEEP..." and
 * "tierTwoHeritageConnections and tierThreeHeritageConnections both funnel
 * through composeHeritageOnceForReading..." in
 * tests/qise/heritage-connections.test.js for the structural proof that the
 * two tiers can no longer request different depths for the same reading —
 * this file has no product-facing registry-injection seam to reconstruct
 * that call site directly (composeHeritageForReading binds the canonical
 * registries internally), so the structural proof lives beside the code it
 * proves.
 */
test("a single composition, reused for both tiers, cannot exhibit the ordering hazard — Tier 2's derived connector is always Tier 3's presentation head", () => {
  for (let occurrence = 0; occurrence < 6; occurrence++) {
    // Simulates the FIXED architecture: exactly one composeHeritageForReading
    // call (here, its registry-injectable twin) shared by both derivations —
    // deriveTier2FromComposition (the REAL Tier 2 selection function) reading
    // the SAME object Tier 3 presents from, never a second call at a
    // different depthMode.
    const once = composeHeritageConnectionsWithRegistries(
      twoActiveConnectorsBase({ depthMode: "SOURCE_DEEP", occurrence }));
    const tier2 = deriveTier2FromComposition(once);
    const tier3PresentationHead = once.renderPlan.relationshipOrder[0];
    assert.equal(tier2.available, true);
    assert.equal(tier2.connector.connectorId, tier3PresentationHead,
      `occurrence ${occurrence}: Tier 2's selected connector must be the head of Tier 3's presentation order`);
  }
});
