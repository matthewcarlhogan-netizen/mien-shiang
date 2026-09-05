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
  /*
   * Lemon Squeezy hosted checkout — the ONLY payment destination.
   *
   * Constrained the same way the documentation links are, and for the same
   * reason: the pattern is anchored at both ends and the path segment excludes
   * `?` and `#`, so a query string or fragment cannot match. That is not
   * decoration. A checkout URL is the one place in this app where it would be
   * natural to append "context" — a zone name, a face shape, a score — and any
   * such value would be biometric-derived data handed to a third party in a URL
   * the user is invited to tap. The regex makes that unrepresentable rather
   * than merely discouraged.
   *
   * The product IDs are placeholders until the products exist in the dashboard.
   * Swapping them changes only the path segment, so this entry does not move.
   */
  { pattern: /^https:\/\/checkout\.lemonsqueezy\.com\/buy\/[A-Za-z0-9-]+$/, why: "Lemon Squeezy hosted checkout" },
];

/** Accepted only when a DSN is configured at runtime; never hardcoded. */
export const SENTRY_DSN_PATTERN = /^https:\/\/[\w.]+@[\w.-]+\.ingest(\.[a-z]+)?\.sentry\.io\/\d+$/;
export const REVENUECAT_HOST = "api.revenuecat.com";

/**
 * DOCUMENTATION LINKS — destinations the user may choose to open, which the
 * app never calls itself.
 *
 * These are not egress. The guard exists to stop the app SENDING anywhere it
 * shouldn't; a hyperlink the user taps is a navigation they initiated. Both
 * entries are here because something else requires them: the MediaPipe URL is
 * part of the Apache-2.0 attribution, and RevenueCat's policy must be linked
 * from ours if their processing is described.
 *
 * They are still constrained: a documentation link may carry NO query string
 * and NO fragment, because either could smuggle a value out in a URL the user
 * is invited to click. Asserted below.
 */
export const DOC_LINK_ALLOWLIST = [
  /^https:\/\/github\.com\/google-ai-edge\/mediapipe$/,
  /^https:\/\/www\.revenuecat\.com\/privacy$/,
  /* Google Fonts — used by beta/ for webfont @import.
   * The font families (Archivo, Fraunces, IBM Plex Mono, Noto Serif SC) are
   * loaded via @import in beta.css; no analysis data is sent, only the font
   * request itself which returns static font files. */
  /^https:\/\/fonts\.googleapis\.com\/css2\?family=/,
];

/**
 * Metadata identifiers that are URIs by specification but are never fetched or
 * offered as links. Keep these exact: a query or fragment would be data, not an
 * identifier, and a different schema version needs its own review.
 */
export const IDENTIFIER_URI_ALLOWLIST = [
  /^https:\/\/json-schema\.org\/draft\/2020-12\/schema$/,
  /*
   * Kanripo evidence-source locators — `sourceUrl` on records in
   * `src/reading/provenance.js`, added by the 2026-08-29 project-owned
   * acquisition (docs/heritage-evidence/acquisition-verify.json). Each
   * record cites the exact GitHub blob it was hashed from; nothing in the
   * app fetches these or renders them as a tappable link today (verified:
   * no `sourceUrl` read exists under src/ui/ or src/qise/) — they exist so
   * a human reviewer can independently re-verify a citation, the same
   * purpose a footnote serves.
   *
   * A single exact-string entry per URL, like the JSON Schema one above,
   * would need a new line for every future pinned source and would drift
   * silently. This pattern is anchored just as tightly instead: it can
   * match ONLY one of the four pinned Kanripo repos, a 40-character git
   * commit SHA (any value — the pin is enforced by
   * `acquisition-verify.json` and its own test, not by this lint), and the
   * `KR3g00NN_NNN.txt` filename convention those repos actually use. No
   * query string or fragment can match, so it cannot smuggle a value the
   * way a tappable link could.
   */
  /^https:\/\/github\.com\/kanripo\/KR3g00(?:43|44|45|46)\/blob\/[0-9a-f]{40}\/KR3g00(?:43|44|45|46)_\d{3}\.txt$/,
];

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

  let copy = [], disclaimer = [], legal = [];
  if (file.endsWith(".html")) {
    ({ copy, disclaimer, legal } = extractHtmlCopy(text));
  } else if (file.endsWith(".js")) {
    copy = extractJsProse(text);
  } else {
    return;
  }
  allCopy.push(...copy, ...disclaimer, ...legal);

  // Disease names are rejected EVERYWHERE — Module B, disclaimers and legal
  // pages included. TGA exclusion 14B does not survive a disease claim in any
  // surface of the product.
  for (const h of findTerms([...copy, ...disclaimer, ...legal], DISEASE_TERMS)) {
    record("disease-name", file, `"${h.term}" in: ${h.text.slice(0, 80)}`);
  }

  // Assertive phrasing. Legal pages are exempt (a statute reference such as
  // "rights you have under consumer law" is not a claim about the reader);
  // disclaimers are not.
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

/**
 * Split an identifier into its segments: camelCase, snake_case, SCREAMING_CASE.
 *
 * ── WHY SUBSTRING MATCHING IS NOT GOOD ENOUGH HERE ─────────────────────────
 * The original patterns matched `\w*rating\w*`, which is a substring test, and
 * a substring test on English inside identifiers finds things that are not
 * there. `CALIBRATING_READINGS` contains "RATING" and was reported as a
 * rating-like scalar; so would `operatingMode`, `generatingFn` and
 * `decoratingStyle`. This is the same class of defect as CLAUDE.md item 22,
 * where a scanner produced confident findings about code it had misparsed —
 * and the same wrong fix is available, which is renaming working code to
 * satisfy a lint about English.
 *
 * A term now has to START A SEGMENT. `beautyScore` and `userRating` still
 * match; `rankings` still matches, because the check is a prefix rather than
 * equality; `CALIBRATING_READINGS` does not.
 */
export function identifierSegments(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[_$\s]+/)
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

export const identifierCarriesTerm = (name, term) =>
  identifierSegments(name).some((seg) => seg.startsWith(term));

/** Positions where a rating-like NAME would be defined or handed back. */
const NAMED_POSITIONS = [
  /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g,
  /\b([A-Za-z_$][\w$]*)\s*:\s*(?:[\d.]|\w+\s*[*/+-])/g,
  /\breturn\s+([A-Za-z_$][\w$]*)\b/g,
  /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
];

function guardAttractiveness(file, text) {
  const code = stripComments(text);
  const seen = new Set();

  for (const pattern of NAMED_POSITIONS) {
    for (const m of code.matchAll(pattern)) {
      const name = m[1];
      for (const term of SCORE_TERMS) {
        if (!identifierCarriesTerm(name, term)) continue;
        const key = `${term}:${name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        record("attractiveness", file, `rating-like scalar: "${name}" (matches "${term}")`);
      }
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
    if (IDENTIFIER_URI_ALLOWLIST.some((p) => p.test(url))) continue;
    if (EGRESS_ALLOWLIST.some((a) => a.pattern.test(url))) continue;
    if (SENTRY_DSN_PATTERN.test(url)) continue;
    if (url.includes(REVENUECAT_HOST)) continue;

    // A documentation link is a navigation the user initiates, not egress by
    // the app — but only if it carries nothing. A query string or fragment on
    // one of these would be a way to hand a value to a third party in a URL
    // the user is invited to click.
    if (DOC_LINK_ALLOWLIST.some((p) => p.test(url))) {
      if (/[?#]/.test(url)) {
        record("egress", file, `documentation link carries a query or fragment: ${url}`);
      }
      continue;
    }
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
