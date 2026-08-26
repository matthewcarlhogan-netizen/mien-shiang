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
 *
 * ── ROUND 11 CORRECTION (Copilot, PR #40, on this test file itself) ────────
 * The original version of this test seeded consent/IndexedDB by first
 * `page.goto("/qise.html")` with NO query string, THEN attached the request
 * listener, THEN navigated a SECOND time with the mode in the query string.
 * 127.0.0.1 is an INTERNAL_HOST_PATTERNS match, whose default is
 * "reflection=on" — so that untracked first navigation could, given
 * already-seeded storage (the "on" case reused the SAME shared
 * `context.newPage()` as the "off" case, run second, so consent/IndexedDB
 * were already populated from the "off" run), reach the reading screen and
 * request/cache the Stage-3 modules BEFORE the listener existed. A cache hit
 * on the tracked second navigation could then either mask a genuine "on"
 * regression (module already warm, so no fresh request needed to satisfy the
 * assertion) or, in the other direction, make an "off" run look clean for the
 * wrong reason.
 *
 * Fixed per the review's own prescription: seed consent/IndexedDB from a
 * NEUTRAL same-origin page that loads no JavaScript at all
 * (`privacy.html` — zero `<script>` tags, confirmed by reading it), attach
 * the request listener BEFORE the first-ever navigation to `qise.html` in
 * this browser context, and put the mode in the URL of THAT first
 * navigation. "off" and "on" are now separate `test()` blocks — Playwright
 * Test gives each `test()` its own fresh, isolated `BrowserContext` by
 * default, so there is no shared storage for a positive control to warm a
 * cache the negative control then reads from.
 */
const NEUTRAL_PAGE = "/privacy.html";

async function buildReading(page, points, canonicalDay) {
  return page.evaluate(async ([pts, day]) => {
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
}

/*
 * Writes through the real `openStore()`/`.put()` (src/qise/store.js) rather
 * than a hand-rolled `indexedDB.open()` — both pure, DOM-free modules,
 * loadable from any same-origin page including the neutral one, so this is
 * not a step back from "no app.js on the neutral page". This is not merely
 * cleaner: a raw `indexedDB.open("qise", 2)` with no `onupgradeneeded`
 * handler creates the "qise" database with NO object store on a page that
 * never ran `openStore()` before — which the neutral-page fix below makes
 * true for the first time. On the OLD `page.goto("/qise.html")`-first flow
 * this went unnoticed because app.js's own boot path had already run
 * `openStore()` and created the schema before the test's raw open() reused
 * it. `openStore()` also runs `toRecord()`'s allow-list on the way in, which
 * is what production actually persists, rather than the test's raw object
 * verbatim.
 */
async function seedConsentAndReading(page, record) {
  return page.evaluate(async (rec) => {
    // The current, non-stale consent shape — see src/qise/consent.js's
    // CONSENT_VERSION. Using the "qise-consent-v2"/2026-08-01 fixture from the
    // "stale grant" test above would be wrong here: that fixture is
    // DELIBERATELY stale, to prove the app forces re-consent on it.
    const { CONSENT_VERSION } = await import("/qise/consent.js");
    const { openStore } = await import("/qise/store.js");
    localStorage.setItem("qise.consent", JSON.stringify({
      granted: true, version: CONSENT_VERSION, timestampIso: new Date().toISOString(),
    }));
    const store = await openStore();
    await store.put(rec);
  }, record);
}

/** Seeds via the neutral page, THEN attaches the listener, THEN makes the one, mode-bearing qise.html navigation. */
async function seedThenColdNavigate(page, points, canonicalDay, query) {
  await page.goto(NEUTRAL_PAGE);
  const reading = await buildReading(page, points, canonicalDay);
  await seedConsentAndReading(page, reading);

  const requested = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.goto(`/qise.html${query}`);
  await expect(page.locator("#screen-reading")).toHaveAttribute("data-active", "true");
  return requested;
}

/*
 * All three Round 10/11 load-boundary tests below run with the service
 * worker blocked. app.js registers one on boot (`navigator.serviceWorker
 * .register("./sw.js")`), and a live SW sitting in front of these requests
 * turned out to be exactly the kind of hidden interference Copilot's review
 * warned about, one layer further down: `page.route()`'s abort in the
 * fallback test below silently never fired once a SW was actually
 * intercepting the fetch for `heritage-connections.js` (a SW-mediated fetch
 * is not the same network-layer event Playwright's page-level route hooks
 * patch), so the "failed import" premise wasn't actually true when first
 * written — the import was silently succeeding underneath the unfired route,
 * and the test failed for an unrelated DOM-timing reason while investigating
 * why. Blocking the SW for this describe block removes that whole dimension
 * of install/activate/fetch-interception timing from all three assertions,
 * which is the right scope for tests about the PAGE's own module-loading
 * behaviour specifically.
 */
test.describe("Stage-3 connector-integration load boundary", () => {
  test.use({ serviceWorkers: "block" });

  test("reflection=off issues no request for the Stage-3 connector-integration modules, on a genuinely cold qise.html navigation", async ({ page }) => {
    const requested = await seedThenColdNavigate(page, canonicalFace(), "2026-08-17", "?reflection=off");
    for (const marker of ["qise/heritage-connections.js", "ui/qise/heritage-view.js", "heritage/composition.js", "heritage/resolver.js"]) {
      expect(requested.some((url) => url.includes(marker)), `unexpected request for ${marker} with reflection=off`).toBe(false);
    }
  });

  test("reflection=on reaches the Stage-3 loader, from an independent context with no prior warm cache", async ({ page }) => {
    const requested = await seedThenColdNavigate(page, canonicalFace(), "2026-08-18", "?reflection=on");
    expect(requested.some((url) => url.includes("qise/heritage-connections.js")), "reflection=on must load heritage-connections.js").toBe(true);
    expect(requested.some((url) => url.includes("ui/qise/heritage-view.js")), "reflection=on must load heritage-view.js").toBe(true);
  });

  /*
   * ROUND 11 (Codex P2, PR #40): the Round 10 lazy loader's failure path used
   * to tear the whole Reflection surface down on any dropped connector-module
   * request — erasing the pre-existing base Reflection Engine (Today/Story/Why)
   * for a reason that has nothing to do with whether there was a reading to
   * show. Fixed in src/ui/qise/app.js's renderReflection(): a failed Stage-3
   * import now falls back to readingTiers(reflection) — the same base tiers
   * the app rendered before Stage 3 ever existed — with zero connector markup,
   * nothing fabricated (tests/qise/heritage-lazy-load.test.js "8b"/"8c" pin the
   * static shape of this). This is the one behavioural browser proof that a
   * source-text check cannot give: a REAL aborted module request, in a REAL
   * page, still leaves an ordinary reading on screen.
   *
   * "No stale prior connector content remains" is covered structurally rather
   * than by a second live render in this same test: both branches of
   * renderReflection() write storyNode/whyNode with a single, full
   * `innerHTML = \`...\`` template assignment (never an incremental append), so
   * there is no code path by which a fallback render could retain markup from
   * an earlier render even in principle — pinned by
   * tests/qise/heritage-lazy-load.test.js "8c". Reproducing that live would
   * mean driving two renderReading() calls inside one page session, which
   * needs a second real capture through the camera/gate pipeline — a much
   * heavier and flakier harness for a property the static test already proves.
   */
  test("a failed Stage-3 import falls back to the base Reflection Engine, not a blank one", async ({ page }) => {
    await page.goto(NEUTRAL_PAGE);
    const reading = await buildReading(page, canonicalFace(), "2026-08-19");
    await seedConsentAndReading(page, reading);

    await page.route("**/qise/heritage-connections.js", (route) => route.abort());

    await page.goto("/qise.html?reflection=on");
    await expect(page.locator("#screen-reading")).toHaveAttribute("data-active", "true");

    // Ordinary reading rendering continues — this text comes from the
    // pre-existing, Reflection-independent passage path (readingScreenModel),
    // not from anything this pass touches.
    await expect(page.locator("#reading-passage")).not.toBeEmpty();

    // The base Reflection Engine still renders. "Today" is the default
    // selected tab, so its surface is visible without any interaction.
    // Story and Why sit inside OTHER `[data-reading-panel]` tabpanels that
    // ship `hidden` until their own tab is selected (qise.html) — that
    // tab-selection gate is a pre-existing, Reflection-independent UI
    // mechanism, so this follows a real reader's path (select the tab) to
    // prove the surface actually renders, rather than asserting full visual
    // visibility on an element nested in a panel nothing has selected yet.
    await expect(page.locator("#reflection-today")).toBeVisible();

    await page.locator('[data-reading-tab="story"]').click();
    await expect(page.locator("#reflection-story")).toBeVisible();

    const whyTab = page.locator("#reading-tab-why");
    await expect(whyTab).not.toHaveAttribute("hidden", "");
    await whyTab.click();
    await expect(page.locator("#reflection-why")).toBeVisible();

    // No Stage-3 connector markup — the specific eyebrow strings
    // heritageConnectorTier2Markup/heritageConnectorTier3Markup emit, and only
    // they emit (src/ui/qise/heritage-view.js).
    const storyHtml = await page.locator("#reflection-story").innerHTML();
    expect(storyHtml).not.toContain("A related historical connection");
    const whyHtml = await page.locator("#reflection-why").innerHTML();
    expect(whyHtml).not.toContain("Historical connector graph");
  });
});
