# Capture-controller / beta-halo parity — Gemini 2.5 Flash execution handoff

**Branch:** `claude/capture-controller-rebuild-hw1pdf`

This replaces the pasted "Phase 2: Capture Controller Rebuild" plan for this branch. Per
`CLAUDE.md`'s cost-control policy and `docs/AI_CONTEXT_BUDGET.md`, Claude's job on a plan this
detailed is to verify it against current `main`, not to execute it — implementation from an
approved, verified specification is Gemini 2.5 Flash's job. The plan turned out not to be
verified: several of its P0/P1 claims are accurate, but several of its proposed fixes contradict
code that already exists and already does the job differently, on purpose. Executing the plan as
written would revert deliberate design decisions and reintroduce duplication it claims to remove.
Everything below is checked against the working tree at the tip of this branch (same as `main` —
`git status` is clean, no local commits ahead).

---

## STOP CONDITIONS — read first, before touching any file

### Blocker 1 — two of the plan's "improvements" are gate-threshold changes that `docs/DECISION_REGISTER.md` already flags as unresolved

`docs/DECISION_REGISTER.md` → "Unresolved proposals": *"Unimplemented scanner improvements,
including underexposure rejection and any threshold changes. Thresholds require recorded evidence
and must not be silently retuned."* `docs/scanner-development-report.md`'s conclusion lists
re-deriving the distance threshold and calibrating confidence as **outstanding release work**, not
authorised changes. The plan's §8 table proposes exactly these two changes:

- "focus: Laplacian var ≥ 8 → Scale-aware threshold" — `FILTER_MIN_LAPLACIAN_VARIANCE = 8` at
  `src/qise/gates.js:40` is confirmed static, but changing it is a threshold change with no
  recorded evidence behind the new formula.
- "distance: ≥ 0.22 frame width → Add upper bound (target band)" — `DISTANCE_MIN_FRACTION = 0.22`
  at `src/qise/gates.js:34` is confirmed floor-only (`OUTER_CANTHI = [33, 263]`,
  `src/qise/gates.js:61`), but adding a ceiling is a new threshold with no derivation behind it.

**Do not touch either constant, or add a distance ceiling, in this pass.** Both need a
product-owner decision with evidence, per the register, before any executor — Gemini or Claude —
implements them.

### Blocker 2 — the plan's burst size (15) contradicts the shipped, load-bearing constant (9)

`export const BURST_FRAMES = 9;` — `src/qise/camera.js:25`. Both `src/ui/qise/app.js` and
`src/beta/beta.js` import and use this same constant. `docs/scanner-development-report.md`
describes *"a stable hold followed by a robust nine-frame burst"* as an already-verified property
of the shipped scanner. The plan's captureController sketch, its "Controller API", and its e2e
test assertions all assume 15 frames throughout. **If any task below touches frame counts, it
must read `BURST_FRAMES` from `camera.js` — never hardcode 15, and never change the constant.**

### Blocker 3 — the halo is a deliberate screen-light control, not a measurement-progress ring

`src/ui/qise/exposure-halo.js:1-8` (a comment, not a stray remark):

> *Light is controlled by a clearly labelled button below the preview. The halo only reflects
> screen-light strength and validated hold progress; turning the whole camera image into an
> invisible slider made accidental changes easy and gave no useful clue for uneven side light.*

That is the resolution of a prior design mistake, stated in the code. `haloStateFromCapture()`
returns exactly three states — `seeking` / `adjust` / `perfect` — driven by `data-state` on
`#exposure-halo`, rendered as an SVG ellipse pair (`.halo-track` + `.halo-progress` with
`data-halo-progress`); see the real, shipped markup at `src/qise.html:415-424`. There is **no**
`[data-halo-value]` element anywhere in the repo outside `exposure-halo.js` itself — the numeric
readout the module supports is intentionally unused in production; the action-oriented text the
plan's §13 wants already exists as a separate element (`#capture-coach`, `src/qise.html`).

