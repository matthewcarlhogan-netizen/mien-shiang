/*
 * Copy lint over the SOURCE TREE — index.html, ui.js and engine.js included.
 *
 * tests/copy-guard.test.js scans the copy DECKS by importing them. That misses
 * every string written directly into a view or a page: the consent gate and the
 * footer, which are the two most compliance-sensitive surfaces in the app, were
 * unscanned by anything until now.
 *
 * This scans files. scripts/lint-bundle.js runs the same primitives from
 * scripts/copy-scan.js against dist/, so source and artefact cannot diverge.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import {
  BLOCKLIST, DISEASE_TERMS, extractJsProse, extractHtmlCopy, findTerms,
  findAssertive, assertCanary, CANARY_FAILURE, CANARY_TERM, isProse,
} from "../scripts/copy-scan.js";
import { IDENTIFIER_URI_ALLOWLIST } from "../scripts/lint-bundle.js";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/** Files whose copy belongs to Module B and may use clinical vocabulary. */
const MODULE_B_FILES = new Set(["rules-b.js", "adapters/safety.js", "modulebview.js"]);

const rel = (f) => relative(SRC, f).replace(/\\/g, "/");

/** Collect every user-facing string in src/, tagged with its origin. */
function collect() {
  const out = [];
  for (const file of walk(SRC).filter((f) => /\.(js|html)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    if (file.endsWith(".html")) {
      const { copy, disclaimer, legal } = extractHtmlCopy(text);
      out.push(...copy.map((s) => ({ s, file: rel(file), bucket: "copy" })));
      out.push(...disclaimer.map((s) => ({ s, file: rel(file), bucket: "disclaimer" })));
      out.push(...legal.map((s) => ({ s, file: rel(file), bucket: "legal" })));
    } else {
      out.push(...extractJsProse(text).map((s) => ({ s, file: rel(file), bucket: "copy" })));
    }
  }
  return out;
}

const ALL = collect();

// ─────────────────────────────────────────────────────────────── the canary ──

test("CANARY: the scanner finds a term that is definitely present", () => {
  // Without this, a broken path or regex reports "clean" instead of "broken".
  // This repo has already shipped one false all-clear from exactly that.
  assertCanary(ALL.map((x) => x.s), (msg) => assert.fail(msg));

  const hits = ALL.filter((x) => new RegExp(String.raw`\b${CANARY_TERM}\b`, "i").test(x.s));
  assert.ok(hits.length > 0, CANARY_FAILURE);
  assert.ok(hits.some((h) => h.file === "index.html"),
    `${CANARY_FAILURE} (index.html specifically was not scanned)`);
});

test("the three previously-unscanned files are actually being scanned", () => {
  for (const f of ["index.html", "ui.js", "engine.js"]) {
    assert.ok(ALL.some((x) => x.file === f),
      `${f} produced no user-facing strings — it is not being scanned`);
  }
  assert.ok(ALL.length > 150, `expected a substantial corpus, got ${ALL.length}`);
});

// ─────────────────────────────────────────────────────────────── blocklist ──

test("no Module A source file contains health vocabulary in user-facing copy", () => {
  const offenders = [];
  for (const { s, file, bucket } of ALL) {
    if (MODULE_B_FILES.has(file)) continue;
    // Disclaimers and legal pages are exempt from the blocklist ONLY. Their job
    // is to say what the app is not and does not do, which cannot be written
    // without the words "diagnose", "treat", "cure" and "disease". Weakening
    // those sentences to satisfy a vocabulary lint would trade a real legal
    // disclosure for a green test.
    if (bucket !== "copy") continue;
    for (const h of findTerms([s], BLOCKLIST)) {
      offenders.push(`${file}: "${h.term}" in ${JSON.stringify(s.slice(0, 90))}`);
    }
  }
  assert.deepEqual(offenders, [],
    "health vocabulary in Module A copy:\n  " + offenders.join("\n  "));
});

test("no disease name appears anywhere, including disclaimers and Module B", () => {
  const offenders = [];
  for (const { s, file } of ALL) {
    for (const h of findTerms([s], DISEASE_TERMS)) {
      offenders.push(`${file}: "${h.term}" in ${JSON.stringify(s.slice(0, 90))}`);
    }
  }
  assert.deepEqual(offenders, [],
    "TGA exclusion 14B does not apply to software making claims about a serious "
    + "disease, in ANY module:\n  " + offenders.join("\n  "));
});

test("the blocklist actually contains the Module B terms it is documented to", () => {
  // Documented in Phase 2 instruction 11 and used by the relocated advisory.
  // Verifying they are TESTED, not merely written down somewhere.
  for (const term of ["circulation", "blood", "iron", "anaemia", "thyroid"]) {
    assert.ok(BLOCKLIST.includes(term), `blocklist is missing "${term}"`);
  }
  // And that the guard would actually fire on them.
  assert.equal(findTerms(["a note about circulation and iron levels here"], BLOCKLIST).length, 2);
});

// ──────────────────────────────────────────────────────── assertive phrasing ─

test("no assertive second-person claim outside a tradition-attributed string", () => {
  const offenders = [];
  for (const { s, file, bucket } of ALL) {
    // Legal pages are exempt: "rights you have under consumer law" and "it does
    // not tell you facts about your character" are a statute reference and a
    // denial, not claims about the reader. Disclaimers are NOT exempt.
    if (bucket === "legal") continue;
    for (const h of findAssertive([s])) {
      offenders.push(`${file}: "${h.phrase}" in ${JSON.stringify(s.slice(0, 90))}`);
    }
  }
  assert.deepEqual(offenders, [],
    "assertive phrasing must be rewritten as tradition:\n  " + offenders.join("\n  "));
});

test("the assertive guard fires on an unattributed claim and not on an attributed one", () => {
  assert.equal(findAssertive(["You are a naturally patient and steady person."]).length, 1);
  assert.equal(findAssertive(["You will find that this holds true for you."]).length, 1);
  assert.equal(
    findAssertive(["In Mian Xiang this shape is read as steadiness, so you are said to be dependable."]).length,
    0, "a tradition-attributed string may use second person");
});

// ────────────────────────────────────────────────── the disclaimer exemption ─

test("only the two legal pages use the legal exemption", () => {
  // The broadest exemption in the system, so it is pinned to exactly the two
  // documents that need it. Anything else marking itself legal is a bug.
  const marked = walk(SRC)
    .filter((f) => /\.html$/.test(f))
    .filter((f) => /data-copy=["']legal["']/.test(readFileSync(f, "utf8")))
    .map(rel)
    .sort();
  assert.deepEqual(marked, ["privacy.html", "terms.html"]);
});

test("the disclaimer exemption is narrow and cannot be applied to a reading", () => {
  const html = readFileSync(join(SRC, "index.html"), "utf8");
  const { disclaimer } = extractHtmlCopy(html);
  assert.ok(disclaimer.length > 0, "the consent gate and footer must be marked as disclaimers");

  // The exemption may only be used where the text is genuinely disclaiming.
  const blob = disclaimer.join(" ");
  assert.match(blob, /not intended to diagnose/i);
  assert.match(blob, /never uploaded|never stored/i);

  // No reading module may carry the marker.
  for (const f of walk(SRC).filter((x) => /reading[\\/]|readingview/.test(x))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /data-copy=["']disclaimer["']/,
      `${rel(f)} must not mark reading copy as a disclaimer`);
  }
});

test("the consent gate states on-device processing and the entertainment framing", () => {
  const { disclaimer } = extractHtmlCopy(readFileSync(join(SRC, "index.html"), "utf8"));
  const blob = disclaimer.join(" ");
  assert.match(blob, /analysed on this device/i);
  assert.match(blob, /discarded/i);
  assert.match(blob, /never linked to you/i);
  assert.match(blob, /no scientific basis/i);
  assert.match(blob, /entertainment/i);
  // And that it promises no rating.
  assert.match(blob, /does not rate you|no attractiveness score/i);
});

// ────────────────────────────────────────────────────────── prose heuristics ─

test("isProse keeps sentences and rejects code-shaped strings", () => {
  assert.equal(isProse("In Mian Xiang the Life Palace is read as general fortune."), true);
  assert.equal(isProse("deep_rhytide_vertical"), false);
  assert.equal(isProse("erythema"), false);
  assert.equal(isProse("application/manifest+json"), false);
  assert.equal(isProse("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision"), false);
  assert.equal(isProse("./reading/five-elements.js"), false);
});

test("the JSON Schema URI exception is an exact metadata identifier", () => {
  const allowed = (url) => IDENTIFIER_URI_ALLOWLIST.some((pattern) => pattern.test(url));
  assert.equal(allowed("https://json-schema.org/draft/2020-12/schema"), true);
  assert.equal(allowed("https://json-schema.org/draft/2020-12/schema?reading=1"), false);
  assert.equal(allowed("https://json-schema.org/draft/2020-12/schema#face"), false);
  assert.equal(allowed("https://json-schema.org/draft/2019-09/schema"), false);
});
