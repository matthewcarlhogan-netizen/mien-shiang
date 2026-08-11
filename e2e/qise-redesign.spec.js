import { test, expect } from "@playwright/test";
import { PALACES } from "../src/reading/twelve-palaces.js";

const palaceReading = {
  palaces: PALACES.map((palace) => ({
    ...palace,
    supported: true,
    measured: true,
    tone: "clear",
    toneGloss: "The texts read this palace as clear in this photo.",
    notMeasuredNote: null,
  })),
  measuredCount: 12,
  supportedCount: 12,
  totalCount: 12,
  sourcesDiffer: "Sources differ on the placement of several palaces.",
};

const reading = {
  timestampIso: "2026-08-11T08:00:00.000Z",
  baselineProgress: 1,
  metrics: {
    raw: { ming: 56, run: 51, basis: "full" },
    corrected: { ming: 58, run: 53, basis: "full" },
  },
  composition: {
    basis: "capture", lead: "chi", support: "huang",
    segments: { chi: 34, huang: 30, qing: 18, bai: 10, hei: 8 },
  },
  integrated: {
    fiveElements: {
      available: true, element: "earth", hanzi: "土", name: "Earth", shape: "round",
      reading: "The Mian Xiang Five Elements tradition places this geometry with Earth.",
      sourcesDiffer: "Historical sources use more than one shape correspondence.",
    },
    threeCourts: {
      available: true, balanced: false, dominant: "middle",
      court: { hanzi: "中停", name: "Middle Court" },
      fractions: { upper: 0.31, middle: 0.38, lower: 0.31 },
      reading: "The accepted map gives the middle court the longest measured share.",
      measurementCaveat: "The upper hairline is estimated rather than observed.",
    },
    twelvePalaces: palaceReading,
    harmony: {
      value: 78,
      components: [{ key: "three-courts", value: 0.78 }],
      sourcesDiffer: "Named historical canons do not form one universal system.",
    },
    provenanceIds: { palaces: "twelve-palaces-v2" },
  },
  roiValidity: {},
  confidence: 0.92,
  valid: true,
};

async function seedReading(page) {
  await page.goto("/qise.html");
  await page.evaluate(async (record) => {
    const [{ createConsent }, { openStore }] = await Promise.all([
      import("/qise/consent.js"), import("/qise/store.js"),
    ]);
    createConsent().grant();
    await (await openStore()).put(record);
  }, reading);
  await page.reload();
}

test("Today gives an immediate path into all twelve palaces", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await seedReading(page);

  await expect(page.locator('[data-reading-panel="today"]')).toBeVisible();
  await expect(page.getByText("12 of 12 palaces revealed")).toBeVisible();
  await expect(page.getByRole("button", { name: "Enter 12 palaces" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("today-mobile.png"), fullPage: true });

  await page.getByRole("button", { name: "Enter 12 palaces" }).click();
  await expect(page.locator(".palace-card")).toHaveCount(12);
  await expect(page.locator('.palace-tone[data-contextual="true"]')).toHaveCount(0);
  await page.getByRole("button", { name: /Siblings Palace/ }).click();
  await expect(page.locator('[data-palace="siblings"] .palace-reveal')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("palaces-mobile.png"), fullPage: true });
  await expect(page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test("desktop palaces and the single-action capture coach remain usable", async ({ page }, testInfo) => {
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedReading(page);
  await page.getByRole("button", { name: "Enter 12 palaces" }).click();

  const columns = await page.locator(".palace-grid").evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns.split(" ").length,
  );
  expect(columns).toBe(2);
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath("palaces-desktop.png"), fullPage: true });

  await page.locator("#capture-coach").evaluate((node) => {
    for (const screen of document.querySelectorAll(".screen")) {
      screen.dataset.active = String(screen.id === "screen-capture");
    }
    document.querySelector('[data-guide="frame"]').dataset.state = "ready";
    document.querySelector('[data-guide="light"]').dataset.state = "adjust";
    document.querySelector('[data-guide="camera"]').dataset.state = "ready";
    document.querySelector('[data-guide="steady"]').dataset.state = "ready";
    document.querySelector("#capture-ready-count").textContent = "3 of 4 ready";
    document.querySelector("#gate-line").textContent = "Put the light behind your phone";
    document.querySelector("#gate-detail").textContent =
      "Keep looking forward. Move the phone towards the light until both cheeks look even.";
    document.querySelector("#use-current-light").hidden = false;
    document.querySelector("#use-current-light").dataset.emphasis = "true";
    document.querySelector("#screen-light").hidden = false;
  });
  await expect(page.getByRole("button", { name: "Use this light anyway" })).toBeVisible();
  await page.getByRole("button", { name: "Turn on screen flash" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-screen-flash", "true");
  await page.screenshot({ path: testInfo.outputPath("camera-halo-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("camera-halo-mobile.png"), fullPage: true });
  await expect(page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});
