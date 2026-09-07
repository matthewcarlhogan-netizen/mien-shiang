import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  PHOTOSENSITIVITY_NOTICE, LAMP_FREQUENCY_HZ, LAMP_PERIOD_MS, LAMP_HALF_PERIOD_MS,
} from "../../lightprobe/copy.js";
import { ASSERTIVE_PHRASES } from "../../scripts/copy-scan.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const LIGHTPROBE_DIR = join(REPO, "lightprobe");
const SRC_DIR = join(REPO, "src");

/* requirement 4.9: photosensitivity notice present. */
test("a photosensitivity notice exists and mentions seizure risk", () => {
  assert.ok(PHOTOSENSITIVITY_NOTICE.length > 40);
  assert.match(PHOTOSENSITIVITY_NOTICE, /seizure/i);
});

/* requirement 4.9: block-wise lamp at ~1.9 Hz. */
test("the lamp schedule runs at ~1.9 Hz", () => {
  assert.ok(Math.abs(LAMP_FREQUENCY_HZ - 1.9) < 1e-9);
  assert.ok(Math.abs(LAMP_PERIOD_MS - 1000 / 1.9) < 1e-9);
  assert.ok(Math.abs(LAMP_HALF_PERIOD_MS * 2 - LAMP_PERIOD_MS) < 1e-9);
});

/* requirement 4.9: no assertive second person in the copy, using the same
 * vocabulary the production copy guards check src/reading/ against, so the
 * two lists cannot drift apart. */
test("the photosensitivity notice contains no assertive second-person phrase", () => {
  const lower = PHOTOSENSITIVITY_NOTICE.toLowerCase();
  for (const phrase of ASSERTIVE_PHRASES) {
    assert.ok(!lower.includes(phrase), `notice must not contain assertive phrase "${phrase}"`);
  }
});

/* requirement 4.8: lightprobe.html is not registered in sw.js's offline shell. */
test("sw.js's precache shell does not mention lightprobe", () => {
  const sw = readFileSync(join(SRC_DIR, "sw.js"), "utf8");
  assert.ok(!/lightprobe/i.test(sw), "sw.js must never reference the light-probe instrument");
});

/* requirement 5.1: the probe lives entirely outside src/, so scripts/build.js
 * (which only walks src/) can never copy it into dist/ regardless of any
 * SHELL entry. */
test("no lightprobe file lives under src/", () => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
  const hits = walk(SRC_DIR).filter((f) => /lightprobe/i.test(f));
  assert.deepEqual(hits, []);
});

/* requirement 4.6: no whitePoint / illuminantDistance symbol exported by any
 * lightprobe module -- scanned as a literal export-name check, not by intent. */
test("no lightprobe module exports a whitePoint or illuminantDistance symbol", () => {
  const jsFiles = readdirSync(LIGHTPROBE_DIR).filter((f) => f.endsWith(".js"));
  assert.ok(jsFiles.length > 0);
  for (const file of jsFiles) {
    const text = readFileSync(join(LIGHTPROBE_DIR, file), "utf8");
    const exportNames = [...text.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g)].map((m) => m[1]);
    for (const name of exportNames) {
      assert.ok(!/whitepoint/i.test(name), `${file} exports forbidden symbol ${name}`);
      assert.ok(!/illuminantdistance/i.test(name), `${file} exports forbidden symbol ${name}`);
    }
  }
});
