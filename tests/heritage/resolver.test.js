import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  resolveHeritageConnections,
  evaluateConditionExpression,
  negativeRuleViolations,
  negativeRuleRuntimeBindingViolations,
  resolveSourceEligibility,
  resolveLineageRestriction,
  referencedParticipantIds,
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
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";
import { checkNegativeRelationshipInvariants, validateHeritageDisagreementRecord } from "../../src/heritage/validator.js";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";

const clone = (value) => structuredClone(value);

/** Real Stage 1 registries, as the resolver will actually see them in production. */
const realArgs = (overrides = {}) => ({
  heritageRegistry: HERITAGE_REGISTRY,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  negativeRelationshipRegistry: HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY,
  compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
  sourceRegistry: SOURCE_REGISTRY,
  readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" },
  depthMode: "STANDARD",
  occurrence: 0,
  ...overrides,
});

/* ── a small synthetic universe for controlled scenarios ─────────────────── */

/*
 * Item 1: a lineage record's own citationStatus/evidenceStrength/sourceId now
 * gate eligibility too, so every synthetic lineage below states them
 * explicitly — "verified"/"VERIFIED_PRIMARY" by default (a strong lineage
 * that should never itself be the limiting factor), so a test that wants to
 * exercise a WEAK lineage overrides these fields deliberately and visibly.
 */
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
    lineages: Object.freeze({
      primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }),
    }),
  }),
  beta: Object.freeze({
    constructId: "beta",
    lineages: Object.freeze({
      primary: solidLineage({ measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT" }),
    }),
  }),
});

const SYN_CONCEPT_REGISTRY = Object.freeze({
  gamma: Object.freeze({ conceptId: "gamma", measurementAvailability: "UNMEASURABLE", modernMeasurementBinding: null }),
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
  // Solid by default (item 5: connector.evidenceStrength now gates
  // eligibility too) — a test that wants to exercise WEAK evidence
  // overrides this explicitly and visibly, same discipline as solidLineage.
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

const synArgs = (overrides = {}) => ({
  heritageRegistry: SYN_HERITAGE_REGISTRY,
  conceptRegistry: SYN_CONCEPT_REGISTRY,
  connectorRegistry: {},
  disagreementRegistry: {},
  negativeRelationshipRegistry: {},
  compositionPolicies: {},
  sourceRegistry: SYN_SOURCE_REGISTRY,
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
  const forward = resolveHeritageConnections(realArgs());
  const reversedRegistry = Object.fromEntries(Object.entries(HERITAGE_CONNECTOR_REGISTRY).reverse());
  const reversed = resolveHeritageConnections(realArgs({ connectorRegistry: reversedRegistry }));
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
  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" },
    depthMode: "SOURCE_DEEP",
  }));
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
});

test("8b: resolveHeritageConnections itself surfaces both, still distinct, only when explicitly anchored", () => {
  const unanchored = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" },
    conditionContext: null,
  }));
  const unanchoredIds = [...unanchored.activeConnectors, ...unanchored.unavailableRelations, ...unanchored.sourcePanels].map((e) => e.connectorId);
  assert.equal(unanchoredIds.includes("shen-requires-form"), false, "concept-only connectors are a deliberate abstention by default");
  assert.equal(unanchoredIds.includes("form-requires-shen"), false);

  const anchored = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" },
    conditionContext: { participants: { shen: "PRESENT" } },
  }));
  const anchoredEntries = [...anchored.activeConnectors, ...anchored.unavailableRelations, ...anchored.sourcePanels];
  const shenEntry = anchoredEntries.find((e) => e.connectorId === "shen-requires-form");
  const formEntry = anchoredEntries.find((e) => e.connectorId === "form-requires-shen");
  assert.ok(shenEntry, "anchoring shen as PRESENT surfaces shen-requires-form as a candidate");
  assert.ok(formEntry, "form-requires-shen is anchored too — both directions share the shen participant");
  assert.notEqual(shenEntry.connectorId, formEntry.connectorId);
  assert.equal(shenEntry.sourceRuleGroupId, formEntry.sourceRuleGroupId);
});

/*
 * Item 3 (Stage 2 review, round 4): a concept-only connector's source
 * eligibility must not depend on which UNRELATED primary construct/lineage
 * happened to be selected when it was anchored.
 */
test("item 3: shen-requires-form's disposition and source eligibility are unaffected by which unrelated primary construct/lineage anchored it", () => {
  const underFiveMountains = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" }, // strong lineage (VERIFIED/VERIFIED_PRIMARY)
    conditionContext: { participants: { shen: "PRESENT" } },
    depthMode: "SOURCE_DEEP",
  }));
  const underFourRivers = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" }, // a different, also-strong lineage
    conditionContext: { participants: { shen: "PRESENT" } },
    depthMode: "SOURCE_DEEP",
  }));
  const entry = (result) => [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels]
    .find((e) => e.connectorId === "shen-requires-form");
  const a = entry(underFiveMountains);
  const b = entry(underFourRivers);
  assert.ok(a && b);
  assert.equal(a.disposition, b.disposition);
  assert.equal(a.relationshipAvailability, b.relationshipAvailability);
  assert.equal(a.runtimePolicy, "RESEARCH_ONLY");
  assert.equal(b.runtimePolicy, "RESEARCH_ONLY");
});

test("item 3: a synthetic concept-only connector's source eligibility is IDENTICAL whether the unrelated primary lineage is fully solid or fully blocked", () => {
  // A concept-only connector, HERITAGE_PRESENTATION_ALLOWED so its FINAL
  // disposition is driven directly by source eligibility (RESEARCH_ONLY
  // would mask the effect, as the real shen-requires-form connector's own
  // policy does above) — this isolates item 3's fix unambiguously.
  const conceptOnlyConnector = synConnector({
    connectorId: "syn-concept-only",
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
    sourceId: "synthetic-source", // resolves to citationStatus "verified" in SYN_SOURCE_REGISTRY
    participants: [{ participantId: "gamma", nodeType: "HERITAGE_CONCEPT", conceptId: "gamma", memberScope: "NODE" }],
  });

  const strongLineageRegistry = {
    alpha: { constructId: "alpha", lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }) } },
  };
  const blockedLineageRegistry = {
    alpha: {
      constructId: "alpha",
      lineages: {
        primary: {
          measurementAvailability: "SUPPORTED_2D", runtimeStatus: "RUNTIME_PROSE",
          availability: "available", terminationState: "continue",
          citationStatus: "source-required", evidenceStrength: "ABSTAINED", sourceId: "does-not-exist",
        },
      },
    },
  };

  const underStrongLineage = resolveHeritageConnections(synArgs({
    heritageRegistry: strongLineageRegistry,
    connectorRegistry: { "syn-concept-only": conceptOnlyConnector },
    readingState: { heritageConstruct: "alpha", sourceLineage: "primary" },
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));
  const underBlockedLineage = resolveHeritageConnections(synArgs({
    heritageRegistry: blockedLineageRegistry,
    connectorRegistry: { "syn-concept-only": conceptOnlyConnector },
    readingState: { heritageConstruct: "alpha", sourceLineage: "primary" },
    conditionContext: { participants: { gamma: "PRESENT" } },
  }));

  assert.equal(underStrongLineage.activeConnectors.length, 1, "the concept-only connector reaches ACTIVE on its own solid evidence");
  assert.equal(underBlockedLineage.activeConnectors.length, 1, "an unrelated construct's BLOCKED lineage must not veto a connector it is not scoped to");
  assert.deepEqual(underStrongLineage.activeConnectors[0], underBlockedLineage.activeConnectors[0]);
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

test("11c: Shen's STATE can never resolve true without an EXPLICIT conditionContext entry — no binding exists", () => {
  const connector = synConnector({
    connectorId: "syn-shen-state",
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
    ],
    conditionExpression: { type: "STATE", participantId: "shen", stateId: "shen-settled" },
    historicalStates: [{ stateId: "shen-settled", participantId: "shen", gloss: null, measurementAvailability: "UNMEASURABLE" }],
  });
  // No conditionContext at all: must not guess.
  const unresolved = evaluateConditionExpression(connector.conditionExpression, connector, null);
  assert.equal(unresolved.resolved, false);

  // Even a fully "read" modern measurement in readingState must not leak in —
  // the resolver never even looks at readingState for this.
  const result = resolveHeritageConnections(synArgs({
    readingState: { heritageConstruct: "alpha", sourceLineage: "primary", availability: "read" },
    connectorRegistry: { "syn-shen-state": connector },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "CONDITION_UNMET");
});

/* ── 12. modern Qi Se does not activate heritageQiSe predicate ───────────── */

test("12: heritageQiSe cannot bind to a modern measurement", () => {
  assert.equal(HERITAGE_CONCEPT_REGISTRY.heritageQiSe.modernMeasurementBinding, null);
});

test("12b: readingState.availability never influences resolution", () => {
  const withRead = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "read" },
  }));
  const withoutRead = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary", availability: "abstained_confidence" },
  }));
  assert.deepEqual(withRead.activeConnectors, withoutRead.activeConnectors);
  assert.deepEqual(withRead.unavailableRelations, withoutRead.unavailableRelations);
});

