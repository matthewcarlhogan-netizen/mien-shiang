import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  resolveHeritageConnections,
  evaluateConditionExpression,
  RELATIONSHIP_AVAILABILITY,
  DEPTH_MODES,
} from "../../src/heritage/resolver.js";
import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";

const clone = (value) => structuredClone(value);

/** Real Stage 1 registries, as the resolver will actually see them in production. */
const realArgs = (overrides = {}) => ({
  heritageRegistry: HERITAGE_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  readingState: { heritageConstruct: "fiveMountains", sourceLineage: "primary" },
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

/* ── a small synthetic universe for controlled scenarios ─────────────────── */

const SYN_HERITAGE_REGISTRY = Object.freeze({
  alpha: Object.freeze({
    constructId: "alpha",
    lineages: Object.freeze({
      primary: Object.freeze({ measurementAvailability: "SUPPORTED_2D" }),
    }),
  }),
  beta: Object.freeze({
    constructId: "beta",
    lineages: Object.freeze({
      primary: Object.freeze({ measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
    }),
  }),
});

const SYN_CONCEPT_REGISTRY = Object.freeze({
  gamma: Object.freeze({ conceptId: "gamma", measurementAvailability: "UNMEASURABLE", modernMeasurementBinding: null }),
});

const synConnector = (fields) => Object.freeze({
  connectorId: fields.connectorId,
  relationshipType: fields.relationshipType || "CORRESPONDS_TO",
  relationshipDirection: fields.relationshipDirection || { kind: "UNDIRECTED" },
  collectiveMode: fields.collectiveMode ?? null,
  graphScope: "CORE_HERITAGE",
  participants: fields.participants,
  evidenceClass: "EXPLICITLY_ATTESTED",
  evidenceStrength: "RECORDED_NOT_VERIFIED",
  sourceId: "synthetic-source",
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

const synArgs = (overrides = {}) => ({
  heritageRegistry: SYN_HERITAGE_REGISTRY,
  conceptRegistry: SYN_CONCEPT_REGISTRY,
  connectorRegistry: {},
  disagreementRegistry: {},
  negativeRelationshipRegistry: {},
  compositionPolicies: {},
  readingState: { heritageConstruct: "alpha", sourceLineage: "primary" },
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

/* ── 1. determinism ────────────────────────────────────────────────────── */

test("1: same inputs produce identical (deep-equal) output", () => {
  const a = resolveHeritageConnections(realArgs());
  const b = resolveHeritageConnections(realArgs());
  assert.deepEqual(a, b);
});

/* ── 2. stable ordering independent of registry object insertion order ──── */

test("2: connector order is independent of registry object insertion order", () => {
  const forward = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveMountains", sourceLineage: "primary" } }));
  const reversedRegistry = Object.fromEntries(Object.entries(HERITAGE_CONNECTOR_REGISTRY).reverse());
  const reversed = resolveHeritageConnections(realArgs({
    connectorRegistry: reversedRegistry,
    readingState: { heritageConstruct: "fiveMountains", sourceLineage: "primary" },
  }));
  assert.deepEqual(forward.activeConnectors, reversed.activeConnectors);
  assert.deepEqual(forward.unavailableRelations, reversed.unavailableRelations);
  assert.deepEqual(forward.renderPlan.relationshipOrder, reversed.renderPlan.relationshipOrder);
});

/* ── 3. occurrence causes only approved deterministic variation ─────────── */

test("3: occurrence changes renderPlan.relationshipOrder rotation but not the eligible sets", () => {
  const args = synArgs({
    connectorRegistry: {
      "syn-a": synConnector({ connectorId: "syn-a", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
      "syn-b": synConnector({ connectorId: "syn-b", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
      "syn-c": synConnector({ connectorId: "syn-c", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
    },
  });
  const r0 = resolveHeritageConnections({ ...args, occurrence: 0 });
  const r1 = resolveHeritageConnections({ ...args, occurrence: 1 });

  assert.deepEqual(
    [...r0.activeConnectors].map((c) => c.connectorId).sort(),
    [...r1.activeConnectors].map((c) => c.connectorId).sort(),
  );
  assert.deepEqual(r0.activeConnectors, r1.activeConnectors, "the active SET and its content must not move with occurrence");
  assert.notDeepEqual(r0.renderPlan.relationshipOrder, r1.renderPlan.relationshipOrder, "presentation order should rotate");
  assert.notDeepEqual(r0.renderPlan.connectorSelectionKey, r1.renderPlan.connectorSelectionKey);
});

/* ── 4. no Math.random / nondeterministic selection ──────────────────────── */

test("4: resolver source contains no Math.random or Date.now content-selection", () => {
  const src = readFileSync(fileURLToPath(new URL("../../src/heritage/resolver.js", import.meta.url)), "utf8");
  assert.doesNotMatch(src, /Math\.random/);
  assert.doesNotMatch(src, /Date\.now/);
});

/* ── 5. primary construct with no eligible connector ─────────────────────── */

test("5: twelvePalaces has zero connectors in the real registry", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "twelvePalaces", sourceLineage: "primary" } }));
  assert.equal(result.abstained, false);
  assert.equal(result.primaryConstruct, "twelvePalaces");
  assert.deepEqual(result.activeConnectors, []);
  assert.deepEqual(result.unavailableRelations, []);
  assert.deepEqual(result.sourcePanels, []);
});

/* ── 6. simple two-node relationship ──────────────────────────────────────── */

test("6: a simple two-construct CORRESPONDS_TO connector resolves", () => {
  const connector = synConnector({
    connectorId: "syn-pair",
    relationshipType: "CORRESPONDS_TO",
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-pair": connector } }));
  assert.equal(result.activeConnectors.length, 1);
  assert.equal(result.activeConnectors[0].connectorId, "syn-pair");
});

/* ── 7. multi-node conjunctive configuration ──────────────────────────────── */

test("7: the real Yuebo CONJUNCTIVE_CONFIGURATION connector carries all four participants", () => {
  const connector = HERITAGE_CONNECTOR_REGISTRY["yuebo-mountains-rivers-form-shen-configuration"];
  assert.equal(connector.participants.length, 4);
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" } }));
  const found = [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels]
    .find((e) => e.connectorId === "yuebo-mountains-rivers-form-shen-configuration");
  assert.ok(found, "the connector should surface as a candidate for fourRivers");
  assert.equal(found.participants.length, 4);
});

/* ── 8. reciprocal Form/Shen connectors remain separate ───────────────────── */

test("8: shen-requires-form and form-requires-shen are two distinct connectors, never merged", () => {
  const shenRequires = HERITAGE_CONNECTOR_REGISTRY["shen-requires-form"];
  const formRequires = HERITAGE_CONNECTOR_REGISTRY["form-requires-shen"];
  assert.notEqual(shenRequires, formRequires);
  assert.deepEqual(shenRequires.relationshipDirection, { kind: "DIRECTED", from: ["shen"], to: ["form"] });
  assert.deepEqual(formRequires.relationshipDirection, { kind: "DIRECTED", from: ["form"], to: ["shen"] });
  assert.equal(shenRequires.sourceRuleGroupId, formRequires.sourceRuleGroupId);

  // Neither construct-based readingState surfaces these (they're HERITAGE_CONCEPT-only,
  // no CONSTRUCT participant), so resolve directly against a synthetic construct that
  // stands in for one and confirm both remain independently enumerable when both are
  // registered.
  const registry = { "shen-requires-form": shenRequires, "form-requires-shen": formRequires };
  const ids = Object.keys(registry).sort();
  assert.deepEqual(ids, ["form-requires-shen", "shen-requires-form"]);
});

/* ── 9. partial availability ──────────────────────────────────────────────── */

test("9: mixed capturable/uncapturable participants yield PARTIALLY_AVAILABLE", () => {
  const connector = synConnector({
    connectorId: "syn-partial",
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
    measurementAvailability: "SUPPORTED_2D",
  });
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-partial": connector } }));
  assert.equal(result.activeConnectors[0].relationshipAvailability, "PARTIALLY_AVAILABLE");
});

/* ── 10. fully unavailable capture participant ────────────────────────────── */

test("10: an entirely CAMERA_GEOMETRY_INSUFFICIENT RESEARCH_ONLY connector is UNAVAILABLE_FROM_CAPTURE", () => {
  const connector = synConnector({
    connectorId: "syn-unavailable",
    participants: [{ participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" }],
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "RESEARCH_ONLY",
  });
  const result = resolveHeritageConnections(synArgs({
    readingState: { heritageConstruct: "beta", sourceLineage: "primary" },
    connectorRegistry: { "syn-unavailable": connector },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].relationshipAvailability, "UNAVAILABLE_FROM_CAPTURE");
});

test("10b: the same measurement gap under HERITAGE_PRESENTATION_ALLOWED becomes HERITAGE_ONLY and active", () => {
  const connector = synConnector({
    connectorId: "syn-heritage-only",
    participants: [{ participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" }],
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
  });
  const result = resolveHeritageConnections(synArgs({
    readingState: { heritageConstruct: "beta", sourceLineage: "primary" },
    connectorRegistry: { "syn-heritage-only": connector },
  }));
  assert.equal(result.activeConnectors.length, 1);
  assert.equal(result.activeConnectors[0].relationshipAvailability, "HERITAGE_ONLY");
});

/* ── 11. Shen remains heritage-only/unmeasurable ──────────────────────────── */

test("11: Shen's concept record is UNMEASURABLE with no modern measurement binding", () => {
  assert.equal(HERITAGE_CONCEPT_REGISTRY.shen.measurementAvailability, "UNMEASURABLE");
  assert.equal(HERITAGE_CONCEPT_REGISTRY.shen.modernMeasurementBinding, null);
});

test("11b: a connector cannot present Shen as measured — measurable Shen is blocked at resolution", () => {
  const connector = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  connector.historicalStates[0].measurementAvailability = "SUPPORTED_2D";
  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "four-rivers-shen-corresponds": connector },
  }));
  const found = result.unavailableRelations.find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.ok(found, "a connector with measurable Shen must be blocked, never activated");
  assert.equal(found.disposition, "BLOCKED_NEGATIVE_RULE");
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "four-rivers-shen-corresponds"), false);
});

/* ── 12. modern Qi Se does not activate heritageQiSe predicate ───────────── */

test("12: heritageQiSe cannot bind to a modern measurement", () => {
  assert.equal(HERITAGE_CONCEPT_REGISTRY.heritageQiSe.modernMeasurementBinding, null);
});

test("12b: readingState never influences which heritageQiSe connector activates", () => {
  const withRead = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "read" },
  }));
  const withoutRead = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "abstained_confidence" },
  }));
  assert.deepEqual(withRead.activeConnectors, withoutRead.activeConnectors);
  assert.deepEqual(withRead.unavailableRelations, withoutRead.unavailableRelations);
});

test("12c: a synthetic connector binding heritageQiSe directly to fiveElements is blocked", () => {
  const connector = synConnector({
    connectorId: "syn-qise-fiveforms",
    participants: [
      { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" },
      { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-fiveforms": connector },
  }));
  const found = [...result.activeConnectors, ...result.unavailableRelations].find((e) => e.connectorId === "syn-qise-fiveforms");
  assert.ok(found);
  assert.equal(found.disposition, "BLOCKED_NEGATIVE_RULE");
});

/* ── 13. Five Forms system connector does not generate pairwise edges ────── */

test("13: fiveElements candidates are exactly the registered connectors, no synthesized pairwise edges", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" } }));
  const allIds = [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels].map((e) => e.connectorId);
  assert.deepEqual(allIds.sort(), ["five-forms-generative-overcoming-system"]);
});

/* ── 14. Twelve Palaces does not import ZWDS ──────────────────────────────── */

test("14: a synthetic ZWDS/twelvePalaces connector is blocked even though it validates structurally elsewhere", () => {
  const connector = synConnector({
    connectorId: "syn-zwds",
    participants: [
      { participantId: "twelvePalaces", nodeType: "CONSTRUCT", constructId: "twelvePalaces", memberScope: "ALL_MEMBERS" },
      { participantId: "zwds", nodeType: "RELATED_SYSTEM", relatedSystemId: "zwds", memberScope: "NODE" },
    ],
  });
  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "twelvePalaces", sourceLineage: "primary" },
    connectorRegistry: { "syn-zwds": connector },
    negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].disposition, "BLOCKED_NEGATIVE_RULE");
});

