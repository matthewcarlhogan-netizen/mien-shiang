/*
 * PHASE 10, gate 1 — no network in the analysis path.
 *
 * Not telemetry, not runtime fonts, not anything. The whole claim of the
 * product is that the photograph never leaves the device, and the only way
 * that claim survives contact with a future contributor is if breaking it
 * turns CI red.
 *
 * ── WHY THIS SCANS src/ui/qise TOO, WHICH THE BRIEF DID NOT ASK FOR ────────
 * The brief scopes this rule to src/qise/**. But the view layer is where a
 * network call would actually be added — an analytics beacon goes next to a
 * button handler, not next to a colour-space conversion — so a guard that
 * exempts the view layer is a guard aimed away from the risk. Both trees are
 * scanned. Inference dependencies are self-hosted, so there is no runtime host
 * exemption to hide behind.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

import { stripComments } from "../../scripts/copy-scan.js";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const SRC = join(REPO, "src");
// beta/ is in scope because a guard that does not scan the beta is not a beta
// gate. The beta ships the same capture path from a different URL, so a fetch
// there would break the same promise in the same product.
const TREES = [join(SRC, "qise"), join(SRC, "ui", "qise"), join(REPO, "beta")];

const walk = (dir) => (existsSync(dir) ? readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
}) : []);

const files = TREES.flatMap(walk).filter((f) => f.endsWith(".js"));
const rel = (f) => relative(REPO, f).replace(/\\/g, "/");

const NETWORK = /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|EventSource)\b/;

test("the guard is scanning a real corpus", () => {
  // A lint that passes because it scanned nothing is the false-green this repo
  // has shipped twice.
  assert.ok(files.length >= 10, `only ${files.length} files found under src/qise and src/ui/qise`);
  assert.ok(files.some((f) => rel(f) === "src/qise/color.js"));
  assert.ok(files.some((f) => rel(f) === "src/ui/qise/app.js"));
  assert.ok(files.some((f) => rel(f) === "beta/beta.js"),
    "the beta capture path must be inside this guard");
});

test("no file in the feature calls out to the network", () => {
  const offenders = [];
  for (const f of files) {
    const code = stripComments(readFileSync(f, "utf8"));
    const m = code.match(NETWORK);
    if (m) offenders.push(`${rel(f)}: ${m[0]}`);
  }
  assert.deepEqual(offenders, [],
    "no network in the analysis path — not telemetry, not runtime fonts, not anything:\n  "
    + offenders.join("\n  "));
});

test("the guard would fire if someone added one", () => {
  // Paired positive control. "No matches" means nothing unless the pattern
  // matches when the thing is there.
  for (const sample of [
    'fetch("/collect", { body: JSON.stringify(reading) })',
    "new WebSocket(url)",
    "navigator.sendBeacon(url, blob)",
    "new XMLHttpRequest()",
    "new EventSource(url)",
  ]) {
    assert.match(sample, NETWORK, `the pattern misses: ${sample}`);
  }
  // And it does not fire on ordinary words that merely contain them.
  assert.doesNotMatch("const prefetched = cache.get(k)", NETWORK);
});

test("the feature contains no remote runtime destination", () => {
  const offenders = [];
  for (const f of files) {
    for (const m of readFileSync(f, "utf8").matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
      offenders.push(`${rel(f)}: ${m[0]}`);
    }
  }
  assert.deepEqual(offenders, [], "unexpected remote destination:\n  " + offenders.join("\n  "));
});

test("nothing derived from a face is passed to anything that could send it", () => {
  // The structural version of the same rule: even a permitted call must not
  // carry a pipeline value. There are no permitted calls today, so this is a
  // regression gate on the day there is one.
  const PIPELINE = /\b(landmark|faceLandmarks|imageData|pixels|mesh|embedding|reading|metrics|axes)\b/i;
  const offenders = [];
  for (const f of files) {
    const code = stripComments(readFileSync(f, "utf8"));
    for (const call of code.matchAll(/\b(fetch|sendBeacon|XMLHttpRequest)\s*\(([^;]{0,300})/g)) {
      if (PIPELINE.test(call[2])) offenders.push(`${rel(f)}: ${call[0].slice(0, 80)}`);
    }
  }
  assert.deepEqual(offenders, []);
});