// 12c superseded (Stage 2 review round 3, item 2): a synthetic
// heritageQiSe+fiveElements connector no longer blocks on mere structural
// co-presence — see "historical heritageQiSe + Five Forms coexistence is not
// automatically banned" and "an attempted modern QiSe->FiveForms
// classification is blocked by the actual FORBID_RUNTIME_BINDING rule"
// further below, which replace this case with the corrected two-part proof.

test("12d: heritageQiSe's STATE cannot be satisfied by 'read' modern availability, only by an explicit conditionContext", () => {
  const connector = synConnector({
    connectorId: "syn-qise-state",
    participants: [{ participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" }],
    conditionExpression: { type: "STATE", participantId: "heritageQiSe", stateId: "qise-observed" },
    historicalStates: [{ stateId: "qise-observed", participantId: "heritageQiSe", gloss: null, measurementAvailability: "UNMEASURABLE" }],
  });
  const readButNoContext = evaluateConditionExpression(connector.conditionExpression, connector, null);
  assert.equal(readButNoContext.resolved, false);
  const explicitlySatisfied = evaluateConditionExpression(connector.conditionExpression, connector, {
    states: { "heritageQiSe:qise-observed": "SATISFIED" },
  });
  assert.equal(explicitlySatisfied.satisfied, true);
});

/* ── 13. Five Forms system connector does not generate pairwise edges ────── */

test("13: fiveElements candidates are exactly the registered connectors, no synthesized pairwise edges", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" }, depthMode: "SOURCE_DEEP" }));
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

test("16: SOURCE_PANEL_ONLY connectors land in sourcePanels (SOURCE_DEEP only), never activeConnectors", () => {
  const standard = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveOfficers", sourceLineage: "primary" }, depthMode: "STANDARD" }));
  assert.equal(standard.activeConnectors.some((e) => e.connectorId === "five-officers-one-good-office-ten-years"), false);
  assert.deepEqual(standard.sourcePanels, [], "item 9: SOURCE_PANEL_ONLY content is withheld outside SOURCE_DEEP");

  const deep = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveOfficers", sourceLineage: "primary" }, depthMode: "SOURCE_DEEP" }));
  assert.equal(deep.activeConnectors.some((e) => e.connectorId === "five-officers-one-good-office-ten-years"), false);
  const panel = deep.sourcePanels.find((e) => e.connectorId === "five-officers-one-good-office-ten-years");
  assert.ok(panel);
  assert.equal(panel.relationshipAvailability, "SOURCE_ONLY");
});

/* ── 17. disagreement returned without harmonization ──────────────────────── */

test("17: an OPEN disagreement keeps every position, picks no winner", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" } }));
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
  assert.equal(result.disagreementPanels.length, 1);
});

/* ── item 8: disagreement target types CONSTRUCT / CONNECTOR / LINEAGE ───── */

test("disagreement target CONNECTOR is attached only to the connector it names", () => {
  const connector = synConnector({
    connectorId: "syn-a",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const other = synConnector({
    connectorId: "syn-b",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const disagreementRegistry = {
    "connector-level": {
      disagreementId: "connector-level",
      nature: "PREDICATE",
      target: { targetType: "CONNECTOR", targetRef: "syn-a" },
      status: "OPEN",
      positions: [{ positionId: "p1", sourceId: "synthetic-source", summary: "x", note: null }],
    },
  };
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-a": connector, "syn-b": other },
    disagreementRegistry,
  }));
  const a = result.activeConnectors.find((e) => e.connectorId === "syn-a");
  const b = result.activeConnectors.find((e) => e.connectorId === "syn-b");
  assert.deepEqual(a.disagreementIds, ["connector-level"]);
  assert.deepEqual(b.disagreementIds, []);
  assert.equal(result.disagreementPanels.length, 1);
});

test("disagreement target LINEAGE uses the construct:lineage composite key and does not cross-contaminate other lineages", () => {
  const connector = synConnector({
    connectorId: "syn-a",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const disagreementRegistry = {
    "lineage-level": {
      disagreementId: "lineage-level",
      nature: "EDITION_VARIATION",
      target: { targetType: "LINEAGE", targetRef: "alpha:primary" },
      status: "OPEN",
      positions: [{ positionId: "p1", sourceId: "synthetic-source", summary: "x", note: null }],
    },
  };
  const matching = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-a": connector },
    disagreementRegistry,
    readingState: { heritageConstruct: "alpha", sourceLineage: "primary" },
  }));
  assert.equal(matching.disagreementPanels.length, 1);

  const nonMatching = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-a": connector },
    disagreementRegistry,
    readingState: { heritageConstruct: "beta", sourceLineage: "primary" },
  }));
  assert.equal(nonMatching.disagreementPanels.length, 0, "a lineage-targeted disagreement for alpha:primary must not leak onto beta:primary");
});

test("an unrelated disagreement target never becomes relevant by invention", () => {
  const connector = synConnector({
    connectorId: "syn-a",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const disagreementRegistry = {
    unrelated: {
      disagreementId: "unrelated",
      nature: "MAPPING",
      target: { targetType: "CONSTRUCT", targetRef: "beta" },
      status: "OPEN",
      positions: [{ positionId: "p1", sourceId: "synthetic-source", summary: "x", note: null }],
    },
  };
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-a": connector }, disagreementRegistry }));
  assert.deepEqual(result.disagreementPanels, []);
});

/*
 * Item 4 (Stage 2 review, round 3): SOURCE_PANEL_ONLY depth leakage. A
 * connector held in the hidden `sourcePanels` bucket (below SOURCE_DEEP)
 * must not be discoverable indirectly through disagreementPanels or
 * editorialJuxtapositions.
 */
test("depth leakage: a CONNECTOR-targeted disagreement belonging solely to a hidden SOURCE_PANEL_ONLY connector does not surface outside SOURCE_DEEP", () => {
  const hiddenConnector = synConnector({
    connectorId: "syn-hidden-panel",
    runtimePolicy: "SOURCE_PANEL_ONLY",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const disagreementRegistry = {
    "hidden-connector-disagreement": {
      disagreementId: "hidden-connector-disagreement",
      nature: "PREDICATE",
      target: { targetType: "CONNECTOR", targetRef: "syn-hidden-panel" },
      status: "OPEN",
      positions: [{ positionId: "p1", sourceId: "synthetic-source", summary: "x", note: null }],
    },
  };
  const standard = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-hidden-panel": hiddenConnector },
    disagreementRegistry,
    depthMode: "STANDARD",
  }));
  assert.deepEqual(standard.sourcePanels, []);
  assert.deepEqual(standard.disagreementPanels, [], "a disagreement about a connector nobody can see must not leak the connector's existence");

  const deep = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-hidden-panel": hiddenConnector },
    disagreementRegistry,
    depthMode: "SOURCE_DEEP",
  }));
  assert.equal(deep.sourcePanels.length, 1);
  assert.equal(deep.disagreementPanels.length, 1, "at SOURCE_DEEP, where the connector itself is visible, its disagreement is too");
  assert.equal(deep.disagreementPanels[0].disagreementId, "hidden-connector-disagreement");
});

