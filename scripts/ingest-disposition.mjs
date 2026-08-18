/*
 * INGEST A CULTURAL REVIEWER'S DISPOSITION.
 *
 * The reviewer returns one JSON file against
 * `docs/cultural-review/disposition.schema.json`. This turns it into the four
 * downstream artefacts — a decision-register entry, provenance updates, rights
 * audit status lines, and manifest entries — without anyone re-typing a verdict
 * in their own words.
 *
 * ── WHY THAT MATTERS MORE THAN CONVENIENCE ─────────────────────────────────
 * Manual transcription of an expert's findings is where approval gets
 * manufactured. Not by anyone deciding to; by a summariser rounding "revise,
 * because the 目/口 split is real but 神相全編 is the dominant transmission" into
 * "approved with notes". The reviewer's words go in verbatim, and the verdict
 * that reaches the manifest is the verdict they typed.
 *
 * ── THE GUARD THAT MATTERS ─────────────────────────────────────────────────
 * Cultural review is ONE of six requirements. A family with an `approved`
 * cultural disposition and no contributor agreement, no legal sign-off and no
 * hashes is still Blocked. This script therefore emits `culturalReview:
 * approved` and NEVER `status: cleared`. `assertCannotClear()` is called on its
 * own output before writing, so a future edit that tries to widen it fails
 * here rather than in a store submission.
 *
 * Usage:  node scripts/ingest-disposition.mjs <disposition.json> [--write]
 * Without --write it prints what it would do and changes nothing.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const p = (rel) => join(ROOT, rel);

export const REQUIREMENTS = Object.freeze([
  "locator", "rights", "contributorAgreement", "culturalReview", "legalApproval", "hashed",
]);

/** Requirements this ingest is permitted to satisfy. Exactly one. */
export const SATISFIES = Object.freeze(["culturalReview"]);

export class DispositionError extends Error {}

/* ── validation ──────────────────────────────────────────────────────────── */

const VERDICTS = new Set(["approved", "revise", "rejected"]);

export function validate(doc) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };

  need(doc && doc.schemaVersion === 1, "schemaVersion must be 1");
  need(/^\d{4}-\d{2}-\d{2}$/.test(doc?.date || ""), "date must be YYYY-MM-DD");

  const r = doc?.reviewer || {};
  need(typeof r.name === "string" && r.name.trim().length > 1,
    "reviewer.name is required — the audit requires a NAMED reviewer");
  need(typeof r.qualifications === "string" && r.qualifications.trim().length >= 20,
    "reviewer.qualifications is required and must be substantive");
  need(typeof r.interestsDeclared === "string" && r.interestsDeclared.trim().length >= 4,
    "reviewer.interestsDeclared is required (write 'none' if none)");
  need(typeof r.signatureArtifact === "string" && r.signatureArtifact.trim().length >= 4,
    "reviewer.signatureArtifact is required — an unsigned return is not a review");

  const sections = { ...(doc?.questions || {}), ...(doc?.families || {}) };
  need(Object.keys(doc?.questions || {}).length === 4, "all four questions Q1–Q4 must be dispositioned");
  need(Object.keys(doc?.families || {}).length === 6, "all six families must be dispositioned");

  for (const [key, d] of Object.entries(sections)) {
    need(VERDICTS.has(d?.verdict), `${key}: verdict must be approved | revise | rejected (found ${JSON.stringify(d?.verdict)})`);
    need(typeof d?.rationale === "string" && d.rationale.trim().length >= 20,
      `${key}: rationale is required and must be substantive`);
    need(Array.isArray(d?.contestedInterpretations),
      `${key}: contestedInterpretations must be an array (empty means "none found", which is a finding)`);
    need(Array.isArray(d?.wordingDecisions), `${key}: wordingDecisions must be an array`);
    for (const c of d?.contestedInterpretations || []) {
      need(c && typeof c.claim === "string" && c.claim.trim().length >= 5, `${key}: a contested interpretation has no claim`);
      need(Array.isArray(c?.sources) && c.sources.length >= 1, `${key}: a contested interpretation cites no sources`);
      need(typeof c?.reviewerView === "string" && c.reviewerView.trim().length >= 10, `${key}: a contested interpretation has no reviewer view`);
    }
  }

  // The template ships with placeholder verdicts. Ingesting one unedited would
  // be the most embarrassing possible failure, so it is caught by name.
  for (const [key, d] of Object.entries(sections)) {
    if (typeof d?.verdict === "string" && d.verdict.includes("|")) {
      problems.push(`${key}: verdict is still the template placeholder`);
    }
  }

  if (problems.length) throw new DispositionError(problems.join("\n  "));
  return true;
}

/* ── the guard ───────────────────────────────────────────────────────────── */

