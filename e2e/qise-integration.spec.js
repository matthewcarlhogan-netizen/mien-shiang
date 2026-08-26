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

test("the optional colour check visibly confirms both states before camera access", async ({ page }) => {
  await page.getByRole("button", { name: "Begin my reading" }).click();
  const checkbox = page.getByLabel(/Optional screen-light experiment/);
  const status = page.locator("#illumination-choice-status");

  await expect(status).toHaveText(/Off — the reading will use the normal camera only/);
  await checkbox.check();
  await expect(page.locator("#illumination-choice")).toHaveAttribute("data-selected", "true");
  await expect(status).toHaveText(/Selected — the colour response check will run before capture/);
  await checkbox.uncheck();
  await expect(status).toHaveText(/Off — the reading will use the normal camera only/);
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
  expect(result.palaces).toBe(12);
  expect(result.harmonyParts).toBeGreaterThanOrEqual(3);
  expect(result.elapsedMs).toBeGreaterThan(0);
  expect(result.elapsedMs).toBeLessThan(2000);
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

/*
 * ROUND 10 — the Stage 3 connector-integration boundary (Codex, PR #40
 * discussion r3856061462): `heritage-connections.js`/`heritage-view.js` must
 * load only once reflectionMode() is confirmed not "off". Verified as an
 * actual network condition, not only a static-source check, because that is
 * the one thing a source-text grep cannot prove — that the browser's real ES
 * module loader genuinely never issues the request.
 *
 * `heritage-connections.js` and `heritage-view.js` are NOT in sw.js's SHELL
 * precache list (confirmed by reading it — see CLAUDE.md item 15's own
 * caution about that file), so there is no precache path that could make this
 * assertion pass vacuously by serving them from cache before the request
 * layer ever sees them.
 *
 * `?reflection=off`/`?reflection=on` are used explicitly rather than relying
 * on the host default, because 127.0.0.1 (this test server) is itself an
 * INTERNAL_HOST_PATTERNS match in reading-flags.js, whose default for an
 * internal host is "on" — asserting on the query-string-forced mode is what
 * makes this deterministic regardless of that default.
 *
 * The seeded reading is built from the REAL production measurement functions
 * (readRois -> trimmedMedianLab -> computeReadingMetrics -> interpretReading
 * -> compositionOf), the same ones tests/qise/reading-production-path.test.js
 * exercises on the Node side, imported live from `dist/` inside the page —
 * not a hand-typed object standing in for a measurement. This is what makes
 * the "off" case meaningful rather than vacuous: renderReading() -> await
 * renderReflection() genuinely runs on a real reading, so a request's absence
 * is evidence the gate held, not evidence the code path was never reached.
 */
test("reflection=off issues no request for the Stage-3 connector-integration modules; reflection=on does", async ({ context }) => {
  const points = canonicalFace();

  const buildReading = async (page, canonicalDay) => page.evaluate(async ([pts, day]) => {
    const { readRois } = await import("/qise/rois.js");
    const { trimmedMedianLab } = await import("/qise/camera.js");
    const color = await import("/qise/color.js");
    const { computeReadingMetrics, lumRatioP90P50 } = await import("/qise/metrics.js");
    const { interpretReading, axesOf, BASELINE_VERSION } = await import("/qise/baseline.js");
    const { compositionOf } = await import("/qise/composition.js");

    const width = 768, height = 1024;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 198; data[i * 4 + 1] = 152; data[i * 4 + 2] = 138; data[i * 4 + 3] = 255;
    }
    const image = { data, width, height };
    const { rois } = readRois(image, pts, { mirrored: false }, color);
    const lab = {}, lumRatio = {};
    for (const [name, r] of Object.entries(rois)) {
      if (!r.pixels.length) continue;
      lab[name] = trimmedMedianLab(r.pixels, color);
      lumRatio[name] = lumRatioP90P50(r.pixels, color);
    }
    const metrics = computeReadingMetrics({ rawLab: lab, correctedLab: lab, lumRatio });
    const timestampIso = `${day}T09:00:00.000Z`;
    const interpreted = interpretReading(metrics.corrected, [], {
      confidence: 0.9, timestampIso, captureMode: "auto",
    });
    return {
      timestampIso, canonicalDay: day, lineageId: "seg-e2e-round10", captureClass: "auto",
      metrics, axes: axesOf(metrics.corrected), deltas: interpreted.deltas,
      compass: interpreted.compass, z: interpreted.z,
      composition: compositionOf({ metrics, compass: interpreted.compass }),
      integrated: null, tags: [], baselineVersion: BASELINE_VERSION, captureTier: "clean",
      readingState: interpreted.state, baselineProgress: 1, consentVersion: "qise-consent-v3",
      illumination: null, gateMargins: {}, sclera: null,
      roiValidity: Object.fromEntries(Object.entries(rois).map(([k, v]) => [k, v.valid])),
      frameJitter: null, confidence: 0.9, valid: true,
    };
  }, [points, canonicalDay]);

  const seedConsentAndReading = async (page, record) => page.evaluate(async (rec) => {
    // The current, non-stale consent shape — see src/qise/consent.js's
    // CONSENT_VERSION. Using the "qise-consent-v2"/2026-08-01 fixture from the
    // "stale grant" test above would be wrong here: that fixture is
    // DELIBERATELY stale, to prove the app forces re-consent on it.
    const { CONSENT_VERSION } = await import("/qise/consent.js");
    localStorage.setItem("qise.consent", JSON.stringify({
      granted: true, version: CONSENT_VERSION, timestampIso: new Date().toISOString(),
    }));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("qise", 2);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("qise_readings", "readwrite");
        tx.objectStore("qise_readings").put(rec);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      };
    });
  }, record);

  const requestsFor = async (query) => {
    const page = await context.newPage();
    await page.goto("/qise.html");
    const reading = await buildReading(page, "2026-08-17");
    await seedConsentAndReading(page, reading);

    const requested = [];
    page.on("request", (r) => requested.push(r.url()));
    await page.goto(`/qise.html${query}`);
    await expect(page.locator("#screen-reading")).toHaveAttribute("data-active", "true");
    await page.close();
    return requested;
  };

  const offRequests = await requestsFor("?reflection=off");
  for (const marker of ["qise/heritage-connections.js", "ui/qise/heritage-view.js", "heritage/composition.js", "heritage/resolver.js"]) {
    expect(offRequests.some((url) => url.includes(marker)), `unexpected request for ${marker} with reflection=off`).toBe(false);
  }

  const onRequests = await requestsFor("?reflection=on");
  expect(onRequests.some((url) => url.includes("qise/heritage-connections.js")), "reflection=on must still load heritage-connections.js").toBe(true);
  expect(onRequests.some((url) => url.includes("ui/qise/heritage-view.js")), "reflection=on must still load heritage-view.js").toBe(true);
});