The plan's §3 and §13 propose a five-state cyan/yellow/green/red/empty ring with new CSS classes
(`.state-armed`, `.state-burst`, `.state-success`) and a second, separate "lighting indicator"
element. **That is a different product design from the one already shipped and reasoned about in
code**, not a bug fix. Task 1 below is DOM parity only — giving beta the same markup production
already has — not the redesign in plan §3/§13. A different halo/illumination visual design is a
product decision for the owner.

### Blocker 4 — "autofocus recovery" and the exposure state machine already exist; there is nothing for a new module to do

`src/qise/camera.js` already exports `ensureContinuousFocus`, `requestCameraRefocus` (the active
refocus trigger), `negotiateCaptureMode`, `canNegotiateCaptureMode`, `exposureAssistState`,
`releaseCaptureMode`, `settleAndNegotiate` — see CLAUDE.md items 50 and 53 for why these exist
(the `exposureMode: "manual"` freeze-at-t=0 bug and its fix) and what breaks if they are removed
or reimplemented. `src/ui/qise/app.js` imports and uses all of them
(`src/ui/qise/app.js:19-28`). `src/beta/beta.js` imports `openCamera`, `attachCameraPreview`,
`ensureContinuousFocus`, `settleAndNegotiate`, `releaseCaptureMode`, `releaseCapture`,
`createLandmarkerGuarded`, `GreenLatch`, `PolygonSmoother`, `BURST_FRAMES`, `trimmedMedianLab`,
`reduceBurst`, `describeCameraError` (`src/beta/beta.js:36-40`) — **but not**
`requestCameraRefocus`, `negotiateCaptureMode`, `canNegotiateCaptureMode`, or
`exposureAssistState`. That import gap — not a missing module — is the real defect. **Do not
create `src/qise/autofocus.js` or `src/qise/captureController.js`.**

### Blocker 5 — `src/qise/illumination.js` is not a lighting-readiness gate; it is a different, already-shipped feature

`src/qise/illumination.js` (`ILLUMINATION_VERSION = "screen-light-v1"`) implements the **opt-in
illumination-consistency experiment**: the screen briefly shows neutral/blue/green and the code
checks whether the camera sees the expected colour change (`illuminationSequence`,
`recordIlluminationSample`, `summarizeIllumination`). Its consent copy is explicit: *"It checks
only whether the camera sees an expected change; it never identifies you, never blocks the reading
and stores no response data."* This is unrelated to "is there enough light, please add light" —
that concern is already split across `exposureAssistState`/`negotiateCaptureMode` (camera-level)
and the halo's screen-light slider (`exposure-halo.js`, user-level).

The plan's §7 wants a fourth lighting concept — `createLightingAssessment()` with
`pending`/`available`/`assisted`/`unavailable` states — bolted onto this file. Building it would
add a **fourth** overlapping lighting concept where three already exist and are already separated
on purpose, which is the opposite of the plan's own stated goal of removing duplication.
**Do not add a lighting-assessment state machine to `illumination.js` or anywhere else in this
pass.**

---

## Verified findings that ARE accurate and safe to act on

1. **Beta halo DOM gap — confirmed.** `src/beta/qise.html:28`'s
   `<div class="halo" id="exposure-halo"></div>` has no `[data-halo-progress]` child.
   `createExposureHalo()` (`src/ui/qise/exposure-halo.js:34-35`) does
   `root.querySelector("[data-halo-progress]")` and `[data-halo-value]`, gets `null` for both, and
   degrades silently — no error, the ring simply never renders. Confirmed against the real
   production markup, which has the child elements (`src/qise.html:415-424`).
2. **E2E test gap — confirmed.** All four tests in `e2e/beta-camera-integration.spec.js` avoid
   asserting success by design: *"Don't assert on errors; synthetic camera setup might have
   expected warnings"* (line 93), *"may not reach a successful reading depending on synthetic
   video quality, but the test verifies the pipeline completes without crashing"* (lines 100-101),
   soft `console.log`s of gate/ring content with no `expect(...)` on their values.
