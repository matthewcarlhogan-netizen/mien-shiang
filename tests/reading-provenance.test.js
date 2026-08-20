import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CITATION_STATUS, CONTENT_PROVENANCE, EXPANSION_AREAS, READING_PROVENANCE_IDS,
  RIGHTS_STATUS, SOURCE_REGISTRY,
  auditContentProvenance, explainProvenanceIssue, validateProvenanceEntry,
} from "../src/reading/provenance.js";
import { passageFor } from "../src/qise/passages.js";

test("every shipped reading family has a valid provenance record", () => {
  for (const [surface, id] of Object.entries(READING_PROVENANCE_IDS)) {
    assert.ok(CONTENT_PROVENANCE[id], `${surface} references missing provenance ${id}`);
    assert.deepEqual(validateProvenanceEntry(id, CONTENT_PROVENANCE[id]), []);
  }
  assert.ok(CONTENT_PROVENANCE["qise-passages-v1"]);
});

test("the registry does not claim unfinished rights are complete", () => {
  const audit = auditContentProvenance();
  for (const [id, result] of Object.entries(audit)) {
    assert.equal(result.ready, false, `${id} was incorrectly marked release-ready`);
    assert.ok(result.issues.includes("rights-not-cleared"), `${id} hides its rights gap`);
    assert.ok(
      result.issues.some((issue) =>
        /^citation-(source-required|recorded-not-verified|status-unrecognised):/.test(issue)),
      `${id} hides its citation gap`);
  }
});

test("a weaker provenance status never satisfies the stronger gate", () => {
  // suwen-ch17 has a recorded edition and a recorded public-domain basis.
  // Neither is an independent citation check, and neither is a commercial
  // clearance. The gate must keep refusing it, and must say which rung it is
  // on — the failure that reads as "missing source" is the one that tempts
  // someone to close it by relabelling the evidence.
  const source = SOURCE_REGISTRY["suwen-ch17"];
  assert.equal(source.citationStatus, CITATION_STATUS.EDITION_RECORDED);
  assert.equal(source.rightsStatus, RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE);
  assert.notEqual(CITATION_STATUS.EDITION_RECORDED, CITATION_STATUS.VERIFIED);
  assert.notEqual(RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE, RIGHTS_STATUS.CLEARED);

  const result = auditContentProvenance()["qi-se-reading-v1"];
  assert.equal(result.ready, false, "a recorded edition must not open the gate");
  assert.ok(result.issues.includes("citation-recorded-not-verified:suwen-ch17"));
  assert.ok(result.issues.includes("source-rights-public-domain-not-cleared:suwen-ch17"));

  // A source that was never identified is reported as its own state, not
  // flattened into the same reason as one that is recorded but unchecked.
  assert.ok(result.issues.includes("citation-source-required:mianxiang-unspecified"));
  assert.ok(result.issues.includes("source-rights-unverified:mianxiang-unspecified"));
});

test("every provenance blocker explains itself", () => {
  for (const result of Object.values(auditContentProvenance())) {
    for (const issue of result.issues) {
      assert.notEqual(explainProvenanceIssue(issue), issue,
        `${issue} has no recorded explanation`);
    }
  }
});

test("the commercial-rights manifest covers every shipping provenance ID", () => {
  // READING_PROVENANCE_IDS.twelvePalaces ships `twelve-palaces-v2`, but the
  // manifest listed only v1. The release checker therefore reported the
  // shipping family as "missing manifest record" and audited evidence for a
  // family no surface renders. Each shipping ID needs its own record; v2 must
  // never inherit, alias or borrow v1's evidence to satisfy this.
  const manifest = JSON.parse(readFileSync(
    new URL("../docs/commercial-rights-manifest.json", import.meta.url), "utf8"));
  const families = manifest.families || {};

  for (const [surface, id] of Object.entries(READING_PROVENANCE_IDS)) {
    assert.ok(families[id],
      `${surface} ships ${id}, which has no commercial-rights manifest record`);
  }

  // Superseded records stay: a reading already stored on a device keeps its
  // provenance ID, so its rights record has to remain resolvable. They are
  // only allowed to describe a family the registry still knows about.
  assert.ok(families["twelve-palaces-v1"],
    "the superseded record was dropped; stored readings lose their rights record");
  for (const id of Object.keys(families)) {
    assert.ok(CONTENT_PROVENANCE[id],
      `the manifest records ${id}, which is not a known content family`);
  }
});

test("known coverage gaps are an explicit expansion queue", () => {
  assert.ok(EXPANSION_AREAS.length >= 5);
  assert.equal(EXPANSION_AREAS.some((area) => area.id === "palaces-remaining"), false);
  assert.equal(new Set(EXPANSION_AREAS.map((area) => area.id)).size, EXPANSION_AREAS.length);
  for (const area of EXPANSION_AREAS) {
    assert.ok(area.label && area.status);
  }
});

test("a composed Qi Se passage carries its stable content provenance ID", () => {
  const passage = passageFor(
    { ascendant: "chi", band: "clear" }, { ming: 1, run: 1 }, "2026-08-11");
  assert.equal(passage.provenanceId, "qise-passages-v1");
});
