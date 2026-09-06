import { test, expect } from "@playwright/test";
import {
  buildSyntheticCapture, fakeMediaPipeModuleSource, fakeGetUserMediaInitScript,
} from "./support/synthetic-capture.js";

/*
 * PHASE 12, Layer B — the genuine positive control.
 *
 * Every other beta E2E spec in this repository tolerates the camera never
 * actually opening (a NotFoundError in a container with no webcam) and
 * asserts on page structure that exists whether or not a single frame was
 * ever processed. None of them proves the capture loop can reach a
 * completed, stored reading. Two bugs in the existing suite's OWN Chromium
 * flags — `launchArgs` is not a real Playwright option, and
 * `--use-fake-device-for-media-stream` was missing even after that was
 * fixed — meant the fake camera never actually engaged, and every test
 * passed anyway. That is CLAUDE.md item 18a's shape in the test suite
 * itself: a guard that runs and proves nothing.
 *
 * This file replaces the camera AND the landmarker with fully controlled,
 * deterministic substitutes — a canvas-painted synthetic face streamed via
 * `captureStream()`, and a fake MediaPipe module returning a fixed mesh
 * built from the same canonical reference mesh every unit test in this repo
 * already uses — and drives the REAL, unmodified beta.js through every
 * stage: camera open, face found, gates green, hold, burst, and a reading
 * actually written to the store. This is explicitly NOT a MediaPipe
 * accuracy test; e2e/beta-camera-integration.spec.js's smoke test against
 * the real bundle covers that MediaPipe still loads.
 */

async function installSyntheticCamera(page, capture) {
  await page.route("**/vendor/mediapipe/vision_bundle.mjs", (route) => route.fulfill({
    contentType: "text/javascript",
    body: fakeMediaPipeModuleSource(capture.normalizedLandmarks),
  }));
  await page.addInitScript(fakeGetUserMediaInitScript(capture));
}

test.describe("beta capture reaches real finalisation — positive control", () => {
  test("a well-framed, evenly lit, sharp synthetic face completes a capture and is stored", async ({ page }) => {
    const capture = buildSyntheticCapture(); // defaults: well-framed, even light, textured for sharpness
    await installSyntheticCamera(page, capture);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/beta/qise.html");

    await page.click("#consent-accept");
    await expect(page.locator("#tracker")).toBeVisible();

    const ledgerBefore = await page.locator("#ledger .sq").count();
    expect(ledgerBefore).toBe(0);

    await page.click("#go-capture");

    // Finalisation, not merely "the page did not crash": the reading
    // surfaces become visible, the ledger gains exactly one entry, and the
    // gate line clears — all three are set together, at the end of
    // finish(), and nowhere else in the file.
    await expect(page.locator("#reading-surfaces")).not.toHaveAttribute("hidden", { timeout: 20000 });
    await expect(page.locator("#ledger .sq")).toHaveCount(1, { timeout: 5000 });
    await expect(page.locator("#gate-line")).toHaveText("", { timeout: 5000 });

    // The capture button must have been handed back — a completed capture
    // is not one that leaves "Capturing…" on screen forever.
    await expect(page.locator("#go-capture")).toBeEnabled();
    await expect(page.locator("#go-capture")).toHaveText("Open the camera");

    // No console error escaped the run.
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });

  test("negative control: a face framed well short of the distance threshold never completes", async ({ page }) => {
    // Half the bizygomatic width of the positive control — comfortably below
    // DISTANCE_MIN_FRACTION. Everything else about the frame (light, sharpness)
    // is identical, isolating exactly one gate.
    const capture = buildSyntheticCapture({ bizygomaticFraction: 0.20 });
    await installSyntheticCamera(page, capture);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/beta/qise.html");

    await page.click("#consent-accept");
    await page.click("#go-capture");

    // Give it the same generous window the positive control gets to reach
    // finalisation, then assert it explicitly did NOT.
    await page.waitForTimeout(8000);
    await expect(page.locator("#reading-surfaces")).toHaveAttribute("hidden");
    await expect(page.locator("#ledger .sq")).toHaveCount(0);

    const guideFrame = page.locator('[data-guide="frame"]');
    await expect(guideFrame).toHaveAttribute("data-state", "adjust");
  });

  test("negative control: sclera too dark to read shows a lighting/visibility instruction, never the coloured-lamp one", async ({ page }) => {
    // Near-black "sclera" fails sampleSclera's own darkness floor
    // (SCLERA_MIN_MEDIAN_L) while still leaving plenty of PIXELS — the
    // too_dark refusal, reproduced from a real pixel buffer rather than a
    // hand-built fixture, matching tests/qise/gate-dependency.test.js's
    // deterministic version of the same case.
    //
    // First confirmed the OTHER way: painting sclera the same colour as skin
    // does NOT reproduce too_few_pixels — it measures the skin's own colour
    // cast as a genuine (correct) illuminant failure, since skin is not
    // colour-neutral. Darkness isolates the intended path instead.
    const capture = buildSyntheticCapture({ sclera: [6, 6, 6] });
    await installSyntheticCamera(page, capture);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/beta/qise.html");

    await page.click("#consent-accept");
    await page.click("#go-capture");

    await page.waitForTimeout(4000);
    const gateText = (await page.locator("#gate-line").textContent()) || "";
    expect(gateText.toLowerCase()).not.toMatch(/coloured|daylight|plain white/);
    await expect(page.locator("#reading-surfaces")).toHaveAttribute("hidden");
  });
});