3. **Neither `app.js` nor `beta.js` deduplicates repeated video frames** — confirmed, but this is
   a **shared** property of both entry points, not a beta-only defect as the plan states. Both run
   the same loop shape: `scheduleStep = () => requestAnimationFrame((time) => step(time)...)`,
   `step` calls `landmarker.detectForVideo(video, nowMs)` on every rAF tick with no
   `mediaTime`/`currentTime` distinctness check (`src/ui/qise/app.js:375-402`,
   `src/beta/beta.js:346-371`, nearly identical). **No test or doc in this repo currently
   demonstrates that this actually degrades a real burst** — it is a plausible risk on a 120 Hz
   display, not a confirmed, measured defect the way the items in CLAUDE.md's "will silently
   break" list are. See Task 3.
4. **`beta.js` is missing four of the eight capture-quality functions `camera.js` already exports
   and `app.js` already uses** — confirmed (Blocker 4). This is real, narrow, mechanical work.

---

## TASK 1 — beta halo DOM parity (mechanical, low risk, no product decision needed)

**Permitted files:** `src/beta/qise.html`, `src/beta/beta.css`.

1. Open `src/qise.html`, find the `id="exposure-halo"` block (around line 415) and copy its
   internal structure — the `<svg>` with `.halo-track` and `.halo-progress[data-halo-progress]`
   ellipses — into `src/beta/qise.html` in place of the current empty
   `<div class="halo" id="exposure-halo"></div>` (around line 28). Keep beta's existing `id` and
   outer class (`halo`) so `src/beta/beta.css:497 .halo { ... }` still applies; do not rename
   selectors.
2. Add `data-state="seeking" data-dragging="false"` to the halo root, matching production. Do
   **not** invent new state values — the only three that exist are `seeking` / `adjust` /
   `perfect` (`haloStateFromCapture()`, `src/ui/qise/exposure-halo.js:25-30`).
3. Grep `src/beta/beta.css` for `halo-track` / `halo-progress` before adding any CSS — if rules
   for those classes don't exist yet, port them from production's stylesheet (find via
   `grep -rn "halo-track\|halo-progress" src/`) rather than writing new ones from scratch.
4. Do **not** add a `[data-halo-value]` element — production doesn't use one either; the readout
   text already has its own element (`#capture-coach` in production; check what beta's equivalent
   is, likely `#gate-line` or `#voice`, and leave it as-is).

**Verify:** after the change, `document.querySelector('#exposure-halo [data-halo-progress]')`
must be non-null in `src/beta/qise.html`, and `dist/beta/qise.html` after `npm run build`.

## TASK 2 — wire `beta.js` to the four capture functions it doesn't call yet

**Permitted files:** `src/beta/beta.js` only.

Add `requestCameraRefocus`, `negotiateCaptureMode`, `canNegotiateCaptureMode`,
`exposureAssistState` to the existing `from "../qise/camera.js"` import at `src/beta/beta.js:37`.
Before writing any call site, read how `src/ui/qise/app.js` uses each of these four functions
(search for each name in `app.js`) and mirror the call sites and state transitions — same
arguments, same order relative to `settleAndNegotiate`/`ensureContinuousFocus`, same handling of
their return values. This is a parity change: beta should end up doing what production already
does, not a new design. Do not add new parameters or new thresholds to any of the four functions
themselves — they are shared, tested code (`tests/qise/camera.test.js` may already cover some of
this; do not weaken any existing assertion there).

## TASK 3 — CONDITIONAL: distinct-frame guard, only if evidence shows it matters here

**This task requires a diagnostic step before any fix is written**, per this repo's own
verification protocol (CLAUDE.md, "No unverified success claims" / "test the artifact you ship").
The duplicate-frame risk is architecturally plausible but not demonstrated in this codebase.

1. First, write a diagnostic (Playwright, using the existing
   `tests/fixtures/synthetic-face.y4m` fixture and `e2e/beta-camera-integration.spec.js`'s launch
   flags) that counts how many times `detectForVideo` is actually invoked per distinct
   `video.currentTime` value during a real capture run in Chromium. Report the actual duplicate
   rate.
