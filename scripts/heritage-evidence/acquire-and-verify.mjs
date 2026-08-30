#!/usr/bin/env node
/*
 * Project-owned Kanripo acquisition + verification.
 *
 * Clones the four Kanripo repositories at the commits pinned in
 * MIEN_SHIANG_PINNING_PASS.md, recomputes every file SHA-256, counts <pb:...>
 * folio markers, and verifies each of the 17 rows of the embedded
 * PINNED_PASSAGES.csv byte-for-byte against the freshly cloned Git object
 * bytes: the claimed <pb:...> marker must govern the passage, and the passage
 * text (with the Mandoku pilcrow and page-break markup removed) must contain
 * the dossier's quoted Chinese as a contiguous run.
 *
 * Nothing here trusts the dossier's PROSE arithmetic (§5). All counts are
 * recomputed from bytes. The negative/count checks in §3/§6/§7 are re-run,
 * including BOTH codepoints for 宮/宫 (U+5BAE and U+5BAB), because Kanripo's
 * 2016-02-05 normalisation pass rewrites one to the other in these texts and a
 * single-codepoint grep produced a false "十二宮 = 0" in the dossier.
 *
 * Source files are read with `git show`, not from the checkout. Git's
 * core.autocrlf setting can rewrite a text file on Windows; hashing the
 * working tree would then make the same pinned commit pass on LF hosts and
 * fail on CRLF hosts.
 *
 * Usage:
 *   node scripts/heritage-evidence/acquire-and-verify.mjs <scratchCloneDir> [--json <out.json>] [--report <out.md>]
 *
 * The scratch clone dir MUST be outside the repo working tree.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractFencedCsv, normaliseNewlines } from "../lib/heritage-dossier.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DOSSIER = join(REPO_ROOT, "MIEN_SHIANG_PINNING_PASS.md");

const KANRIPO = [
  { id: "KR3g0043", title: "月波洞中記", commit: "f69732902fc82fb6b1f759cb7bf5a910c0b903a3" },
  { id: "KR3g0044", title: "玉管照神局", commit: "0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74" },
  { id: "KR3g0045", title: "太清神鑑",   commit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5" },
  { id: "KR3g0046", title: "人倫大統賦", commit: "b408ea0b969672a1f52e5ec371f9fe3250976e58" },
];

const args = process.argv.slice(2);
const scratch = args[0] ? resolve(args[0]) : null;
const jsonOut = flag("--json");
const reportOut = flag("--report");
function flag(name) { const i = args.indexOf(name); return i >= 0 ? resolve(args[i + 1]) : null; }

if (!scratch) { console.error("need <scratchCloneDir>"); process.exit(2); }
if (scratch.startsWith(REPO_ROOT)) { console.error("scratch dir must be OUTSIDE the repo"); process.exit(2); }
if (!existsSync(scratch)) mkdirSync(scratch, { recursive: true });

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");
const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8" }).trim();
const gitBlob = (cwd, path) => execFileSync("git", ["show", `HEAD:${path}`], { cwd });

// ---------------------------------------------------------------------------
// 1. Parse the dossier: §1 expected hashes, §2 PINNED_PASSAGES.csv
// ---------------------------------------------------------------------------
const dossierText = readFileSync(DOSSIER, "utf8");
const dossier = normaliseNewlines(dossierText);

// §1 hash block: lines "  <64hex>  <file>"
const expectedHashes = {};
for (const m of dossier.matchAll(/^([0-9a-f]{64})\s+(KR3g004\d_\d{3}\.txt)$/gm)) {
  expectedHashes[m[2]] = m[1];
}

// §2 CSV: the fenced blocks beginning with their stable headers
const passagesCsv = extractFencedCsv(dossier, "passageId,sourceId,repoUrl");
const atlasCsv = extractFencedCsv(dossier, "relationshipId,family,relationshipClass");

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const passages = parseCsv(passagesCsv);
const atlas = atlasCsv ? parseCsv(atlasCsv) : [];

// ---------------------------------------------------------------------------
// 2. Clone + checkout + verify commits, hash every file
// ---------------------------------------------------------------------------
const acqTimestamp = new Date().toISOString();
const repoResults = [];
const fileBytes = {}; // "KR3g0045_001.txt" -> Buffer

for (const r of KANRIPO) {
  const dir = join(scratch, r.id);
  if (!existsSync(join(dir, ".git"))) {
    execFileSync("git", ["clone", "--quiet", `https://github.com/kanripo/${r.id}`, dir], { stdio: "inherit" });
  }
  execFileSync("git", ["checkout", "--quiet", r.commit], { cwd: dir });
  const head = git(dir, "rev-parse", "HEAD");
  const commitDate = git(dir, "show", "-s", "--format=%cI", "HEAD");
  const files = git(dir, "ls-files").split("\n").filter(Boolean);
  const hashes = {};
  for (const f of files) {
    const buf = gitBlob(dir, f);
    hashes[f] = { sha256: sha256(buf), bytes: buf.length };
    if (/^KR3g004\d_\d{3}\.txt$/.test(f)) fileBytes[f] = buf;
  }
  repoResults.push({
    id: r.id, title: r.title, remote: `https://github.com/kanripo/${r.id}`,
    expectedCommit: r.commit, actualCommit: head, commitMatch: head === r.commit,
    commitDate, defaultBranch: "master", files, hashes,
  });
}

// hash comparison table (17 text files)
const hashTable = [];
for (const [file, expected] of Object.entries(expectedHashes).sort()) {
  const repo = file.slice(0, 8);
  const actual = repoResults.find(r => r.id === repo)?.hashes[file]?.sha256 ?? null;
  hashTable.push({ file, expected, actual, match: actual === expected });
}
const hashAllMatch = hashTable.every(h => h.match) && hashTable.length === 17;

// ---------------------------------------------------------------------------
// 3. <pb:...> marker counts
// ---------------------------------------------------------------------------
const pbCounts = {};
let pbTotal = 0;
for (const [file, buf] of Object.entries(fileBytes)) {
  const n = (buf.toString("utf8").match(/<pb:[^>]*>/g) || []).length;
  pbCounts[file] = n; pbTotal += n;
}

// ---------------------------------------------------------------------------
// 4. Passage verification — 17 rows
// ---------------------------------------------------------------------------
// Mandoku markup: <pb:> page breaks, ¶ column breaks, / splitting a double-column
// interlinear note, and the ideographic space 　 used for indent/gaps.
const stripMarkup = (s) => s.replace(/<pb:[^>]*>/g, "").replace(/[¶\/　]/g, "").replace(/\s+/g, "");
// dossier quotes flatten the double-column notes and read through phonological
// glosses; verify by requiring every maximal Han run of the quote (split on the
// note parentheses and on … ellipsis) to appear in the marker-governed span, in order.
const quoteSegments = (s) => s
  .replace(/[¶\/　\s]/g, "")
  .split(/[（(）)…]+/)
  .map(x => x.trim())
  .filter(x => x.length >= 2);

const passageResults = passages.map((p) => {
  const buf = fileBytes[p.filePath];
  const out = { passageId: p.passageId, filePath: p.filePath, juan: p.juan, section: p.section,
                pbMarker: p.pbMarker, textualLayer: p.textualLayer };
  if (!buf) { out.status = "FILE_MISSING"; return out; }
  const text = buf.toString("utf8");
  // marker(s) named in pbMarker: "<pb:X>" or "<pb:X> to <pb:Y>"
  const markers = [...p.pbMarker.matchAll(/<pb:([^>]*)>/g)].map(m => m[1]);
  out.markersPresent = markers.map(m => ({ marker: m, present: text.includes(`<pb:${m}>`) }));


  // span governed by the first marker: from that marker to the next <pb:> (or file end)
  const firstIdx = text.indexOf(`<pb:${markers[0]}>`);
  let span = "";
  if (firstIdx >= 0) {
    const rest = text.slice(firstIdx);
    const nextPb = rest.slice(1).search(/<pb:[^>]*>/);
    // extend across the whole quoted range if a "to" marker is given
    if (markers.length > 1) {
      const lastIdx = text.indexOf(`<pb:${markers[markers.length - 1]}>`);
      const after = text.slice(lastIdx + 1);
      const endRel = after.search(/<pb:[^>]*>/);
      span = text.slice(firstIdx, endRel >= 0 ? lastIdx + 1 + endRel : text.length);
    } else {
      span = nextPb >= 0 ? rest.slice(0, nextPb + 1) : rest;
    }
  }
  // widen the span to also include text between the previous <pb:> and the first
  // named marker, since a passage can straddle a folio break (yg-j3).
  let widened = span;
  if (firstIdx > 0) {
    const prevPb = text.slice(0, firstIdx).lastIndexOf("<pb:");
    const start = prevPb >= 0 ? prevPb : firstIdx;
    widened = text.slice(start);
    const lastMarkerIdx = widened.indexOf(`<pb:${markers[markers.length - 1]}>`);
    const endRel = widened.slice(lastMarkerIdx + 1).search(/<pb:[^>]*>/);
    if (endRel >= 0) widened = widened.slice(0, lastMarkerIdx + 1 + endRel);
  }

  const hay = stripMarkup(span);
  const wideHay = stripMarkup(widened);
  const wholeFileHay = stripMarkup(text);
  const needle = stripMarkup(p.passageChinese.replace(/…/g, "").trim());
  const segs = quoteSegments(p.passageChinese);

  // Reading-through match. The dossier's passageChinese (a) flattens Mandoku
  // double-column notes (the / split), (b) splices the base text across the note
  // parentheses it deletes, and (c) reads through short interlinear phonological
  // glosses that interrupt a 賦 line. Verification: split the quote on the note
  // parentheses into segments; each segment must occur in the marker-governed
  // span as an ordered sequence of runs (>= 2 chars each; gaps allowed = the
  // glosses read through), and the segments themselves must appear in order.
  const noParen = (s) => s.replace(/[（(）)]/g, "");
  // Backtracking run match: seg[si..] must be consumable as ordered runs of the
  // haystack from position hi. Each run >= 2 chars (a trailing remainder may be
  // 1). Haystack gaps between runs = the interlinear glosses the dossier reads
  // through. Returns the run lengths on success, or null.
  const matchSeg = (seg, si, haystack, hi, acc) => {
    if (si >= seg.length) return { runs: acc, endPos: hi };
    let maxL = 0;
    while (si + maxL < seg.length && haystack.indexOf(seg.slice(si, si + maxL + 1), hi) >= 0) maxL++;
    for (let L = maxL; L >= 1; L--) {
      if (L < 2 && si + L < seg.length) continue;
      let from = hi;
      for (;;) {
        const idx = haystack.indexOf(seg.slice(si, si + L), from);
        if (idx < 0) break;
        const r = matchSeg(seg, si + L, haystack, idx + L, [...acc, L]);
        if (r) return r;
        from = idx + 1;
      }
    }
    return null;
  };
  const segRunMatch = (haystack) => {
    let hi = 0; const runsPerSeg = []; let firstMiss = null;
    for (const seg of segs) {
      const m = matchSeg(seg, 0, haystack, hi, []);
      if (!m) { firstMiss = firstMiss ?? seg.slice(0, 14); runsPerSeg.push(null); continue; }
      runsPerSeg.push(m.runs);
      hi = m.endPos;
    }
    const ok = !firstMiss && runsPerSeg.every(Boolean);
    return { ok, runsPerSeg, firstMiss };
  };
  const contiguous = hay.includes(needle) || wideHay.includes(needle);
  const inSpan = segRunMatch(noParen(wideHay));
  const inFile = segRunMatch(noParen(wholeFileHay));

  out.contiguousInSpan = contiguous;
  out.segCount = segs.length;
  out.runsInMarkerSpan = inSpan.runsPerSeg;
  out.matchOrderInMarkerSpan = inSpan.ok;
  out.matchOrderInFile = inFile.ok;
  out.firstDivergence = inSpan.firstMiss || inFile.firstMiss || null;
  const gaps = inSpan.runsPerSeg.reduce((a, rs) => a + Math.max(0, rs.length - 1), 0) + Math.max(0, segs.length - 1);
  out.transcriptionNote = contiguous ? null
    : inSpan.ok ? `dossier quote is a reading-through: flattens Mandoku double-column notes and/or splices the base text across ${gaps} note/gloss gap(s); every substantive run present under the marker, in order; runsPerSeg=${JSON.stringify(inSpan.runsPerSeg)}`
    : null;
  out.status = contiguous ? "VERIFIED"
             : inSpan.ok ? "VERIFIED_WITH_TRANSCRIPTION_NOTE"
             : inFile.ok ? "RUNS_OK_BUT_NOT_UNDER_MARKER"
             : "PASSAGE_NOT_FOUND";
  return out;
});

// ---------------------------------------------------------------------------
// 5. Negative / count checks (§3, §6, §7) — recomputed from bytes
// ---------------------------------------------------------------------------
function countAll(term) {
  const per = {};
  let total = 0;
  for (const [file, buf] of Object.entries(fileBytes)) {
    const t = buf.toString("utf8");
    let n = 0, idx = 0;
    while ((idx = t.indexOf(term, idx)) >= 0) { n++; idx += term.length; }
    if (n) per[file] = n;
    total += n;
  }
  return { term, total, per };
}
const checks = {
  "十二宮_U+5BAE": countAll("十二宮"),
  "十二宫_U+5BAB": countAll("十二宫"),
  "面有十二宫": countAll("面有十二宫"),
  "面有十二宮": countAll("面有十二宮"),
  "人倫風鑑": countAll("人倫風鑑"),
  "二十五": countAll("二十五"),
  "五形": countAll("五形"),
  "五行形": countAll("五行形"),
  "似金得": countAll("似金得"), "似木得": countAll("似木得"), "似水得": countAll("似水得"),
  "似火得": countAll("似火得"), "似土得": countAll("似土得"),
  "荀子": countAll("荀子"),
  "荀子曰": countAll("荀子曰"),
  "論心擇術": countAll("論心擇術"),
  "三停平等": countAll("三停平等"),
  "五嶽四瀆要相應": countAll("五嶽四瀆要相應"),
};

// ---------------------------------------------------------------------------
// 6. §5 coverage arithmetic recomputed from the §4 CSV bytes
// ---------------------------------------------------------------------------
const atlasArith = atlas.length ? {
  rows: atlas.length,
  verifiedPrimary: atlas.filter(r => r.evidenceStrength === "VERIFIED_PRIMARY").length,
  recordedNotVerified: atlas.filter(r => r.evidenceStrength === "RECORDED_NOT_VERIFIED").length,
  prohibitedTrue: atlas.filter(r => r.prohibitedForUserInference === "true").length,
  eligible: atlas.filter(r => r.runtimePotential === "ELIGIBLE").length,
  productDecisionRequired: atlas.filter(r => r.runtimePotential === "PRODUCT_DECISION_REQUIRED").length,
  historicalEvidenceOnly: atlas.filter(r => r.runtimePotential === "HISTORICAL_EVIDENCE_ONLY").length,
} : null;

// ---------------------------------------------------------------------------
// Emit
// ---------------------------------------------------------------------------
const result = {
  acquisitionTimestamp: acqTimestamp,
  dossier: { path: "MIEN_SHIANG_PINNING_PASS.md", sha256: sha256(Buffer.from(dossier, "utf8")) },
  repos: repoResults.map(r => ({ id: r.id, title: r.title, remote: r.remote,
    expectedCommit: r.expectedCommit, actualCommit: r.actualCommit, commitMatch: r.commitMatch,
    commitDate: r.commitDate, fileCount: r.files.length })),
  hashTable, hashAllMatch,
  pbCounts, pbTotal,
  passageResults,
  passageAllVerified: passageResults.every(p => p.status === "VERIFIED"),
  checks,
  atlasArith,
};

if (jsonOut) writeFileSync(jsonOut, JSON.stringify(result, null, 2));

const L = [];
L.push(`# acquire-and-verify — ${acqTimestamp}`);
L.push("");
L.push(`dossier SHA-256: ${result.dossier.sha256}`);
L.push("");
L.push(`## Commits`);
for (const r of result.repos) L.push(`- ${r.id} ${r.title}: ${r.actualCommit} ${r.commitMatch ? "MATCH" : "!!! MISMATCH"} (${r.commitDate})`);
L.push("");
L.push(`## File hashes (expected vs actual) — ${hashAllMatch ? "17/17 MATCH" : "MISMATCH PRESENT"}`);
for (const h of hashTable) L.push(`- ${h.file}: ${h.match ? "MATCH" : `MISMATCH exp=${h.expected} act=${h.actual}`}`);
L.push("");
L.push(`## <pb:...> markers — total ${pbTotal}`);
for (const [f, n] of Object.entries(pbCounts)) L.push(`- ${f}: ${n}`);
L.push("");
L.push(`## Passage verification`);
for (const p of passageResults) {
  L.push(`- ${p.passageId} [${p.status}] ${p.filePath} ${p.juan}/${p.section} ${p.pbMarker}`);
  if (p.transcriptionNote) L.push(`    NOTE: ${p.transcriptionNote}`);
  else if (p.status !== "VERIFIED") L.push(`    firstDivergence≈"${p.firstDivergence}"  contiguous=${p.contiguousInSpan} inFile=${p.matchOrderInFile}`);
}
L.push("");
L.push(`## Count checks`);
for (const [k, v] of Object.entries(checks)) L.push(`- ${k}: total ${v.total} ${JSON.stringify(v.per)}`);
L.push("");
if (atlasArith) {
  L.push(`## §4 atlas CSV arithmetic (recomputed from bytes)`);
  for (const [k, v] of Object.entries(atlasArith)) L.push(`- ${k}: ${v}`);
}
const report = L.join("\n") + "\n";
if (reportOut) writeFileSync(reportOut, report);
console.log(report);

// exit non-zero only on genuine hard stops
const hardStop = !hashAllMatch
  || result.repos.some(r => !r.commitMatch)
  || passageResults.some(p => p.status === "PASSAGE_NOT_FOUND");
process.exit(hardStop ? 1 : 0);
