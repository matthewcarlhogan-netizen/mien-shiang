/*
 * Screen wake lock for the hold-still capture.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * There is no shutter. The reading is taken when the frame is good, which
 * means the user holds a pose for GATES_GREEN_MS and then through a burst,
 * touching nothing. Touching nothing is exactly what the OS idle timer waits
 * for, so the screen dims — and on most phones dims to black — in the middle
 * of the one interaction the app is built around.
 *
 * ── WHY IT IS A MEASUREMENT CONCERN AND NOT A COMFORT ONE ──────────────────
 * The screen is a light source pointed at the face. That is not incidental:
 * it is the whole premise of the optional screen-light check in
 * illumination.js. So a screen that dims part-way through a burst changes the
 * illuminant between frames of a single reading, and every value downstream is
 * a CIELAB difference. `reduceBurst()` would see it as frame jitter and
 * degrade confidence, which is the honest response to a corrupted burst, but
 * the better answer is for the illuminant not to move.
 *
 * ── WHY EVERY BROWSER OBJECT IS AN ARGUMENT ────────────────────────────────
 * Same reason as `createLandmarkerWithFallback()` (CLAUDE.md item 14) and
 * `openCamera()`: the paths that matter are the ones a developer machine never
 * takes — the browser with no `navigator.wakeLock` at all, and the browser
 * that REJECTS the request. A fallback nothing can execute is a fallback
 * nobody has run, and this file is only reachable from `ui/qise/app.js`, which
 * no test can import.
 *
 * Nothing here is a precondition. A capture must run identically where the API
 * is missing; the lock is an improvement, never a gate.
 */

/** What `state` can be. `unsupported` and `failed` are NOT the same thing. */
export const WAKE_LOCK_STATES = Object.freeze({
  IDLE: "idle",
  HELD: "held",
  RELEASED: "released",
  UNSUPPORTED: "unsupported",
  FAILED: "failed",
});

/**
 * A screen wake lock that survives the tab going away and coming back.
 *
 * ── WHY visibilitychange IS NOT OPTIONAL ───────────────────────────────────
 * The platform drops a screen wake lock whenever the document stops being
 * visible, and it does NOT restore it on return. An app that requests once at
 * the start of capture therefore holds a lock that is silently gone the first
 * time the user glances at a notification — and the retry path is the one that
 * would never be exercised in testing, because nobody backgrounds the tab
 * while checking that the feature works.
 *
 * @param {{wakeLock?:Object, documentRef?:Object, log?:Function}} deps
 */
export function createScreenWakeLock({ wakeLock, documentRef, log = console.warn } = {}) {
  const supported = Boolean(wakeLock && typeof wakeLock.request === "function");

  let state = supported ? WAKE_LOCK_STATES.IDLE : WAKE_LOCK_STATES.UNSUPPORTED;
  let sentinel = null;
  // Distinct from `state`. `state` is what we HAVE; `wanted` is what we asked
  // for, and it is what tells the visibility handler whether a re-acquire is a
  // restoration or an unwanted grab after the capture already finished.
  let wanted = false;
  let listening = false;

  const onVisibility = () => {
    if (!wanted) return;
    if (documentRef && documentRef.visibilityState !== "visible") return;
    if (sentinel && sentinel.released === false) return;
    // Re-acquire, and do not let a rejection here escape into a visibility
    // handler where nothing can catch it.
    request().catch(() => {});
  };

  function listen() {
    if (listening || !documentRef || typeof documentRef.addEventListener !== "function") return;
    documentRef.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }

  function unlisten() {
    if (!listening) return;
    if (documentRef && typeof documentRef.removeEventListener === "function") {
      documentRef.removeEventListener("visibilitychange", onVisibility);
    }
    listening = false;
  }

  async function request() {
    if (!supported) return false;
    try {
      sentinel = await wakeLock.request("screen");
      state = WAKE_LOCK_STATES.HELD;
      // The platform can drop the lock without being asked. Record that rather
      // than continuing to report a lock we no longer hold.
      if (sentinel && typeof sentinel.addEventListener === "function") {
        sentinel.addEventListener("release", () => {
          if (state === WAKE_LOCK_STATES.HELD) state = WAKE_LOCK_STATES.RELEASED;
        });
      }
      return true;
    } catch (error) {
      // Not swallowed (CLAUDE.md verification protocol item 6). A wake lock is
      // refused for ordinary reasons — a backgrounded tab, a battery-saver
      // policy — and silence here would make a capture taken under a dimming
      // screen indistinguishable from one taken under a steady one.
      sentinel = null;
      state = WAKE_LOCK_STATES.FAILED;
      log("qise/wakelock: screen wake lock refused:", error && error.message ? error.message : error);
      return false;
    }
  }

  return {
    get supported() { return supported; },
    get state() { return state; },
    /** True only while a sentinel is genuinely held. */
    get held() { return state === WAKE_LOCK_STATES.HELD; },

    async acquire() {
      wanted = true;
      listen();
      return request();
    },

    /**
     * Give the screen back to the idle timer.
     *
     * Idempotent, and safe to call from a teardown path that may run twice —
     * `releaseCapture()` is reached from the burst completing, from the loop
     * error handler and from a re-entrant `runCapture()`, and a throw from any
     * of those would strand the camera it was called to shut down.
     */
    async release() {
      wanted = false;
      unlisten();
      const current = sentinel;
      sentinel = null;
      if (state === WAKE_LOCK_STATES.HELD) state = WAKE_LOCK_STATES.RELEASED;
      if (!current || typeof current.release !== "function") return false;
      try {
        await current.release();
        return true;
      } catch (error) {
        log("qise/wakelock: release failed:", error && error.message ? error.message : error);
        return false;
      }
    },
  };
}
