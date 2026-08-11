import { test } from "node:test";
import assert from "node:assert/strict";

import { createScreenWakeLock, WAKE_LOCK_STATES } from "../../src/qise/wakelock.js";

/* A minimal stand-in for the platform objects. Everything the module touches
 * is injected, which is the only reason any of this runs at all — the real
 * caller is ui/qise/app.js, which nothing can import. */
function fakeSentinel() {
  const sentinel = {
    released: false,
    listeners: {},
    addEventListener(name, fn) { (sentinel.listeners[name] ||= []).push(fn); },
    async release() { sentinel.released = true; },
  };
  return sentinel;
}

function fakeWakeLock({ reject = null } = {}) {
  const api = {
    calls: 0,
    sentinels: [],
    async request(type) {
      api.calls++;
      api.lastType = type;
      if (reject) throw reject;
      const s = fakeSentinel();
      api.sentinels.push(s);
      return s;
    },
  };
  return api;
}

function fakeDocument(visibility = "visible") {
  const doc = {
    visibilityState: visibility,
    handlers: {},
    addEventListener(name, fn) { (doc.handlers[name] ||= []).push(fn); },
    removeEventListener(name, fn) {
      doc.handlers[name] = (doc.handlers[name] || []).filter((h) => h !== fn);
    },
    async fire(name) {
      for (const h of [...(doc.handlers[name] || [])]) await h();
    },
  };
  return doc;
}

test("a host with no wake lock API reports unsupported and never throws", async () => {
  const lock = createScreenWakeLock({ wakeLock: undefined, documentRef: fakeDocument() });

  assert.equal(lock.supported, false);
  assert.equal(lock.state, WAKE_LOCK_STATES.UNSUPPORTED);
  // The capture must be identical here, so acquire resolves rather than throwing.
  assert.equal(await lock.acquire(), false);
  assert.equal(lock.held, false);
  await lock.release();
  assert.equal(lock.state, WAKE_LOCK_STATES.UNSUPPORTED);
});

test("acquiring asks for a SCREEN lock and reports holding it", async () => {
  const api = fakeWakeLock();
  const lock = createScreenWakeLock({ wakeLock: api, documentRef: fakeDocument() });

  assert.equal(await lock.acquire(), true);
  assert.equal(api.calls, 1);
  assert.equal(api.lastType, "screen", "a system wake lock would not keep the screen lit");
  assert.equal(lock.held, true);
});

test("a REFUSED lock is reported as failed, not as unsupported", async () => {
  // The two are different bugs and point at different fixes: unsupported is a
  // platform fact, refused is a policy or state problem on this device. This
  // is the same distinction as zoneNotExtracted vs colourNotMeasurable.
  const logged = [];
  const api = fakeWakeLock({ reject: new Error("battery saver") });
  const lock = createScreenWakeLock({
    wakeLock: api, documentRef: fakeDocument(), log: (...a) => logged.push(a.join(" ")),
  });

  assert.equal(await lock.acquire(), false);
  assert.equal(lock.supported, true, "the API exists; this device refused");
  assert.equal(lock.state, WAKE_LOCK_STATES.FAILED);
  assert.equal(lock.held, false);
  assert.match(logged.join("\n"), /battery saver/, "a refusal must not be swallowed");
});

test("the lock is re-acquired when the tab becomes visible again", async () => {
  // The platform drops a screen lock whenever the document stops being visible
  // and does NOT restore it. Requesting once at the start of capture therefore
  // holds nothing after the first notification glance.
  const api = fakeWakeLock();
  const doc = fakeDocument();
  const lock = createScreenWakeLock({ wakeLock: api, documentRef: doc });

  await lock.acquire();
  assert.equal(api.calls, 1);

  // The platform drops it while hidden.
  api.sentinels[0].released = true;
  doc.visibilityState = "hidden";
  await doc.fire("visibilitychange");
  assert.equal(api.calls, 1, "must not request a lock while hidden");

  doc.visibilityState = "visible";
  await doc.fire("visibilitychange");
  assert.equal(api.calls, 2, "the lock was not restored on return");
  assert.equal(lock.held, true);
});

test("releasing stops the visibility handler re-taking the lock", async () => {
  // Otherwise a capture that has already finished keeps grabbing the screen
  // every time the user switches back to the tab.
  const api = fakeWakeLock();
  const doc = fakeDocument();
  const lock = createScreenWakeLock({ wakeLock: api, documentRef: doc });

  await lock.acquire();
  await lock.release();
  assert.equal(api.sentinels[0].released, true);
  assert.equal(lock.held, false);

  await doc.fire("visibilitychange");
  assert.equal(api.calls, 1, "a released lock was re-acquired by the visibility handler");
  assert.deepEqual(doc.handlers.visibilitychange, [], "the listener outlived the capture");
});

test("release is idempotent, because teardown is reached from four paths", async () => {
  // releaseCapture() runs from the burst completing, the loop error handler, a
  // re-entrant runCapture() and withdrawal. A throw from the second call would
  // strand the camera it was called to shut down.
  const api = fakeWakeLock();
  const lock = createScreenWakeLock({ wakeLock: api, documentRef: fakeDocument() });

  await lock.acquire();
  await lock.release();
  await lock.release();
  await lock.release();
  assert.equal(lock.state, WAKE_LOCK_STATES.RELEASED);
});

test("a lock dropped by the platform stops being reported as held", async () => {
  const api = fakeWakeLock();
  const lock = createScreenWakeLock({ wakeLock: api, documentRef: fakeDocument() });

  await lock.acquire();
  assert.equal(lock.held, true);

  for (const fn of api.sentinels[0].listeners.release || []) fn();
  assert.equal(lock.held, false, "reporting a lock we no longer hold is worse than not having one");
});
