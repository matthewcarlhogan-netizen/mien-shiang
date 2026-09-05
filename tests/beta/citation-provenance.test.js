/* A citation the beta prints must resolve to a recorded edition.
 *
 * The beta shipped attributing San Ting to 麻衣相法 and Shi Er Gong to the
 * 文獻通考. src/reading/provenance.js records the first as
 * `heritage-three-sections`: kind "contested-attribution-witness",
 * citationStatus ATTRIBUTION_CONTRADICTED, locator null. The second appears in
 * no provenance record at all. Printing either as a citation is HVR-014
 * (a contradicted attribution promoted to verified evidence) and HVR-012 (a
 * verified citation with no section locator).
 *
 * HVR-012/013/014 run over registries and fixtures and never read beta/, so
 * they cannot catch a regression here. This is the guard that can — without
 * it, the fix is a one-time edit and the next author restores the citation
 * because it looked more scholarly than the truth.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { stripComments } from "../../scripts/copy-scan.js";
import { SOURCE_REGISTRY, CITATION_STATUS } from "../../src/reading/provenance.js";

const BETA_DIR = fileURLToPath(new URL("../../src/beta", import.meta.url));

const betaFiles = readdirSync(BETA_DIR).filter((n) => /\.(html|js|css)$/.test(n));
/* Comments are stripped from .js before scanning: the note in beta-model.js
 * explaining WHY these attributions were withdrawn names them, and a guard
 * that forbids explaining itself is a guard that gets deleted. */
const readBeta = (name) => {
  const raw = readFileSync(join(BETA_DIR, name), "utf8");
  return name.endsWith(".js") ? stripComments(raw) : raw;
};

/** Work titles the beta is NOT entitled to cite, and why. */
const WITHDRAWN = [
  ["Mayi Xiangfa", "recorded ATTRIBUTION_CONTRADICTED with no locator"],
  ["麻衣相法", "recorded ATTRIBUTION_CONTRADICTED with no locator"],
  ["Wenxian Tongkao", "appears in no provenance record"],
  ["文獻通考", "appears in no provenance record"],
];

test("the guard is scanning the beta's real surfaces", () => {
  assert.ok(betaFiles.length >= 4, `only ${betaFiles.length} beta files found`);
  assert.ok(betaFiles.includes("qise.html"));
  assert.ok(betaFiles.includes("study.html"));
});

test("no withdrawn attribution appears on any beta surface", () => {
  const offenders = [];
  for (const name of betaFiles) {
    const text = readBeta(name);
    for (const [work, why] of WITHDRAWN) {
      if (text.includes(work)) offenders.push(`beta/${name} cites "${work}" — ${why}`);
    }
  }
  assert.deepEqual(offenders, [],
    "a citation the provenance record does not support:\n  " + offenders.join("\n  "));
});

test("the work the beta does cite is recorded at EDITION_RECORDED", () => {
  // The beta prints the ROMANISED name: reader-facing literals under src/ are
  // English-only (tests/ui-language.test.js), and CJK lives in the provenance
  // registry. So the UI says "Shenxiang Quanbian" and the registry entry it
  // must resolve to carries 神相全編.
  const cited = "神相全編";
  const printed = "Shenxiang Quanbian";
  const citing = betaFiles.filter((n) => readBeta(n).includes(printed));

  assert.ok(citing.length > 0, "the beta must cite the recorded witness by its romanised name");
  const entries = Object.entries(SOURCE_REGISTRY)
    .filter(([, entry]) => typeof entry.title === "string" && entry.title.includes(cited));
  assert.ok(entries.length > 0, `${cited} must appear in SOURCE_REGISTRY`);

  const recorded = entries.filter(([, entry]) =>
    entry.citationStatus === CITATION_STATUS.EDITION_RECORDED
    || entry.citationStatus === CITATION_STATUS.VERIFIED);
  assert.ok(recorded.length > 0,
    `${cited} must be recorded at EDITION_RECORDED or better to be citable`);

  // And the locators the beta prints are the ones the registry carries.
  const locators = recorded.map(([, entry]) => entry.locator || entry.sectionLocator || "");
  for (const name of citing) {
    const text = readBeta(name);
    for (const [romanised, han] of [["Mian San Ting", "面三停"], ["Shi Er Gong Jue", "十二宮訣"]]) {
      if (!text.includes(romanised)) continue;
      assert.ok(locators.some((l) => l.includes(han)),
        `beta/${name} prints locator "${romanised}", which no registry entry records`);
    }
  }
});

test("the contradicted entry is still contradicted, so this guard stays needed", () => {
  // If the provenance record is ever upgraded, this test should be revisited
  // deliberately rather than quietly passing on a changed premise.
  const entry = SOURCE_REGISTRY["heritage-three-sections"];
  assert.ok(entry, "heritage-three-sections must exist");
  assert.equal(entry.citationStatus, CITATION_STATUS.ATTRIBUTION_CONTRADICTED);
  assert.equal(entry.locator, null);
});
