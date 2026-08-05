/* Offline support.
 *
 * App shell is cached on install. The MediaPipe WASM runtime and the 4 MB face
 * model are cached on first successful fetch (stale-while-revalidate), so the
 * second launch works with no connection at all. */
// Bumped when the shell list changes: the activate handler deletes every cache
// whose name is not CACHE, so a stale v1 holding an old SHELL cannot survive.
const CACHE = "mienshiang-v3";
const SHELL = [
  "./", "./index.html", "./ui.js", "./analysis.js", "./engine.js",
  "./rules.js", "./geometry.js", "./landmarker.js", "./expression.js",
  "./debugview.js", "./flags.js",
  // Both module adapters ship in both flavours. The flag governs BEHAVIOUR,
  // not bytes — see the honest limitation in flags.js. Omitting safety.js here
  // while rules.js still imports it would break the app offline rather than
  // produce an entertainment-only build.
  "./adapters/entertainment.js", "./adapters/safety.js",
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
  const cacheable =
    url.startsWith(self.location.origin) ||
    url.includes("cdn.jsdelivr.net") ||
    url.includes("storage.googleapis.com/mediapipe-models") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com");
  if (!cacheable) return;

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