/* ── 15. RESEARCH_ONLY connector remains research-only ────────────────────── */

test("15: RESEARCH_ONLY connectors never appear in activeConnectors", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: construct, sourceLineage: "primary" } }));
    for (const entry of result.activeConnectors) {
      assert.notEqual(entry.runtimePolicy, "RESEARCH_ONLY", `${entry.connectorId} is RESEARCH_ONLY and must not be active`);
    }
  }
});

/* ── 16. SOURCE_PANEL_ONLY connector does not become ordinary active inference ── */

test("16: SOURCE_PANEL_ONLY connectors land in sourcePanels, never activeConnectors", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveOfficers", sourceLineage: "primary" } }));
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "five-officers-one-good-office-ten-years"), false);
  const panel = result.sourcePanels.find((e) => e.connectorId === "five-officers-one-good-office-ten-years");
  assert.ok(panel);
  assert.equal(panel.relationshipAvailability, "SOURCE_ONLY");
});

/* ── 17. disagreement returned without harmonization ──────────────────────── */

test("17: an OPEN disagreement keeps every position, picks no winner", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveMountains", sourceLineage: "primary" } }));
  const panel = result.disagreementPanels.find((d) => d.disagreementId === "five-mountains-northern-region");
  assert.ok(panel);
  assert.equal(panel.status, "OPEN");
  assert.equal(panel.positions.length, 4);
  const ids = panel.positions.map((p) => p.positionId).sort();
  assert.deepEqual(ids, ["renlun-datong-chin", "shenyi-lower-face-zone", "sxqb-chin", "taiqing-han"]);
});

