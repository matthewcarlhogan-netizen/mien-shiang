import test from "node:test";
import assert from "node:assert/strict";
import { extractFencedCsv, normaliseNewlines } from "../../scripts/lib/heritage-dossier.mjs";

const HEADER = "passageId,sourceId,repoUrl";
const DOSSIER = [
  "# Evidence",
  "",
  "```csv",
  HEADER,
  "example,source,https://example.test",
  "```",
  "",
].join("\n");

test("heritage dossier parsing is identical for LF, CRLF and CR text", () => {
  const expected = `${HEADER}\nexample,source,https://example.test`;
  for (const text of [DOSSIER, DOSSIER.replaceAll("\n", "\r\n"), DOSSIER.replaceAll("\n", "\r")]) {
    assert.equal(extractFencedCsv(text, HEADER), expected);
    assert.equal(normaliseNewlines(text), DOSSIER);
  }
});

test("missing heritage CSV sections fail with the requested header", () => {
  assert.throws(
    () => extractFencedCsv("```csv\nother,header\n```", HEADER),
    /missing or malformed fenced CSV block headed by passageId,sourceId,repoUrl/,
  );
});

test("optional heritage CSV sections preserve the empty-section fallback", () => {
  assert.equal(
    extractFencedCsv("# Evidence\n", "relationshipId,family,relationshipClass", { optional: true }),
    null,
  );
});

test("CSV headers must match exactly rather than by prefix", () => {
  assert.throws(
    () => extractFencedCsv("```csv\npassageId,sourceId,repoUrlExtra\n```", HEADER),
    /missing or malformed fenced CSV block headed by passageId,sourceId,repoUrl/,
  );
});

test("duplicate CSV sections fail closed instead of selecting one silently", () => {
  const duplicate = [
    "```csv",
    HEADER,
    "one,source,https://one.test",
    "```",
    "```csv",
    HEADER,
    "two,source,https://two.test",
    "```",
  ].join("\n");
  assert.throws(
    () => extractFencedCsv(duplicate, HEADER),
    /duplicate fenced CSV blocks headed by passageId,sourceId,repoUrl/,
  );
});

test("an optional section with its header but no closing fence fails closed", () => {
  assert.throws(
    () => extractFencedCsv("```csv\nrelationshipId,family,relationshipClass\nrow", "relationshipId,family,relationshipClass", { optional: true }),
    /missing or malformed fenced CSV block headed by relationshipId,family,relationshipClass/,
  );
});
