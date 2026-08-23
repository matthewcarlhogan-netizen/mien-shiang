import { test } from "node:test";
import assert from "node:assert/strict";
import { HERITAGE_REGISTRY } from "../../src/heritage/registry.js";
import { HERITAGE_CROSS_FAMILY_COMBINATIONS } from "../../src/heritage/evidence.js";
import {
  validateHeritageCombination,
  validateHeritageRecord,
  validateHeritageSourceRecord,
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
  ["HVR-010", "non-empty combinations marked none attested", fiveMountains,
    (record) => { record.lineages["taiqing-siku"].attestedCombinationsStatus = "NONE_ATTESTED"; }, /NONE_ATTESTED/i],
  ["HVR-011", "recorded combinations with no entries", fiveOfficers,
    (record) => { record.lineages.primary.attestedCombinationsStatus = "RECORDED"; }, /RECORDED requires/i],
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

const combinationCases = [
  ["HVC-001", "cross-family combination with one construct",
    (value) => { value.constructIds = [value.constructIds[0]]; }, /at least two constructIds/i],
  ["HVC-002", "runtime combination marked prohibited",
    (value) => { value.renderPolicy = "RUNTIME_ALLOWED"; }, /cannot be prohibited/i],
  ["HVC-003", "runtime combination without measurable evidence",
    (value) => { value.renderPolicy = "RUNTIME_ALLOWED"; value.prohibitedForUserInference = false; }, /requires measurable evidence/i],
  ["HVC-004", "combination with unknown source",
    (value) => { value.sourceId = "not-a-source"; }, /unknown sourceId/i],
];

for (const [id, description, mutate, expected] of combinationCases) {
  test(`falsification ${id}: ${description}`, () => {
    const value = clone(HERITAGE_CROSS_FAMILY_COMBINATIONS[0]);
    mutate(value);
    const result = validateHeritageCombination(value);
    assert.equal(result.valid, false, `${id} mutation unexpectedly passed`);
    assert.ok(result.errors.some((error) => expected.test(error)), result.errors.join("; "));
  });
}

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