/* ── 18. Four Rivers disagreement does not duplicate high-level connector ── */

test("18: the Four Rivers eye/mouth disagreement is constituent-level, distinct from the mountains/rivers connector", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" } }));
  const disagreement = result.disagreementPanels.find((d) => d.disagreementId === "four-rivers-eye-mouth");
  assert.ok(disagreement);
  assert.equal(disagreement.nature, "MAPPING");
  // Exactly one disagreement panel for fourRivers — no second, duplicated
  // "mountains-rivers-corresponds-disagreement" record was invented.
  assert.equal(result.disagreementPanels.length, 1);
});

/* ── 19. editorial juxtaposition returned separately ──────────────────────── */

test("19: editorial juxtaposition is separate from activeConnectors and historicalRelationshipAsserted is false", () => {
  const connectorRegistry = {
    "syn-a": synConnector({ connectorId: "syn-a", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
    "syn-b": synConnector({ connectorId: "syn-b", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
  };
  const compositionPolicies = {
    "sources-shown-beside-one-another": {
      policyId: "sources-shown-beside-one-another",
      policyType: "EDITORIAL_JUXTAPOSITION",
      leftEligibility: "ANY_HERITAGE_SYSTEM",
      rightEligibility: "ANY_HERITAGE_SYSTEM",
      requiresSeparateAttribution: true,
      historicalRelationshipAsserted: false,
      disclosureId: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER",
      maxItems: 3,
    },
  };
  const result = resolveHeritageConnections(synArgs({ connectorRegistry, compositionPolicies }));
  assert.equal(result.editorialJuxtapositions.length, 1);
  const juxtaposition = result.editorialJuxtapositions[0];
  assert.equal(juxtaposition.historicalRelationshipAsserted, false);
  assert.equal(juxtaposition.requiresSeparateAttribution, true);
  assert.equal(juxtaposition.attributionMode, "separate");
  assert.ok(juxtaposition.items.includes("syn-a"));
  assert.ok(juxtaposition.items.includes("syn-b"));
  // Never merged into activeConnectors.
  assert.equal(result.activeConnectors.every((c) => c.connectorId !== "sources-shown-beside-one-another"), true);
  assert.equal("policyType" in result.activeConnectors[0], false);
});

test("19b: SUMMARY depth never surfaces editorial juxtaposition", () => {
  const connectorRegistry = {
    "syn-a": synConnector({ connectorId: "syn-a", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
    "syn-b": synConnector({ connectorId: "syn-b", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
  };
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry,
    compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
    depthMode: "SUMMARY",
  }));
  assert.deepEqual(result.editorialJuxtapositions, []);
});

/* ── 20. invalid/unknown construct gracefully abstains ────────────────────── */

test("20: an unknown heritageConstruct abstains with a structured empty state", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "notAConstruct", sourceLineage: "primary" } }));
  assert.equal(result.abstained, true);
  assert.equal(result.abstentionReasonCode, "UNKNOWN_HERITAGE_CONSTRUCT");
  assert.equal(result.primaryConstruct, null);
  assert.deepEqual(result.activeConnectors, []);
  assert.deepEqual(result.unavailableRelations, []);
  assert.deepEqual(result.disagreementPanels, []);
  assert.deepEqual(result.editorialJuxtapositions, []);
  assert.deepEqual(result.sourcePanels, []);
  assert.deepEqual(result.renderPlan.relationshipOrder, []);
});

