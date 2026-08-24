import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HERITAGE_REGISTRY,
  HERITAGE_CONNECTOR_REGISTRY,
  HERITAGE_DISAGREEMENT_REGISTRY,
} from "../../src/heritage/registry.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "../../src/heritage/negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "../../src/heritage/composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "../../src/heritage/concepts.js";
import { HERITAGE_CONSTRUCT_IDS } from "../../src/heritage/constants.js";
import {
  validateHeritageRecord,
  validateHeritageSourceRecord,
  validateHeritageConnector,
  validateHeritageDisagreementRecord,
  validateHeritageNegativeRule,
  validateHeritageCompositionPolicy,
  validateHeritageConcept,
} from "../../src/heritage/validator.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

const clone = (value) => structuredClone(value);
const fiveOfficers = () => clone(HERITAGE_REGISTRY.fiveOfficers);
const fiveMountains = () => clone(HERITAGE_REGISTRY.fiveMountains);

const recordCases = [
  ["HVR-001", "missing construct identity", fiveOfficers,
    (record) => { delete record.constructId; }, /constructId/i],
  ["HVR-002", "contradictory lineage identity", fiveOfficers,
    (record) => { record.lineages.primary.lineageId = "other"; }, /contradictory lineageId/i],
  ["HVR-003", "unknown provenance source", fiveOfficers,
    (record) => { record.lineages.primary.sourceId = "not-a-source"; }, /unknown sourceId/i],
  ["HVR-004", "duplicate supporting source", fiveOfficers,
    (record) => { record.lineages.primary.supportingSourceIds = ["heritage-five-officers-sxqb", "heritage-five-officers-sxqb"]; }, /duplicate/i],
  ["HVR-005", "primary source repeated as support", fiveOfficers,
    (record) => { record.lineages.primary.supportingSourceIds = [record.lineages.primary.sourceId]; }, /repeats the primary sourceId/i],
  ["HVR-006", "invalid measurement state", fiveOfficers,
    (record) => { record.lineages.primary.measurementAvailability = "GUESSED"; }, /measurementAvailability/i],
  ["HVR-007", "abstention without reason", fiveOfficers,
    (record) => { record.lineages.primary.availability = "abstention"; record.lineages.primary.terminationState = "abstain"; record.lineages.primary.abstentionReason = null; }, /abstention requires abstentionReason/i],
  ["HVR-008", "abstention without termination", fiveOfficers,
    (record) => { record.lineages.primary.availability = "abstention"; record.lineages.primary.terminationState = "continue"; record.lineages.primary.abstentionReason = "Source unavailable."; }, /terminationState abstain/i],
  ["HVR-009", "prohibited lineage without inference lock", fiveOfficers,
    (record) => { record.lineages.primary.safetyStatus = "prohibited"; record.lineages.primary.prohibitedForUserInference = false; }, /prohibited safety status/i],
  ["HVR-012", "verified citation without section locator", fiveOfficers,
    (record) => { record.lineages.primary.sectionLocator = null; record.lineages.primary.sectionLocatorStatus = "NOT_RECORDED"; }, /verified.*sectionLocator/i],
  ["HVR-013", "verified evidence exceeding citation", fiveOfficers,
    (record) => { record.lineages.primary.citationStatus = "work-recorded"; }, /verified primary evidence/i],
  ["HVR-014", "contradicted attribution promoted to verified evidence", fiveOfficers,
    (record) => { record.lineages.primary.citationStatus = "attribution-contradicted"; }, /contradicted attribution/i],
  ["HVR-015", "runtime copy without translation", fiveOfficers,
    (record) => { record.lineages.primary.translationProvenance = "NOT_TRANSLATED_HERITAGE_ONLY"; record.lineages.primary.translationAgentId = null; }, /runtime prose requires translation provenance/i],
  ["HVR-016", "project translation without registered agent", fiveOfficers,
    (record) => { record.lineages.primary.translationAgentId = "unknown-agent"; }, /registered translationAgentId/i],
  ["HVR-017", "alias without witness provenance", fiveOfficers,
    (record) => { record.lineages.primary.constituents[0].aliasWitnesses = []; }, /alias.*witness provenance/i],
  ["HVR-018", "duplicate constituent identity", fiveOfficers,
    (record) => { record.lineages.primary.constituents.push(clone(record.lineages.primary.constituents[0])); }, /constituentId.*duplicate/i],
  ["HVR-019", "related system also declared as alias", fiveOfficers,
    (record) => { record.aliases = [record.lineages.primary.relatedSystems[0].canonicalChineseName]; }, /cannot also be a construct alias/i],
  ["HVR-020", "malformed unattested research claim", fiveOfficers,
    (record) => { record.lineages.primary.unverifiedClaims[0].attestationStatus = "RECORDED"; }, /attestationStatus/i],
];

