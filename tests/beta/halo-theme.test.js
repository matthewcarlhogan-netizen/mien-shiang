/* The capture sequence overrides the theme to halo-white, and that override
 * must not touch how bright the flash is.
 *
 * The screen is a light source pointed at the face (CLAUDE.md item 52), so a
 * theme that could move the flash would move the illuminant between frames of
 * a single burst — and every value downstream is a CIELAB difference against
 * the subject's own baseline.
 *
 * Driven through the real createExposureHalo rather than scanned, which is
 * possible because it takes its root as an ARGUMENT (the same reason
 * createLandmarkerWithFallback takes its factory — CLAUDE.md item 14).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  createExposureHalo, haloStateFromCapture, clampExposure,
} from "../../src/ui/qise/exposure-halo.js";

/** A root the halo can drive, carrying a theme it must be blind to. */
function fakeRoot(theme) {
  return {
    dataset: { theme },
    style: {
      props: {},
      setProperty(name, value) { this.props[name] = value; },
      getPropertyValue(name) { return this.props[name]; },
    },
    querySelector: () => null,
  };
}

function levelsUnderTheme(theme) {
  const emitted = [];
  const halo = createExposureHalo({
    root: fakeRoot(theme),
    onLevel: (level) => emitted.push(level),
  });
  for (const value of [0, 0.25, 0.5, 0.75, 1]) halo.setLevel(value);
  halo.setCaptureState("perfect", 1);
  return { emitted, finalLevel: halo.level };
}

test("theme does not change halo flash luminance at capture", () => {
  const dark = levelsUnderTheme("");
  const haloWhite = levelsUnderTheme("halo-white");

  assert.deepEqual(haloWhite.emitted, dark.emitted,
    "the emitted halo levels must be identical under either theme");
  assert.equal(haloWhite.finalLevel, dark.finalLevel);
});

test("the strength the page paints is a function of LEVEL alone", () => {
  // beta.js turns the level into --halo-screen-strength. The expression must
  // read the level and nothing else; a theme token inside it is what would
  // make the flash theme-dependent.
  const source = readFileSync(
    fileURLToPath(new URL("../../beta/beta.js", import.meta.url)), "utf8");
  const match = source.match(/--halo-screen-strength[^\n]*\n?[^\n]*/);
  assert.ok(match, "beta.js must set --halo-screen-strength");
  const expression = match[0];
  assert.ok(/level/.test(expression), "the strength must be computed from the halo level");
  assert.ok(!/theme|dataset\.theme|--t-|halo-white/.test(expression),
    "no theme token may enter the flash-strength expression");
});

test("the halo-white theme block declares skin tokens only", () => {
  const css = readFileSync(
    fileURLToPath(new URL("../../beta/beta.css", import.meta.url)), "utf8");
  const block = css.match(/\[data-theme="halo-white"\][^{]*\{([^}]*)\}/);
  assert.ok(block, "beta.css must define the halo-white override");
  assert.ok(!block[1].includes("--halo-screen-strength"),
    "the theme must not redefine the flash strength");
  assert.ok(!/opacity|filter|brightness/.test(block[1]),
    "the theme must not modulate luminance by another route");
});

test("capture state is derived from the gates, not from the theme", () => {
  assert.equal(haloStateFromCapture({ gatesPass: true, captureSettled: true }), "perfect");
  assert.equal(haloStateFromCapture({ underexposed: true }), "adjust");
  assert.equal(haloStateFromCapture({}), "seeking");
  // Bounded, so no theme or caller can drive the flash past full.
  assert.equal(clampExposure(4), 1);
  assert.equal(clampExposure(-4), 0);
});
