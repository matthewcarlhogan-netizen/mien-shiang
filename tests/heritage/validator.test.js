import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateHeritageFieldFinding,
  validateHeritageRecord,
  validateHeritageSourceRecord,
} from "../../src/heritage/validator.js";
import {
  heritageFieldFindingFixtures,
  heritageFixtures,
} from "../../src/heritage/fixtures.js";
import {
  HERITAGE_MEASUREMENT_AVAILABILITY,
  HERITAGE_TRANSLATION_PROVENANCE,
  HeritageConnectorSchema,
} from "../../src/heritage/schema.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

/*
 * A tiny, purpose-built structural checker for the condition-AST fragment —
 * this repo has no JSON Schema validation library dependency, so this is not
 * a general JSON Schema engine, only enough to prove the six node shapes are
 * enforced and nothing else validates.
 */
function matchesConditionNode(defs, node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return false;
  const branches = defs.conditionNode.oneOf;
  return branches.some((branch) => {
    const keys = Object.keys(branch.properties);
    if (!branch.required.every((k) => k in node)) return false;
    if (Object.keys(node).some((k) => !keys.includes(k))) return false; // additionalProperties: false
    if (branch.properties.type.const !== node.type) return false;
    for (const [key, propSchema] of Object.entries(branch.properties)) {
      if (key === "type") continue;
      const value = node[key];
      if (propSchema.type === "string") {
        if (typeof value !== "string" || value.length < 1) return false;
      } else if (propSchema.$ref) {
        if (!matchesConditionNode(defs, value)) return false;
      } else if (propSchema.type === "array") {
        if (!Array.isArray(value) || value.length < (propSchema.minItems || 0)) return false;
        if (!value.every((item) => matchesConditionNode(defs, item))) return false;
      }
    }
    return true;
  });
}

const baseLineage = (overrides = {}) => ({
  lineageId: "primary",
  definition: "An attributed source definition.",
  source: "An existing source record.",
  sourceId: "heritage-three-sections",
  supportingSourceIds: [],
  evidenceKind: "POSITIVE_CLAIM",
  evidenceStrength: "RECORDED_NOT_VERIFIED",
  sectionLocator: null,
  sectionLocatorStatus: "NOT_RECORDED",
  folioLocator: null,
  folioLocatorStatus: "NOT_RECORDED",
  citationStatus: "source-required",
  rightsStatus: "unverified",
  workRightsStatus: "unverified",
  editionRightsStatus: "unverified",
  measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
  runtimeStatus: "RUNTIME_PROSE",
  terminationState: "continue",
  availability: "available",
  abstentionReason: null,
  abstentionReasonCode: null,
  safetyStatus: "safe",
  prohibitedForUserInference: true,
  permittedHeritageSemantics: "Report the source claim as attributed.",
  prohibitedInference: "Do not infer a user trait from this source claim.",
  translationProvenance: "PROJECT_ORIGINAL",
  translationAgentId: "repository-editorial",
  constituents: [],
  relatedSystems: [],
  disagreements: [],
  unverifiedClaims: [],
  negativeFinding: null,
  note: null,
  ...overrides,
  });
const validRecord = (overrides = {}) => ({
  constructId: "test-construct",
  canonicalChineseName: "三停",
  canonicalNameStatus: "RECORDED_NOT_VERIFIED",
  aliases: [],
  verificationStatus: "RECORDED_NOT_VERIFIED",
  prohibitedForUserInference: true,
  lineages: { primary: baseLineage() },
  ...overrides,
});

test("the machine-readable manifest exposes the required measurement states", () => {
  assert.ok(HERITAGE_MEASUREMENT_AVAILABILITY.includes("SUPPORTED_2D"));
  assert.ok(HERITAGE_MEASUREMENT_AVAILABILITY.includes("PERMANENTLY_ABSTAIN"));
  assert.ok(HERITAGE_MEASUREMENT_AVAILABILITY.includes("NOT_RECORDED"));
});

test("validator accepts a complete attributed record", () => {
  const result = validateHeritageRecord(validRecord());
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.deepEqual(result.errors, []);
});

test("validator rejects missing top-level identity and safety boundary", () => {
  const record = validRecord();
  delete record.constructId;
  delete record.prohibitedForUserInference;
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("constructId")));
  assert.ok(result.errors.some((error) => /prohibitedForUserInference/.test(error)));
});