for (const [id, description, make, mutate, expected] of recordCases) {
  test(`falsification ${id}: ${description}`, () => {
    const record = make();
    mutate(record);
    const result = validateHeritageRecord(record);
    assert.equal(result.valid, false, `${id} mutation unexpectedly passed`);
    assert.ok(result.errors.some((error) => expected.test(error)), result.errors.join("; "));
  });
}

/*
 * Connector falsification. Bases are cloned from the real connector graph
 * (registry.js) rather than a synthetic fixture, so these tests fail the
 * moment the shipped data itself regresses — the same reasoning the HVR
 * cases above apply to HERITAGE_REGISTRY.
 */
const connectorContext = (overrides = {}) => ({
  constructIds: HERITAGE_CONSTRUCT_IDS,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  relatedSystemIds: ["five-phases", "zwds", "medical-five-organs", "five-directions-cosmology"],
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  sourceRegistry: SOURCE_REGISTRY,
  ...overrides,
});
const correspondsBase = () => clone(HERITAGE_CONNECTOR_REGISTRY["five-mountains-four-rivers-corresponds"]);
const directedShenBase = () => clone(HERITAGE_CONNECTOR_REGISTRY["four-rivers-shen-corresponds"]);
const collectiveBase = () => clone(HERITAGE_CONNECTOR_REGISTRY["five-mountains-mutual-facing-fullness"]);
const conjunctiveBase = () => clone(HERITAGE_CONNECTOR_REGISTRY["yuebo-mountains-rivers-form-shen-configuration"]);

