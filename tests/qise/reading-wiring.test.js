/*
 * THE SEAM BETWEEN THE ENGINE AND THE PAGE.
 *
 * Everything else in this suite proves the engine is correct. None of it would
 * notice the most ordinary integration failure there is: the view writes to an
 * element id that the markup does not contain, so the reading is computed
 * perfectly and rendered nowhere. Unit tests stay green, the page stays blank,
 * and the bug is found by a person.
 *
 * Static, because the alternative is a browser for a question about whether two
 * files agree on a string.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (rel) => readFileSync(fileURLToPath(new URL(`../../src/${rel}`, import.meta.url)), "utf8");
const APP = read("ui/qise/app.js");
const HTML = read("qise.html");

/** The body of `renderReflection`, so the audit is scoped to what it touches. */
function renderReflectionBody() {
  const start = APP.indexOf("function renderReflection(");
  assert.ok(start > 0, "renderReflection is gone; the reflection engine is not wired to the page");
  const end = APP.indexOf("\nasync function renderReading(", start);
  assert.ok(end > start, "could not bound renderReflection");
  return APP.slice(start, end);
}

test("the reading path calls the reflection renderer", () => {
  const renderReading = APP.slice(APP.indexOf("async function renderReading("));
  assert.match(renderReading, /renderReflection\(reading, history\)/,
    "renderReading does not invoke renderReflection with the record and the history");
});

test("the history actually reaches the renderer, not an empty array", () => {
  // The dimension most easily lost at this seam is trajectory, because it is
  // the only one that needs anything other than the record itself.
  const body = renderReflectionBody();
  assert.match(body, /reflectionFor\(reading, history\)/,
    "the renderer calls reflectionFor without the personal history; trajectory would go flat");
});

test("every element the renderer writes to exists in the markup", () => {
  const body = renderReflectionBody();
  const ids = [...body.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map((m) => m[1]);
  assert.ok(ids.length >= 4, `renderReflection touches only ${ids.length} elements`);
  for (const id of new Set(ids)) {
    assert.ok(HTML.includes(`id="${id}"`), `renderReflection writes to #${id}, which qise.html does not contain`);
  }
});

test("every panel selector the renderer uses exists in the markup", () => {
  const body = renderReflectionBody();
  for (const m of body.matchAll(/data-reading-panel="([a-z]+)"/g)) {
    assert.ok(HTML.includes(`data-reading-panel="${m[1]}"`),
      `renderReflection selects the "${m[1]}" panel, which qise.html does not contain`);
  }
});

test("the renderer stands down completely when the flag is off", () => {
  const body = renderReflectionBody();
  const off = body.slice(body.indexOf('if (mode === "off")'));
  assert.ok(off.length > 0, "there is no off branch; the flag does not gate anything");
  const guarded = off.slice(0, off.indexOf("}"));
  // Round 10 factored the inline hide-everything code into one shared
  // helper (see the next test) — the off branch now hands off to it rather
  // than setting `hidden = true` inline.
  assert.match(guarded, /teardownReflectionSurfaces\(/,
    "the off branch does not hand off to the shared teardown");
  assert.match(guarded, /return;/, "the off branch does not return");
  assert.doesNotMatch(guarded, /loadHeritageStage3Modules/,
    "the off branch must return before the Stage-3 connector loader is ever called — " +
    "an off build must not pay the connector graph's load cost");
  assert.ok(body.indexOf('if (mode === "off")') < body.indexOf("reflectionFor("),
    "the engine runs before the flag is checked; an off build would still pay for it");
});

test("EVERY stand-down branch hides the Why panel, not only its tab", () => {
  // The tab and the panel are two elements. Hiding the tab alone leaves a
  // reader who already opened Why looking at the PREVIOUS reading's text,
  // presented as current, with no control left to dismiss it. The `off`
  // branch got this right and the `!tiers` branch did not — item 51's
  // shape, a teardown written into one branch of a conditional and not the
  // other.
  //
  // Round 10 factored the duplicated inline teardown into ONE shared
  // `teardownReflectionSurfaces()` helper (CLAUDE.md item 51's own
  // recommended fix for this exact defect class), used from a third
  // stand-down branch too (a Stage-3 import failure). So instead of finding
  // "whyTab.hidden = true" inline at each site, every branch must call the
  // shared helper and return immediately; the helper itself is checked once,
  // separately, for actually hiding both elements.
  const body = renderReflectionBody();

  const standDownCount = (body.match(/teardownReflectionSurfaces\(surfaces\);/g) || []).length;
  assert.ok(standDownCount >= 3,
    `expected at least three stand-down branches (off, Stage-3 load failure, !tiers), found ${standDownCount}`);

  const immediateReturns = (body.match(/teardownReflectionSurfaces\(surfaces\);\s*return;/g) || []).length;
  assert.equal(immediateReturns, standDownCount,
    "every stand-down branch must return immediately after calling the shared teardown");

  const teardownAt = APP.indexOf("function teardownReflectionSurfaces(");
  assert.ok(teardownAt > 0, "teardownReflectionSurfaces is gone; the shared helper was removed");
  const teardownBody = APP.slice(teardownAt, APP.indexOf("\n}", teardownAt));
  assert.match(teardownBody, /whyTab\.hidden = true/,
    "the shared teardown does not hide the Why tab");
  assert.match(teardownBody, /whyPanel\.hidden = true/,
    "the shared teardown does not hide the Why panel; " +
    "stale reflection text would survive into a reading that produced none");
});

test("the flagged surfaces ship hidden", () => {
  for (const id of ["reflection-today", "reflection-story", "reflection-compare"]) {
    const tag = HTML.slice(HTML.indexOf(`id="${id}"`));
    assert.match(tag.slice(0, tag.indexOf(">")), /\bhidden\b/,
      `#${id} ships visible; the default path would show engine output`);
  }
});

test("the comparison mode renders both engines, not one relabelled", () => {
  // The owner's requirement: no removal of the current engine until parity is
  // evidenced. Evidence needs both outputs on the same record.
  const body = renderReflectionBody();
  assert.match(body, /passageFor\(/, "compare mode does not run the current engine");
  assert.match(APP, /import \{ passageFor \}/, "the current engine is not imported");
  assert.match(body, /mode === "compare"/);
});
