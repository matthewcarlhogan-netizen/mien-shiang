import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8");

test("the shared project URL opens the scanner, with an explicit classic escape hatch", () => {
  const html = read("index.html");
  const worker = read("sw.js");
  assert.match(html, /URLSearchParams\(location\.search\)\.has\("classic"\)/);
  const entryGeneration = html.match(/qise\.html\?v=(\d+)/)?.[1];
  const shellGeneration = worker.match(/mienshiang-v(\d+)/)?.[1];
  assert.equal(entryGeneration, shellGeneration, "the entry URL must bypass the previous shell once");
  assert.match(worker, /e\.request\.mode === "navigate"/,
    "online page navigations must not prefer a stale scanner");
  assert.match(worker, /\["script", "style"\]\.includes\(e\.request\.destination\)/,
    "online product code must not prefer a stale module graph");
});

test("the mobile journey leads with a promise before the consent detail", () => {
  const html = read("qise.html");
  assert.ok(html.indexOf("See what today’s face is quietly showing.") < html.indexOf("During the scan."));
  assert.match(html, /Begin my reading/);
  assert.match(html, /Agree &amp; open camera/);
  assert.match(html, /never uploaded, never stored/);
  assert.match(html, /Optional screen-light experiment/);
  assert.match(html, /illumination-choice-status/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Leave this off if changing light causes discomfort/);
  assert.match(html, /Or choose a clear selfie/);
  assert.match(html, /accept="image\/\*"/);
  assert.match(html, /no beauty filter or portrait blur/i);
});

test("results are split into three short views with one primary story surface", () => {
  /*
   * The count is three SHIPPED views. The reflection engine's "Why" panel is a
   * fourth in the markup and is not a fourth in the journey: it ships with the
   * `hidden` attribute and is only revealed when the rollout flag is on, so a
   * user on the default path meets the same three tabs they always did.
   *
   * The guard is therefore counted over shipped panels rather than relaxed to
   * "three or four" — a relaxed count would let a genuine fourth tab in on the
   * next change, which is the sprawl this test exists to prevent.
   */
  const html = read("qise.html");
  const FLAG_GATED = ["why"];

  const tabs = [...html.matchAll(/data-reading-tab="([a-z]+)"([^>]*)>/g)];
  const panels = [...html.matchAll(/data-reading-panel="([a-z]+)"([^>]*)>/g)];

  for (const name of FLAG_GATED) {
    const tab = tabs.find((m) => m[1] === name);
    const panel = panels.find((m) => m[1] === name);
    assert.ok(tab, `the ${name} tab is missing`);
    assert.match(tab[2], /\bhidden\b/, `the ${name} tab ships visible; it must be flag-gated`);
    assert.ok(panel, `the ${name} panel is missing`);
    assert.match(panel[2], /\bhidden\b/, `the ${name} panel ships visible; it must be flag-gated`);
  }

  const shippedTabs = tabs.filter((m) => !FLAG_GATED.includes(m[1]));
  const shippedPanels = panels.filter((m) => !FLAG_GATED.includes(m[1]));
  assert.equal(shippedTabs.length, 3);
  assert.equal(shippedPanels.length, 3);
  assert.match(html, /data-reading-panel="today"/);
  assert.match(html, /data-reading-panel="story"/);
  assert.match(html, /data-reading-panel="pattern"/);
  assert.doesNotMatch(html, /Unlock the full reading|Weekly access|coming soon/i);
});