test("validator rejects missing lineage identity", () => {
  const record = validRecord();
  delete record.lineages.primary.lineageId;
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("lineageId")));
});

test("validator rejects an unknown provenance source", () => {
  const record = validRecord();
  record.lineages.primary.sourceId = "source-does-not-exist";
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /sourceId|source registry|provenance/i.test(error)));
});

test("validator rejects an invalid measurement availability state", () => {
  const record = validRecord();
  record.lineages.primary.measurementAvailability = "NOT_A_CANONICAL_STATE";
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes("measurementAvailability")));
});

test("validator preserves disagreements but rejects malformed disagreement records", () => {
  const record = validRecord();
  record.lineages.primary.disagreements = [{ positionId: "other-lineage" }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /disagreement/i.test(error)));
});

test("validator requires an abstention reason and terminating state", () => {
  const record = validRecord();
  record.lineages.primary.availability = "abstention";
  record.lineages.primary.terminationState = "continue";
  record.lineages.primary.abstentionReason = null;
  record.lineages.primary.abstentionReasonCode = null;
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /abstention|terminationState/i.test(error)));
});

test("validator will not call an unlocated claim verified", () => {
  const record = validRecord();
  record.lineages.primary.citationStatus = "verified";
  record.lineages.primary.evidenceStrength = "VERIFIED_PRIMARY";
  record.lineages.primary.sectionLocatorStatus = "NOT_RECORDED";
  record.lineages.primary.sectionLocator = null;
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /locator|verified|citation/i.test(error)));
});

test("every fixture is valid and contains no placeholder provenance", () => {
  assert.ok(heritageFixtures.length >= 6);
  for (const fixture of heritageFixtures) {
    const result = validateHeritageRecord(fixture);
    assert.equal(result.valid, true, fixture.constructId + ": " + result.errors.join("; "));
    for (const lineage of Object.values(fixture.lineages)) {
      assert.ok(lineage.sourceId);
      assert.doesNotMatch(lineage.source, /pending-/i);
    }
  }
});

test("field-level negative findings stay outside construct lineages", () => {
  assert.ok(heritageFieldFindingFixtures.length >= 3);
  for (const fixture of heritageFieldFindingFixtures) {
    const result = validateHeritageFieldFinding(fixture);
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.equal(fixture.evidenceKind, "NEGATIVE_FINDING");
  }
  assert.ok(heritageFieldFindingFixtures.some((finding) =>
    finding.findingId === "xunzi-rejects-physiognomic-inference"));
});

test("validator rejects duplicate member IDs and alias-related-system contradictions", () => {
  const record = validRecord({ aliases: ["五行"] });
  const member = {
    constituentId: "wood",
    canonicalChineseName: "木形",
    aliases: [],
    aliasWitnesses: [],
    definition: "A named member.",
    sourceId: "heritage-five-elements",
    sectionLocator: "靈樞 第六十四·陰陽二十五人",
    folioLocator: null,
    evidenceStrength: "VERIFIED_PRIMARY",
    measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
    prohibitedForUserInference: true,
    note: null,
  };
  record.lineages.primary.constituents = [member, { ...member }];
  record.lineages.primary.relatedSystems = [{
    relatedSystemId: "five-phases",
    canonicalChineseName: "五行",
    relationship: "A related but distinct system.",
    sourceId: "heritage-five-elements-taiqing",
    note: null,
  }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /constituentId.*duplicate/i.test(error)));
  assert.ok(result.errors.some((error) => /cannot also be a construct alias/i.test(error)));
});

test("every source record preserves independent section and folio states", () => {
  for (const [sourceId, source] of Object.entries(SOURCE_REGISTRY)) {
    const result = validateHeritageSourceRecord(source);
    assert.equal(result.valid, true, sourceId + ": " + result.errors.join("; "));
    assert.ok(source.sectionLocatorStatus);
    assert.ok(source.folioLocatorStatus);
  }
  // heritage-taiqing-form-qise-interaction (SR-08, 2026-08-29 project-owned
  // reconciliation) still has a verified section locator and an unpinned folio —
  // its specific 卷四 predicate was not read this pass — which is what this test
  // exercises. heritage-five-mountains (formerly used here) now has a verified
  // folio too (SR-01/SR-01b); see the dedicated test in integration.test.js.
  const taiqing = SOURCE_REGISTRY["heritage-taiqing-form-qise-interaction"];
  assert.equal(taiqing.sectionLocatorStatus, "VERIFIED");
  assert.equal(taiqing.folioLocatorStatus, "NOT_RECORDED");
  assert.equal(taiqing.folioLocator, null);
});

