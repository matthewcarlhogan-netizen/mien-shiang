import test from "node:test";
import assert from "node:assert/strict";
import { extractFencedCsv, normaliseNewlines, parseCsv } from "../../scripts/lib/heritage-dossier.mjs";

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

test("required CSV rejects an empty table instead of passing vacuously", () => {
  assert.throws(
    () => parseCsv(HEADER, { label: "required passage CSV", expectedHeader: HEADER, expectedRows: 1 }),
    /required passage CSV: expected 1 data rows; got 0/,
  );
});

test("required CSV rejects malformed row shapes", () => {
  assert.throws(
    () => parseCsv(`${HEADER}\nonly,two`, { label: "required passage CSV", expectedHeader: HEADER, expectedRows: 1 }),
    /required passage CSV: row 2 has 2 fields; expected 3/,
  );
});

test("CSV rejects unterminated quoted fields", () => {
  assert.throws(
    () => parseCsv(`${HEADER}\n"unterminated`, { label: "required passage CSV", expectedHeader: HEADER, expectedRows: 1 }),
    /required passage CSV: unterminated quoted field/,
  );
});

test("CSV rejects non-empty text after a closing quote", () => {
  assert.throws(
    () => parseCsv(`${HEADER}\n"value"oops,source,test`, { label: "required passage CSV", expectedHeader: HEADER, expectedRows: 1 }),
    /required passage CSV: unexpected character after closing quote/,
  );
});
