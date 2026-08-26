/*
 * ROUND 10 — the Stage 3 connector-INTEGRATION boundary deferred behind
 * reflectionMode() (Codex, PR #40 discussion r3856061462).
 *
 * The finding: `src/ui/qise/app.js` statically imported
 * `../../qise/heritage-connections.js`, which transitively imports
 * `../heritage/composition.js` -> `resolver.js` -> the full connector/source
 * registries and their import-time validation. `qise.html` loads `app.js`
 * eagerly, so every public-origin Qi Se visit paid that download/parse/
 * validation cost even though the public default is `reflection=off` and the
 * safety gate suppresses all connector output. This file proves that cost is
 * now paid only once Reflection is confirmed not "off".
 *
 * ── SCOPE, AND WHAT THIS DELIBERATELY DOES NOT CLAIM ────────────────────────
 * `src/qise/reflection.js` imports `src/heritage/registry.js` directly, on a
 * SEPARATE, pre-existing path (`reading-pipeline.js` -> `reflection.js` ->
 * `registry.js`) that has nothing to do with the connector-integration files
 * this pass defers. That path is unrelated to r3856061462's finding — which
 * named `heritage-connections.js`/`heritage-view.js` specifically, because
 * THOSE are what pull in `composition.js`/`resolver.js`/the connector
 * registries — and narrowing it is a materially larger, unauthorized change
 * (see docs/HERITAGE_CONNECTOR_STAGE_STATUS.md). No test in this file asserts
 * anything about `registry.js`/`validator.js` being absent from any load
 * path; several of them assert the opposite is untouched.
 *
 * ── WHY THIS IS STATIC-SOURCE, LIKE reading-wiring.test.js ──────────────────
 * `app.js` cannot be imported under `node --test` — it drags in a CDN-hosted
 * MediaPipe bundle and browser globals (`document`, `location`, `crypto`,
 * `navigator`) at module scope (CLAUDE.md item 44). Every assertion here is
 * therefore a check on the source text, in the same style as
 * `heritage-connections.test.js`'s and `reading-wiring.test.js`'s existing
 * app.js checks.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Normalised to LF: test 9 below slices source text at a literal
// "/**\n * ..." JSDoc boundary. A Windows checkout with core.autocrlf=true
// (no .gitattributes forces LF in this repo) reads the same file as "\r\n",
// so the raw string never matches — confirmed against CI, where this broke
// that test on windows-latest (20/22/24) starting at 9e7f28c.
const read = (rel) => readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8").replace(/\r\n/g, "\n");
const APP = read("ui/qise/app.js");

/** The body of `renderReflection`, so the audit is scoped to what it touches — same helper as reading-wiring.test.js. */
function renderReflectionBody() {
  const start = APP.indexOf("function renderReflection(");
  assert.ok(start > 0, "renderReflection is gone; the reflection engine is not wired to the page");
  const end = APP.indexOf("\nasync function renderReading(", start);
  assert.ok(end > start, "could not bound renderReflection");
  return APP.slice(start, end);
}

test("1: app.js has no static import from heritage-connections.js or heritage-view.js", () => {
  const staticImportLines = APP.match(/^import[\s\S]*?;\s*$/gm) || [];
  for (const line of staticImportLines) {
    assert.doesNotMatch(line, /heritage-connections\.js/,
      `a static import still references heritage-connections.js: ${line}`);
    assert.doesNotMatch(line, /\.\/heritage-view\.js/,
      `a static import still references heritage-view.js: ${line}`);
  }
  assert.ok(staticImportLines.length > 10, "fixture assumption: app.js has a normal top-of-file import block");
});

