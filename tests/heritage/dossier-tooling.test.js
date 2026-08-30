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
    /missing fenced CSV block headed by passageId,sourceId,repoUrl/,
  );
});

test("optional heritage CSV sections preserve the empty-section fallback", () => {
  assert.equal(
    extractFencedCsv("# Evidence\n", "relationshipId,family,relationshipClass", { optional: true }),
    null,
  );
});