const connectorCases = [
  ["HVC-001", "missing connector ID", correspondsBase,
    (c) => { delete c.connectorId; }, /connectorId/i],
  ["HVC-002", "invalid relationship type", correspondsBase,
    (c) => { c.relationshipType = "INVALID_TYPE"; }, /relationshipType/i],
  ["HVC-003", "REQUIRES not DIRECTED", correspondsBase,
    (c) => { c.relationshipType = "REQUIRES"; }, /REQUIRES requires direction DIRECTED/i],
  ["HVC-004", "MODIFIES not DIRECTED", correspondsBase,
    (c) => { c.relationshipType = "MODIFIES"; }, /MODIFIES requires direction DIRECTED/i],
  ["HVC-005", "SEQUENTIAL_RELATION not ORDERED", correspondsBase,
    (c) => { c.relationshipType = "SEQUENTIAL_RELATION"; }, /SEQUENTIAL_RELATION requires direction ORDERED/i],
  ["HVC-006", "CONJUNCTIVE_CONFIGURATION not UNDIRECTED", conjunctiveBase,
    (c) => { c.relationshipDirection = { kind: "DIRECTED", from: ["fiveMountains"], to: ["fourRivers"] }; }, /CONJUNCTIVE_CONFIGURATION requires direction UNDIRECTED/i],
  ["HVC-007", "COLLECTIVE_RULE without collectiveMode", collectiveBase,
    (c) => { delete c.collectiveMode; }, /COLLECTIVE_RULE requires collectiveMode/i],
  ["HVC-008", "collectiveMode on inappropriate type", correspondsBase,
    (c) => { c.collectiveMode = "ALL_MEMBERS"; }, /collectiveMode is only valid on COLLECTIVE_RULE/i],
  ["HVC-009", "unknown participant referenced by direction", directedShenBase,
    (c) => { c.relationshipDirection.to = ["ghost-participant"]; }, /unknown participant/i],
  ["HVC-010", "duplicate participant", correspondsBase,
    (c) => { c.participants.push(clone(c.participants[0])); }, /participantId.*duplicate/i],
  ["HVC-011", "invalid self-edge", directedShenBase,
    (c) => { c.relationshipDirection = { kind: "DIRECTED", from: ["fourRivers"], to: ["fourRivers"] }; }, /invalid self-edge/i],
  ["HVC-012", "unknown source", correspondsBase,
    (c) => { c.sourceId = "not-a-source"; }, /unknown source/i],
  ["HVC-013", "unknown concept", directedShenBase,
    (c) => { c.participants.find((p) => p.nodeType === "HERITAGE_CONCEPT").conceptId = "not-a-concept"; }, /unknown heritage concept/i],
  ["HVC-014", "unknown related system", correspondsBase,
    (c) => { c.participants.push({ participantId: "ghost-system", nodeType: "RELATED_SYSTEM", relatedSystemId: "not-a-system", memberScope: "NODE" }); }, /unknown related system/i],
  ["HVC-016", "invalid disagreement reference", correspondsBase,
    (c) => { c.disagreementIds = ["not-a-disagreement"]; }, /unknown disagreement/i],
  ["HVC-017", "invalid alternate connector reference", correspondsBase,
    (c) => { c.alternateConnectorIds = ["not-a-connector"]; }, /unknown connector/i],
  ["HVC-018", "malformed AST", correspondsBase,
    (c) => { c.conditionExpression = { type: "MALFORMED" }; }, /invalid type/i],
  ["HVC-019", "empty ALL", correspondsBase,
    (c) => { c.conditionExpression = { type: "ALL", operands: [] }; }, /ALL requires at least one operand/i],
  ["HVC-020", "empty ANY", correspondsBase,
    (c) => { c.conditionExpression = { type: "ANY", operands: [] }; }, /ANY requires at least one operand/i],
  ["HVC-021", "AST depth exceeds 4", correspondsBase,
    (c) => {
      c.participants.push({ participantId: "leaf", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "NODE" });
      c.conditionExpression = { type: "NOT", operand: { type: "NOT", operand: { type: "NOT", operand: { type: "NOT", operand: { type: "PRESENT", participantId: "leaf" } } } } };
    }, /exceeds max depth/i],
  ["HVC-022", "more than 8 operands", correspondsBase,
    (c) => {
      c.conditionExpression = {
        type: "ANY",
        operands: Array.from({ length: 9 }, () => ({ type: "PRESENT", participantId: "fiveMountains" })),
      };
    }, /exceeds max operands/i],
  ["HVC-023", "unknown STATE", correspondsBase,
    (c) => { c.conditionExpression = { type: "STATE", participantId: "fiveMountains", stateId: "no-such-state" }; }, /undeclared historicalState/i],
  ["HVC-024", "measurable Shen", directedShenBase,
    (c) => { c.historicalStates[0].measurementAvailability = "SUPPORTED_2D"; }, /shen-unmeasurable/i],
  ["HVC-026", "Qi Se classifying Five Forms", correspondsBase,
    (c) => {
      c.participants = [
        { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" },
        { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
      ];
    }, /no-qise-to-form-classification/i],
  ["HVC-027", "Five Forms/Five Phases conflation", correspondsBase,
    (c) => {
      c.participants = [
        { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
        { participantId: "fivePhases", nodeType: "RELATED_SYSTEM", relatedSystemId: "five-phases", memberScope: "NODE" },
      ];
    }, /no-five-forms-five-phases-conflation/i],
  ["HVC-028", "Zi Wei Dou Shu contamination", correspondsBase,
    (c) => {
      c.participants = [
        { participantId: "twelvePalaces", nodeType: "CONSTRUCT", constructId: "twelvePalaces", memberScope: "ALL_MEMBERS" },
        { participantId: "zwds", nodeType: "RELATED_SYSTEM", relatedSystemId: "zwds", memberScope: "NODE" },
      ];
    }, /no-zwds-import/i],
  ["HVC-029", "editorial policy in historical graph", correspondsBase,
    (c) => { c.policyType = "EDITORIAL_JUXTAPOSITION"; }, /editorial composition policy/i],
  ["HVC-030", "verified citation without required locator", directedShenBase,
    (c) => { c.sectionLocatorStatus = "RECORDED"; }, /verified.*section locator/i],
  ["HVC-033", "textual adjacency promoted to historical relationship", correspondsBase,
    (c) => {
      c.participants = [
        { participantId: "threeSections", nodeType: "CONSTRUCT", constructId: "threeSections", memberScope: "ALL_MEMBERS" },
        { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
      ];
    }, /no-three-sections-five-forms-promotion/i],
];

for (const [id, description, make, mutate, expected] of connectorCases) {
  test(`connector falsification ${id}: ${description}`, () => {
    const value = make();
    mutate(value);
    const result = validateHeritageConnector(value, connectorContext());
    assert.equal(result.valid, false, `${id} mutation unexpectedly passed`);
    assert.ok(result.errors.some((error) => expected.test(error)), result.errors.join("; "));
  });
}

test("connector falsification HVC-015: missing disagreement target", () => {
  const disagreement = clone(HERITAGE_DISAGREEMENT_REGISTRY["three-sections-boundaries"]);
  disagreement.target.targetRef = "not-a-construct";
  const result = validateHeritageDisagreementRecord(disagreement, {
    constructIds: HERITAGE_CONSTRUCT_IDS,
    connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
    sourceRegistry: SOURCE_REGISTRY,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /missing disagreement target/i.test(error)), result.errors.join("; "));
});

test("connector falsification HVC-025: modern Qi Se binding to heritageQiSe", () => {
  const concept = clone(HERITAGE_CONCEPT_REGISTRY.heritageQiSe);
  concept.modernMeasurementBinding = "qise-metrics-v1";
  const result = validateHeritageConcept(concept);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /heritageQiSe/i.test(error)), result.errors.join("; "));
});

test("connector falsification HVC-032: negative-rule violation (product/governance rule fabricated a source)", () => {
  const rule = clone(HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY["no-zwds-import"]);
  rule.sourceIds = ["heritage-five-elements-taiqing"];
  const result = validateHeritageNegativeRule(rule);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /cannot cite a historical sourceId/i.test(error)), result.errors.join("; "));
});