test("2: app.js contains a dynamic import() for both Stage-3 modules", () => {
  assert.match(APP, /import\(\s*["']\.\.\/\.\.\/qise\/heritage-connections\.js["']\s*\)/,
    "no dynamic import() of heritage-connections.js");
  assert.match(APP, /import\(\s*["']\.\/heritage-view\.js["']\s*\)/,
    "no dynamic import() of heritage-view.js");
});

test("3: the Stage-3 loader promise is memoized", () => {
  assert.match(APP, /let\s+heritageStage3ModulesPromise\s*=\s*null;/,
    "no memo variable found for the Stage-3 loader");
  assert.match(APP, /if\s*\(\s*!heritageStage3ModulesPromise\s*\)\s*\{/,
    "the loader does not guard its re-entry — every call would re-trigger the dynamic import");
  const promiseAll = APP.slice(
    APP.indexOf("if (!heritageStage3ModulesPromise) {"),
    APP.indexOf("return heritageStage3ModulesPromise;"),
  );
  assert.ok(promiseAll.length > 0, "fixture assumption: the memoized-assignment block must be findable");
  assert.match(promiseAll, /import\(\s*["']\.\.\/\.\.\/qise\/heritage-connections\.js["']\s*\)/);
  assert.match(promiseAll, /import\(\s*["']\.\/heritage-view\.js["']\s*\)/);
});

test("4: reflectionMode() is checked, and the off branch returns, BEFORE the Stage-3 loader is ever referenced", () => {
  const body = renderReflectionBody();
  const modeAt = body.indexOf("reflectionMode(");
  const offAt = body.indexOf('if (mode === "off")');
  const firstLoaderRefAt = body.indexOf("loadHeritageStage3Modules(");

  assert.ok(modeAt >= 0, "reflectionMode() is not called in renderReflection");
  assert.ok(offAt > modeAt, "the off branch must come after reading the mode");
  assert.ok(firstLoaderRefAt > offAt,
    "the Stage-3 loader must not be referenced before the off branch has had a chance to return");

  const offBlockEnd = body.indexOf("}", offAt);
  const offBlock = body.slice(offAt, offBlockEnd);
  assert.doesNotMatch(offBlock, /loadHeritageStage3Modules/,
    "the off branch itself must not call the Stage-3 loader");
  assert.match(offBlock, /return;/, "the off branch must return without falling through to the loader");
});

/*
 * ROUND 12 (Copilot, PR #40): a calibrating/never-read reading has no usable
 * reflection state, and the function was always going to tear down in that
 * case regardless of whether the Stage-3 modules loaded — so computing
 * `reflection` (cheap, synchronous, local) and returning early on `null`
 * BEFORE the Stage-3 await avoids paying the connector graph's download/parse
 * cost for a render that could never have used it. Same shape as test 4
 * above, one gate later: a cheap check that can make the expensive await
 * moot must run before it, not after.
 */
test("4b: reflectionFor() is computed and null-checked BEFORE the Stage-3 loader is ever referenced", () => {
  const body = renderReflectionBody();
  const offAt = body.indexOf('if (mode === "off")');
  const reflectionAt = body.indexOf("const reflection = reflectionFor(reading, history);");
  const reflectionNullCheckAt = body.indexOf("if (!reflection)", reflectionAt);
  const firstLoaderRefAt = body.indexOf("loadHeritageStage3Modules(");

  assert.ok(reflectionAt > offAt, "reflectionFor() must be computed after the off branch, not before it");
  assert.ok(reflectionNullCheckAt > reflectionAt && reflectionNullCheckAt < firstLoaderRefAt,
    "a null reflection must be checked, and must return, before the Stage-3 loader is ever referenced");

  const nullCheckBlockEnd = body.indexOf("}", reflectionNullCheckAt);
  const nullCheckBlock = body.slice(reflectionNullCheckAt, nullCheckBlockEnd);
  assert.doesNotMatch(nullCheckBlock, /loadHeritageStage3Modules/,
    "the null-reflection branch itself must not call the Stage-3 loader");
  assert.match(nullCheckBlock, /teardownReflectionSurfaces\(surfaces\);\s*return;/,
    "a null reflection must tear down and return, the same as any other stand-down branch");
});

test("5: 'on' and 'compare' share exactly one post-gate loader call site — no mode-specific loader exists", () => {
  const body = renderReflectionBody();
  const loaderCallCount = (body.match(/loadHeritageStage3Modules\(\)/g) || []).length;
  assert.equal(loaderCallCount, 1,
    "renderReflection must call the Stage-3 loader from exactly one call site, reached by every non-off mode alike");
  assert.doesNotMatch(APP, /function\s+loadHeritageStage3ModulesOn\b|function\s+loadHeritageStage3ModulesCompare\b/,
    "no mode-specific loader variant may exist — 'on' and 'compare' must fall through the same gate");
});

test("6: renderReading() awaits renderReflection()", () => {
  const renderReading = APP.slice(APP.indexOf("async function renderReading("));
  assert.match(renderReading, /await renderReflection\(reading, history\)/,
    "renderReading must await the now-async renderReflection, not fire-and-forget it");
});

test("7: renderReflection is async, and a render-generation guard sits around the loader's await", () => {
  assert.match(APP, /async function renderReflection\(reading, history\)\s*\{/,
    "renderReflection must be declared async");

  const body = renderReflectionBody();
  assert.match(body, /const epoch = \+\+reflectionRenderEpoch;/,
    "no per-invocation epoch captured at the top of renderReflection");

  const epochAt = body.indexOf("const epoch = ++reflectionRenderEpoch;");
  const offAt = body.indexOf('if (mode === "off")');
  assert.ok(epochAt >= 0 && epochAt < offAt,
    "the epoch must be bumped before the off branch — a LATER call, including one that resolves off, " +
    "must be able to invalidate an earlier pending one");

  const awaitAt = body.indexOf("await loadHeritageStage3Modules()");
  assert.ok(awaitAt >= 0, "the loader must be awaited");
  const afterAwait = body.slice(awaitAt);
  assert.match(afterAwait, /if\s*\(\s*epoch\s*!==\s*reflectionRenderEpoch\s*\)\s*return;/,
    "no stale-render check immediately follows the loader's await — a slower earlier reading could " +
    "overwrite a faster later one's DOM");
});

test("8: a Stage-3 import failure is caught and logged, without throwing", () => {
  const body = renderReflectionBody();
  const heritageVarAt = body.indexOf("let heritageStage3 = null;");
  assert.ok(heritageVarAt >= 0, "no local heritageStage3 binding found");
  const tryAt = body.indexOf("try {", heritageVarAt);
  const catchAt = body.indexOf("} catch", tryAt);
  assert.ok(tryAt >= 0 && catchAt > tryAt, "the loader await is not wrapped in try/catch");

  const tryBlock = body.slice(tryAt, catchAt);
  assert.match(tryBlock, /heritageStage3\s*=\s*await loadHeritageStage3Modules\(\)/,
    "the try block does not await the Stage-3 loader");

  const catchBlockEnd = body.indexOf("}", catchAt + 6);
  const catchBlock = body.slice(catchAt, catchBlockEnd);
  assert.match(catchBlock, /console\.error\(/, "the catch block must log the failure, not swallow it silently");
});

/*
 * ROUND 11 (Codex P2, PR #40): a Stage-3 import failure must NOT be treated
 * as equivalent to "nothing to reflect on". The pre-existing Reflection
 * Engine (Today/Story/Why over the BASE tiers) predates Stage 3 entirely and
 * has nothing to do with whether a connector-module request succeeded — so
 * a dropped request degrades ONLY the connector extension, never the reading
 * itself. This is `readingTiers()` (reading-tiers.js), the same base tiers
 * `readingTiersWithHeritage()` itself wraps — not a hand-rolled substitute.
 */
test("8b: a Stage-3 import failure falls back to the BASE tiers (readingTiers), not to teardown", () => {
  assert.match(APP, /^import \{ readingTiers \} from "\.\.\/\.\.\/qise\/reading-tiers\.js";$/m,
    "app.js must statically import readingTiers from reading-tiers.js for the fallback path");

  const body = renderReflectionBody();
  const elseAt = body.indexOf("} else {", body.indexOf("if (heritageStage3) {"));
  assert.ok(elseAt > 0, "no else branch found for a failed Stage-3 load");
  const elseBlockEnd = body.indexOf("\n  }", elseAt);
  const elseBlock = body.slice(elseAt, elseBlockEnd);

  assert.match(elseBlock, /readingTiers\(reflection\)/,
    "the fallback branch must derive tiers with the base readingTiers(), not readingTiersWithHeritage");
  assert.doesNotMatch(elseBlock, /readingTiersWithHeritage/,
    "the fallback branch must not call the Stage-3 tiers function — its module failed to load");
  assert.doesNotMatch(elseBlock, /heritageConnectorTier2Markup|heritageConnectorTier3Markup/,
    "the fallback branch must not call connector-markup functions — it never has them, by construction");

  // Falls through to teardown only when there is genuinely no reflection
  // state (e.g. a calibrating/never-read reading) — the SAME condition that
  // gates the Stage-3-success branch, not a new, stricter one.
  assert.match(elseBlock, /if\s*\(!tiers\)\s*\{\s*teardownReflectionSurfaces\(surfaces\);\s*return;/,
    "the fallback branch must still tear down when there is no reflection state at all");
});

test("8c: both the Stage-3 and fallback branches feed the same render below them — one template, two tier sources", () => {
  const body = renderReflectionBody();
  // Exactly one destructuring assignment of tier1/tier2/tier3 per branch,
  // both writing into the SAME outer `let` bindings the shared template
  // below reads — never two separate render templates.
  const destructureCount = (body.match(/\(\{\s*tier1, tier2, tier3\s*\}\s*=\s*tiers\);/g) || []).length;
  assert.equal(destructureCount, 2,
    "expected exactly one tier1/tier2/tier3 destructure in the Stage-3 branch and one in the fallback branch");
  assert.match(body, /const rotationDisclosure = tier2\.rotationDisclosure;/,
    "a single shared render must still read tier2.rotationDisclosure after both branches");
});

test("9: disclosure ownership is unchanged — Story and Why each render the bound disclosure exactly once, connector markup renders none", () => {
  const body = renderReflectionBody();

  const bindings = body.match(/const rotationDisclosure = tier2\.rotationDisclosure;/g) || [];
  assert.equal(bindings.length, 1, "rotationDisclosure must still be bound exactly once");

  const storySlice = body.slice(
    body.indexOf("storyNode.innerHTML = `"),
    body.indexOf("`;", body.indexOf("storyNode.innerHTML = `")),
  );
  assert.equal((storySlice.match(/\$\{esc\(rotationDisclosure\)\}/g) || []).length, 1,
    "Story must still render the bound disclosure exactly once");

  const whySlice = body.slice(body.indexOf("whyNode.innerHTML = `"), body.lastIndexOf("`;"));
  assert.equal((whySlice.match(/\$\{esc\(rotationDisclosure\)\}/g) || []).length, 1,
    "Why must still render the bound disclosure exactly once");

  const viewSource = read("ui/qise/heritage-view.js");
  const tier2Body = viewSource.slice(
    viewSource.indexOf("export function heritageConnectorTier2Markup(model) {"),
    viewSource.indexOf("/**\n * Tier 3's expanded contract:"),
  );
  assert.doesNotMatch(tier2Body, /rotationDisclosure/,
    "heritageConnectorTier2Markup must still never reference rotationDisclosure");

  const tier3Body = viewSource.slice(viewSource.indexOf("export function heritageConnectorTier3Markup(model) {"));
  assert.doesNotMatch(tier3Body, /rotationDisclosure/,
    "heritageConnectorTier3Markup must still never reference rotationDisclosure");
});

test("10: locator-status precedence in composition.js is untouched by this pass", () => {
  // This pass's do-not-touch list includes src/heritage/composition.js
  // byte-for-byte. The behavioural coverage for locator-status precedence
  // already lives in tests/heritage/composition.test.js; this is a narrow
  // structural guard that the specific mechanism Round 7 landed is still
  // present verbatim, not a duplicate of that suite.
  const source = read("heritage/composition.js");
  assert.match(source, /function withConnectorLocatorStatus\(/,
    "withConnectorLocatorStatus is gone from composition.js — the locator-status precedence fix moved or was removed");
});

test("no swallowed errors: the Stage-3 loader's own rejection path still throws, so a caller who forgets to catch is not silently lied to", () => {
  const loaderAt = APP.indexOf("function loadHeritageStage3Modules() {");
  assert.ok(loaderAt > 0, "loadHeritageStage3Modules is gone");
  const loaderEnd = APP.indexOf("\n}\n", loaderAt);
  const loaderBody = APP.slice(loaderAt, loaderEnd);
  assert.match(loaderBody, /\.catch\(\(error\) => \{\s*heritageStage3ModulesPromise = null;\s*throw error;\s*\}\)/,
    "the loader must clear its memo and rethrow on failure, not resolve to a silent fallback value");
});
