# Audit: `AutoRingFlash.kt` (native Android CameraX ring-flash + screen-flash burst)

Status: **proposal, unreviewed, not wired into any build.** Nothing under
`docs/proposals/android-native-camera/` ships. See
`docs/DECISION_REGISTER.md` → `DR-2026-09-07-DUAL-STORE-DISTRIBUTION-GOAL`
for why this file exists at all despite the repository being a plain-JS PWA
today, and → "Unresolved proposals" for the open architecture question it is
one candidate answer to.

## 0. Environment declaration

This sandbox has no Android SDK, no Kotlin/Gradle toolchain and no device or
emulator. Everything below is a manual, line-by-line static review against
the CameraX 1.4.0 API surface as documented in training knowledge, **not** a
compiled or run verification. Anything that would normally be confirmed by
`./gradlew compileDebugKotlin` or a device run is called out as such rather
than asserted as fact, per this repository's own Verification Protocol
(`CLAUDE.md` §0–§1). Do not read "compile error" below as "confirmed by a
compiler" — read it as "this specific line will not resolve against the
imports present, on inspection."

## 1. Why this is a proposal and not an addition to the shipped scanner

Two things established elsewhere in this repository, unchanged by this
proposal existing:

- `docs/DECISION_REGISTER.md` → "Established and implemented": *"Scanner-first,
  on-device PWA; current application code is plain JavaScript."* The shipped
  face scanner (`src/qise/`, `src/ui/qise/`) is entirely browser-based —
  `getUserMedia`, MediaPipe Tasks Vision, and the camera/capture/gate logic in
  `src/qise/camera.js`, `src/qise/capture-runtime.js`, `src/qise/gates.js`,
  `src/qise/wakelock.js`. This Kotlin file does not call into, extend, or
  replace any of that; it is a second, disconnected capture pipeline with its
  own state machine, gates, and illumination model.
- `docs/DECISION_REGISTER.md` → "Approved direction": *"Scanner-first Android
  TWA route and GitHub-hosted HTTPS deployment."* The only approved Android
  packaging plan (`docs/ANDROID_SHIP_ROADMAP.md`) is Bubblewrap wrapping the
  existing `dist/` PWA in a Trusted Web Activity — no native camera code, no
  Gradle module, no `android/` directory. None currently exists in this repo.

`DR-2026-09-07-DUAL-STORE-DISTRIBUTION-GOAL` (added alongside this audit)
changes *why a native module might eventually be justified* — Apple App
Review requires a native iOS target that a TWA-style wrapper cannot satisfy,
which makes "native capture shell, at least on the platform(s) that need one"
a live question for the first time. It does **not** retroactively approve
this specific file, decide how much of the capture/measurement pipeline
should move to native code, or decide a cross-platform framework. Per
`AGENTS.md`, new ideas are proposals until the product owner approves them —
hence this file living under `docs/proposals/`, not `android/`.

## 2. Where this design conflicts with invariants the shipped scanner already earned

The web scanner's screen-as-light-source handling (CLAUDE.md items 50–58,
and `docs/DECISION_REGISTER.md` → `DR-2026-09-06-SCANNER-CAPTURE-CORRECTION`)
is the product of real, previously-shipped bugs on physical hardware, not
first-principles design. `AutoRingFlashController` re-derives a materially
similar feature (screen brightness as supplemental face light, plus a
screen-flash burst) from scratch, and does not inherit the fixes:

- **A screen cannot be the illuminant it is helping you find your face in**
  (CLAUDE.md item 56; principle 3 of `DR-2026-09-06-SCANNER-CAPTURE-
  CORRECTION`). The JS side's `ScreenAssistGuard.gatesPassForHold()`
  (`src/qise/capture-runtime.js`) makes it structurally impossible for a
  capture hold to accumulate while the screen assist is active, and every
  on/off transition resets the hold and releases any exposure lock taken
  under the wrong light. `AutoRingFlashController` has no equivalent for its
  general case: the ring can stay engaged and its closed loop can keep
  adjusting screen brightness for the **entire duration** of an ordinary
  `takePicture()` call (not just the dedicated screen-flash burst window),
  because `step()` never checks whether a capture is in flight. A still photo
  can be taken while the very light illuminating the face is actively moving
  under it — the same class of defect the JS side already found and fixed
  once, reintroduced by not reusing the fix.
