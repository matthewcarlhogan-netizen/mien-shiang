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
});

test("the mobile journey leads with a promise before the consent detail", () => {
  const html = read("qise.html");
  assert.ok(html.indexOf("See what today’s face is quietly showing.") < html.indexOf("During the scan."));
  assert.match(html, /Begin my reading/);
  assert.match(html, /Agree &amp; open camera/);
  assert.match(html, /never uploaded, never stored/);
  assert.match(html, /Optional screen-light experiment/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /Leave this off if changing light causes discomfort/);
  assert.match(html, /Or choose a clear selfie/);
  assert.match(html, /accept="image\/\*"/);
  assert.match(html, /no beauty filter or portrait blur/i);
});

test("results are split into three short views with one primary story surface", () => {
  const html = read("qise.html");
  assert.equal((html.match(/data-reading-tab=/g) || []).length, 3);
  assert.equal((html.match(/data-reading-panel=/g) || []).length, 3);
  assert.match(html, /data-reading-panel="today"/);
  assert.match(html, /data-reading-panel="story"/);
  assert.match(html, /data-reading-panel="pattern"/);
  assert.doesNotMatch(html, /Unlock the full reading|Weekly access|coming soon/i);
});
