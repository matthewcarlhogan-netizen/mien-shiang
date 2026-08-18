/*
 * THE DISPOSITION INGEST.
 *
 * The point of this pipeline is that an expert's findings reach the manifest in
 * the expert's own words. The risk it exists to remove is not typing effort —
 * it is the summariser who rounds "revise, because the other transmission is
 * dominant" into "approved with notes". So most of these tests are about what
 * the ingest REFUSES.
 *
 * The last group is the one that matters: cultural review satisfies one of six
 * requirements, and no path through this code may mark a family cleared.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

import {
  validate, plan, assertCannotClear, DispositionError, SATISFIES, REQUIREMENTS,
} from "../../scripts/ingest-disposition.mjs";

const read = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8"));
const TEMPLATE = read("docs/cultural-review/disposition.template.json");
const SCHEMA = read("docs/cultural-review/disposition.schema.json");
const MANIFEST = read("docs/commercial-rights-manifest.json");

/** A complete, well-formed return. Every refusal test damages one field of it. */
const good = () => {
  const d = JSON.parse(JSON.stringify(TEMPLATE));
  d.date = "2026-09-30";
  d.reviewer = {
    name: "Dr A. Reviewer",
    qualifications: "Doctorate in Chinese intellectual history; twenty years reading Ming physiognomic texts.",
    interestsDeclared: "none",
    signatureArtifact: "cultural-review-signed.pdf",
  };
  for (const section of [d.questions, d.families]) {
    for (const k of Object.keys(section)) {
      section[k].verdict = "approved";
      section[k].rationale = "The handling reflects the sources as I read them, with the disagreement stated.";
      section[k].contestedInterpretations = [];
      section[k].wordingDecisions = [];
    }
  }
  return d;
};

/* ── the template agrees with the product ────────────────────────────────── */

test("the template covers every question and every manifest family", () => {
  assert.deepEqual(Object.keys(TEMPLATE.questions).sort(), ["Q1", "Q2", "Q3", "Q4"]);
  assert.deepEqual(
    Object.keys(TEMPLATE.families).sort(),
    Object.keys(MANIFEST.families).sort(),
    "the reviewer template and the rights manifest disagree about which families exist");
});

test("the schema requires a named, signed reviewer", () => {
  const r = SCHEMA.properties.reviewer;
  for (const field of ["name", "qualifications", "interestsDeclared", "signatureArtifact"]) {
    assert.ok(r.required.includes(field), `schema does not require reviewer.${field}`);
  }
});

/* ── refusals ────────────────────────────────────────────────────────────── */

test("the unedited template is refused", () => {
  assert.throws(() => validate(TEMPLATE),
    (e) => e instanceof DispositionError && /placeholder/.test(e.message));
});

test("an anonymous or unsigned return is refused", () => {
  const noName = good(); noName.reviewer.name = "";
  assert.throws(() => validate(noName), /NAMED reviewer/);

  const noSig = good(); noSig.reviewer.signatureArtifact = "";
  assert.throws(() => validate(noSig), /unsigned return is not a review/);

  const thin = good(); thin.reviewer.qualifications = "expert";
  assert.throws(() => validate(thin), /qualifications/);
});
test("a verdict without a rationale is refused", () => {
  const d = good(); d.families["qi-se-reading-v1"].rationale = "fine";
  assert.throws(() => validate(d), /rationale is required/);
});

test("security: path traversal in signature artifact is refused", () => {
  const d = good();
  d.reviewer.signatureArtifact = "../etc/passwd";
  assert.throws(() => validate(d), /cannot be an absolute path or contain '..'/);
});

test("security: Windows-style absolute and UNC paths in signature artifact are refused", () => {
  for (const bad of ["C:\\outside\\sig.pdf", "C:/outside/sig.pdf", "\\\\server\\share\\sig.pdf"]) {
    const d = good();
    d.reviewer.signatureArtifact = bad;
    assert.throws(() => validate(d), /cannot be an absolute path or contain '..'/,
      `${JSON.stringify(bad)} was not rejected`);
  }
});

test("security: invalid dates are refused", () => {
  const d = good();
  d.date = "2026-02-30";
  assert.throws(() => validate(d), /date must be a valid calendar date/);
});

test("security: unknown root fields are refused", () => {
  const d = good();
  d.unknown = "field";
  assert.throws(() => validate(d), /root: unknown property/);
});

test("a partial return is refused", () => {
  const q = good(); delete q.questions.Q3;
  assert.throws(() => validate(q), /missing question: Q3/);

  const f = good(); delete f.families["harmony-v1"];
  assert.throws(() => validate(f), /missing family: harmony-v1/);
});

test("an invented verdict word is refused", () => {
  const d = good(); d.questions.Q2.verdict = "approved-with-notes";
  assert.throws(() => validate(d), /verdict must be/);
});

test("a contested interpretation with no sources is refused", () => {
  const d = good();
  d.questions.Q1.contestedInterpretations = [
    { claim: "the eye is the Huai", sources: [], reviewerView: "this is the dominant reading" },
  ];
  assert.throws(() => validate(d), /cites no sources/);
});

/* ── what it produces ────────────────────────────────────────────────────── */