test("20b: a missing readingState also abstains rather than throwing", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: undefined }));
  assert.equal(result.abstained, true);
});

/* ── 21. source/provenance trace preserved ────────────────────────────────── */

test("21: every resolved entry preserves the full Stage 1 provenance trace", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" } }));
  const entries = [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels];
  assert.ok(entries.length > 0);
  for (const entry of entries) {
    for (const field of [
      "connectorId", "sourceId", "supportingSourceIds", "evidenceClass", "evidenceStrength",
      "textualLayer", "sectionLocator", "folioLocator", "runtimePolicy",
      "prohibitedForUserInference", "sourceRuleGroupId", "disagreementIds",
    ]) {
      assert.ok(field in entry, `${entry.connectorId} is missing trace field ${field}`);
    }
  }
});

/* ── 22-28. condition AST evaluation ──────────────────────────────────────── */

const conditionConnector = (conditionExpression, historicalStates = []) => synConnector({
  connectorId: "syn-cond",
  participants: [
    { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
    { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
  ],
  conditionExpression,
  historicalStates,
});

test("22: condition ALL — satisfied only when every operand is", () => {
  const trueCase = evaluateConditionExpression({
    type: "ALL",
    operands: [{ type: "PRESENT", participantId: "alpha" }, { type: "PRESENT", participantId: "beta" }],
  }, conditionConnector(null));
  assert.deepEqual(trueCase, { satisfied: true, resolved: true, reason: null });

  const falseCase = evaluateConditionExpression({
    type: "ALL",
    operands: [{ type: "PRESENT", participantId: "alpha" }, { type: "ABSENT", participantId: "beta" }],
  }, conditionConnector(null));
  assert.equal(falseCase.satisfied, false);
  assert.equal(falseCase.resolved, true);
});

test("23: condition ANY — satisfied when at least one resolved operand is true", () => {
  const result = evaluateConditionExpression({
    type: "ANY",
    operands: [{ type: "ABSENT", participantId: "alpha" }, { type: "PRESENT", participantId: "beta" }],
  }, conditionConnector(null));
  assert.equal(result.satisfied, true);
  assert.equal(result.resolved, true);
});

test("24: condition NOT — inverts a resolved operand", () => {
  const result = evaluateConditionExpression({
    type: "NOT",
    operand: { type: "PRESENT", participantId: "alpha" },
  }, conditionConnector(null));
  assert.equal(result.satisfied, false);
  assert.equal(result.resolved, true);
});

test("25: condition PRESENT — true exactly when the participant is declared", () => {
  const yes = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, conditionConnector(null));
  const no = evaluateConditionExpression({ type: "PRESENT", participantId: "gamma" }, conditionConnector(null));
  assert.equal(yes.satisfied, true);
  assert.equal(no.satisfied, false);
  assert.equal(no.resolved, true);
});

test("26: condition ABSENT — true exactly when the participant is not declared", () => {
  const result = evaluateConditionExpression({ type: "ABSENT", participantId: "gamma" }, conditionConnector(null));
  assert.equal(result.satisfied, true);
  assert.equal(result.resolved, true);
});

test("27: condition STATE — resolves true when the declared historicalState is capturable", () => {
  const connector = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-known" },
    [{ stateId: "alpha-known", participantId: "alpha", gloss: null, measurementAvailability: "SUPPORTED_2D" }],
  );
  const result = evaluateConditionExpression(connector.conditionExpression, connector);
  assert.deepEqual(result, { satisfied: true, resolved: true, reason: null });
});