export function assertCannotClear(plan) {
  for (const [family, entry] of Object.entries(plan.manifest || {})) {
    if (entry.status && entry.status !== "pending") {
      throw new DispositionError(
        `refusing to set ${family} status to "${entry.status}". Cultural review satisfies one of six requirements; only the release check may clear a family.`);
    }
    for (const key of Object.keys(entry.evidence || {})) {
      if (!SATISFIES.includes(key)) {
        throw new DispositionError(
          `refusing to write evidence "${key}" for ${family}: this ingest may only record ${SATISFIES.join(", ")}.`);
      }
    }
  }
  return true;
}

/* ── planning ────────────────────────────────────────────────────────────── */

export function plan(doc, { signatureHash = null } = {}) {
  validate(doc);

  const manifest = {};
  for (const [family, d] of Object.entries(doc.families)) {
    manifest[family] = {
      status: "pending",
      evidence: {
        culturalReview: {
          verdict: d.verdict,
          reviewer: doc.reviewer.name,
          date: doc.date,
          briefVersion: doc.briefVersion,
          artifact: doc.reviewer.signatureArtifact,
          sha256: signatureHash,
          contestedInterpretations: d.contestedInterpretations.length,
        },
      },
    };
  }

  const wording = [];
  for (const [key, d] of Object.entries({ ...doc.questions, ...doc.families })) {
    for (const w of d.wordingDecisions) {
      if (w.current || w.required) wording.push({ section: key, ...w });
    }
  }

  const contested = [];
  for (const [key, d] of Object.entries({ ...doc.questions, ...doc.families })) {
    for (const c of d.contestedInterpretations) contested.push({ section: key, ...c });
  }

  const out = {
    manifest,
    wording,
    contested,
    blocking: Object.entries({ ...doc.questions, ...doc.families })
      .filter(([, d]) => d.verdict !== "approved")
      .map(([k, d]) => ({ section: k, verdict: d.verdict, rationale: d.rationale })),
    registerEntry: registerEntry(doc, signatureHash),
  };

  assertCannotClear(out);
  return out;
}

function registerEntry(doc, signatureHash) {
  const L = [];
  L.push(`### DR-${doc.date}-CULTURAL-REVIEW`);
  L.push("");
  L.push(`- **Date:** ${doc.date}`);
  L.push(`- **Owner:** ${doc.reviewer.name} (independent cultural reviewer)`);
  L.push("- **Status:** recorded");
  L.push(`- **Qualifications:** ${doc.reviewer.qualifications}`);
  L.push(`- **Interests declared:** ${doc.reviewer.interestsDeclared}`);
  L.push(`- **Signed artifact:** \`${doc.reviewer.signatureArtifact}\`${signatureHash ? ` (sha256 \`${signatureHash}\`)` : " — **hash not recorded**"}`);
  L.push(`- **Brief version:** ${doc.briefVersion}`);
  L.push("");
  L.push("| Section | Verdict | Rationale (reviewer's words, verbatim) |");
  L.push("|---|---|---|");
  for (const [k, d] of Object.entries({ ...doc.questions, ...doc.families })) {
    L.push(`| ${k} | ${d.verdict} | ${d.rationale.replace(/\|/g, "\\|")} |`);
  }
  L.push("");
  L.push("- **Consequences:** this records requirement 4 of `docs/commercial-rights-audit.md` for the families listed. It does **not** clear any family: requirements 1, 2, 3, 5 and 6 are unaffected and every family remains `Blocked` until the release check says otherwise.");
  return L.join("\n");
}

/* ── CLI ─────────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) { console.error("usage: node scripts/ingest-disposition.mjs <disposition.json> [--write]"); process.exit(2); }
  const doc = JSON.parse(readFileSync(file, "utf8"));

  const sigPath = join(dirname(resolve(file)), doc.reviewer?.signatureArtifact || "");
  const signatureHash = existsSync(sigPath)
    ? createHash("sha256").update(readFileSync(sigPath)).digest("hex")
    : null;
  if (!signatureHash) console.error(`WARNING: signed artifact not found beside the JSON (${doc.reviewer?.signatureArtifact}); hash will be null.`);

  let result;
  try { result = plan(doc, { signatureHash }); }
  catch (e) { console.error(`REFUSED:\n  ${e.message}`); process.exit(1); }

  console.log(result.registerEntry);
  console.log(`\n--- ${result.contested.length} contested interpretations, ${result.wording.length} wording decisions, ${result.blocking.length} sections not approved`);

  if (flags.includes("--write")) {
    const manifestPath = p("docs/commercial-rights-manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const [family, entry] of Object.entries(result.manifest)) {
      if (!manifest.families[family]) continue;
      manifest.families[family].evidence = { ...manifest.families[family].evidence, ...entry.evidence };
    }
    manifest.updated = doc.date;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const reg = p("docs/DECISION_REGISTER.md");
    const s = readFileSync(reg, "utf8");
    writeFileSync(reg, s.replace("### DR-2026-08-17-B020-CLASS-A", result.registerEntry + "\n\n### DR-2026-08-17-B020-CLASS-A"));
    console.log("\nwritten: manifest evidence + decision register entry. Statuses unchanged.");
  } else {
    console.log("\n(dry run — pass --write to apply)");
  }
}
