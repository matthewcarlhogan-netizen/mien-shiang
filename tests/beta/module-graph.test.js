/* The guard the beta did not have.
 *
 * beta/beta.js shipped importing "../engine.js" — a path that resolves to a
 * repo-root file which does not exist — so the beta page could not load in any
 * browser. Every test in this directory passed anyway, because they all read
 * the file as TEXT and scanned it with regexes. A module nothing imports is a
 * module nothing tests (CLAUDE.md item 18a).
 *
 * This test imports it for real. It fails on a broken import path, on a
 * top-level DOM access, and on a syntax error, none of which a text scan sees.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

test("beta.js loads through the real module graph, with no DOM present", async () => {
  // No globalThis.document and no globalThis.window here, deliberately. If
  // beta.js ever regains a top-level DOM side effect this throws, which is the
  // whole point: the wiring file has to stay importable for the assertions
  // below to mean anything.
  assert.equal(typeof globalThis.document, "undefined",
    "the suite must not provide a DOM; beta.js has to import without one");

  const mod = await import("../../beta/beta.js");
  assert.equal(typeof mod.init, "function", "beta.js must export init()");
});

test("every module beta.js imports resolves", async () => {
  // Resolution is what actually broke. Importing the entry is sufficient —
  // an unresolvable specifier anywhere in the graph rejects this import — but
  // the production modules are named explicitly so a failure says which one.
  const specifiers = [
    "../../beta/beta-model.js",
    "../../src/qise/consent.js",
    "../../src/qise/camera.js",
    "../../src/qise/gates.js",
    "../../src/qise/wakelock.js",
    "../../src/qise/framestats.js",
    "../../src/ui/qise/exposure-halo.js",
    "../../src/landmarker.js",
    "../../src/region-extractor.js",
    "../../src/engine.js",
    "../../src/qise/store.js",
    "../../src/qise/baseline.js",
    "../../src/qise/integrated.js",
  ];
  for (const specifier of specifiers) {
    await assert.doesNotReject(() => import(specifier), `${specifier} must resolve`);
  }
});

test("beta.js imports the engine from src/, never from the repo root", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const source = readFileSync(
    fileURLToPath(new URL("../../beta/beta.js", import.meta.url)), "utf8");

  // The specific defect: beta/ is a SIBLING of src/, so "../engine.js" leaves
  // the source tree entirely.
  assert.ok(!/from\s+"\.\.\/engine\.js"/.test(source),
    'beta/ is a sibling of src/, so "../engine.js" resolves outside the tree');
  assert.ok(!/from\s+"\.\.\/region-extractor\.js"/.test(source),
    '"../region-extractor.js" resolves outside the tree; src/region-extractor.js is the file');
  assert.ok(source.includes('from "../src/engine.js"'),
    "beta must consume the production engine");
});

test("the beta runs no simulation", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  for (const name of ["beta.js", "beta-model.js", "boot.js"]) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../beta/${name}`, import.meta.url)), "utf8");
    assert.ok(!source.includes("Math.random"),
      `${name} must not fabricate a value; every number shown is measured`);
    assert.ok(!/simulateCapture/.test(source),
      `${name} must not carry a simulated capture path`);
  }
});
