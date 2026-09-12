import { test, expect } from "@playwright/test";
import {
  buildSyntheticCapture, fakeMediaPipeModuleSource, fakeGetUserMediaInitScript,
} from "./support/synthetic-capture.js";
import { faceGuideRect } from "../src/qise/frame-geometry.js";
import { DISTANCE_MIN_FRACTION } from "../src/qise/gates.js";

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

/*
 * Regression check for the parity gap CLAUDE.md item 57 documents as fixed
 * in beta but not production: production's #face-guide was a static CSS
 * oval with no relationship to DISTANCE_MIN_FRACTION, so a face that
 * visibly filled the on-screen oval could still fail the distance gate.
 * This drives the real capture code and asserts the guide's inline style
 * is DERIVED from faceGuideRect() against the actual rendered box and the
 * real buffer dimensions, not left on its static fallback.
 */
test("production: the face guide is sized from faceGuideRect(), not the static CSS fallback", async ({ page }) => {
  const capture = buildSyntheticCapture();
  await installSyntheticCamera(page, capture);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/qise.html");

  await page.click("#consent-next");
  await page.click("#consent-grant");

  // applyFaceGuide() runs synchronously right after attachCameraPreview()
  // resolves, which itself only resolves once the video reports real
  // dimensions (item 50) — so waiting on videoWidth is sufficient.
  await page.waitForFunction(() => {
    const v = document.getElementById("preview");
    return Boolean(v && v.videoWidth > 0);
  }, { timeout: 20000 });

  const guideStyle = await page.locator("#face-guide").evaluate((el) => ({
    left: el.style.left, top: el.style.top, width: el.style.width, height: el.style.height,
  }));

  // Must have been set by JS (inline style overriding the class), not left
  // on the static CSS fallback.
  expect(guideStyle.left).not.toBe("");
  expect(guideStyle.left).not.toBe("17%");

  const box = await page.locator("#capture-frame").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  });
  const expected = faceGuideRect({
    bufferWidth: capture.width,
    bufferHeight: capture.height,
    boxWidth: box.width,
    boxHeight: box.height,
    minInterocularFraction: DISTANCE_MIN_FRACTION,
  });

  expect(guideStyle.left).toBe(`${(expected.leftFraction * 100).toFixed(3)}%`);
  expect(guideStyle.top).toBe(`${(expected.topFraction * 100).toFixed(3)}%`);
  expect(guideStyle.width).toBe(`${(expected.widthFraction * 100).toFixed(3)}%`);
  expect(guideStyle.height).toBe(`${(expected.heightFraction * 100).toFixed(3)}%`);
});

/*
 * Real-time ghost-outline feedback: the guide oval reflects the pose gate's
 * live status (set from gates.js's own `failures` array — no new threshold),
 * so a well-posed face should see it turn positive WHILE STILL LOOKING AT
 * THE CAMERA, not only find out after a completed or failed attempt. This
 * drives the real capture loop and watches for the DOM state transition,
 * rather than asserting on app.js source (which nothing else can import —
 * item 44) or by construction alone.
 */
test("production: the face guide turns positive in real time for a well-posed synthetic face", async ({ page }) => {
  const capture = buildSyntheticCapture();
  await installSyntheticCamera(page, capture);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/qise.html");

  await page.click("#consent-next");
  await page.click("#consent-grant");

  // Reached during the live preview, well before finish() navigates away to
  // #screen-reading (asserted separately by the finalisation test above).
  await expect(page.locator("#face-guide")).toHaveAttribute("data-pose", "pass", { timeout: 20000 });
});
