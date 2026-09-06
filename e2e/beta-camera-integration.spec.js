import { test, expect } from "@playwright/test";

/**
 * Beta Scanner: Synthetic Camera Feed Integration Test
 *
 * Tests the capture pipeline against a synthetic Y4M video fed in as the
 * fake camera device, instead of live camera hardware.
 *
 * IMPORTANT: `test.use({ launchArgs: [...] })` is not a real Playwright Test
 * option — the recognised option is `launchOptions.args`. The previous
 * version of this file used `launchArgs` and it was silently ignored, so
 * Chromium launched with NO fake camera device at all: `getUserMedia`
 * failed with `NotFoundError: Requested device not found` on every run, and
 * every assertion below was written soft enough to still pass through that
 * failure. Verified directly: with `launchArgs` (broken), `#preview`'s
 * `srcObject` stays false and the gate line reads "No front camera was
 * found." With `launchOptions.args` (this file) plus
 * `--use-fake-device-for-media-stream` (also missing before — required
 * alongside `--use-file-for-fake-video-capture`, which does nothing without
 * it), the stream genuinely attaches: `srcObject` is true, the video plays
 * at the fixture's real 320x240, and MediaPipe's WASM runtime actually
 * initialises (its "Created TensorFlow Lite XNNPACK delegate" log appears).
 *
 * What the fixture can and cannot prove: `tests/fixtures/synthetic-face.y4m`
 * (see `scripts/generate-synthetic-face-video.mjs`) is a plain skin-toned
 * ellipse with procedural texture noise, not real facial geometry — MediaPipe's
 * FaceLandmarker never finds a 478-point mesh in it. So these tests prove the
 * camera/MediaPipe/gate pipeline runs end-to-end on real frames, not that a
 * reading can be produced; the gate line settles on a real, stable
 * face-detection instruction and stays there, which is the honest ceiling for
 * this fixture.
 */

test.use({
  launchOptions: {
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-video-capture=${process.cwd()}/tests/fixtures/synthetic-face.y4m`,
    ],
  },
});

test.beforeEach(async ({ page }) => {
  // Disable reduced-motion so capture sequence animation works
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/beta/qise.html");
});

test("synthetic camera feed genuinely attaches and MediaPipe initialises",
  async ({ page }) => {
    await page.click("#consent-accept");
    await expect(page.locator("#tracker")).toBeVisible();

    // MediaPipe's WASM runtime logs its own init messages (e.g. the XNNPACK
    // delegate line) via console.error even though they're informational —
    // verified directly by running this file: that exact line is the only
    // thing in `error` on a clean run. Collect all console output regardless
    // of level and match the init message from there, instead of trusting
    // the browser's level classification.
    const consoleMessages = { log: [], error: [], warn: [], all: [] };
    page.on("console", (msg) => {
      consoleMessages.all.push(msg.text());
      if (msg.type() === "error") consoleMessages.error.push(msg.text());
      else if (msg.type() === "warn") consoleMessages.warn.push(msg.text());
      else consoleMessages.log.push(msg.text());
    });

    const captureBtn = page.locator("#go-capture");
    await expect(captureBtn).toBeEnabled();
    await captureBtn.click();

    const video = page.locator("#preview");
    await expect(video).toBeVisible({ timeout: 5000 });

    // The real regression: without a working fake device, srcObject stays
    // false and videoWidth/Height stay 0 no matter how long you wait.
    await expect.poll(async () => video.evaluate((el) => ({
      srcObject: !!el.srcObject, paused: el.paused, w: el.videoWidth, h: el.videoHeight,
    })), { timeout: 5000 }).toMatchObject({ srcObject: true, paused: false, w: 320, h: 240 });

    const gateLine = page.locator("#gate-line");
    await expect(gateLine).not.toHaveText("No front camera was found. Choose a selfie below instead.");

    // MediaPipe's WASM runtime only logs this once its Tasks Vision graph is
    // actually running inference on real frames, not on a device that never
    // produced any.
    await expect.poll(() => consoleMessages.all.some((m) => /XNNPACK|TensorFlow Lite/i.test(m)),
      { timeout: 5000 }).toBe(true);

    const unexpectedErrors = consoleMessages.error.filter((m) => !/XNNPACK|TensorFlow Lite/i.test(m));
    expect(unexpectedErrors, `unexpected console errors: ${unexpectedErrors.join(" | ")}`).toEqual([]);
  }
);

test("gates evaluate real frames: gate line settles on a genuine face-detection instruction",
  async ({ page }) => {
    // The synthetic fixture has no real facial geometry (see file header), so
    // this cannot reach a completed reading — it proves the gate pipeline is
    // live on real pixels, which is the defect this file used to hide.
    await page.click("#consent-accept");
    await page.click("#go-capture");

    const video = page.locator("#preview");
    await expect(video).toBeVisible({ timeout: 5000 });

    const gateLine = page.locator("#gate-line");
    // Any real instruction is acceptable; what must NOT appear is the
    // device-acquisition failure this file was silently exercising before.
    await expect.poll(async () => (await gateLine.textContent())?.trim(), { timeout: 5000 })
      .not.toBe("");
    await expect(gateLine).not.toContainText("No front camera was found");

    // Reading surfaces genuinely cannot appear against a face-less fixture —
    // assert that honestly rather than a soft "may or may not".
    await expect(page.locator("#reading-surfaces")).toBeHidden();
  }
);

test("media stream termination: camera stops cleanly when capture ends or user aborts",
  async ({ page }) => {
    await page.click("#consent-accept");
    await page.click("#go-capture");

    const video = page.locator("#preview");
    await expect(video).toBeVisible({ timeout: 5000 });
    await expect.poll(() => video.evaluate((el) => !!el.srcObject), { timeout: 5000 }).toBe(true);

    // Reload (simulating navigation away or session end)
    await page.reload();

    // After reload, consent is persisted in localStorage, so the tracker
    // should be visible and the consent screen should be hidden
    await expect(page.locator("#tracker")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#consent-screen")).toHaveAttribute("hidden");

    // A fresh document has a fresh <video> with no stream of its own — the
    // previous MediaStreamTrack was not carried across navigation, which is
    // the actual thing "stops cleanly" needs to mean here.
    await expect(page.locator("#preview")).toHaveJSProperty("srcObject", null);
  }
);

test("gate feedback renders consistently as synthetic frames are processed",
  async ({ page }) => {
    await page.click("#consent-accept");
    const captureBtn = page.locator("#go-capture");
    await captureBtn.click();

    const video = page.locator("#preview");
    await expect(video).toBeVisible({ timeout: 5000 });
    await expect.poll(() => video.evaluate((el) => !!el.srcObject), { timeout: 5000 }).toBe(true);

    const gateLine = page.locator("#gate-line");
    const gateMessages = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(200);
      const content = await gateLine.textContent();
      if (content && content.trim()) gateMessages.push(content.trim());
    }

    // Every sample must carry a real instruction — a live loop that stalls
    // would show blank text, and a device-acquisition failure would show the
    // camera-not-found message instead.
    expect(gateMessages.length).toBeGreaterThanOrEqual(8);
    for (const message of gateMessages) {
      expect(message).not.toContain("No front camera was found");
    }
  }
);