test("depth leakage: editorial juxtaposition outside SOURCE_DEEP never contains a hidden SOURCE_PANEL_ONLY connector ID", () => {
  const connectorRegistry = {
    "syn-visible-a": synConnector({ connectorId: "syn-visible-a", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
    "syn-visible-b": synConnector({ connectorId: "syn-visible-b", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
    "syn-hidden-panel": synConnector({ connectorId: "syn-hidden-panel", runtimePolicy: "SOURCE_PANEL_ONLY", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] }),
  };
  const standard = resolveHeritageConnections(synArgs({
    connectorRegistry,
    compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
    depthMode: "STANDARD",
  }));
  for (const juxtaposition of standard.editorialJuxtapositions) {
    assert.equal(juxtaposition.items.includes("syn-hidden-panel"), false, "a STANDARD-depth juxtaposition must never list a connector hidden at this depth");
  }

  const deep = resolveHeritageConnections(synArgs({
    connectorRegistry,
    compositionPolicies: HERITAGE_COMPOSITION_POLICIES,
    depthMode: "SOURCE_DEEP",
  }));
  // At SOURCE_DEEP the hidden connector is visible, so it becomes a
  // legitimate candidate — proving the STANDARD-depth exclusion above is a
  // real depth filter, not an accidental omission of that connector always.
  // Three candidates, policy maxItems 3: all three are eligible to appear.
  assert.ok(deep.sourcePanels.some((e) => e.connectorId === "syn-hidden-panel"));
  const deepCandidateIds = deep.editorialJuxtapositions.flatMap((j) => j.items);
  assert.ok(deepCandidateIds.includes("syn-hidden-panel"), deepCandidateIds.join(","));
});

test("depth leakage: a genuine CONSTRUCT-level disagreement still appears even when the only connector is a hidden SOURCE_PANEL_ONLY one", () => {
  const hiddenConnector = synConnector({
    connectorId: "syn-hidden-panel",
    runtimePolicy: "SOURCE_PANEL_ONLY",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const disagreementRegistry = {
    "construct-level-disagreement": {
      disagreementId: "construct-level-disagreement",
      nature: "MAPPING",
      target: { targetType: "CONSTRUCT", targetRef: "alpha" },
      status: "OPEN",
      positions: [{ positionId: "p1", sourceId: "synthetic-source", summary: "x", note: null }],
    },
  };
  const standard = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-hidden-panel": hiddenConnector },
    disagreementRegistry,
    depthMode: "STANDARD",
  }));
  assert.deepEqual(standard.sourcePanels, [], "the only connector is indeed hidden at this depth");
  assert.equal(standard.disagreementPanels.length, 1, "the CONSTRUCT-level disagreement is about the visible construct itself, not about the hidden connector — it must not be suppressed");
  assert.equal(standard.disagreementPanels[0].disagreementId, "construct-level-disagreement");
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
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" }, depthMode: "SOURCE_DEEP" }));
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

/* ── 22-28. condition AST evaluation: PRESENT/ABSENT/STATE runtime tri-state ── */

const conditionConnector = (conditionExpression, historicalStates = []) => synConnector({
  connectorId: "syn-cond",
  participants: [
    { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
    { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
  ],
  conditionExpression,
  historicalStates,
});

test("22: condition ALL — satisfied only when every operand resolves true", () => {
  const ctx = { participants: { alpha: "PRESENT", beta: "PRESENT" } };
  const connector = conditionConnector(null);
  const trueCase = evaluateConditionExpression({
    type: "ALL",
    operands: [{ type: "PRESENT", participantId: "alpha" }, { type: "PRESENT", participantId: "beta" }],
  }, connector, ctx);
  assert.deepEqual(trueCase, { satisfied: true, resolved: true, reason: null });

  const ctx2 = { participants: { alpha: "PRESENT", beta: "ABSENT" } };
  const falseCase = evaluateConditionExpression({
    type: "ALL",
    operands: [{ type: "PRESENT", participantId: "alpha" }, { type: "PRESENT", participantId: "beta" }],
  }, connector, ctx2);
  assert.equal(falseCase.satisfied, false);
  assert.equal(falseCase.resolved, true);
});

test("23: condition ANY — satisfied when at least one resolved operand is true", () => {
  const ctx = { participants: { alpha: "ABSENT", beta: "PRESENT" } };
  const result = evaluateConditionExpression({
    type: "ANY",
    operands: [{ type: "PRESENT", participantId: "alpha" }, { type: "PRESENT", participantId: "beta" }],
  }, conditionConnector(null), ctx);
  assert.equal(result.satisfied, true);
  assert.equal(result.resolved, true);
});

test("24: condition NOT — inverts a resolved operand", () => {
  const result = evaluateConditionExpression({
    type: "NOT",
    operand: { type: "PRESENT", participantId: "alpha" },
  }, conditionConnector(null), { participants: { alpha: "PRESENT" } });
  assert.equal(result.satisfied, false);
  assert.equal(result.resolved, true);
});

test("25: condition PRESENT — declared participant + PRESENT runtime status -> true", () => {
  const connector = conditionConnector(null);
  const yes = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, connector, { participants: { alpha: "PRESENT" } });
  assert.equal(yes.satisfied, true);
  assert.equal(yes.resolved, true);
});

test("25b: condition PRESENT — declared participant + ABSENT runtime status -> PRESENT false", () => {
  const connector = conditionConnector(null);
  const result = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, connector, { participants: { alpha: "ABSENT" } });
  assert.equal(result.satisfied, false);
  assert.equal(result.resolved, true);
});

test("25c: condition PRESENT — declared participant + UNKNOWN/missing runtime status -> unresolved", () => {
  const connector = conditionConnector(null);
  const missing = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, connector, { participants: {} });
  assert.equal(missing.resolved, false);
  assert.equal(missing.satisfied, false);
  const unknown = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, connector, { participants: { alpha: "UNKNOWN" } });
  assert.equal(unknown.resolved, false);
  const noContextAtAll = evaluateConditionExpression({ type: "PRESENT", participantId: "alpha" }, connector, null);
  assert.equal(noContextAtAll.resolved, false);
});

test("25d: PRESENT on a participant the connector never declared is rejected, not guessed", () => {
  const connector = conditionConnector(null);
  const result = evaluateConditionExpression({ type: "PRESENT", participantId: "gamma" }, connector, { participants: { gamma: "PRESENT" } });
  assert.equal(result.resolved, false);
  assert.equal(result.reason, "UNDECLARED_PARTICIPANT");
});

test("26: condition ABSENT — declared participant + ABSENT -> true", () => {
  const connector = conditionConnector(null);
  const result = evaluateConditionExpression({ type: "ABSENT", participantId: "alpha" }, connector, { participants: { alpha: "ABSENT" } });
  assert.equal(result.satisfied, true);
  assert.equal(result.resolved, true);
});

test("26b: condition ABSENT — declared participant + PRESENT -> ABSENT false", () => {
  const connector = conditionConnector(null);
  const result = evaluateConditionExpression({ type: "ABSENT", participantId: "alpha" }, connector, { participants: { alpha: "PRESENT" } });
  assert.equal(result.satisfied, false);
  assert.equal(result.resolved, true);
});

test("26c: condition ABSENT — unknown runtime presence -> unresolved, never guessed true", () => {
  const connector = conditionConnector(null);
  const result = evaluateConditionExpression({ type: "ABSENT", participantId: "alpha" }, connector, { participants: {} });
  assert.equal(result.resolved, false);
});

test("27: condition STATE — declared historical state + SATISFIED runtime status -> true", () => {
  const connector = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-state" },
    [{ stateId: "alpha-state", participantId: "alpha", gloss: null, measurementAvailability: "NOT_RECORDED" }],
  );
  const result = evaluateConditionExpression(connector.conditionExpression, connector, {
    states: { "alpha:alpha-state": "SATISFIED" },
  });
  assert.deepEqual(result, { satisfied: true, resolved: true, reason: null });
});

test("27b: condition STATE — UNSATISFIED runtime status -> false, resolved", () => {
  const connector = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-state" },
    [{ stateId: "alpha-state", participantId: "alpha", gloss: null, measurementAvailability: "NOT_RECORDED" }],
  );
  const result = evaluateConditionExpression(connector.conditionExpression, connector, {
    states: { "alpha:alpha-state": "UNSATISFIED" },
  });
  assert.equal(result.satisfied, false);
  assert.equal(result.resolved, true);
});