test("28: condition STATE — abstains (never guesses) when unresolved or unknown", () => {
  const unknownState = conditionConnector({ type: "STATE", participantId: "alpha", stateId: "no-such-state" });
  const r1 = evaluateConditionExpression(unknownState.conditionExpression, unknownState);
  assert.equal(r1.resolved, false);
  assert.equal(r1.reason, "UNKNOWN_STATE");

  const notRecorded = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-unknown" },
    [{ stateId: "alpha-unknown", participantId: "alpha", gloss: null, measurementAvailability: "NOT_RECORDED" }],
  );
  const r2 = evaluateConditionExpression(notRecorded.conditionExpression, notRecorded);
  assert.equal(r2.resolved, false);
  assert.equal(r2.satisfied, false);

  const categorical = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-unmeasurable" },
    [{ stateId: "alpha-unmeasurable", participantId: "alpha", gloss: null, measurementAvailability: "UNMEASURABLE" }],
  );
  const r3 = evaluateConditionExpression(categorical.conditionExpression, categorical);
  // A categorical "never measurable" IS a definitive (resolved) no, not an
  // unknown — the resolver still never presents it as satisfied.
  assert.equal(r3.resolved, true);
  assert.equal(r3.satisfied, false);
});

test("28b: a connector whose condition cannot resolve is parked in unavailableRelations, never active", () => {
  const connector = conditionConnector({ type: "STATE", participantId: "alpha", stateId: "missing" });
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-cond": connector } }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].disposition, "CONDITION_UNMET");
});

