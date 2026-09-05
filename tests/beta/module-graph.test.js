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

  const mod = await import("../../src/beta/beta.js");
  assert.equal(typeof mod.init, "function", "beta.js must export init()");
});

test("every module beta.js imports resolves", async () => {
  // Resolution is what actually broke. Importing the entry is sufficient —
  // an unresolvable specifier anywhere in the graph rejects this import — but
  // the production modules are named explicitly so a failure says which one.
  const specifiers = [
    "../../src/beta/beta-model.js",
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
    fileURLToPath(new URL("../../src/beta/beta.js", import.meta.url)), "utf8");

  // The specific defect: beta/ is a SIBLING of src/, so "../engine.js" leaves
  // the source tree entirely.
  assert.ok(!/from\s+"\.\.\/src\/engine\.js"/.test(source),
    'the deployed dist/ is a FLATTENED copy of src/, so this must be ../engine.js');
  assert.ok(source.includes('from "../engine.js"'),
    "beta must consume the production engine at the path that resolves in BOTH trees");
});

test("the beta runs no simulation", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  for (const name of ["beta.js", "beta-model.js", "boot.js"]) {
    const source = readFileSync(
      fileURLToPath(new URL(`../../src/beta/${name}`, import.meta.url)), "utf8");
    assert.ok(!source.includes("Math.random"),
      `${name} must not fabricate a value; every number shown is measured`);
    assert.ok(!/simulateCapture/.test(source),
      `${name} must not carry a simulated capture path`);
  }
});

test("the SHIPPED artifact resolves, not just the source tree", async () => {
  /* The bug this exists for: dist/ is a FLATTENED copy of src/ (build.js does
   * no transform), so a beta beside src/ has no single relative specifier that
   * is correct in both trees. "../engine.js" resolved in dist and not in the
   * source; "../src/engine.js" resolved in the source and 404'd on the live
   * site. Verifying the tree caught the first and shipped the second —
   * CLAUDE.md's Verification Protocol §4, "test the artifact you ship, not the
   * tree you built in", learned the expensive way.
   *
   * Skipped when dist/ is absent, because `npm test` must not require a build;
   * CI runs the build before the suite. */
  const { existsSync, readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const dist = fileURLToPath(new URL("../../dist/beta/beta.js", import.meta.url));
  if (!existsSync(dist)) return;

  await assert.doesNotReject(() => import(dist),
    "the built beta must load from dist/, where the app is actually served");

  // And every specifier it names must exist at the path dist puts it.
  const { dirname, resolve } = await import("node:path");
  const source = readFileSync(dist, "utf8");
  const specifiers = [...source.matchAll(/from\s+"(\.[^"]+)"/g)].map((m) => m[1]);
  assert.ok(specifiers.length >= 10, `expected the real import list, saw ${specifiers.length}`);
  for (const specifier of specifiers) {
    const target = resolve(dirname(dist), specifier);
    assert.ok(existsSync(target), `dist/beta/beta.js imports ${specifier}, which is not in dist/`);
  }
});