2. If the duplicate rate is negligible in this environment (e.g., the synthetic feed or headless
   Chromium's rAF/video timing doesn't reproduce the 120 Hz-display scenario), **stop here and
   report that back** rather than fixing a problem that isn't reproducible — do not guess at a fix
   for an unconfirmed condition.
3. If it is reproducible and non-trivial, add ONE new exported pure helper to
   `src/qise/camera.js` (beside `attachCameraPreview` et al. — do **not** create a new
   `captureController.js` file; this class of function already lives in `camera.js`) that both
   `app.js` and `beta.js` call identically inside their existing `step`/`scheduleStep` functions.
   Take `video` and any timer/RVFC functions as arguments, following the existing pattern in this
   file (`attachCameraPreview` takes the video, stream and timers as arguments — same reason: so a
   test can drive it without a real browser).
4. Requirements if a fix is written: `BURST_FRAMES` stays 9; no gate threshold changes; the
   `previous`/`drift` motion-tracking arrays in both files must keep measuring the same physical
   quantity, just less often. Run `node scripts/engine-bench.mjs out-before.txt`, apply the change,
   run `node scripts/engine-bench.mjs out-after.txt`, and diff them — an empty diff is required
   before this task can be called done, per CLAUDE.md's bit-exactness rule for anything upstream
   of a measurement. Add a unit test in `tests/qise/camera.test.js` proving the new helper accepts
   a genuinely new frame and rejects a repeated one.

## TASK 4 — real E2E assertions, scoped to what the fixture can prove

**Permitted files:** `e2e/beta-camera-integration.spec.js` only.

Replace the soft/no-op assertions with real ones, but only assert what
`tests/fixtures/synthetic-face.y4m` can actually be shown to produce — check
`scripts/generate-synthetic-face-video.mjs` first to know what the fixture contains before writing
an assertion against it.

- After Task 1 lands: assert `page.locator('[data-halo-progress]')` exists — this alone pins the
  P0 DOM defect shut.
- Assert the `#gate-line` text content actually changes at least once during the wait window
  (proves gates are live) — do not assert a specific pass/fail outcome unless you've confirmed by
  running it that the fixture reliably produces that outcome.
- Do not add an assertion that the full burst completes and reading-surfaces become visible unless
  you first run the test and confirm the synthetic fixture reliably clears all ten gates. A
  flaky assertion is worse than the current honest gap.

---

## FORBIDDEN IN ALL TASKS

- Changing `FILTER_MIN_LAPLACIAN_VARIANCE`, `DISTANCE_MIN_FRACTION`, `EXPOSURE_MAX_FRACTION`,
  `BURST_FRAMES`, or any other constant in `src/qise/gates.js` or `src/qise/camera.js`.
- Creating `src/qise/captureController.js` or `src/qise/autofocus.js`.
- Adding a lighting-readiness state machine to `src/qise/illumination.js` or anywhere else.
- Redesigning the halo's state model or CSS state classes beyond copying production's existing
  markup verbatim.
- Touching `src/engine.js`, `src/utils/textureAnalyzer.js`, or `src/utils/calibrationEngine.js`.
- Weakening, skipping, or deleting any existing assertion in `tests/qise/camera.test.js`,
  `tests/qise/gates.test.js` (or wherever gate/camera tests currently live).
- Marking the resulting PR ready for review, merging it, or approving it.

## Definition of done

- [ ] `npm test` passes, count quoted verbatim (currently 1344 across 76 files — re-verify by
      running it, don't trust that number without running it), no test deleted or skipped.
- [ ] `npm run lint:bundle` passes.
- [ ] `[data-halo-progress]` present in `dist/beta/qise.html` after `npm run build`.
- [ ] E2E suite run and its output quoted per test (pass/fail), not just "it ran".
- [ ] If Task 3 was attempted: the diagnostic's actual duplicate-frame count is quoted, and either
      the engine-bench fingerprint diff is quoted as empty, or the task was stopped and reported
      per step 2.
- [ ] Explicit statement of which blockers (1-5) still stand — all five should still stand after
      Tasks 1/2/4, since none of them touch a blocked area. Task 3 is the only one with a
      conditional path.
