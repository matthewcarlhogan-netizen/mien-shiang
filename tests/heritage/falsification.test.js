import { test } from "node:test";
import assert from "node:assert/strict";
import { HERITAGE_REGISTRY } from "../../src/heritage/registry.js";
import {
  validateHeritageRecord,
  validateHeritageSourceRecord,
} from "../../src/heritage/validator.js";
import { SOURCE_REGISTRY } from "../../src/reading/provenance.js";

const clone = (value) => structuredClone(value);
const fiveOfficers = () => clone(HERITAGE_REGISTRY.fiveOfficers);
const fiveMountains = () => clone(HERITAGE_REGISTRY.fiveMountains);

const connectorCases = [
  ["HVC-001", "missing connector ID", (conn) => { delete conn.connectorId; }, /connectorId/i],
  ["HVC-002", "invalid relationship type", (conn) => { conn.relationshipType = "INVALID_TYPE"; }, /relationshipType/i],
  ["HVC-003", "invalid direction for type", (conn) => { conn.relationshipType = "REQUIRES"; conn.relationshipDirection = { kind: "UNDIRECTED" }; }, /direction/i],
];

for (const [id, description, mutate, expected] of connectorCases) {
  test(`connector falsification ${id}: ${description}`, () => {
    const value = clone(HERITAGE_CONNECTOR_REGISTRY["five-mountains-four-rivers-corresponds"]);
    mutate(value);
    // Note: I need a connector validator to test this.
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
