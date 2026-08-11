import { test, expect } from "@playwright/test";
import { canonicalFace } from "../tests/fixtures/canonical-face.js";

test.beforeEach(async ({ page }) => {
  await page.goto("/qise.html");
});

test("a stale grant and saved reading always return to consent renewal", async ({ page }) => {
  await page.evaluate(async () => {
    localStorage.setItem("qise.consent", JSON.stringify({
      granted: true,
      version: "qise-consent-v2",
      timestampIso: "2026-08-01T00:00:00.000Z",
    }));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("qise", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("qise_readings", "readwrite");
        tx.objectStore("qise_readings").put({ timestampIso: "2026-08-10T00:00:00.000Z" });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      };
    });
  });

  await page.reload();
  await expect(page.locator("#screen-consent")).toHaveAttribute("data-active", "true");
  await expect(page.locator("#screen-reading")).not.toHaveAttribute("data-active", "true");
  await expect(page.getByRole("heading", { name: /quietly showing/i })).toBeVisible();
});

test("the accepted-frame boundary runs in a real browser canvas", async ({ page }) => {
  const result = await page.evaluate(async (points) => {
    const { measureIntegratedReading } = await import("/qise/integrated.js");
    const width = 768;
    const height = 1024;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let offset = 0; offset < data.length; offset += 4) {
      data[offset] = 186;
      data[offset + 1] = 137;
      data[offset + 2] = 112;
      data[offset + 3] = 255;
    }
    const started = performance.now();
    const reading = measureIntegratedReading({ data, width, height }, points);
    return {
      elapsedMs: performance.now() - started,
      element: reading.fiveElements?.element,
      courts: reading.threeCourts?.available,
      palaces: reading.twelvePalaces?.measuredCount,
      harmonyParts: reading.harmony?.components?.length,
    };
  }, canonicalFace());

  expect(result.element).toBeTruthy();
  expect(result.courts).toBe(true);
  expect(result.palaces).toBe(6);
  expect(result.harmonyParts).toBeGreaterThanOrEqual(3);
  expect(result.elapsedMs).toBeGreaterThan(0);
});

test("browser failure paths explicitly zero temporary accepted-frame data", async ({ page }) => {
  const erased = await page.evaluate(async (points) => {
    const { measureIntegratedReading } = await import("/qise/integrated.js");
    const balanced = new Uint8ClampedArray([11, 22, 33, 255]);
    try {
      measureIntegratedReading(
        { data: new Uint8ClampedArray(4), width: 1, height: 1 }, points, document,
        {
          shadesOfGray: () => balanced,
          extractRegions: () => { throw new Error("browser failure path"); },
        },
      );
    } catch {
      return [...balanced];
    }
    return null;
  }, canonicalFace());
  expect(erased).toEqual([0, 0, 0, 0]);
});

test("inference dependencies are pinned and requested only from this origin", async ({ page }) => {
  const requested = [];
  page.on("request", (request) => requested.push(request.url()));
  await page.reload();
  await page.evaluate(() => import("/vendor/mediapipe/vision_bundle.mjs").then(() => true));

  const manifest = await page.request.get("/vendor/mediapipe/manifest.json");
  expect(manifest.ok()).toBe(true);
  const vendor = await manifest.json();
  expect(vendor.version).toBe("0.10.18");
  expect(vendor.assets).toHaveLength(6);
  expect(vendor.assets.every((asset) => /^[0-9a-f]{64}$/.test(asset.sha256))).toBe(true);

  const external = requested.filter((url) => {
    const parsed = new URL(url);
    return parsed.protocol.startsWith("http") && parsed.origin !== "http://127.0.0.1:4173";
  });
  expect(external).toEqual([]);
});