test("validator rejects malformed source integrity and discovery promotion", () => {
  const source = {
    ...SOURCE_REGISTRY["heritage-taiqing-shidian-discovery"],
    sourceAccess: "STABLE_REMOTE",
    sourceUrl: "http://example.test/source",
    sha256: "not-a-hash",
    citationStatus: "verified",
  };
  const result = validateHeritageSourceRecord(source);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /HTTPS/i.test(error)));
  assert.ok(result.errors.some((error) => /sha256/i.test(error)));
  assert.ok(result.errors.some((error) => /verified|stable source/i.test(error)));
});

test("runtime prose requires declared translation provenance and an agent", () => {
  const record = validRecord();
  record.lineages.primary.translationProvenance = "NOT_TRANSLATED_HERITAGE_ONLY";
  record.lineages.primary.translationAgentId = null;
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /runtime prose.*translation provenance/i.test(error)));
});

test("constituent aliases require source-witness provenance", () => {
  const record = validRecord();
  record.lineages.primary.constituents = [{
    constituentId: "inspection",
    canonicalChineseName: "鑒察官",
    aliases: ["監察官"],
    aliasWitnesses: [],
    definition: "Eye.",
    sourceId: "heritage-five-officers",
    sectionLocator: "Five Officers section, juan 2",
    folioLocator: null,
    evidenceStrength: "VERIFIED_PRIMARY",
    measurementAvailability: "CONDITIONALLY_SUPPORTED",
    prohibitedForUserInference: true,
    note: null,
  }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /alias.*witness provenance/i.test(error)));
});

/*
 * Item 3 (Stage 1 repair): conditionExpression's machine-readable schema
 * must no longer be `{ type: "object" }`, which the Stage 1 checkpoint
 * explicitly rejected as indistinguishable from "any object is acceptable".
 */
test("HeritageConnectorSchema no longer describes conditionExpression as an unbounded object", () => {
  const field = HeritageConnectorSchema.properties.conditionExpression;
  assert.equal(field.type, undefined, "must not fall back to a bare object type");
  assert.equal(typeof field.$ref, "string");
  assert.ok(HeritageConnectorSchema.$defs.conditionNode, "the recursive node definition must be hoisted to the schema root");
});

test("HeritageConnectorSchema's condition node describes exactly the six allowed AST shapes, each closed", () => {
  const branches = HeritageConnectorSchema.$defs.conditionNode.oneOf;
  const types = branches.map((b) => b.properties.type.const).sort();
  assert.deepEqual(types, ["ABSENT", "ALL", "ANY", "NOT", "PRESENT", "STATE"]);
  for (const branch of branches) {
    assert.equal(branch.additionalProperties, false, `${branch.properties.type.const} must reject unknown properties`);
  }
});

test("the schema/validator boundary rejects malformed AST shapes", () => {
  const defs = HeritageConnectorSchema.$defs;
  const valid = [
    { type: "PRESENT", participantId: "a" },
    { type: "ABSENT", participantId: "a" },
    { type: "STATE", participantId: "a", stateId: "s" },
    { type: "NOT", operand: { type: "PRESENT", participantId: "a" } },
    { type: "ALL", operands: [{ type: "PRESENT", participantId: "a" }] },
    { type: "ANY", operands: [{ type: "ABSENT", participantId: "a" }] },
  ];
  for (const node of valid) {
    assert.equal(matchesConditionNode(defs, node), true, JSON.stringify(node));
  }

  const malformed = [
    { type: "PRESENT" }, // missing participantId
    { type: "PRESENT", participantId: "a", extra: "not allowed" }, // additionalProperties
    { type: "BEFORE", participantId: "a" }, // not one of the six node types
    { type: "ALL", operands: [] }, // JSON Schema minItems:1 — structurally empty
    { type: "STATE", participantId: "a" }, // missing stateId
    { type: "AND", operands: [{ type: "PRESENT", participantId: "a" }] }, // no generic boolean-expression names
    { type: "PRESENT", participantId: { $$eval: "window.location" } }, // no arbitrary JS values
  ];
  for (const node of malformed) {
    assert.equal(matchesConditionNode(defs, node), false, JSON.stringify(node));
  }
});