test("28: condition STATE — UNKNOWN/missing runtime status -> unresolved; undeclared state -> rejected", () => {
  const declared = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-state" },
    [{ stateId: "alpha-state", participantId: "alpha", gloss: null, measurementAvailability: "NOT_RECORDED" }],
  );
  const missing = evaluateConditionExpression(declared.conditionExpression, declared, { states: {} });
  assert.equal(missing.resolved, false);
  const noContext = evaluateConditionExpression(declared.conditionExpression, declared, null);
  assert.equal(noContext.resolved, false);

  const undeclared = conditionConnector({ type: "STATE", participantId: "alpha", stateId: "no-such-state" });
  const rejected = evaluateConditionExpression(undeclared.conditionExpression, undeclared, {
    states: { "alpha:no-such-state": "SATISFIED" },
  });
  assert.equal(rejected.resolved, false);
  assert.equal(rejected.reason, "UNDECLARED_STATE");
});

test("28b: SUPPORTED_2D on the historicalState alone does NOT satisfy STATE — measurementAvailability is not condition truth", () => {
  const connector = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-state" },
    [{ stateId: "alpha-state", participantId: "alpha", gloss: null, measurementAvailability: "SUPPORTED_2D" }],
  );
  const noRuntimeEvidence = evaluateConditionExpression(connector.conditionExpression, connector, null);
  assert.equal(noRuntimeEvidence.resolved, false, "a capturable measurementAvailability must not, by itself, satisfy STATE");
  const emptyContext = evaluateConditionExpression(connector.conditionExpression, connector, { states: {} });
  assert.equal(emptyContext.resolved, false);
});

test("28c: changing readingState.availability from read to abstained_* does not satisfy a historical STATE", () => {
  const connector = conditionConnector(
    { type: "STATE", participantId: "alpha", stateId: "alpha-state" },
    [{ stateId: "alpha-state", participantId: "alpha", gloss: null, measurementAvailability: "SUPPORTED_2D" }],
  );
  const registry = { "syn-cond": connector };
  const read = resolveHeritageConnections(synArgs({ connectorRegistry: registry, readingState: { heritageConstruct: "alpha", sourceLineage: "primary", availability: "read" } }));
  const abstained = resolveHeritageConnections(synArgs({ connectorRegistry: registry, readingState: { heritageConstruct: "alpha", sourceLineage: "primary", availability: "abstained_confidence" } }));
  assert.equal(read.activeConnectors.length, 0);
  assert.equal(abstained.activeConnectors.length, 0);
  assert.deepEqual(read.unavailableRelations.map((e) => e.disposition), abstained.unavailableRelations.map((e) => e.disposition));
});

test("28d: a connector whose condition cannot resolve is parked in unavailableRelations, never active", () => {
  const connector = conditionConnector({ type: "STATE", participantId: "alpha", stateId: "missing" });
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-cond": connector } }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].disposition, "CONDITION_UNMET");
});

/* ── item 4: source / lineage eligibility ─────────────────────────────────── */

test("source/lineage: runtime lineage (RUNTIME_PROSE, no restriction) is accepted", () => {
  assert.equal(resolveLineageRestriction({ runtimeStatus: "RUNTIME_PROSE", availability: "available", terminationState: "continue" }), "NONE");
});

