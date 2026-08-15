import { test, expect } from "@playwright/test";

async function prepare(page, { reducedMotion = false } = {}) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto("/qise.html");
  await page.evaluate(() => {
    for (const screen of document.querySelectorAll(".screen")) {
      screen.dataset.active = String(screen.id === "screen-postscan");
    }
  });
}

async function drive(page, mode, reducedMotion = false) {
  return page.evaluate(async ({ mode: selectedMode, reduced }) => {
    const { createPostScanReveal, renderPostScanReveal } = await import("/ui/qise/postscan-reveal.js");
    const root = document.querySelector("#screen-postscan");
    const reveal = createPostScanReveal({
      reducedMotion: reduced,
      onChange: (state) => renderPostScanReveal(root, state),
    });
    reveal.begin();
    reveal.completeStage("capture-quality", "Accepted capture · clean light");
    if (selectedMode === "slow") {
      reveal.completeStage("eligible-regions", "6 approved regions used for this reading.", [
        "tian", "yintang", "quan_l", "quan_r", "dige", "periorbital",
      ]);
      return reveal.state;
    }
    if (selectedMode === "error") {
      reveal.fail("The on-device reading stopped before it was assembled. Return to the scan choices and try again.");
      return reveal.state;
    }
    if (selectedMode === "abstain") {
      reveal.abstain("Not enough approved regions were readable for a complete reading. Return to the scan choices and try again.");
      return reveal.state;
    }
    reveal.completeStage("eligible-regions", "6 approved regions used for this reading.", [
      "tian", "yintang", "quan_l", "quan_r", "dige", "periorbital",
    ]);
    if (selectedMode === "calibration") {
      reveal.skipStage("personal-history", "Personal comparison will begin after more scans.");
    } else {
      reveal.completeStage("personal-history", "Compared with your own earlier readings.");
    }
    reveal.completeStage("reflection-assembly", "Reflection assembled on-device.");
    return reveal.state;
  }, { mode, reduced: reducedMotion });
}

test("post-scan reveal shows the primary slow state at target mobile width", async ({ page }, testInfo) => {
  await prepare(page);
  const state = await drive(page, "slow");
  await expect(page.locator("#screen-postscan")).toHaveAttribute("data-state", "active");
  await expect(page.locator("[data-postscan-field] [data-region-id]")).toHaveCount(6);
  await expect(page.getByText("Working on this device · your face image is not being stored.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("postscan-slow-mobile.png"), fullPage: true });
  expect(state.stages.find((stage) => stage.id === "eligible-regions").status).toBe("complete");
});

test("fast completion has a complete named transition without a fabricated progress value", async ({ page }, testInfo) => {
  await prepare(page);
  const state = await drive(page, "fast");
  await expect(page.locator("#screen-postscan")).toHaveAttribute("data-state", "complete");
  await expect(page.locator("[data-postscan-stages] li")).toHaveCount(4);
  await expect(page.locator("#screen-postscan")).not.toContainText(/%|countdown|seconds/);
  await page.screenshot({ path: testInfo.outputPath("postscan-fast-mobile.png"), fullPage: true });
  expect(state.status).toBe("complete");
});

test("calibration omits personal history and error/abstention return an action", async ({ page }, testInfo) => {
  await prepare(page);
  const calibration = await drive(page, "calibration");
  await expect(page.locator('[data-stage-id="personal-history"]')).toHaveCount(0);
  expect(calibration.stages.find((stage) => stage.id === "personal-history").status).toBe("skipped");

  const error = await drive(page, "error");
  await expect(page.locator("#screen-postscan")).toHaveAttribute("data-state", "error");
  await expect(page.getByRole("button", { name: "Return to scan choices" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("postscan-error-mobile.png"), fullPage: true });

  const abstention = await drive(page, "abstain");
  await expect(page.locator("#screen-postscan")).toHaveAttribute("data-state", "abstained");
  await page.screenshot({ path: testInfo.outputPath("postscan-abstention-mobile.png"), fullPage: true });
  expect(abstention.outcome).toBe("abstained");
});

test("reduced motion keeps the same event states without region animation", async ({ page }, testInfo) => {
  await prepare(page, { reducedMotion: true });
  const state = await drive(page, "calibration", true);
  await expect(page.locator("#screen-postscan")).toHaveAttribute("data-reduced-motion", "true");
  await expect(page.locator(".postscan-region")).toHaveCount(6);
  const animation = await page.locator(".postscan-region").first().evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toBe("none");
  await page.screenshot({ path: testInfo.outputPath("postscan-reduced-motion-mobile.png"), fullPage: true });
  expect(state.reducedMotion).toBe(true);
});
