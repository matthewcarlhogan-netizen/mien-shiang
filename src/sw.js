/* Offline support.
 *
 * App shell is cached on install. The MediaPipe WASM runtime and the 4 MB face
 * model are cached on first successful fetch (stale-while-revalidate), so the
 * second launch works with no connection at all. */
// Bumped when the shell list changes: the activate handler deletes every cache
// whose name is not CACHE, so a stale v1 holding an old SHELL cannot survive.
const CACHE = "mienshiang-v22";
const SHELL = [
  "./", "./index.html", "./ui.js", "./analysis.js", "./engine.js",
  // Measurement calibration. Owned by neither module; engine.js imports both,
  // so omitting them here breaks the app offline rather than degrading it.
  "./utils/calibrationEngine.js", "./utils/textureAnalyzer.js",
  // Module A insights narrative, imported by readingview.js.
  "./utils/insights.js",
  "./geometry.js", "./landmarker.js", "./expression.js", "./region-extractor.js",
  "./debugview.js", "./flags.js", "./zones.js", "./roi.js",
  "./modulebview.js", "./report.js", "./about.js",
  "./privacy.html", "./terms.html", "./.well-known/assetlinks.json",
  // Rule layer, split by module.
  "./rules.js", "./rules-a.js", "./rules-b.js", "./rule-engine.js",
  // Module A reading + its views.
  "./reading/index.js", "./reading/five-elements.js", "./reading/three-courts.js",
  "./reading/twelve-palaces.js", "./reading/qi-se.js", "./reading/science.js",
  "./reading/summary.js", "./reading/harmony.js", "./reading/provenance.js",
  "./readingview.js", "./scienceview.js", "./sharecard.js", "./shareGate.js",
  // Both module adapters ship in both flavours. The flag governs BEHAVIOUR,
  // not bytes — see the honest limitation in flags.js. Omitting safety.js here
  // while rules.js still imports it would break the app offline rather than
  // produce an entertainment-only build.
  "./adapters/entertainment.js", "./adapters/safety.js",
  // Qi Se longitudinal tracker. A separate page and a separate module tree,
  // precached whole: the feature is useless offline if any one of these is
  // missing, and Promise.allSettled means an absent entry costs only itself
  // rather than the whole install.
  "./qise.html",
  "./qise/consent.js", "./qise/color.js", "./qise/rois.js", "./qise/sclera.js",
  "./qise/illumination.js", "./qise/upload.js", "./qise/framestats.js",
  "./qise/wakelock.js",
  "./qise/gates.js", "./qise/camera.js", "./qise/metrics.js", "./qise/pose.js",
  "./qise/baseline.js", "./qise/store.js", "./qise/passages.js",
  "./qise/patterns.js", "./qise/composition.js", "./qise/integrated.js",
  "./ui/qise/palette.js", "./ui/qise/seal.js", "./ui/qise/screens.js",
  "./ui/qise/share.js", "./ui/qise/theme.js", "./ui/qise/app.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png",
  "./icon-512-maskable.png",
];

self.addEventListener("install", (e) => {
  // Deliberately not addAll(): addAll is atomic, so a single missing entry
  // rejects the whole install and the worker never activates — losing ALL
  // offline support, silently, because ui.js swallows registration errors.
  // Cache each entry independently so one absent asset costs only that asset.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = e.request.url;
  // Mirrors the egress allowlist in scripts/lint-bundle.js. Google Fonts is
  // deliberately absent — the webfont import was removed, and re-adding a host
  // here without adding it to the allowlist will fail the bundle lint.
  const cacheable = url.startsWith(self.location.origin);
  if (!cacheable) return;

  // Product code is network-first. A paid user who is online must never run
  // yesterday's capture logic just because an older worker owns the tab.
  // The cached response remains the fallback when the device is offline.
  if (e.request.mode === "navigate" || ["script", "style"].includes(e.request.destination)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