test("source/lineage: a HERITAGE_ONLY lineage caps availability, never converts to a connected/measured claim", () => {
  const connector = synConnector({
    connectorId: "syn-cap",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
    measurementAvailability: "SUPPORTED_2D",
  });
  const heritageRegistry = {
    alpha: { constructId: "alpha", lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D", runtimeStatus: "HERITAGE_ONLY" }) } },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, connectorRegistry: { "syn-cap": connector } }));
  assert.equal(result.activeConnectors.length, 1);
  assert.equal(result.activeConnectors[0].relationshipAvailability, "HERITAGE_ONLY", "even a fully-capturable connector is capped by a HERITAGE_ONLY lineage");
});

test("source/lineage: a RESEARCH_ONLY lineage forces every candidate research-only, regardless of connector.runtimePolicy", () => {
  const connector = synConnector({
    connectorId: "syn-cap",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
  });
  const heritageRegistry = {
    alpha: { constructId: "alpha", lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D", runtimeStatus: "RESEARCH_ONLY" }) } },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, connectorRegistry: { "syn-cap": connector } }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "LINEAGE_RESEARCH_ONLY");
});

test("source/lineage: an abstaining lineage never becomes active", () => {
  const connector = synConnector({
    connectorId: "syn-cap",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const heritageRegistry = {
    alpha: { constructId: "alpha", lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D", availability: "abstention", terminationState: "abstain" }) } },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, connectorRegistry: { "syn-cap": connector } }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "LINEAGE_ABSTAINED");
});

test("source/lineage: an unknown sourceId never becomes active", () => {
  const connector = synConnector({ connectorId: "syn-unknown-source", sourceId: "does-not-exist", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] });
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-unknown-source": connector } }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "UNKNOWN_SOURCE");
});

test("source/lineage: source-required is never silently promoted", () => {
  const connector = synConnector({ connectorId: "syn-source-required", sourceId: "weak-source", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] });
  const sourceRegistry = { "weak-source": { citationStatus: "source-required" } };
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-source-required": connector }, sourceRegistry }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "SOURCE_INELIGIBLE");
});

test("source/lineage: a work-recorded (identified but unlocated) source is capped to a source panel, not active", () => {
  const connector = synConnector({ connectorId: "syn-work-recorded", sourceId: "weak-source", participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }] });
  const sourceRegistry = { ...SYN_SOURCE_REGISTRY, "weak-source": { citationStatus: "work-recorded" } };
  const result = resolveHeritageConnections(synArgs({ connectorRegistry: { "syn-work-recorded": connector }, sourceRegistry, depthMode: "SOURCE_DEEP" }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.sourcePanels[0].disposition, "SOURCE_PANEL_CEILING");
});

test("source/lineage: lineage citation/evidence/source can veto active presentation even when the CONNECTOR's own source is solid", () => {
  const connector = synConnector({
    connectorId: "syn-solid-connector-source",
    sourceId: "solid-source",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const sourceRegistry = { "solid-source": { citationStatus: "verified" } };
  const heritageRegistry = {
    alpha: {
      constructId: "alpha",
      lineages: {
        primary: { measurementAvailability: "SUPPORTED_2D", runtimeStatus: "RUNTIME_PROSE", availability: "available", terminationState: "continue", citationStatus: "work-recorded", evidenceStrength: "RECORDED_NOT_VERIFIED", sourceId: "solid-source" },
      },
    },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, connectorRegistry: { "syn-solid-connector-source": connector }, sourceRegistry, depthMode: "SOURCE_DEEP" }));
  assert.equal(result.activeConnectors.length, 0, "the connector's edition-recorded/verified source must not override the weaker lineage disposition");
  assert.equal(result.sourcePanels[0]?.disposition, "SOURCE_PANEL_CEILING");
});

/*
 * Item 2 (Stage 2 review): gate precedence. A RESEARCH_ONLY connector, or one
 * whose SELECTED LINEAGE is RESEARCH_ONLY, must never be promoted into
 * sourcePanels merely because source eligibility alone would compute
 * SOURCE_PANEL_CEILING. RESEARCH_ONLY is strictly more restrictive and must
 * win regardless of source strength.
 */
test("gate precedence: connector-level RESEARCH_ONLY + a weak (work-recorded) source stays RESEARCH_ONLY, never sourcePanels", () => {
  const connector = synConnector({
    connectorId: "syn-research-only-weak-source",
    sourceId: "weak-source",
    runtimePolicy: "RESEARCH_ONLY",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const sourceRegistry = { ...SYN_SOURCE_REGISTRY, "weak-source": { citationStatus: "work-recorded" } };
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-research-only-weak-source": connector },
    sourceRegistry,
    depthMode: "SOURCE_DEEP",
  }));
  assert.deepEqual(result.sourcePanels, [], "SOURCE_PANEL_CEILING must not promote a RESEARCH_ONLY connector into a source panel");
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "RESEARCH_ONLY");
});

test("gate precedence: lineage-level RESEARCH_ONLY + a weak (work-recorded) connector source stays LINEAGE_RESEARCH_ONLY, never sourcePanels", () => {
  const connector = synConnector({
    connectorId: "syn-lineage-research-only-weak-source",
    sourceId: "weak-source",
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const sourceRegistry = { ...SYN_SOURCE_REGISTRY, "weak-source": { citationStatus: "work-recorded" } };
  const heritageRegistry = {
    alpha: { constructId: "alpha", lineages: { primary: solidLineage({ measurementAvailability: "SUPPORTED_2D", runtimeStatus: "RESEARCH_ONLY" }) } },
  };
  const result = resolveHeritageConnections(synArgs({
    heritageRegistry,
    connectorRegistry: { "syn-lineage-research-only-weak-source": connector },
    sourceRegistry,
    depthMode: "SOURCE_DEEP",
  }));
  assert.deepEqual(result.sourcePanels, [], "SOURCE_PANEL_CEILING must not promote a lineage-RESEARCH_ONLY candidate into a source panel");
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "LINEAGE_RESEARCH_ONLY");
});

/*
 * Item 3 (Stage 2 review): runtime PARTICIPANT availability is its own axis,
 * independent of measurementAvailability and of whether a conditionExpression
 * exists at all.
 */
test("participant runtime availability: an explicitly ABSENT participant blocks an UNCONDITIONAL connector", () => {
  const connector = synConnector({
    connectorId: "syn-unconditional-absent",
    conditionExpression: null, // no condition to evaluate at all
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-unconditional-absent": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "PARTICIPANT_UNAVAILABLE");
  assert.equal(result.unavailableRelations[0].gateReasons[0], "PARTICIPANT_ABSENT");
});

test("participant runtime availability: an explicitly UNKNOWN participant also blocks an unconditional connector, without asserting falsity", () => {
  const connector = synConnector({
    connectorId: "syn-unconditional-unknown",
    conditionExpression: null,
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-unconditional-unknown": connector },
    conditionContext: { participants: { beta: "UNKNOWN" } },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations[0].disposition, "PARTICIPANT_UNAVAILABLE");
  assert.equal(result.unavailableRelations[0].gateReasons[0], "PARTICIPANT_UNKNOWN");
});

test("participant runtime availability: no entry at all (vs explicit ABSENT/UNKNOWN) carries no opinion and does not block", () => {
  const connector = synConnector({
    connectorId: "syn-unconditional-no-opinion",
    conditionExpression: null,
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const withEmptyContext = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-unconditional-no-opinion": connector },
    conditionContext: { participants: {} },
  }));
  const withNoContext = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-unconditional-no-opinion": connector },
    conditionContext: null,
  }));
  assert.equal(withEmptyContext.activeConnectors.length, 1);
  assert.equal(withNoContext.activeConnectors.length, 1);
});

test("participant runtime availability: ABSENT does not assert the historical claim is false — the connector is parked, not rejected", () => {
  const connector = synConnector({
    connectorId: "syn-absent-not-false",
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-absent-not-false": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  const entry = result.unavailableRelations[0];
  // It is fully present in the trace with its real provenance — "parked",
  // never simply discarded as if the historical relationship were untrue.
  assert.equal(entry.connectorId, "syn-absent-not-false");
  assert.equal(entry.sourceId, connector.sourceId);
  assert.equal(entry.evidenceClass, connector.evidenceClass);
});

/*
 * Item 3 (Stage 2 review, round 3): the generic participant-availability
 * gate must not pre-empt an explicit AST whose own semantics deliberately
 * test for absence. Integration tests through resolveHeritageConnections
 * (not just direct evaluateConditionExpression calls) — the earlier round's
 * tests proved the evaluator itself was correct; this proves the RESOLVER
 * actually reaches it instead of rejecting first.
 */
test("condition-aware participant gate: an explicit ABSENT conditionExpression is satisfied BY the participant being absent, through the full resolver", () => {
  const connector = synConnector({
    connectorId: "syn-absent-condition",
    conditionExpression: { type: "ABSENT", participantId: "beta" },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-absent-condition": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  assert.equal(result.unavailableRelations.length, 0, "must not be blocked by the generic PARTICIPANT_UNAVAILABLE gate");
  assert.equal(result.activeConnectors.length, 1);
  assert.equal(result.activeConnectors[0].connectorId, "syn-absent-condition");
  assert.deepEqual(result.activeConnectors[0].conditionResolution, { satisfied: true, resolved: true, reason: null });
});

test("condition-aware participant gate: an explicit PRESENT conditionExpression through the full resolver", () => {
  const connector = synConnector({
    connectorId: "syn-present-condition",
    conditionExpression: { type: "PRESENT", participantId: "beta" },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const satisfied = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-present-condition": connector },
    conditionContext: { participants: { beta: "PRESENT" } },
  }));
  assert.equal(satisfied.activeConnectors.length, 1);

  const unsatisfied = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-present-condition": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  assert.equal(unsatisfied.activeConnectors.length, 0);
  assert.equal(unsatisfied.unavailableRelations[0].disposition, "CONDITION_UNMET");
});

test("condition-aware participant gate: ANY(PRESENT alpha, ABSENT beta) through the full resolver", () => {
  const connector = synConnector({
    connectorId: "syn-any-condition",
    conditionExpression: {
      type: "ANY",
      operands: [
        { type: "PRESENT", participantId: "alpha" },
        { type: "ABSENT", participantId: "beta" },
      ],
    },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  // alpha ABSENT, beta ABSENT — the ANY is still satisfied via beta's ABSENT branch.
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-any-condition": connector },
    conditionContext: { participants: { alpha: "ABSENT", beta: "ABSENT" } },
  }));
  assert.equal(result.activeConnectors.length, 1);
});

test("condition-aware participant gate: NOT(PRESENT beta) through the full resolver", () => {
  const connector = synConnector({
    connectorId: "syn-not-condition",
    conditionExpression: { type: "NOT", operand: { type: "PRESENT", participantId: "beta" } },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-not-condition": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  assert.equal(result.activeConnectors.length, 1, "NOT(PRESENT beta) is satisfied when beta is ABSENT");
});

/*
 * Item 1 (Stage 2 review, round 4): the round-3 fix ("any conditionExpression
 * at all suspends the blanket gate for the WHOLE connector") was too broad.
 * The corrected rule: the AST owns availability semantics only for the
 * participantIds it actually references (referencedParticipantIds); a THIRD
 * declared participant the AST never mentions still falls under the blanket
 * rule. Required scenarios A-E, run through the full resolver.
 */
const threeParticipantConnector = (conditionExpression) => synConnector({
  connectorId: "syn-third-participant",
  conditionExpression,
  participants: [
    { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
    { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    { participantId: "gamma", nodeType: "CONSTRUCT", constructId: "gamma-construct", memberScope: "ALL_MEMBERS" },
  ],
});

test("A: participants alpha, beta — condition ABSENT(beta), beta ABSENT — satisfied, connector proceeds", () => {
  const connector = synConnector({
    connectorId: "syn-scenario-a",
    conditionExpression: { type: "ABSENT", participantId: "beta" },
    participants: [
      { participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" },
      { participantId: "beta", nodeType: "CONSTRUCT", constructId: "beta", memberScope: "ALL_MEMBERS" },
    ],
  });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-scenario-a": connector },
    conditionContext: { participants: { beta: "ABSENT" } },
  }));
  assert.equal(result.unavailableRelations.length, 0);
  assert.equal(result.activeConnectors.length, 1);
  assert.deepEqual(result.activeConnectors[0].conditionResolution, { satisfied: true, resolved: true, reason: null });
});

test("B: participants alpha, beta, gamma — condition ABSENT(beta); beta ABSENT, gamma ABSENT — PARTICIPANT_UNAVAILABLE (gamma is outside the AST)", () => {
  const connector = threeParticipantConnector({ type: "ABSENT", participantId: "beta" });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { beta: "ABSENT", gamma: "ABSENT" } },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].disposition, "PARTICIPANT_UNAVAILABLE");
  assert.equal(result.unavailableRelations[0].gateReasons[0], "PARTICIPANT_ABSENT");
});

test("C: same as B but gamma UNKNOWN — PARTICIPANT_UNAVAILABLE", () => {
  const connector = threeParticipantConnector({ type: "ABSENT", participantId: "beta" });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { beta: "ABSENT", gamma: "UNKNOWN" } },
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.unavailableRelations.length, 1);
  assert.equal(result.unavailableRelations[0].disposition, "PARTICIPANT_UNAVAILABLE");
  assert.equal(result.unavailableRelations[0].gateReasons[0], "PARTICIPANT_UNKNOWN");
});

test("D: same as B but gamma PRESENT — condition succeeds, connector proceeds", () => {
  const connector = threeParticipantConnector({ type: "ABSENT", participantId: "beta" });
  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { beta: "ABSENT", gamma: "PRESENT" } },
  }));
  assert.equal(result.unavailableRelations.length, 0);
  assert.equal(result.activeConnectors.length, 1);
});

