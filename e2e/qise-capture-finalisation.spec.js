import { test, expect } from "@playwright/test";
import {
  buildSyntheticCapture, fakeMediaPipeModuleSource, fakeGetUserMediaInitScript,
} from "./support/synthetic-capture.js";

/*
 * PHASE 5 verification — production must not have regressed when it picked
 * up the shared frame scheduler and the screen-assist hold gating (locked
 * decision 3). Reuses the exact synthetic-capture harness built for the
 * beta's finalisation spec, against the production entry point instead.
 *
 * This is deliberately a SMOKE test, not a full duplicate of the beta's
 * suite: production's capture surface carries substantially more feature
 * surface (the opt-in illumination sequence, selfie upload, twelve-palace
 * measurement) that this correction did not touch and that already has its
 * own e2e coverage in e2e/qise-integration.spec.js. The one thing that
 * needed a fresh, real-browser check was the two changes this correction
 * actually made to the live loop.
 */

// Production registers a service worker (the beta deliberately does not);
// left running, it can intercept the vendor/mediapipe/ module fetch at the
// SW layer before Playwright's page.route() ever sees it, silently loading
// the REAL bundle instead of the fake one below. Blocked for this test only.
test.use({ serviceWorkers: "block" });

async function installSyntheticCamera(page, capture) {
  await page.route("**/vendor/mediapipe/vision_bundle.mjs", (route) => route.fulfill({
    contentType: "text/javascript",
    body: fakeMediaPipeModuleSource(capture.normalizedLandmarks),
  }));
  await page.addInitScript(fakeGetUserMediaInitScript(capture));
}

test("production: a well-framed, evenly lit, sharp synthetic face completes a capture on the real capture screen", async ({ page }) => {
  const capture = buildSyntheticCapture();
  await installSyntheticCamera(page, capture);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/qise.html"); // the redirect in index.html only fires from index.html itself

  await page.click("#consent-next");
  await page.click("#consent-grant");

  // Finalisation on the production screen: it navigates away from
  // screen-capture to screen-reading once finish() completes.
  await expect(page.locator("#screen-reading")).toHaveAttribute("data-active", "true", { timeout: 20000 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.waitForTimeout(200);
  expect(errors).toEqual([]);
});
