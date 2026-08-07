#!/usr/bin/env node
/**
 * Post-build compliance lint. Runs against dist/, NOT src/.
 *
 * ── WHY THE ARTEFACT AND NOT THE SOURCE ────────────────────────────────────
 * A term in a file that never ships is not a finding; a term that survives
 * into the deployed bundle is. These three guards are the ones a store review
 * or a regulator would effectively be running, so they run on the same thing
 * a reviewer would download.
 *
 * Three guards, all regression gates rather than one-off checks:
 *   1. copy blocklist   — Module A vocabulary discipline, in the artefact
 *   2. attractiveness   — no rating/rank/score scalar reaches the bundle
 *   3. egress allowlist — every network destination is on the list, and no
 *                         analysis-derived value is ever sent anywhere
 *
 * Exits non-zero on any finding. Exits non-zero on an EMPTY bundle too: a lint
 * that passes because it scanned nothing is the false-green this repo has
 * shipped twice.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(REPO, "dist");

// ─────────────────────────────────────────────────────────────── allowlist ──

/**
 * Every network destination the bundle may contain.
 *
 * `storage.googleapis.com/mediapipe-models` is present because that is where
 * the face_landmarker .task model actually lives — the brief named only
 * cdn.jsdelivr.net, but jsDelivr serves the WASM runtime and Google serves the
 * model. Both are MediaPipe asset hosts, neither receives user data: the model
 * is a GET of a static file.
 *
 * Sentry and RevenueCat are NOT listed as active. Neither is integrated. When
 * they are, add the pattern here and the guard will start enforcing it — the
 * placeholder assertions below check the shape rather than pretending the
 * integration exists.
 */
export const EGRESS_ALLOWLIST = [
  { pattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@mediapipe\//, why: "MediaPipe WASM runtime" },
  { pattern: /^https:\/\/storage\.googleapis\.com\/mediapipe-models\//, why: "MediaPipe face_landmarker model" },
];

/** Accepted only when a DSN is configured at runtime; never hardcoded. */
export const SENTRY_DSN_PATTERN = /^https:\/\/[\w.]+@[\w.-]+\.ingest(\.[a-z]+)?\.sentry\.io\/\d+$/;
export const REVENUECAT_HOST = "api.revenuecat.com";

import {
  BLOCKLIST, DISEASE_TERMS, extractJsProse, extractHtmlCopy, findTerms,
  findAssertive, stripComments as sharedStrip, assertCanary, CANARY_FAILURE,
} from "./copy-scan.js";

/**
 * Rating-like scalars. Checked on ASSIGNMENTS, PROPERTIES and RETURNS — never
 * on comments, so the "no attractiveness scalar" comments do not self-trip.
 *
 * Bare "score" is deliberately NOT here. MediaPipe's blendshape categories
 * carry a `score` field and `expression.js` has a `toScoreMap` helper; banning
 * the word outright would force renaming a third-party API surface to satisfy
 * a lint about English. The brief's wording is "score (when applied to a
 * person)", so person-scoped compounds are matched instead.
 */
const SCORE_TERMS = [
  "attractiveness", "hotness", "beauty", "appeal", "looksmax", "rating", "rank",
];

/** Person-scoped score compounds — these ARE the thing being banned. */
const SCORE_COMPOUNDS = [
  /\b\w*(?:attractiveness|beauty|hotness|appeal|looks)Score\b/i,
  /\b(?:overall|face|person|user|global)Score\b/i,
  /\bscoreOutOf\b/i,
];

// ───────────────────────────────────────────────────────────────── helpers ──

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/**
 * Strip comments and string-literal noise that would cause false positives.
 * Keeps code structure so assignments and returns survive.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")   // block comments
    .replace(/^\s*\/\/.*$/gm, " ")        // whole-line // comments
    .replace(/([^:])\/\/.*$/gm, "$1 ");   // trailing // comments (not URLs)
}

const findings = [];
const record = (guard, file, detail) =>
  findings.push({ guard, file: relative(DIST, file).replace(/\\/g, "/"), detail });

// ─────────────────────────────────────────────────────────────────── guards ─

/** Every user-facing string seen this run, for the canary. */
const allCopy = [];

function guardCopyBlocklist(file, text, flavour) {
  const rel = relative(DIST, file).replace(/\\/g, "/");
  const isModuleB = rel === "rules-b.js" || rel === "adapters/safety.js";

  let copy = [], disclaimer = [];
  if (file.endsWith(".html")) {
    ({ copy, disclaimer } = extractHtmlCopy(text));
  } else if (file.endsWith(".js")) {
    copy = extractJsProse(text);
  } else {
    return;
  }
  allCopy.push(...copy, ...disclaimer);

  // Disease names are rejected everywhere — Module B and disclaimers included.
  for (const h of findTerms([...copy, ...disclaimer], DISEASE_TERMS)) {
    record("disease-name", file, `"${h.term}" in: ${h.text.slice(0, 80)}`);
  }

  // Assertive phrasing outside a tradition-attributed context, everywhere.
  for (const h of findAssertive([...copy, ...disclaimer])) {
    record("assertive", file, `"${h.phrase}" in: ${h.text.slice(0, 80)}`);
  }

  // Module A vocabulary. Module B may use it when Module B actually ships;
  // disclaimers may use it because their job is to say what the app is not.
  if (isModuleB && flavour.moduleBShipped) return;
  for (const h of findTerms(copy, BLOCKLIST)) {
    record("copy-blocklist", file, `"${h.term}" in: ${h.text.slice(0, 80)}`);
  }
}

function guardAttractiveness(file, text) {
  const code = stripComments(text);
  for (const term of SCORE_TERMS) {
    // Assignment, property definition, or return of a rating-like name.
    const patterns = [
      new RegExp(String.raw`\b(?:const|let|var)\s+\w*${term}\w*\s*=`, "i"),
      new RegExp(String.raw`\b\w*${term}\w*\s*:\s*(?:[\d.]|\w+\s*[*/+-])`, "i"),
      new RegExp(String.raw`\breturn\s+\w*${term}\w*\b`, "i"),
      new RegExp(String.raw`\bfunction\s+\w*${term}\w*\s*\(`, "i"),
    ];
    for (const p of patterns) {
      if (p.test(code)) record("attractiveness", file, `rating-like scalar: "${term}"`);
    }
  }
  for (const p of SCORE_COMPOUNDS) {
    const m = code.match(p);
    if (m) record("attractiveness", file, `person-scoped score: "${m[0]}"`);
  }
}

function guardEgress(file, text) {
  for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
    const url = m[0];
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) continue;
    if (url.startsWith("http://www.w3.org")) continue;              // XML namespace, not a fetch
    if (EGRESS_ALLOWLIST.some((a) => a.pattern.test(url))) continue;
    if (SENTRY_DSN_PATTERN.test(url)) continue;
    if (url.includes(REVENUECAT_HOST)) continue;
    record("egress", file, `destination not on the allowlist: ${url}`);
  }
}

