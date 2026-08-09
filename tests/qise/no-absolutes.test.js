/*
 * PHASE 10, gate 3 — no absolute or cross-user quantity may be rendered.
 *
 * `melaninIndexProxy` and `ita` exist for INTERNAL stratification only: they
 * are how the ROI rejection rate gets reported per tone band during device
 * testing, which is the only way a fairness defect in the landmarker becomes
 * visible instead of averaging away. Rendered, they become a number about a
 * person's skin on a scale they never asked to be placed on.
 *
 * The same applies to any percentile or cross-user comparison, for a simpler
 * reason: there is no population in this repository. Every number the product
 * shows is a comparison between one person's face and their own previous
 * readings, and any language implying otherwise is describing a computation
 * that does not exist.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { stripComments, tokeniseStringLiterals } from "../../scripts/copy-scan.js";
import { identifierSegments, identifierCarriesTerm } from "../../scripts/lint-bundle.js";

const SRC = fileURLToPath(new URL("../../src", import.meta.url));
const UI = join(SRC, "ui", "qise");

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

const uiFiles = walk(UI).filter((f) => f.endsWith(".js"));
const rel = (f) => relative(SRC, f).replace(/\\/g, "/");

test("the guard is scanning the view layer", () => {
  assert.ok(uiFiles.length >= 3, `only ${uiFiles.length} view files`);
  assert.ok(uiFiles.some((f) => rel(f) === "ui/qise/screens.js"));
  assert.ok(uiFiles.some((f) => rel(f) === "ui/qise/app.js"));
});

test("no view module imports or calls melaninIndexProxy or ita", () => {
  // Checked as an IMPORT and as a CALL. Checking only the import misses
  // `color.ita(...)` through a namespace import, which is exactly how the view
  // layer already reaches the colour module.
  const offenders = [];
  for (const f of uiFiles) {
    const code = stripComments(readFileSync(f, "utf8"));
    for (const p of [
      /import\s*\{[^}]*\b(melaninIndexProxy|ita)\b[^}]*\}/,
      /\b(melaninIndexProxy|ita)\s*\(/,
      /\.\s*(melaninIndexProxy|ita)\b/,
    ]) {
      const m = code.match(p);
      if (m) offenders.push(`${rel(f)}: ${m[0].slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, [],
    "these are for internal tone stratification only:\n  " + offenders.join("\n  "));
});

test("the guard would catch it if a view did render one", () => {
  // Paired positive control.
  const patterns = [
    /import\s*\{[^}]*\b(melaninIndexProxy|ita)\b[^}]*\}/,
    /\b(melaninIndexProxy|ita)\s*\(/,
    /\.\s*(melaninIndexProxy|ita)\b/,
  ];
  for (const sample of [
    'import { ita, chroma } from "../../qise/color.js";',
    "el.textContent = melaninIndexProxy(lab.L).toFixed(1)",
    "const band = color.ita(lab.L, lab.b)",
  ]) {
    assert.ok(patterns.some((p) => p.test(sample)), `missed: ${sample}`);
  }
  // And it does not fire on ordinary words containing the letters.
  for (const ok of ["const capital = 1", "digital", "orbital", "qualitative"]) {
    assert.ok(!patterns.some((p) => p.test(ok)), `false positive on: ${ok}`);
  }
});

test("no rendered string offers a percentile or a comparison to other people", () => {
  // The `top N%` alternative sits OUTSIDE the \b-delimited group: a trailing
  // \b after `%` requires a word character next, so "top 10% of users" would
  // not match and the guard would miss the most likely phrasing of all.
  const CROSS_USER = /\btop \d+%|\b(percentile|better than|worse than|average (person|user)|most people|other (people|users)|compared to others|ranked?|rating)\b/i;
  const offenders = [];
  for (const f of uiFiles) {
    for (const s of tokeniseStringLiterals(readFileSync(f, "utf8"))) {
      const m = s.match(CROSS_USER);
      if (m) offenders.push(`${rel(f)}: "${m[0]}" in ${JSON.stringify(s.slice(0, 80))}`);
    }
  }
  assert.deepEqual(offenders, [],
    "there is no population in this repository to be average against:\n  " + offenders.join("\n  "));
  assert.match("you are in the top 10% of users", CROSS_USER);
  assert.match("above the average person", CROSS_USER);
});

test("the whole feature renders no leaderboard, rank or overall score", () => {
  const SCALARS = [
    /\b\w*(?:overall|beauty|attractiveness|glow|skin|face)Score\b/i,
    /\bleaderboard\b/i,
    /\bpercentileOf\b/i,
    /\bscoreOutOf\b/i,
  ];
  const all = [...walk(join(SRC, "qise")), ...uiFiles].filter((f) => f.endsWith(".js"));
  const offenders = [];
  for (const f of all) {
    const code = stripComments(readFileSync(f, "utf8"));
    for (const p of SCALARS) {
      const m = code.match(p);
      if (m) offenders.push(`${rel(f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, []);
  assert.ok(SCALARS.some((p) => p.test("const overallScore = 82")));
});

test("the bundle lint matches rating terms at SEGMENT boundaries, not as substrings", () => {
  // A substring test on English inside identifiers finds things that are not
  // there: `CALIBRATING_READINGS` contains "RATING" and was reported as a
  // rating-like scalar by scripts/lint-bundle.js. Same class as CLAUDE.md item
  // 22 — a scanner confidently wrong about code it misread — and the same
  // wrong fix was available, which is renaming working code to satisfy a lint
  // about English.
  assert.deepEqual(identifierSegments("CALIBRATING_READINGS"), ["calibrating", "readings"]);
  assert.deepEqual(identifierSegments("beautyScore"), ["beauty", "score"]);
  assert.deepEqual(identifierSegments("overall_rank"), ["overall", "rank"]);

  // The false positives that prompted the change.
  for (const safe of ["CALIBRATING_READINGS", "operatingMode", "generatingFn", "decoratingStyle"]) {
    assert.equal(identifierCarriesTerm(safe, "rating"), false, safe);
  }

  // And every real detection still fires. A prefix, not equality, so a
  // pluralised or suffixed name is still caught.
  for (const [name, term] of [
    ["beautyScore", "beauty"], ["userRating", "rating"], ["rankings", "rank"],
    ["attractivenessIndex", "attractiveness"], ["hotness", "hotness"],
    ["appeal_score", "appeal"], ["looksmaxScore", "looksmax"],
  ]) {
    assert.equal(identifierCarriesTerm(name, term), true, `${name} should match ${term}`);
  }
});

test("the internal users of the two functions are still allowed, and still exist", () => {
  // The negative above is only meaningful if the functions are genuinely used
  // somewhere legitimate. If nothing used them, "no view renders them" would
  // be true of a codebase that had simply deleted the fairness instrumentation.
  const color = readFileSync(join(SRC, "qise", "color.js"), "utf8");
  assert.match(color, /export function melaninIndexProxy/);
  assert.match(color, /export function ita/);
  assert.match(color, /INTERNAL stratification only/i,
    "the constraint must be stated where the function is defined, not only in a test");
});