test("a complete return produces a register entry in the reviewer's own words", () => {
  const d = good();
  d.questions.Q1.verdict = "revise";
  d.questions.Q1.rationale = "Both lineages are real, but the Shen Xiang Quan Bian line is the dominant transmission and should be primary.";
  const out = plan(d, { signatureHash: "abc123" });

  assert.match(out.registerEntry, /Dr A\. Reviewer/);
  assert.match(out.registerEntry, /abc123/);
  assert.match(out.registerEntry, /dominant transmission and should be primary/,
    "the reviewer's rationale was not carried through verbatim");
  assert.equal(out.blocking.length, 1);
  assert.equal(out.blocking[0].section, "Q1");
});

test("a missing signature hash is recorded as missing, not omitted", () => {
  const out = plan(good(), { signatureHash: null });
  assert.match(out.registerEntry, /hash not recorded/,
    "an unhashed artifact passed without the record saying so");
  for (const entry of Object.values(out.manifest)) {
    assert.equal(entry.evidence.culturalReview.sha256, null);
  }
});

test("an empty contested-interpretation log is recorded as a finding, not a gap", () => {
  const out = plan(good(), { signatureHash: "x" });
  assert.equal(out.contested.length, 0);
  for (const entry of Object.values(out.manifest)) {
    assert.equal(entry.evidence.culturalReview.contestedInterpretations, 0);
  }
});

test("a non-approved verdict on any provisional row is surfaced as blocking", () => {
  // R3, R6, R8 and R9 map to Q1–Q4. A `revise` on any of them must not be
  // absorbed into an otherwise-green ingest.
  for (const q of ["Q1", "Q2", "Q3", "Q4"]) {
    const d = good();
    d.questions[q].verdict = "revise";
    d.questions[q].rationale = "This needs changing before it can be presented to a user in this form.";
    const out = plan(d, { signatureHash: "x" });
    assert.ok(out.blocking.some((b) => b.section === q), `${q} revise was not surfaced as blocking`);
  }
});

/* ── THE GUARD ───────────────────────────────────────────────────────────── */

test("the ingest may satisfy exactly one of the six requirements", () => {
  assert.deepEqual([...SATISFIES], ["culturalReview"]);
  assert.equal(REQUIREMENTS.length, 6);
  for (const r of SATISFIES) assert.ok(REQUIREMENTS.includes(r));
});

test("every family it touches stays pending", () => {
  const out = plan(good(), { signatureHash: "x" });
  for (const [family, entry] of Object.entries(out.manifest)) {
    assert.equal(entry.status, "pending", `${family} did not stay pending`);
  }
});

test("it refuses to clear a family even when handed one directly", () => {
  assert.throws(
    () => assertCannotClear({ manifest: { "qi-se-reading-v1": { status: "cleared", evidence: {} } } }),
    /refusing to set/);
});

test("it refuses to write evidence for a requirement it does not satisfy", () => {
  assert.throws(
    () => assertCannotClear({ manifest: { "qi-se-reading-v1": { status: "pending", evidence: { legalApproval: {} } } } }),
    /may only record culturalReview/);
});

test("an approved cultural review does not by itself unblock anything", () => {
  const out = plan(good(), { signatureHash: "x" });
  assert.equal(Object.values(out.manifest).filter((e) => e.status !== "pending").length, 0);
  assert.ok(out.registerEntry.includes("does **not** clear any family"),
    "the register entry does not state its own limits");
});

/* ── CLI: dry-run must warn, not crash, on a missing signature artifact ──── */

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const INGEST_SCRIPT = path.join(REPO_ROOT, "scripts", "ingest-disposition.mjs");

function runIngestCli(jsonPath, extraArgs = []) {
  return spawnSync(process.execPath, [INGEST_SCRIPT, jsonPath, ...extraArgs], { encoding: "utf8" });
}

test("CLI dry run warns and reports 'hash not recorded' on a missing artifact, and does not crash", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ingest-missing-artifact-"));
  try {
    const d = good();
    d.reviewer.signatureArtifact = "does-not-exist.pdf";
    const jsonPath = path.join(tmp, "disposition.json");
    writeFileSync(jsonPath, JSON.stringify(d));

    const res = runIngestCli(jsonPath);

    assert.equal(res.status, 0, `dry run should exit 0; stderr: ${res.stderr}`);
    assert.doesNotMatch(res.stderr, /ENOENT|at Module\.realpathSync/,
      "a missing artifact must not surface as an uncaught realpathSync crash in dry run");
    assert.match(res.stderr, /WARNING: signed artifact not found/);
    assert.match(res.stdout, /hash not recorded/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});

test("CLI --write fails closed on a missing artifact, with no filesystem mutation", () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ingest-missing-artifact-write-"));
  try {
    const d = good();
    d.reviewer.signatureArtifact = "does-not-exist.pdf";
    const jsonPath = path.join(tmp, "disposition.json");
    writeFileSync(jsonPath, JSON.stringify(d));

    const res = runIngestCli(jsonPath, ["--write"]);

    assert.notEqual(res.status, 0, "a missing artifact must fail closed under --write");
    assert.match(res.stderr, /refusing to write/);
  } finally {
    rmSync(tmp, { recursive: true });
  }
});