test("E: ANY/NOT nested AST reference extraction — referencedParticipantIds walks ALL/ANY/NOT/STATE correctly", () => {
  assert.deepEqual(referencedParticipantIds(null), new Set());
  assert.deepEqual(
    referencedParticipantIds({
      type: "ANY",
      operands: [
        { type: "NOT", operand: { type: "PRESENT", participantId: "alpha" } },
        { type: "ALL", operands: [{ type: "ABSENT", participantId: "beta" }, { type: "STATE", participantId: "gamma", stateId: "s1" }] },
      ],
    }),
    new Set(["alpha", "beta", "gamma"]),
  );

  // Through the full resolver: a nested ANY(NOT(PRESENT alpha), ABSENT(beta))
  // references both alpha and beta; gamma is still outside the AST and an
  // explicit ABSENT on it must still block.
  const connector = threeParticipantConnector({
    type: "ANY",
    operands: [
      { type: "NOT", operand: { type: "PRESENT", participantId: "alpha" } },
      { type: "ABSENT", participantId: "beta" },
    ],
  });
  const blockedByGamma = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { alpha: "PRESENT", beta: "ABSENT", gamma: "ABSENT" } },
  }));
  assert.equal(blockedByGamma.activeConnectors.length, 0);
  assert.equal(blockedByGamma.unavailableRelations[0].disposition, "PARTICIPANT_UNAVAILABLE");

  const succeedsWithGammaPresent = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-third-participant": connector },
    conditionContext: { participants: { alpha: "PRESENT", beta: "ABSENT", gamma: "PRESENT" } },
  }));
  assert.equal(succeedsWithGammaPresent.activeConnectors.length, 1);
});

test("source/lineage: requesting a valid, non-default lineage is preserved exactly", () => {
  const heritageRegistry = {
    alpha: {
      constructId: "alpha",
      lineages: {
        primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }),
        variant: solidLineage({ measurementAvailability: "SUPPORTED_2D" }),
      },
    },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, readingState: { heritageConstruct: "alpha", sourceLineage: "variant" } }));
  assert.equal(result.primaryLineage, "variant");
});

test("source/lineage: an invalid lineage falls back to 'primary' by documented policy, never cross-contaminates a different lineage's data", () => {
  const heritageRegistry = {
    alpha: {
      constructId: "alpha",
      lineages: {
        primary: solidLineage({ measurementAvailability: "SUPPORTED_2D" }),
        variant: solidLineage({ measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT", runtimeStatus: "RESEARCH_ONLY" }),
      },
    },
  };
  const result = resolveHeritageConnections(synArgs({ heritageRegistry, readingState: { heritageConstruct: "alpha", sourceLineage: "not-a-real-lineage" } }));
  assert.equal(result.primaryLineage, "primary", "falls back to primary, not to variant or any other declared lineage");
});

/* ── item 7: negative-rule canonical-reference normalization ─────────────── */

test("negative-rule: the real registry's conceptual refs (fiveForms/fivePhases) block via the generic normalized matcher", () => {
  const connector = synConnector({
    connectorId: "syn-canonical",
    participants: [
      { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
      { participantId: "fivePhases", nodeType: "RELATED_SYSTEM", relatedSystemId: "five-phases", memberScope: "NODE" },
    ],
  });
  const violations = negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY);
  assert.ok(violations.includes("no-five-forms-five-phases-conflation"), violations.join(","));
});

test("negative-rule: the real registry blocks Twelve Palaces / zwds via the generic matcher", () => {
  const connector = synConnector({
    connectorId: "syn-zwds-canonical",
    participants: [
      { participantId: "twelvePalaces", nodeType: "CONSTRUCT", constructId: "twelvePalaces", memberScope: "ALL_MEMBERS" },
      { participantId: "zwds", nodeType: "RELATED_SYSTEM", relatedSystemId: "zwds", memberScope: "NODE" },
    ],
  });
  const violations = negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY);
  assert.ok(violations.includes("no-zwds-import"), violations.join(","));
});

test("negative-rule: Three Sections / Five Forms textual-adjacency promotion is blocked via the generic matcher", () => {
  const connector = synConnector({
    connectorId: "syn-adjacency",
    participants: [
      { participantId: "threeSections", nodeType: "CONSTRUCT", constructId: "threeSections", memberScope: "ALL_MEMBERS" },
      { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
    ],
  });
  const violations = negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY);
  assert.ok(violations.includes("no-three-sections-five-forms-promotion"), violations.join(","));
});

/*
 * Item 4 (Stage 2 review): FORBID_RUNTIME_BINDING must block a modern
 * runtime classification/binding, not every historical connector containing
 * heritageQiSe and fiveElements. Split into the two proofs the review asked
 * for explicitly.
 */
const historicalQiSeFiveFormsConnector = () => synConnector({
  connectorId: "syn-qise-canonical",
  sourceId: "heritage-five-elements-taiqing", // real, VERIFIED source — proves this is source-backed, not a placeholder
  evidenceClass: "EXPLICITLY_ATTESTED",
  participants: [
    { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" },
    { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
  ],
});

test("historical heritageQiSe + Five Forms coexistence is not automatically banned — NO attempted binding -> not BLOCKED_RUNTIME_BINDING, may be ordinary heritage presentation", () => {
  const connector = historicalQiSeFiveFormsConnector();
  // Not caught by the absolute coexistence checks at all.
  const negativeErrors = [];
  checkNegativeRelationshipInvariants(connector, negativeErrors);
  assert.deepEqual(negativeErrors, []);
  const generic = negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY);
  assert.equal(generic.includes("no-qise-to-form-classification"), false);
  // No runtimeBindingContext at all -> the type-aware check never fires,
  // structural co-presence alone is not an attempted binding.
  const noAttempt = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, null);
  assert.deepEqual(noAttempt, { violations: [], contextValid: true });

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": connector },
  }));
  const found = [...result.activeConnectors, ...result.unavailableRelations].find((e) => e.connectorId === "syn-qise-canonical");
  assert.ok(found);
  assert.notEqual(found.disposition, "BLOCKED_NEGATIVE_RULE");
  assert.notEqual(found.disposition, "BLOCKED_RUNTIME_BINDING");
  // Source-backed, VERIFIED_PRIMARY evidence, no other gate applies: it is
  // genuinely ordinary heritage presentation, up to and including ACTIVE —
  // still prohibitedForUserInference: true, as always.
  assert.equal(found.disposition, "ACTIVE");
  assert.equal(found.prohibitedForUserInference, true);
});

test("an attempted modern QiSe->FiveForms classification is blocked by the actual FORBID_RUNTIME_BINDING rule (SAME historical connector as above)", () => {
  const connector = historicalQiSeFiveFormsConnector();
  const runtimeBindingContext = { attemptedBindings: [{ fromRef: "heritageQiSe", toRef: "fiveElements" }] };

  // The actual registry rule (canonical-ref normalized) is what fires, and
  // only because an attempt was declared.
  const runtimeBindingHits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, runtimeBindingContext);
  assert.equal(runtimeBindingHits.contextValid, true);
  assert.ok(runtimeBindingHits.violations.includes("no-qise-to-form-classification"), runtimeBindingHits.violations.join(","));

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": connector },
    runtimeBindingContext,
  }));
  const found = [...result.activeConnectors, ...result.unavailableRelations].find((e) => e.connectorId === "syn-qise-canonical");
  assert.equal(found.disposition, "BLOCKED_RUNTIME_BINDING");
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "syn-qise-canonical"), false);
  assert.deepEqual(found.gateReasons, ["no-qise-to-form-classification"]);
});

test("an attempted binding for an UNRELATED ref pair does not block a connector it doesn't apply to", () => {
  const connector = historicalQiSeFiveFormsConnector();
  const runtimeBindingContext = { attemptedBindings: [{ fromRef: "shen", toRef: "measurementBinding" }] };
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, runtimeBindingContext);
  assert.deepEqual(hits, { violations: [], contextValid: true });
});

/*
 * Item 2 (Stage 2 review, round 4): the shen-unmeasurable rule
 * (fromRef "shen", toRef "measurementBinding" — a governance SENTINEL with
 * no participant counterpart) must be reachable through the SAME
 * type-aware mechanism as no-qise-to-form-classification, using the SAME
 * four-rivers-shen-corresponds connector (which already carries a
 * historicalState correctly marking shen UNMEASURABLE, so the SEPARATE
 * checkNegativeRelationshipInvariants historicalStates check does not fire
 * here — this proof is isolated to the runtime-binding path).
 */
