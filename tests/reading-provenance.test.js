import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTENT_PROVENANCE, EXPANSION_AREAS, READING_PROVENANCE_IDS,
  auditContentProvenance, validateProvenanceEntry,
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
    assert.ok(result.issues.some((issue) => issue.startsWith("citation-not-verified:")),
      `${id} hides its citation gap`);
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
