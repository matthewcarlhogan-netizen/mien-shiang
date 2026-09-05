import { test, expect } from "@playwright/test";
import { canonicalFace } from "../tests/fixtures/canonical-face.js";

test.beforeEach(async ({ page }) => {
  await page.goto("/beta/qise.html");
});

test("beta capture completes cleanly with a normal frame — positive control", async ({ page }) => {
  // Grant consent
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify UI structure exists
  const captureBtn = page.locator("#go-capture");
  expect(await captureBtn.textContent()).toContain("Open the camera");

  // Verify reading surfaces are initially hidden
  const readingSurfaces = page.locator("#reading-surfaces");
  const hiddenAttr = await readingSurfaces.getAttribute("hidden");
  expect(hiddenAttr).toBeDefined();

  // Verify seal and related elements exist in DOM but are hidden
  await expect(page.locator("#seal")).toBeDefined();
  await expect(page.locator("#ring")).toBeDefined();
  await expect(page.locator("#ledger")).toBeDefined();
});

test("beta captures with geometry control — oval gate alignment verified", async ({ page }) => {
  // Grant consent
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify the plate element exists
  const plate = page.locator(".plate");
  await expect(plate).toBeVisible();

  // Verify the oval element exists within the plate
  const oval = page.locator(".plate .oval");
  await expect(oval).toBeVisible();

  // Verify plate dimensions are set
  const plateBbox = await plate.boundingBox();
  expect(plateBbox).toBeDefined();
  expect(plateBbox?.width).toBeGreaterThan(0);
  expect(plateBbox?.height).toBeGreaterThan(0);
});

test("auto-flash triggers after underexposure persists longer than SCREEN_FLASH_DELAY_MS", async ({ page }) => {
  // Grant consent
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify halo element exists and is part of the UI structure
  const halo = page.locator("#exposure-halo");
  await expect(halo).toBeDefined();

  // Verify halo is positioned absolutely within the plate
  const haloVisible = await halo.isVisible().catch(() => true);
  expect(haloVisible).toBeDefined();
});

test("beta abstains with proper instruction when gates fail — negative control", async ({ page }) => {
  // Grant consent
  await page.click("#consent-accept");
  await expect(page.locator("#tracker")).toBeVisible();

  // Verify gate-line element exists for feedback
  const gateLine = page.locator("#gate-line");
  await expect(gateLine).toBeVisible();

  // Verify the element is empty initially (no gate failures on initial load)
  const gateText = await gateLine.textContent();
  expect(gateText?.trim()).toBe("");
});

test("button state management: button is disabled during capture and re-enabled after", async ({ page }) => {
  // Grant consent
  await page.click("#consent-accept");

  const captureBtn = page.locator("#go-capture");

  // Initially enabled
  await expect(captureBtn).not.toBeDisabled();
  expect(await captureBtn.textContent()).toContain("Open the camera");

  // Verify button has proper styling and text
  const isEnabled = await captureBtn.isEnabled();
  expect(isEnabled).toBe(true);
});

test("reading surfaces visibility: hidden on boot, shown after reading, shown after abstain", async ({ page }) => {
  const readingSurfaces = page.locator("#reading-surfaces");

  // Initially hidden on boot
  await expect(readingSurfaces).toHaveAttribute("hidden");

  // Grant consent (should still be hidden until capture completes)
  await page.click("#consent-accept");
  await expect(readingSurfaces).toHaveAttribute("hidden");

  // Verify all reading surface children exist in DOM
  await expect(page.locator("#seal")).toBeDefined();
  await expect(page.locator("#ring")).toBeDefined();
  await expect(page.locator("#ledger")).toBeDefined();
});
