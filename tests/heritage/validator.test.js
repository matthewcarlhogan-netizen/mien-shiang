import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateHeritageCombination,
  validateHeritageFieldFinding,
  validateHeritageRecord,
} from "../../src/heritage/validator.js";
import {
  heritageCombinationFixtures,
  heritageFieldFindingFixtures,
  heritageFixtures,
} from "../../src/heritage/fixtures.js";
import {
  HERITAGE_MEASUREMENT_AVAILABILITY,
} from "../../src/heritage/schema.js";

const baseLineage = (overrides = {}) => ({
  lineageId: "primary",
  definition: "An attributed source definition.",
  source: "An existing source record.",
  sourceId: "heritage-three-sections",
  supportingSourceIds: [],
  evidenceKind: "POSITIVE_CLAIM",
  evidenceStrength: "RECORDED_NOT_VERIFIED",
  preciseLocator: null,
  locatorStatus: "NOT_RECORDED",
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
  translationProvenance: "repository-editorial",
  constituents: [],
  relatedSystems: [],
  attestedCombinations: [],
  attestedCombinationsStatus: "NONE_ATTESTED",
  disagreements: [],
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

test("validator rejects source-attested combinations without their own source", () => {
  const record = validRecord();
  record.lineages.primary.attestedCombinations = [{
    combinationId: "three-sections",
    constructIds: ["test-construct"],
    sourceId: null,
    preciseLocator: null,
    combinationScope: "WITHIN_CONSTRUCT",
    renderPolicy: "RESEARCH_ONLY",
    measurementAvailability: "NOT_RECORDED",
    prohibitedForUserInference: true,
    note: null,
  }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /attestedCombinations|combination.*source/i.test(error)));
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
  record.lineages.primary.locatorStatus = "NOT_RECORDED";
  record.lineages.primary.preciseLocator = null;
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


test("validator rejects a non-empty combination list marked NONE_ATTESTED", () => {
  const record = validRecord();
  record.lineages.primary.attestedCombinations = [{
    combinationId: "three-sections-example",
    constructIds: ["test-construct"],
    sourceId: "heritage-three-sections",
    preciseLocator: null,
    combinationScope: "WITHIN_CONSTRUCT",
    renderPolicy: "RESEARCH_ONLY",
    measurementAvailability: "NOT_RECORDED",
    prohibitedForUserInference: true,
    note: null,
  }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /NONE_ATTESTED|combination/i.test(error)));
});

test("validator accepts explicitly sourced combinations and disagreements", () => {
  const record = validRecord();
  record.lineages.primary.attestedCombinations = [{
    combinationId: "three-sections-example",
    constructIds: ["test-construct"],
    sourceId: "heritage-three-sections",
    preciseLocator: null,
    combinationScope: "WITHIN_CONSTRUCT",
    renderPolicy: "RESEARCH_ONLY",
    measurementAvailability: "NOT_RECORDED",
    prohibitedForUserInference: true,
    note: null,
  }];
  record.lineages.primary.attestedCombinationsStatus = "RECORDED";
  record.lineages.primary.disagreements = [{
    disagreementId: "example-disagreement",
    positionId: "alternate-position",
    sourceId: "heritage-three-sections",
    summary: "An attributed alternate position retained for research review.",
    status: "PARALLEL",
    note: null,
  }];
  const result = validateHeritageRecord(record);
  assert.equal(result.valid, true, result.errors.join("; "));
});

test("cross-family combinations are sourced, heritage-only and non-operational", () => {
  assert.ok(heritageCombinationFixtures.length > 0);
  for (const fixture of heritageCombinationFixtures) {
    const result = validateHeritageCombination(fixture);
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.equal(fixture.combinationScope, "CROSS_CONSTRUCT");
    assert.equal(fixture.renderPolicy, "HERITAGE_ONLY");
    assert.equal(fixture.prohibitedForUserInference, true);
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

test("validator refuses to operationalise prohibited or unmeasurable combinations", () => {
  const prohibited = {
    combinationId: "unsafe-example",
    constructIds: ["threeSections"],
    sourceId: "heritage-three-sections",
    preciseLocator: null,
    combinationScope: "WITHIN_CONSTRUCT",
    renderPolicy: "RUNTIME_ALLOWED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    prohibitedForUserInference: true,
    note: null,
  };
  const result = validateHeritageCombination(prohibited, "threeSections");
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => /RUNTIME_ALLOWED|measurable/i.test(error)));
});

test("validator rejects duplicate member IDs and alias-related-system contradictions", () => {
  const record = validRecord({ aliases: ["五行"] });
  const member = {
    constituentId: "wood",
    canonicalChineseName: "木形",
    aliases: [],
    definition: "A named member.",
    sourceId: "heritage-five-elements",
    preciseLocator: "靈樞 第六十四·陰陽二十五人",
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
