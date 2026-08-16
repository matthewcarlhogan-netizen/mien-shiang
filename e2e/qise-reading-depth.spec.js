/*
 * The reading screen's CONTENT DEPTH, asserted in a real browser.
 *
 * This file exists because the defect it pins was invisible to every unit
 * test in the repo. `integratedStoryMarkup()` lives in ui/qise/app.js, which
 * nothing can import (CLAUDE.md item 44), and it rendered each palace's body
 * from `toneGloss` — a per-TONE string with exactly three values. So a
 * flawless 12-of-12 capture paid out three sentences repeated four times,
 * every model underneath was correct, and no assertion anywhere looked at
 * what the view did with them.
 *
 * The guard is therefore a COUNT OF DISTINCT RENDERED BODIES, not a string
 * match: a future refactor that re-collapses twelve readings into three fails
 * here whatever wording it uses.
 */
import { test, expect } from "@playwright/test";
import { PALACES } from "../src/reading/twelve-palaces.js";

const TONE = {
  clear: "The texts read this palace as clear in this photo, which they associate with the area running easily at the moment.",
  even: "The texts read this palace as even in this photo — neither prominent nor shadowed.",
  shadowed: "The texts read this palace as shadowed in this photo, which they associate with attention having been elsewhere lately.",
};

/* Spread across all three tones, with one unambiguous furthest-from-baseline
 * palace. Career is driven NEGATIVE while the largest positives sit elsewhere,
 * so a view ranking on the signed value picks the wrong palace and fails. */
const DELTAS = {
  life: 2, wealth: -0.4, siblings: 3.1, property: -2.2, children: 0.1, support: 4.4,
  partner: -1.9, trials: 0.6, travel: 2.7, career: -8.6, fortune: 1.7, parents: -3.3,
};

const palaceReading = {
  palaces: PALACES.map((p) => {
    const deltaMi = DELTAS[p.key];
    const tone = deltaMi > 1.5 ? "shadowed" : (deltaMi < -1.5 ? "clear" : "even");
    return {
      ...p, supported: true, measured: true, tone, deltaMi,
      toneGloss: TONE[tone], notMeasuredNote: null,
    };
  }),
  measuredCount: 12, supportedCount: 12, totalCount: 12,
  sourcesDiffer: "Sources differ on the number and placement of the palaces.",
};

const reading = {
  timestampIso: "2026-08-11T08:00:00.000Z",
  baselineProgress: 2,
  compass: { ascendant: "chi", magnitude: 2.2, band: "clear", components: { chi: 2.2, huang: 0.4 } },
  metrics: { raw: { ming: 56, run: 51, basis: "full" }, corrected: { ming: 58, run: 53, basis: "full" } },
  composition: {
    basis: "capture", lead: "chi", support: "huang",
    segments: { chi: 34, huang: 30, qing: 18, bai: 10, hei: 8 },
  },
  integrated: {
    fiveElements: {
      available: true, element: "metal", hanzi: "金", name: "Metal", shape: "square",
      reading: "In Mian Xiang the Metal type is read through clear edges and defined structure.",
      sourcesDiffer: "Other traditions may read this shape as Fire.",
    },
    threeCourts: {
      available: true, balanced: false, dominant: "middle",
      court: { hanzi: "中停", name: "Middle Court" },
      fractions: { upper: 0.31, middle: 0.38, lower: 0.31 },
      reading: "Classical Chinese face reading gives the middle court the middle years.",
      measurementCaveat: "The upper court uses the top of the face oval rather than the hairline.",
    },
    twelvePalaces: palaceReading,
    harmony: {
      value: 78, components: [{ key: "three-courts", value: 0.78 }],
      sourcesDiffer: "Named historical canons do not form one universal system.",
    },
    provenanceIds: { palaces: "twelve-palaces-v2" },
  },
  roiValidity: {}, confidence: 0.92, valid: true,
};

async function seedReading(page, record = reading) {
  await page.goto("/qise.html");
  await page.evaluate(async (r) => {
    const [{ createConsent }, { openStore }] = await Promise.all([
      import("/qise/consent.js"), import("/qise/store.js"),
    ]);
    createConsent().grant();
    await (await openStore()).put(r);
  }, record);
  await page.reload();
}

/* The palace's own reading: the only <p> in the reveal that is not the tone
 * annotation, the anatomy line, or a source note. Named by exclusion so a new
 * sibling paragraph fails loudly here rather than quietly inflating the count
 * of "distinct readings" this file exists to assert. */
const BODY = ".palace-reveal > p:not(.palace-tone-line):not(.palace-where):not(.source-note)";

test("twelve palaces render twelve DIFFERENT readings, not three tone glosses", async ({ page }) => {
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReading(page);

  await page.getByRole("button", { name: "Enter 12 palaces" }).click();
  await expect(page.locator(".palace-card")).toHaveCount(12);

  // Open every palace. The accordion closes siblings, so the bodies are read
  // from the DOM rather than from what happens to be visible.
  for (const enter of await page.locator(".palace-enter").all()) {
    await enter.click({ force: true });
  }
  const bodies = await page.locator(BODY).allInnerTexts();
  expect(bodies).toHaveLength(12);
  expect(new Set(bodies).size).toBe(12);

  // And the tone line is still present as an ANNOTATION — the fix is that it
  // sits below the reading, not that it was deleted.
  const tones = await page.locator(".palace-card .palace-tone-line").allInnerTexts();
  expect(tones).toHaveLength(12);
  expect(new Set(tones).size).toBe(3);

  expect(errors).toEqual([]);
});

test("one palace is flagged as furthest from baseline, and none are hidden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReading(page);
  await page.getByRole("button", { name: "Enter 12 palaces" }).click();

  await expect(page.locator('.palace-card[data-lead="true"]')).toHaveCount(1);
  await expect(page.locator('[data-palace="career"][data-lead="true"]')).toBeVisible();
  await expect(page.locator(".palace-focus")).toContainText("Career Palace");

  // The highlight must never become a filter.
  await expect(page.locator(".palace-card")).toHaveCount(12);
});

test("a frame where nothing stood out names no lead rather than inventing one", async ({ page }) => {
  const flat = structuredClone(reading);
  for (const p of flat.integrated.twelvePalaces.palaces) {
    p.deltaMi = 0;
    p.tone = "even";
    p.toneGloss = TONE.even;
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReading(page, flat);
  await page.getByRole("button", { name: "Enter 12 palaces" }).click();

  await expect(page.locator('.palace-card[data-lead="true"]')).toHaveCount(0);
  await expect(page.locator('.palace-focus[data-empty="true"]')).toBeVisible();
  await expect(page.locator(".palace-card")).toHaveCount(12);
});

test("the reading screen offers a next step that is not the footer's label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReading(page);

  const cta = page.locator("#next-scan-again");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText("Take the next scan");
  // This fixture carries a compass, so personal comparison is already live —
  // the "still building your baseline" wording belongs to the other branch.
  await expect(page.locator("#reading-next-scan")).toContainText("already in your column");
});