test("negative rule falsification: historical finding without a source", () => {
  const rule = clone(HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY["no-five-forms-five-phases-conflation"]);
  rule.sourceIds = [];
  const result = validateHeritageNegativeRule(rule);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /requires at least one sourceId/i.test(error)), result.errors.join("; "));
});

test("editorial composition policy falsification: cannot assert a historical relationship", () => {
  const policy = clone(HERITAGE_COMPOSITION_POLICIES["sources-shown-beside-one-another"]);
  policy.historicalRelationshipAsserted = true;
  const result = validateHeritageCompositionPolicy(policy);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /historicalRelationshipAsserted/i.test(error)), result.errors.join("; "));
});

test("heritage concept falsification: shen cannot become measurable", () => {
  const concept = clone(HERITAGE_CONCEPT_REGISTRY.shen);
  concept.measurementAvailability = "SUPPORTED_2D";
  const result = validateHeritageConcept(concept);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /measurable Shen/i.test(error)), result.errors.join("; "));
});

const sourceCases = [
  ["HVS-001", "section status without section locator",
    (source) => { source.sectionLocator = null; source.sectionLocatorStatus = "RECORDED"; }, /requires sectionLocator/i],
  ["HVS-002", "folio locator without folio status",
    (source) => { source.folioLocator = "folio 1"; source.folioLocatorStatus = "NOT_RECORDED"; }, /folioLocator requires/i],
  ["HVS-003", "non-HTTPS stable URL",
    (source) => { source.sourceUrl = "http://example.test/source"; }, /HTTPS URL/i],
  ["HVS-004", "malformed artifact hash",
    (source) => { source.sha256 = "bad-hash"; }, /sha256/i],
  ["HVS-005", "discovery surrogate promoted to verified",
    (source) => { source.citationStatus = "verified"; source.sectionLocatorStatus = "VERIFIED"; source.sectionLocator = "section"; }, /Discovery-only source cannot be verified/i],
  ["HVS-006", "unresolved source promoted to verified",
    (source) => {
      source.citationStatus = "verified";
      source.sectionLocatorStatus = "VERIFIED";
      source.sectionLocator = "section";
      source.sourceAccess = "REFERENCE_ONLY";
      source.bibliographicIdentityStatus = "UNRESOLVED";
    }, /unresolved bibliographic identity/i],
  ["HVS-007", "commit SHA substituted for SHA-256",
    (source) => { source.sha256 = "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678"; }, /sha256/i],
  ["HVS-008", "invalid WYG PB marker",
    (source) => { source.folioLocatorKind = "WYG_PB"; source.folioLocator = "page 18a"; }, /WYG_PB requires a folioLocator/i],
];

for (const [id, description, mutate, expected] of sourceCases) {
  test(`falsification ${id}: ${description}`, () => {
    const source = clone(SOURCE_REGISTRY["heritage-taiqing-shidian-discovery"]);
    mutate(source);
    const result = validateHeritageSourceRecord(source);
    assert.equal(result.valid, false, `${id} mutation unexpectedly passed`);
    assert.ok(result.errors.some((error) => expected.test(error)), result.errors.join("; "));
  });
}