- **Arm on darkness alone; release on darkness clearing, not on a full gate
  pass** (CLAUDE.md item 58). `shouldUseScreenFlash`-equivalent logic here is
  `burstRecommended()` (fine, single condition), but the *ring's* own
  engage/disengage hysteresis is luma-only — reasonable — while nothing
  prevents the ring's brightness contribution from being counted as part of
  "the scene got brighter," i.e. the loop can partially self-justify staying
  on. This is a softer version of the same closed-loop-on-its-own-output risk
  the JS side had to reason through explicitly; nothing here shows that
  reasoning happened.
- **Motion/stillness gate, burst-of-N median, wake lock, gate-dependency
  status model** (CLAUDE.md items 42, 46, 52, 54). None of these have an
  analogue in this file. That may be fine if the intended product is a "ring
  light while framing" feature rather than a repeat of the Qi Se measurement
  gate stack — but if a native rewrite is meant to reach parity with the
  shipped scanner's actual measurement quality, each of these is a specific,
  previously-earned fix that will need re-deriving, one physical-device bug
  at a time, exactly as it was the first time.

None of this means the approach is wrong — a ring light for framing/preview
purposes is a materially different feature from the Qi Se measurement capture
and may not need all of the above. It means the file does not state which of
these it intends to be, and an unstated scope here is exactly the gap
`docs/DECISION_REGISTER.md`'s new "Unresolved proposals" entry names.

## 3. Concrete issues found in the file itself

Ordered roughly by severity. None of these were compiled or run; see §0.

1. **Missing import — will not resolve.** `ScreenBrightnessController(private
   val window: Window)` uses `android.view.Window`, but the import block only
   has `android.view.Gravity` and `android.view.WindowManager`. `import
   android.view.Window` is absent.
2. **Gradle setup block is incomplete for what the file actually imports.**
   The header's dependency list has `camera-core`, `camera-camera2`,
   `camera-lifecycle`, `camera-view`, and `lifecycle-runtime-ktx`, but the
   file also imports `androidx.appcompat.app.AppCompatActivity`
   (`androidx.appcompat:appcompat`) and `androidx.core.view.ViewCompat` /
   `WindowCompat` / `WindowInsetsCompat` / `updatePadding`
   (`androidx.core:core-ktx`). Following the SETUP comment verbatim produces
   a build that cannot resolve `AppCompatActivity` or the `androidx.core.*`
   extension functions.
3. **The control loop is not suspended across the Activity lifecycle, only
   cancelled at destroy.** `AutoRingFlashController` overrides `onPause` and
   `onDestroy` but not `onStop`; only `onDestroy` cancels `loop`. `onPause`'s
   `release()` resets `engaged`/overlay/brightness state, but the coroutine
   itself keeps ticking every `periodMs` indefinitely while backgrounded,
   including through a full stop/resume cycle. CameraX unbinds its use cases
   at `ON_STOP`, so once that happens the loop is inert (stale
   `smoothLuma`), but in the window between `ON_PAUSE` and `ON_STOP` — where
   frames can still be arriving — `UserMode.AUTO` can re-engage the ring
   (screen brightness change) on a backgrounded activity. Even once fully
   stopped, an un-cancelled 5-Hz coroutine that runs until the Activity is
   destroyed is unnecessary battery/CPU cost for a "stress-hardened" claim.
