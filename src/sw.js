import {
  canonicalDayFor, notificationEligibility, notificationPayload,
  openNotificationStore, recordNotificationDelivered,
} from "./qise/notifications.js";

/* Offline support.
 *
 * App shell is cached on install. The MediaPipe WASM runtime and the 4 MB face
 * model are cached on first successful fetch (stale-while-revalidate), so the
 * second launch works with no connection at all. */
// Bumped when the shell list changes: the activate handler deletes every cache
// whose name is not CACHE, so a stale v1 holding an old SHELL cannot survive.
const CACHE = "mienshiang-v24";
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
  "./qise/baseline.js", "./qise/store.js", "./qise/passages.js", "./qise/notifications.js",
  "./qise/patterns.js", "./qise/composition.js", "./qise/integrated.js",
  "./ui/qise/palette.js", "./ui/qise/seal.js", "./ui/qise/screens.js",
  "./ui/qise/share.js", "./ui/qise/theme.js", "./ui/qise/exposure-halo.js", "./ui/qise/app.js",
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

const PERIODIC_SYNC_TAG = "qise-daily-reading";

/**
 * Background delivery is deliberately best effort. A browser may delay or
 * decline Periodic Background Sync; the page also schedules an active-app
 * fallback. Neither path is allowed to claim a reminder was shown until the
 * browser accepted showNotification and the delivery day was persisted.
 */
async function deliverDailyNotification() {
  try {
    const store = await openNotificationStore();
    const preferences = await store.get();
    const now = new Date();
    const day = canonicalDayFor(now);
    const result = notificationEligibility({
      now,
      preferences,
      hasPriorReading: Boolean(preferences.lastReadingDay),
      hasReadingToday: preferences.lastReadingDay === day,
    });
    if (!result.eligible) return result;

    if (!await store.claimDelivery(result.canonicalDay)) {
      return { ...result, eligible: false, reason: "already-claimed" };
    }
    const payload = notificationPayload(result.canonicalDay);
    try {
      await self.registration.showNotification(payload.title, payload);
      await store.put(recordNotificationDelivered(preferences, result.canonicalDay));
      return { ...result, delivered: true };
    } catch (error) {
      await store.releaseDelivery(result.canonicalDay).catch(() => {});
      throw error;
    }
  } catch (error) {
    // A permission revocation, unavailable store, or browser scheduling
    // failure must not turn into a false delivery record or an unhandled worker
    // rejection that kills future background events.
    console.warn("qise: daily notification was not delivered", error);
    return { eligible: false, reason: "delivery-failed" };
  }
}

async function registerPeriodicBackgroundSync() {
  try {
    const registration = self.registration;
    if (registration.periodicSync?.register) {
      await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
        // This is a lower bound, not a promise of exact-time delivery.
        minInterval: 24 * 60 * 60 * 1000,
      });
      return true;
    }
  } catch (error) {
    console.warn("qise: periodic notification scheduling unavailable", error);
  }
  return false;
}

async function unregisterPeriodicBackgroundSync() {
  try {
    if (self.registration.periodicSync?.unregister) {
      await self.registration.periodicSync.unregister(PERIODIC_SYNC_TAG);
    }
  } catch (error) {
    console.warn("qise: periodic notification cancellation unavailable", error);
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "qise-notification-register") {
    event.waitUntil(registerPeriodicBackgroundSync());
  }
  if (event.data?.type === "qise-notification-unregister") {
    event.waitUntil(unregisterPeriodicBackgroundSync());
  }
  if (event.data?.type === "qise-notification-check") {
    event.waitUntil(deliverDailyNotification());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) event.waitUntil(deliverDailyNotification());
});

// A future push provider may use the same privacy-safe payload. No server or
// subscription is assumed here; an unsolicited push can never bypass the
// user's local preference and quiet-hours policy.
self.addEventListener("push", (event) => {
  event.waitUntil(deliverDailyNotification());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "./qise.html", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const qiseUrl = new URL("./qise.html", self.location.origin).href;
      const existing = windows.find((client) => client.url.startsWith(qiseUrl));
      if (existing?.focus) return existing.focus();
      return self.clients.openWindow(destination);
    }),
  );
});