test("Shen + explicit shen->measurementBinding attempt is blocked by the actual shen-unmeasurable registry rule", () => {
  const connector = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  const runtimeBindingContext = { attemptedBindings: [{ fromRef: "shen", toRef: "measurementBinding" }] };

  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, runtimeBindingContext);
  assert.equal(hits.contextValid, true);
  assert.ok(hits.violations.includes("shen-unmeasurable"), hits.violations.join(","));

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "four-rivers-shen-corresponds": connector },
    runtimeBindingContext,
  }));
  const found = result.unavailableRelations.find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.ok(found, "must be present, fully traceable — not silently dropped");
  assert.equal(found.disposition, "BLOCKED_RUNTIME_BINDING");
  assert.deepEqual(found.gateReasons, ["shen-unmeasurable"]);
});

test("the SAME Shen connector with NO binding attempt is not blocked merely because Shen exists historically", () => {
  const connector = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, null);
  assert.deepEqual(hits, { violations: [], contextValid: true });

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fourRivers", sourceLineage: "primary" },
  }));
  const found = [...result.activeConnectors, ...result.unavailableRelations].find((e) => e.connectorId === "four-rivers-shen-corresponds");
  assert.notEqual(found.disposition, "BLOCKED_RUNTIME_BINDING");
});

/*
 * Item 2: malformed runtimeBindingContext fails CLOSED — it must never
 * silently behave like "no attempt was made".
 */
test("malformed runtimeBindingContext (attemptedBindings not an array) fails closed for an implicated connector", () => {
  const connector = historicalQiSeFiveFormsConnector();
  const malformed = { attemptedBindings: "not-an-array" };
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, malformed);
  assert.equal(hits.contextValid, false);
  assert.ok(hits.violations.includes("no-qise-to-form-classification"), hits.violations.join(","));

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveElements", sourceLineage: "primary" },
    connectorRegistry: { ...HERITAGE_CONNECTOR_REGISTRY, "syn-qise-canonical": connector },
    runtimeBindingContext: malformed,
  }));
  const found = [...result.activeConnectors, ...result.unavailableRelations].find((e) => e.connectorId === "syn-qise-canonical");
  assert.equal(found.disposition, "RUNTIME_BINDING_CONTEXT_INVALID");
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "syn-qise-canonical"), false);
});

test("malformed runtimeBindingContext (one malformed entry among well-formed ones) still fails closed", () => {
  const connector = historicalQiSeFiveFormsConnector();
  const malformed = { attemptedBindings: [{ fromRef: "heritageQiSe", toRef: "fiveElements" }, { fromRef: "onlyFromRef" }] };
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, malformed);
  assert.equal(hits.contextValid, false);
  assert.ok(hits.violations.includes("no-qise-to-form-classification"));
});

test("malformed runtimeBindingContext does NOT block a connector that could never be implicated by any FORBID_RUNTIME_BINDING rule", () => {
  const connector = synConnector({
    connectorId: "syn-unrelated",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const malformed = { attemptedBindings: "not-an-array" };
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, malformed);
  assert.equal(hits.contextValid, false);
  assert.deepEqual(hits.violations, [], "a malformed context is not a license to block every connector, only ones it could plausibly implicate");

  const result = resolveHeritageConnections(synArgs({
    connectorRegistry: { "syn-unrelated": connector },
    runtimeBindingContext: malformed,
  }));
  assert.equal(result.activeConnectors.length, 1);
});

test("a genuinely EMPTY, well-formed attemptedBindings array is valid and means no attempt — not malformed", () => {
  const connector = historicalQiSeFiveFormsConnector();
  const hits = negativeRuleRuntimeBindingViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY, { attemptedBindings: [] });
  assert.deepEqual(hits, { violations: [], contextValid: true });
});

test("negative-rule: shen-unmeasurable is enforced (via historicalStates, unreachable to the pairwise-ref matcher by design)", () => {
  const connector = clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
  // The rule's toRef "measurementBinding" has no participant counterpart —
  // the generic matcher correctly never fires for it.
  const generic = negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY);
  assert.equal(generic.includes("shen-unmeasurable"), false);
  // A measurable Shen is still blocked (see test 11b above) by the dedicated check.
});

test("negative-rule: FORBID_RUNTIME_BINDING does not ban an otherwise legitimate historically-attested co-occurrence generically", () => {
  // A rule of type FORBID_RUNTIME_BINDING must not be treated by the generic
  // matcher as "these two refs may never appear together in ANY connector" —
  // only FORBID_RELATIONSHIP_FAMILY / FORBID_NODE_MAPPING rules are.
  const runtimeBindingRules = Object.values(HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY)
    .filter((r) => r.negativeRuleType === "FORBID_RUNTIME_BINDING");
  assert.ok(runtimeBindingRules.length > 0);
  for (const rule of runtimeBindingRules) {
    const connector = synConnector({
      connectorId: `syn-${rule.negativeRuleId}`,
      participants: [
        { participantId: "x", nodeType: "HERITAGE_CONCEPT", conceptId: rule.fromRef, memberScope: "NODE" },
      ],
    });
    // Single-participant connector cannot even pair fromRef/toRef — sanity
    // check that the generic matcher requires BOTH sides present, not one.
    assert.equal(negativeRuleViolations(connector, HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY).includes(rule.negativeRuleId), false);
  }
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

test("30: the resolver never mutates its injected registries, readingState or conditionContext", () => {
  const registrySnapshot = clone(HERITAGE_CONNECTOR_REGISTRY);
  const disagreementSnapshot = clone(HERITAGE_DISAGREEMENT_REGISTRY);
  const readingState = Object.freeze({ heritageConstruct: "fourRivers", sourceLineage: "primary" });
  const rotationState = Object.freeze({ recentConnectorIds: Object.freeze(["four-rivers-flow-and-banks"]) });
  const conditionContext = Object.freeze({ participants: Object.freeze({ shen: "PRESENT" }), states: Object.freeze({}) });

  assert.doesNotThrow(() => resolveHeritageConnections(realArgs({ readingState, rotationState, conditionContext })));
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
  assert.equal(summary.activeConnectors.length, 4);
});

test("unknown depthMode falls back to STANDARD rather than throwing", () => {
  const result = resolveHeritageConnections(realArgs({ depthMode: "NOT_A_MODE" }));
  assert.equal(result.renderPlan.presentationMode, "STANDARD");
});

test("relationshipAvailability values are always drawn from the declared enum", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: construct, sourceLineage: "primary" }, depthMode: "SOURCE_DEEP" }));
    for (const entry of [...result.activeConnectors, ...result.unavailableRelations, ...result.sourcePanels]) {
      assert.ok(RELATIONSHIP_AVAILABILITY.includes(entry.relationshipAvailability), entry.connectorId);
    }
  }
});

test("DEPTH_MODES is the declared three-value enum", () => {
  assert.deepEqual(DEPTH_MODES, ["SUMMARY", "STANDARD", "SOURCE_DEEP"]);
});

test("resolveSourceEligibility: only 'verified' is ELIGIBLE — item 5, edition-recorded and verified are NOT the same rung", () => {
  const conn = (sourceId) => synConnector({ connectorId: "x", sourceId, participants: [] });
  const solid = solidLineage({ measurementAvailability: "SUPPORTED_2D" });
  const withS = (status) => ({ s: { citationStatus: status }, [solid.sourceId]: { citationStatus: "verified" } });
  assert.equal(resolveSourceEligibility(conn("s"), solid, withS("verified")), "ELIGIBLE");
  assert.equal(resolveSourceEligibility(conn("s"), solid, withS("edition-recorded")), "SOURCE_PANEL_CEILING",
    "edition-recorded (identified, not independently checked) must not collapse into the same strength as verified");
  assert.equal(resolveSourceEligibility(conn("s"), solid, withS("work-recorded")), "SOURCE_PANEL_CEILING");
  assert.equal(resolveSourceEligibility(conn("s"), solid, withS("source-required")), "BLOCKED");
  assert.equal(resolveSourceEligibility(conn("s"), solid, withS("attribution-contradicted")), "BLOCKED");
  assert.equal(resolveSourceEligibility(conn("missing"), solid, withS("verified")), "UNKNOWN_SOURCE");
});

