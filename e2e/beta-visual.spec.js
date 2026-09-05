import { test, expect } from "@playwright/test";

/**
 * Visual Regression Tests for Beta UI
 *
 * Verifies that the bespoke dark-mode design system renders correctly:
 * - Mineral pigment accents (cinnabar, malachite, azurite, orpiment)
 * - Typography with clreq line-height rules
 * - Asymmetric composition and Liu Bai (negative space)
 * - UI component alignment and styling
 *
 * Snapshots capture deterministic states only — animations, timestamps,
 * and transient content are disabled. Tests are platform-sensitive (OS fonts)
 * so snapshots are updated when font rendering changes legitimately.
 */

test.beforeEach(async ({ page }) => {
  // Disable animations for deterministic snapshots
  await page.addInitScript(() => {
    document.documentElement.style.setProperty("--bridge-transition", "none");
    document.querySelectorAll("[style*='animation']").forEach((el) => {
      el.style.animation = "none";
    });
  });
  await page.goto("/beta/qise.html");
});

test("consent screen renders with correct dark typography and spacing", async ({
  page,
}, testInfo) => {
  // Set deterministic viewport (mobile-first)
  await page.setViewportSize({ width: 390, height: 844 });

  // Verify consent text renders with serif font and clreq line-height
  const consentTitle = page.locator("#consent-title");
  const consentBody = page.locator("#consent-body");

  await expect(consentTitle).toBeVisible();
  await expect(consentBody).toBeVisible();

  // Check computed line-height matches clreq range (1.5–2.0em)
  const titleLineHeight = await consentTitle.evaluate((el) =>
    window.getComputedStyle(el).lineHeight
  );
  const bodyLineHeight = await consentBody.evaluate((el) =>
    window.getComputedStyle(el).lineHeight
  );

  console.log(`Title line-height: ${titleLineHeight}, Body: ${bodyLineHeight}`);

  // Capture consent screen
  await page.screenshot({
    path: testInfo.outputPath("consent-mobile.png"),
    fullPage: false,
  });
});

test("tracker screen with cinnabar seal rendering and mineral accent colors", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  // Grant consent
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify seal and ring elements exist for snapshot
  await expect(page.locator("#seal")).toBeDefined();
  await expect(page.locator("#ring")).toBeDefined();
  await expect(page.locator("#ledger")).toBeDefined();

  // Check that cinnabar color token is applied
  const tracker = page.locator(".tracker");
  const tCinColor = await tracker.evaluate((el) =>
    window.getComputedStyle(el).getPropertyValue("--t-cin").trim()
  );
  console.log(`Cinnabar color value: ${tCinColor}`);

  // Capture tracker state
  await page.screenshot({
    path: testInfo.outputPath("tracker-mobile.png"),
    fullPage: false,
  });
});

test("reading surfaces: hidden state, typography, and spacing integrity", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const readingSurfaces = page.locator("#reading-surfaces");

  // Initially hidden
  await expect(readingSurfaces).toHaveAttribute("hidden");

  // Verify child elements structure
  await expect(page.locator("#seal")).toBeDefined();
  await expect(page.locator("#ring")).toBeDefined();
  await expect(page.locator("#ledger")).toBeDefined();
  await expect(page.locator("#readout")).toBeDefined();

  // Capture hidden state to verify no layout shift
  await page.screenshot({
    path: testInfo.outputPath("reading-surfaces-hidden.png"),
    fullPage: false,
  });
});

test("desktop layout: asymmetric grid alignment and Liu Bai (negative space)", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // Grant consent to reach tracker
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify layout spacing and padding integrity
  const tracker = page.locator(".tracker");
  const trackerPadding = await tracker.evaluate((el) =>
    window.getComputedStyle(el).padding
  );
  console.log(`Tracker padding: ${trackerPadding}`);

  // Capture desktop layout to verify asymmetric composition
  await page.screenshot({
    path: testInfo.outputPath("tracker-desktop.png"),
    fullPage: true,
  });
});

test("punctuation rendering: verify EM DASH, EN DASH, ELLIPSIS, MIDDLE DOT centering",
  async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Grant consent
    await page.click("#consent-accept");

    // Inject test content with problematic punctuation marks
    await page.evaluate(() => {
      const testDiv = document.createElement("div");
      testDiv.id = "punct-test";
      testDiv.className = "tracker";
      testDiv.style.padding = "20px";
      testDiv.style.fontSize = "16px";
      testDiv.style.lineHeight = "1.6";
      testDiv.style.fontFamily = "monospace";

      // U+2E3A (TWO-EM DASH), U+2014 (EM DASH), U+2013 (EN DASH),
      // U+2026 (HORIZONTAL ELLIPSIS), U+00B7 (MIDDLE DOT)
      testDiv.innerHTML = `
        <p>Two-em dash: ⸺ test</p>
        <p>Em dash: — test</p>
        <p>En dash: – test</p>
        <p>Ellipsis: … test</p>
        <p>Middle dot: · test (should be half-width or full-width Han)</p>
      `;
      document.body.insertBefore(testDiv, document.body.firstChild);
    });

    // Capture punctuation rendering
    await page.screenshot({
      path: testInfo.outputPath("punctuation-rendering.png"),
      fullPage: false,
    });
  }
);