4. **`step()` never checks `burstInFlight`.** The closed-loop brightness
   controller keeps adapting `level` and calling `brightness.apply(level)`
   every `periodMs` regardless of whether a screen-flash burst is currently
   forcing brightness to `1f` via `cameraXScreenFlash().apply()`. Because the
   `ImageAnalysis` stream keeps delivering frames during the flash (it is a
   separate, concurrently-bound use case from `ImageCapture`), the sudden
   spike in measured luma from the flash itself can drive `level` sharply
   down mid-exposure, and the next `step()` tick (up to `periodMs` = 200 ms
   after the flash starts, well inside the flash's own fixed 150 ms hold) can
   call `brightness.apply()` with a *lower* target than `1f`, undermining the
   very screen-flash the burst is trying to produce. This is the same class
   of bug §2 describes at the architecture level, concretely located.
5. **`expirationTimeMillis` is silently ignored.**
   `ImageCapture.ScreenFlash.apply(expirationTimeMillis, listener)` receives
   a deadline from CameraX by which the screen-flash UI change must be
   visible; this implementation always waits a fixed `delay(150)` and never
   compares it against `expirationTimeMillis`. On a device where 150 ms is
   too slow (e.g. a busy main thread delaying the overlay's actual repaint),
   there is no fallback; on a device where the deadline is much shorter, the
   fixed delay may needlessly outlast it.
6. **The camera-warmup guard (`readyAt`) is one-shot, not per-bind.**
   `noteCameraBound()` is only called from `bindCamera()`'s listener, which
   only runs once, from `onCreate`. After any stop/start (background/
   foreground) cycle, CameraX automatically re-binds and the sensor's
   auto-exposure re-converges from scratch (same physical behaviour
   `EXPOSURE_WARMUP_MS` exists for in `src/qise/camera.js`), but `readyAt` is
   not refreshed, so the "ignore engage/disengage decisions on dark pre-AE
   frames" protection this field exists for only actually applies to the very
   first bind of the Activity's lifetime.
7. **`holeStop`/`featherStop` are unvalidated, non-invalidating public
   vars.** Nothing stops a caller from setting `holeStop >= featherStop`, and
   `RadialGradient`'s `positions` array (`floatArrayOf(0f, holeStop,
   featherStop, 1f)`) must be strictly increasing or the constructor throws —
   this is a real crash path for external configuration, not merely a visual
   glitch. Separately, unlike `intensity`/`tintColor`, these two properties
   have no custom setter, so changing either alone does not call
   `invalidate()`; the new geometry only appears once some other property
   forces a redraw.
8. **`pendingDisengage` has no timeout.** It is only ever cleared inside
   `cameraXScreenFlash().clear()`. If CameraX fails to invoke `clear()` after
   a screen-flash capture (an error path, an unexpected teardown, an OEM
   quirk), `disengage()` is permanently stuck deferring: the ring, the
   elevated screen brightness, and (implicitly, via `FLAG_KEEP_SCREEN_ON`)
   the awake screen never release. No watchdog exists.
9. **The debug HUD ships visible by default.** `DEBUG_HUD = true` renders
   live `luma`/`warmth`/`level` telemetry over the camera preview
   unconditionally. `DR-2026-09-06-SCANNER-CAPTURE-CORRECTION`'s
   implementation note for the *shipped* scanner explicitly records the
   opposite decision for the same class of readout: "hidden-by-default debug
   output — a consumer mid-capture no longer sees `L*`/`WB`/`HALO` readouts."
   If this file is meant to inform a real native build, this constant needs
   to flip before anything resembling a release candidate.

## 4. What this audit does not attempt

It does not attempt to verify the CameraX 1.4.0 `ImageCapture.ScreenFlash` /
`FLASH_MODE_SCREEN` API shapes against current live documentation — no web
fetch was performed for this review, and the surface used here is consistent
with training-era knowledge of the API but is called out as **not
independently re-verified** rather than confirmed. It does not attempt to
design the native-shell architecture question raised in
`docs/DECISION_REGISTER.md`; that is a product/architecture decision, not an
audit finding.

## 5. Definition of done for this audit

```
[x] Host OS/shell stated (Linux sandbox; no Android toolchain available)
[ ] Compiled — NOT VERIFIED, no Gradle/Kotlin toolchain in this environment
[ ] Run on device/emulator — NOT VERIFIED, none available
[x] Cross-checked against the shipped JS capture pipeline it duplicates
[x] Findings are itemised with file-relative reasoning, not a blanket verdict
```