test("resolveSourceEligibility: item 5 — connector.evidenceStrength gates too; a verified source cannot upgrade an unverified predicate", () => {
  const solid = solidLineage({ measurementAvailability: "SUPPORTED_2D" });
  const sourceRegistry = { "verified-source": { citationStatus: "verified" }, [solid.sourceId]: { citationStatus: "verified" } };
  const weakEvidence = synConnector({ connectorId: "x", sourceId: "verified-source", evidenceStrength: "RECORDED_NOT_VERIFIED", participants: [] });
  const strongEvidence = synConnector({ connectorId: "x", sourceId: "verified-source", evidenceStrength: "VERIFIED_PRIMARY", participants: [] });
  const corroborated = synConnector({ connectorId: "x", sourceId: "verified-source", evidenceStrength: "CORROBORATED_NOT_VERIFIED", participants: [] });
  assert.equal(resolveSourceEligibility(weakEvidence, solid, sourceRegistry), "SOURCE_PANEL_CEILING",
    "a verified SOURCE must not upgrade a connector whose own evidenceStrength is RECORDED_NOT_VERIFIED");
  assert.equal(resolveSourceEligibility(strongEvidence, solid, sourceRegistry), "ELIGIBLE");
  assert.equal(resolveSourceEligibility(corroborated, solid, sourceRegistry), "ELIGIBLE",
    "verified or corroborated evidence reaches full eligibility");
});

/*
 * Item 5 (Stage 2 review, round 3): the specific real connector named in the
 * review. Its own evidenceStrength is RECORDED_NOT_VERIFIED — the weakest
 * rung — even though the source it cites (heritage-five-mountains) is fully
 * VERIFIED. Under the corrected ladder this now ceilings at SOURCE_PANEL,
 * not ACTIVE. This is a real, honest behaviour change, not a test-fitting
 * exercise — see the delivery report for why this is flagged for
 * source-review rather than silently reinterpreted.
 */
test("five-mountains-mutual-facing-fullness: RECORDED_NOT_VERIFIED evidenceStrength ceilings it at SOURCE_PANEL even under its own well-sourced lineage", () => {
  const connector = HERITAGE_CONNECTOR_REGISTRY["five-mountains-mutual-facing-fullness"];
  assert.equal(connector.evidenceStrength, "RECORDED_NOT_VERIFIED");
  assert.equal(connector.runtimePolicy, "HERITAGE_PRESENTATION_ALLOWED");

  const result = resolveHeritageConnections(realArgs({
    readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" },
    depthMode: "SOURCE_DEEP",
  }));
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "five-mountains-mutual-facing-fullness"), false);
  const panel = result.sourcePanels.find((e) => e.connectorId === "five-mountains-mutual-facing-fullness");
  assert.ok(panel, "held at SOURCE_PANEL_CEILING, not simply dropped — it is still fully traceable");
  assert.equal(panel.disposition, "SOURCE_PANEL_CEILING");

  // Confirm it is genuinely a SOURCE-EVIDENCE ceiling, not some other gate:
  // the source itself IS independently verified.
  const source = SOURCE_REGISTRY[connector.sourceId];
  assert.equal(source.citationStatus, "verified");
});

test("resolveSourceEligibility: item 1 — a weak/held LINEAGE ceilings an otherwise-solid connector source; the weaker side always wins", () => {
  const conn = (sourceId) => synConnector({ connectorId: "x", sourceId, participants: [] });
  const sourceRegistry = { "solid-source": { citationStatus: "verified" } };

  const weakByCitation = { citationStatus: "work-recorded", evidenceStrength: "VERIFIED_PRIMARY", sourceId: "solid-source" };
  assert.equal(resolveSourceEligibility(conn("solid-source"), weakByCitation, sourceRegistry), "SOURCE_PANEL_CEILING",
    "a verified connector source must not override a work-recorded lineage citationStatus");

  const weakByEvidence = { citationStatus: "verified", evidenceStrength: "RECORDED_NOT_VERIFIED", sourceId: "solid-source" };
  assert.equal(resolveSourceEligibility(conn("solid-source"), weakByEvidence, sourceRegistry), "SOURCE_PANEL_CEILING",
    "a verified connector source must not override a lineage whose OWN evidenceStrength is unverified");

  const heldByLineageSourceRecord = { citationStatus: "verified", evidenceStrength: "VERIFIED_PRIMARY", sourceId: "actually-weak-source" };
  const sourceRegistryWithWeakLineageSource = { "solid-source": { citationStatus: "verified" }, "actually-weak-source": { citationStatus: "source-required" } };
  assert.equal(resolveSourceEligibility(conn("solid-source"), heldByLineageSourceRecord, sourceRegistryWithWeakLineageSource), "BLOCKED",
    "the lineage's OWN cited source record is cross-checked even when the lineage's denormalized citationStatus looks solid");

  const bothSolid = { citationStatus: "verified", evidenceStrength: "VERIFIED_PRIMARY", sourceId: "solid-source" };
  assert.equal(resolveSourceEligibility(conn("solid-source"), bothSolid, sourceRegistry), "ELIGIBLE");
});

/*
 * Item 1 (Stage 2 review, round 3), the exact case specified: a lineage
 * claiming citationStatus "verified" / evidenceStrength "VERIFIED_PRIMARY"
 * while citing a sourceId that is UNRESOLVABLE (not merely weak — absent
 * from the injected sourceRegistry entirely) must fail closed, even when
 * the CONNECTOR's own source is genuinely verified.
 */
test("resolveSourceEligibility: item 1 — an UNRESOLVABLE lineage.sourceId fails closed, never falls back to the lineage's own claimed citationStatus", () => {
  const conn = synConnector({ connectorId: "x", sourceId: "connector-source", participants: [] });
  const sourceRegistry = { "connector-source": { citationStatus: "verified" } }; // "does-not-exist" deliberately absent
  const lineageWithMissingSource = {
    citationStatus: "verified",
    evidenceStrength: "VERIFIED_PRIMARY",
    sourceId: "does-not-exist",
  };
  assert.equal(
    resolveSourceEligibility(conn, lineageWithMissingSource, sourceRegistry),
    "BLOCKED",
    "an unverifiable lineage source claim must not grant eligibility just because the connector's own source is solid",
  );
});

test("resolveHeritageConnections: item 1 — an unresolvable lineage source keeps a genuinely well-sourced connector OUT of activeConnectors", () => {
  const connector = synConnector({
    connectorId: "syn-connector-solid",
    sourceId: "connector-source",
    participants: [{ participantId: "alpha", nodeType: "CONSTRUCT", constructId: "alpha", memberScope: "ALL_MEMBERS" }],
  });
  const sourceRegistry = { "connector-source": { citationStatus: "verified" } };
  const heritageRegistry = {
    alpha: {
      constructId: "alpha",
      lineages: {
        primary: {
          measurementAvailability: "SUPPORTED_2D",
          runtimeStatus: "RUNTIME_PROSE",
          availability: "available",
          terminationState: "continue",
          citationStatus: "verified",
          evidenceStrength: "VERIFIED_PRIMARY",
          sourceId: "does-not-exist",
        },
      },
    },
  };
  const result = resolveHeritageConnections(synArgs({
    heritageRegistry,
    connectorRegistry: { "syn-connector-solid": connector },
    sourceRegistry,
    depthMode: "SOURCE_DEEP",
  }));
  assert.equal(result.activeConnectors.length, 0);
  assert.equal(result.activeConnectors.some((e) => e.connectorId === "syn-connector-solid"), false);
});

test("prohibitedForUserInference stays true on every surfaced entry", () => {
  for (const construct of Object.keys(HERITAGE_REGISTRY)) {
    const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: construct, sourceLineage: "primary" }, depthMode: "SOURCE_DEEP" }));
    for (const entry of [...result.activeConnectors, ...result.sourcePanels]) {
      assert.equal(entry.prohibitedForUserInference, true);
    }
  }
});

test("wordingVariantIndices are stable integers, not a wording corpus", () => {
  const result = resolveHeritageConnections(realArgs({ readingState: { heritageConstruct: "fiveMountains", sourceLineage: "taiqing-siku" } }));
  for (const [, index] of Object.entries(result.renderPlan.wordingVariantIndices)) {
    assert.equal(typeof index, "number");
    assert.ok(Number.isInteger(index) && index >= 0);
  }
});