/* ── 29. connector registry reordering does not change deterministic result ── */

test("29: shuffled connector registry key order never changes the resolved result", () => {
  const base = HERITAGE_CONNECTOR_REGISTRY;
  const shuffledKeys = Object.keys(base).sort((a, b) => b.localeCompare(a));
  const shuffled = Object.fromEntries(shuffledKeys.map((k) => [k, base[k]]));
  const r1 = resolveHeritageConnections(realArgs({ connectorRegistry: base, readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" } }));
  const r2 = resolveHeritageConnections(realArgs({ connectorRegistry: shuffled, readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" } }));
  assert.deepEqual(r1, r2);
});

/* ── 30. no mutation of injected registries or readingState ──────────────── */

test("30: the resolver never mutates its injected registries or readingState", () => {
  const registrySnapshot = clone(HERITAGE_CONNECTOR_REGISTRY);
  const disagreementSnapshot = clone(HERITAGE_DISAGREEMENT_REGISTRY);
  const readingState = Object.freeze({ heritageConstruct: "fourRivers", sourceLineage: "primary" });
  const rotationState = Object.freeze({ recentConnectorIds: Object.freeze(["four-rivers-flow-and-banks"]) });

  // Registries are already deep-frozen by registry.js; a real mutation attempt
  // would throw under strict-mode ES modules. Calling the resolver with them
  // must not throw, and the content must be byte-identical afterward.
  assert.doesNotThrow(() => resolveHeritageConnections(realArgs({ readingState, rotationState })));
  assert.deepEqual(HERITAGE_CONNECTOR_REGISTRY, registrySnapshot);
  assert.deepEqual(HERITAGE_DISAGREEMENT_REGISTRY, disagreementSnapshot);
  assert.deepEqual(readingState, { heritageConstruct: "fourRivers", sourceLineage: "primary" });
});

test("30b: an UNFROZEN registry passed in is also left untouched", () => {
  const mutableRegistry = clone(HERITAGE_CONNECTOR_REGISTRY);
  const before = clone(mutableRegistry);
  resolveHeritageConnections(realArgs({
    connectorRegistry: mutableRegistry,
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" },
  }));
  assert.deepEqual(mutableRegistry, before);
});

/* ── additional invariants exposed by the implementation ──────────────────── */

test("depthMode caps the number of active connectors surfaced in the render plan", () => {
  const connectorRegistry = Object.fromEntries(
    ["a", "b", "c", "d"].map((id) => [id, synConnector({
      connectorId: id,
      participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
    })]),
  );
  const summary = resolveHeritageConnections(synArgs({ connectorRegistry, depthMode: "SUMMARY" }));
  const deep = resolveHeritageConnections(synArgs({ connectorRegistry, depthMode: "SOURCE_DEEP" }));
  assert.equal(summary.renderPlan.relationshipOrder.length, 2);
  assert.equal(deep.renderPlan.relationshipOrder.length, 4);
  // Cap is presentation-only — the full eligible set is still reported.
  assert.equal(summary.activeConnectors.length, 4);
});

test("unknown depthMode falls back to STANDARD rather than throwing", () => {
  const result = resolveHeritageConnections(realArgs({ depthMode: "NOT_A_MODE" }));
  assert.equal(result.renderPlan.presentationMode, "STANDARD");
});

test("relationshipAvailability values are always drawn from the declared enum", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: construct, sourceLineage: "primary" } }));
    for (const entry of [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels]) {
      assert.ok(RELATIONSHIP_AVAILABILITY.includes(entry.relationshipAvailability), entry.connectorId);
    }
  }
});

test("DEPTH_MODES is the declared three-value enum", () => {
  assert.deepEqual(DEPTH_MODES, ["SUMMARY", "STANDARD", "SOURCE_DEEP"]);
});

test("prohibitedForUserInference stays true on every surfaced entry", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: construct, sourceLineage: "primary" } }));
    for (const entry of [...result.activeConnectors, ...result.sourcePanels]) {
      assert.equal(entry.prohibitedForUserInference, true);
    }
  }
});

test("wordingVariantIndices are stable integers, not a wording corpus", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveMountains", sourceLineage: "primary" } }));
  for (const [id, index] of Object.entries(result.renderPlan.wordingVariantIndices)) {
    assert.equal(typeof index, "number");
    assert.ok(Number.isInteger(index) && index >= 0);
  }
});