/**
 * No analysis-derived value may be sent anywhere.
 *
 * Checked structurally rather than by term: find every fetch/XHR/sendBeacon
 * call and reject any whose arguments mention a pipeline identifier.
 */
const PIPELINE_IDENTIFIERS = [
  "landmark", "faceLandmarks", "blendshape", "canvas", "imageData", "bitmap",
  "rawScalars", "deltaEi", "deltaMi", "glowIndex", "observations", "regions",
  "geometry", "complexion", "pts",
];

function guardNoBiometricEgress(file, text) {
  const code = stripComments(text);
  const calls = code.matchAll(/\b(fetch|sendBeacon|XMLHttpRequest|axios)\s*\(([^;]{0,400})/g);
  for (const c of calls) {
    const args = c[2];
    for (const id of PIPELINE_IDENTIFIERS) {
      if (new RegExp(String.raw`\b${id}`, "i").test(args)) {
        record("biometric-egress", file,
          `network call references pipeline value "${id}" — nothing derived from a face may leave the device`);
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────── run ─

function main() {
  if (!existsSync(DIST)) {
    console.error("FAIL: dist/ does not exist. Run `npm run build` first.");
    process.exit(1);
  }

  const flavour = JSON.parse(readFileSync(join(DIST, "build-info.json"), "utf8"));
  const files = walk(DIST).filter((f) => /\.(js|html|webmanifest|json)$/.test(f));

  if (files.length === 0) {
    console.error("FAIL: scanned 0 files in dist/. A lint that scans nothing cannot pass.");
    process.exit(1);
  }

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (file.endsWith("build-info.json")) continue;
    guardCopyBlocklist(file, text, flavour);
    guardAttractiveness(file, text);
    guardEgress(file, text);
    guardNoBiometricEgress(file, text);
  }

  console.log(`Bundle lint — flavour: ${flavour.flavour}, ${files.length} files scanned`);
  console.log(`  ${allCopy.length} user-facing strings extracted`);

  // A scanner that found nothing because it is broken must fail loudly rather
  // than report clean. This repo has already shipped one false all-clear.
  assertCanary(allCopy, (msg) => {
    console.error(`\nFAIL: ${msg}`);
    process.exit(1);
  });

  if (findings.length) {
    console.error(`\nFAIL: ${findings.length} finding(s)\n`);
    for (const f of findings) console.error(`  [${f.guard}] ${f.file}: ${f.detail}`);
    process.exit(1);
  }
  console.log("  copy blocklist    ok");
  console.log("  attractiveness    ok");
  console.log("  egress allowlist  ok");
  console.log("  biometric egress  ok");
}

if (import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1]?.endsWith("lint-bundle.js")) {
  main();
}
