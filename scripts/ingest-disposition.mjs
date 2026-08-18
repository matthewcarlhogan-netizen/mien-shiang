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

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, copyFileSync } from "node:fs";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import path from "node:path";

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
const REQUIRED_QUESTIONS = new Set(["Q1", "Q2", "Q3", "Q4"]);
const REQUIRED_FAMILIES = new Set([
  "five-elements-v1",
  "three-courts-v1",
  "twelve-palaces-v1",
  "qi-se-reading-v1",
  "harmony-v1",
  "qise-passages-v1"
]);

function checkAllowedKeys(obj, allowedKeys, label) {
  const keys = Object.keys(obj || {});
  for (const key of keys) {
    if (!allowedKeys.includes(key)) {
      throw new DispositionError(`${label}: unknown property "${key}"`);
    }
  }
}

export function validate(doc) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };

  try {
    checkAllowedKeys(doc, ["schemaVersion", "reviewer", "briefVersion", "date", "questions", "families"], "root");
  } catch (e) { problems.push(e.message); }

  need(doc && doc.schemaVersion === 1, "schemaVersion must be 1");
  need(Number.isInteger(doc?.briefVersion) && doc?.briefVersion >= 1, "briefVersion must be an integer >= 1");
  need(/^\d{4}-\d{2}-\d{2}$/.test(doc?.date || ""), "date must be YYYY-MM-DD");
  if (/^\d{4}-\d{2}-\d{2}$/.test(doc?.date || "")) {
    const [year, month, day] = doc.date.split("-").map(n => parseInt(n, 10));
    const dateObj = new Date(year, month - 1, day);
    need(dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day, "date must be a valid calendar date");
  }

  const r = doc?.reviewer || {};
  try {
    checkAllowedKeys(r, ["name", "qualifications", "interestsDeclared", "signatureArtifact"], "reviewer");
  } catch (e) { problems.push(e.message); }
  need(typeof r.name === "string" && r.name.trim().length >= 2,
    "reviewer.name is required — the audit requires a NAMED reviewer");
  need(typeof r.qualifications === "string" && r.qualifications.trim().length >= 20,
    "reviewer.qualifications is required and must be substantive");
  need(typeof r.interestsDeclared === "string" && r.interestsDeclared.trim().length >= 4,
    "reviewer.interestsDeclared is required (write 'none' if none)");
  need(typeof r.signatureArtifact === "string" && r.signatureArtifact.trim().length >= 4,
    "reviewer.signatureArtifact is required — an unsigned return is not a review");
  // path.win32.isAbsolute() catches "C:\foo", "C:/foo" and "\\server\share" —
  // none of which is a POSIX absolute path, so none is caught by the
  // startsWith("/") check, but all three walk out of the disposition
  // directory just as surely once resolved on a case-insensitive host.
  if (r.signatureArtifact && (
    r.signatureArtifact.includes("..") ||
    r.signatureArtifact.startsWith("/") ||
    path.win32.isAbsolute(r.signatureArtifact)
  )) {
    problems.push("reviewer.signatureArtifact cannot be an absolute path or contain '..'");
  }

  need(doc?.questions && typeof doc.questions === "object", "questions object is required");
  const qKeys = Object.keys(doc?.questions || {});
  for (const q of qKeys) {
    if (!REQUIRED_QUESTIONS.has(q)) problems.push(`unknown question: ${q}`);
  }
  for (const q of REQUIRED_QUESTIONS) {
    if (!qKeys.includes(q)) problems.push(`missing question: ${q}`);
  }

  need(doc?.families && typeof doc.families === "object", "families object is required");
  const fKeys = Object.keys(doc?.families || {});
  for (const f of fKeys) {
    if (!REQUIRED_FAMILIES.has(f)) problems.push(`unknown family: ${f}`);
  }
  for (const f of REQUIRED_FAMILIES) {
    if (!fKeys.includes(f)) problems.push(`missing family: ${f}`);
  }

  const sections = { ...(doc?.questions || {}), ...(doc?.families || {}) };

  for (const [key, d] of Object.entries(sections)) {
    if (!d || typeof d !== "object") { problems.push(`${key}: must be an object`); continue; }
    try {
      checkAllowedKeys(d, ["verdict", "rationale", "contestedInterpretations", "wordingDecisions", "_subject"], key);
    } catch (e) { problems.push(e.message); }

    need(VERDICTS.has(d?.verdict), `${key}: verdict must be approved | revise | rejected (found ${JSON.stringify(d?.verdict)})`);
    need(typeof d?.rationale === "string" && d.rationale.trim().length >= 20,
      `${key}: rationale is required and must be substantive`);
    need(Array.isArray(d?.contestedInterpretations),
      `${key}: contestedInterpretations must be an array`);
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

export function apply(result, doc, { manifestPath, regPath }, { fsOps = fs, hooks = {} } = {}) {
  // 1. Read originals
  const manifestOrig = JSON.parse(fsOps.readFileSync(manifestPath, "utf8"));
  const regOrig = fsOps.readFileSync(regPath, "utf8");

  // 1.5. Conflict check: an existing culturalReview entry for a family must
  // match this ingest's entry exactly, or the ingest is refused.
  for (const [family, entry] of Object.entries(result.manifest)) {
    if (manifestOrig.families && manifestOrig.families[family] && manifestOrig.families[family].evidence?.culturalReview) {
      const existing = JSON.stringify(manifestOrig.families[family].evidence.culturalReview);
      const incoming = JSON.stringify(entry.evidence.culturalReview);
      if (existing !== incoming) {
        throw new DispositionError(`conflicting cultural review for ${family}.`);
      }
    }
  }

  const anchor = "### DR-2026-08-17-B020-CLASS-A";
  if (regOrig.split(anchor).length !== 2) {
    throw new DispositionError("decision register anchor missing or duplicated");
  }

  // 1.6. Duplicate-entry check. The per-family conflict check above only
  // fires once a family already carries culturalReview evidence, so it
  // cannot see a repeat ingestion of a disposition whose families are all
  // still evidence-free. The register entry's own header is unique per
  // ingest (keyed off the reviewer's date), so a header already present in
  // the register means this exact disposition was ingested before —
  // whether the repeat is byte-identical or a conflicting resubmission,
  // both are refused the same way.
  const incomingHeader = result.registerEntry.split("\n")[0];
  if (regOrig.includes(incomingHeader)) {
    throw new DispositionError(
      `duplicate cultural-review register entry: "${incomingHeader}" already exists in the decision register.`);
  }

  // 2. Build new outputs
  const manifestNew = JSON.parse(JSON.stringify(manifestOrig));
  if (!manifestNew.families) {
    throw new DispositionError("Authoritative manifest has no 'families' property.");
  }
  for (const [family, entry] of Object.entries(result.manifest)) {
    if (!manifestNew.families[family]) {
      throw new DispositionError(`Family "${family}" from disposition is missing from authoritative manifest.`);
    }
    const famEntry = manifestNew.families[family];
    if (!famEntry.evidence || typeof famEntry.evidence !== 'object' || Array.isArray(famEntry.evidence)) {
        throw new DispositionError(`Malformed evidence in manifest for family ${family}`);
    }
    famEntry.evidence = { ...famEntry.evidence, ...entry.evidence };
  }
  manifestNew.updated = doc.date;
  const manifestNewStr = JSON.stringify(manifestNew, null, 2) + "\n";
  const regNewStr = regOrig.replace(anchor, anchor + "\n\n" + result.registerEntry);

  // 3. Staging and backup
  const manifestTemp = manifestPath + ".new";
  const regTemp = regPath + ".new";
  const manifestBak = manifestPath + ".bak";
  const regBak = regPath + ".bak";

  for (const p of [manifestTemp, regTemp, manifestBak, regBak]) {
    if (fsOps.existsSync(p)) throw new DispositionError(`Conflicting staging artifact: ${p}`);
  }

  const staged = [];
  try {
    fsOps.writeFileSync(manifestTemp, manifestNewStr);
    staged.push(manifestTemp);
    fsOps.writeFileSync(regTemp, regNewStr);
    staged.push(regTemp);
    fsOps.copyFileSync(manifestPath, manifestBak);
    staged.push(manifestBak);
    fsOps.copyFileSync(regPath, regBak);
    staged.push(regBak);
  } catch (prepErr) {
    const cleanupErrors = [];
    for (const f of staged) {
        try { if (fsOps.existsSync(f)) fsOps.unlinkSync(f); }
        catch (e) { cleanupErrors.push(`cleanup failed (${f}): ${e.message}`); }
    }
    throw new DispositionError(`Preparation failed: ${prepErr.message}${cleanupErrors.length > 0 ? `, Cleanup errors: ${cleanupErrors.join('; ')}` : ''}`);
  }

  // 4. Commit (rollback-protected two-file update)
  try {
    fsOps.renameSync(manifestTemp, manifestPath); // RENAME 1
    if (hooks.afterFirstRename) hooks.afterFirstRename();
    fsOps.renameSync(regTemp, regPath); // RENAME 2
  } catch (commitErr) {
    const rollbackErrors = [];

    // Restoration (independently attempt both)
    for (const [bak, dest] of [[manifestBak, manifestPath], [regBak, regPath]]) {
      try {
        if (fsOps.existsSync(bak)) {
           fsOps.renameSync(bak, dest);
        }
      } catch (e) {
        rollbackErrors.push(`restoration failed (${bak} -> ${dest}): ${e.message}`);
      }
    }

    // Cleanup staged/bak (independently attempt all)
    const toCleanup = [manifestTemp, regTemp, manifestBak, regBak];
    for (const f of toCleanup) {
      try {
        if (fsOps.existsSync(f)) fsOps.unlinkSync(f);
      } catch (e) {
        rollbackErrors.push(`cleanup failed (${f}): ${e.message}`);
      }
    }

    const msg = `Commit failed: ${commitErr.message}${rollbackErrors.length > 0 ? `, Rollback errors: ${rollbackErrors.join('; ')}` : ''}`;
    throw new DispositionError(msg);
  }

  // 5. Cleanup success
  if (fsOps.existsSync(manifestBak)) fsOps.unlinkSync(manifestBak);
  if (fsOps.existsSync(regBak)) fsOps.unlinkSync(regBak);
  return true;
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

  const isWrite = flags.includes("--write");
  const sigPath = resolve(dirname(resolve(file)), doc.reviewer?.signatureArtifact || "");
  const baseDir = fs.realpathSync(dirname(resolve(file)));

  // realpathSync throws ENOENT on a path that doesn't exist, so the
  // containment check only runs once something is actually there to
  // contain. A merely-missing artifact is not a containment question —
  // it is handled below, and must not crash either mode.
  let signatureHash = null;
  if (existsSync(sigPath)) {
    let resolvedArtifact;
    try {
      resolvedArtifact = fs.realpathSync(sigPath);
    } catch (e) {
      console.error(`ERROR: failed to resolve signature artifact ${doc.reviewer?.signatureArtifact}: ${e.message}`);
      process.exit(1);
    }
    if (!resolvedArtifact.startsWith(baseDir + (baseDir.endsWith(path.sep) ? "" : path.sep))) {
      console.error(`ERROR: signature artifact ${doc.reviewer?.signatureArtifact} is outside disposition directory.`);
      process.exit(1);
    }
    try {
      signatureHash = createHash("sha256").update(readFileSync(sigPath)).digest("hex");
    } catch (e) {
      console.error(`ERROR: failed to compute hash for ${sigPath}: ${e.message}`);
      process.exit(1);
    }
  } else if (isWrite) {
    console.error(`ERROR: signed artifact not found or unreadable (${doc.reviewer?.signatureArtifact}); refusing to write.`);
    process.exit(1);
  } else {
    console.error(`WARNING: signed artifact not found beside the JSON (${doc.reviewer?.signatureArtifact}); hash will be null.`);
  }

  let result;
  try { result = plan(doc, { signatureHash }); }
  catch (e) { console.error(`REFUSED:\n  ${e.message}`); process.exit(1); }

  console.log(result.registerEntry);
  console.log(`\n--- ${result.contested.length} contested interpretations, ${result.wording.length} wording decisions, ${result.blocking.length} sections not approved`);

  if (flags.includes("--write")) {
    try {
      apply(result, doc, { manifestPath: p("docs/commercial-rights-manifest.json"), regPath: p("docs/DECISION_REGISTER.md") }, {});
      console.log("\nwritten: manifest evidence + decision register entry. Statuses unchanged.");
    } catch (e) {
      console.error(`ERROR: rollback-protected write failed: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.log("\n(dry run — pass --write to apply)");
  }
}
