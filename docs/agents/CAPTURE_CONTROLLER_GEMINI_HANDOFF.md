# Capture-controller / beta-halo parity — verification record and handoff

**Branch:** `claude/capture-controller-rebuild-hw1pdf`

This replaces the pasted "Phase 2: Capture Controller Rebuild" plan for this branch. Per
`CLAUDE.md`'s cost-control policy and `docs/AI_CONTEXT_BUDGET.md`, Claude's job on a plan this
detailed is to verify it against current `main` first — implementation from an approved, verified
specification is otherwise Gemini 2.5 Flash's job. The plan turned out not to be verified: several
of its P0/P1 claims were accurate, but several of its proposed fixes contradicted code that already
existed and already did the job differently, on purpose. Executing the plan as written would have
reverted deliberate design decisions and reintroduced duplication it claimed to remove.

**Update:** after writing the verification below, the user asked for the corrected, narrow items to
be implemented directly rather than hand this document to a separate executor — the remaining scope
after correction turned out small enough (one ~15-line addition, one file rewrite) to verify
end-to-end in this session rather than round-trip it. Tasks 1, 2 and 4 below are marked with their
actual outcome. Task 3 was investigated and intentionally left undone — see its section. Everything
was checked against the real code, not assumed; several findings below only emerged by actually
running the affected code, not by reading it.

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
`exposureAssistState`. **Update, see Task 2:** of those four, only `requestCameraRefocus` turned
out to be a genuine functional gap once `app.js`'s actual call sites (not just its import list)
were compared against `beta.js`'s — the other three are already achieved differently or drive UI
beta doesn't have. Either way, **do not create `src/qise/autofocus.js` or
`src/qise/captureController.js`** — nothing found here needed a new module; it needed reading how
the existing one is actually used.

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

1. **Beta halo DOM "gap" — RETRACTED, see Task 1.** `src/beta/qise.html:28`'s
   `<div class="halo" id="exposure-halo"></div>` does have no `[data-halo-progress]` child, and
   `createExposureHalo()` does get `null` for it — that part of the original plan's observation was
   accurate. But `beta.js` never reads `[data-halo-progress]`/`[data-halo-value]` in the first
   place; it drives a full-screen flash overlay through the module's `onLevel` callback instead,
   which works identically with or without those elements. There is no rendering gap in beta — see
   Task 1 for the full evidence. Left in this list, struck through in effect, so nobody re-derives
   the same wrong conclusion from `exposure-halo.js` alone without also reading `beta.js`.
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
   and `app.js` already uses — partially confirmed, narrowed by Task 2.** The import gap itself is
   real, but only one of the four (`requestCameraRefocus`) turned out to be missing *functionality*;
   the other three (`negotiateCaptureMode`, `canNegotiateCaptureMode`, `exposureAssistState`) are
   equivalent-behaviour-via-a-different-composition or drive UI beta doesn't have. See Task 2 for
   the breakdown.

---

## TASK 1 — beta halo DOM parity — WITHDRAWN, the original P0 claim was wrong

**Status: no fix made. The premise was checked by reading `src/beta/beta.js`'s actual wiring, not
just `exposure-halo.js` in isolation, and it doesn't hold.**

`src/beta/beta.js:686-691` wires `createExposureHalo`'s `onLevel` callback to set
`--halo-screen-strength` on `#plate`, and `src/beta/beta.css:497-504` uses that variable to paint
`.halo` as a **plain full-bleed white overlay** — `background: rgba(255, 255, 255,
var(--halo-screen-strength, 0))`, explicitly commented as driven "from the halo LEVEL alone." That
`onLevel` callback fires regardless of whether `[data-halo-progress]`/`[data-halo-value]` exist —
`createExposureHalo()` guards both with `if (progress)`/`if (valueLabel)` before touching them.
Beta's whole design is a screen-as-light-source flash (matching CLAUDE.md item 52), never an SVG
progress ring; the ring is production's design, in a different file, styled by a different
selector. There is no drag/pointer interaction in `beta.js` either — light only turns on
automatically via `shouldUseScreenFlash()`, never by user gesture, so the "Slide up for light"
text path in `exposure-halo.js` is simply unused code in both apps (confirmed: no
`[data-halo-value]` element exists anywhere in the repo outside the module itself).

Copying production's `<svg>` ring markup into beta, as originally proposed, would have laid an
unused progress ring on top of a full-screen white flash overlay that was never meant to have one —
a plausible-sounding fix for a symptom (`[data-halo-progress]` is null) that isn't a defect in
beta's actual, different design. **Do not implement this task.** If beta's `data-state`
(`seeking`/`adjust`/`perfect`, set by `setCaptureState()`) turning into a no-op in `beta.css` — it
has zero matching CSS rules today — is itself something worth a visible treatment, that is a new
product/UX question, not a bug fix, and belongs to the product owner.

## TASK 2 — wire `beta.js` to missing capture functions — DONE, narrowed after deeper verification

**Status: implemented.** Reading `app.js`'s actual call sites (not just its import list) showed
that only one of the original four "missing" functions is a real gap:

- `negotiateCaptureMode` / `canNegotiateCaptureMode` — **not a gap.** `beta.js` already achieves
  the same one-shot exposure-negotiation semantics via `settleAndNegotiate(opened.track)`, gated on
  `!negotiationStarted && gates.pass` (`src/beta/beta.js:423-435`) — the same guard shape as
  `app.js`'s `modeNegotiationStarted` flag around `canNegotiateCaptureMode`/`negotiateCaptureMode`
  (`src/ui/qise/app.js:488-505`). Different composition, same behaviour. Left untouched.
- `exposureAssistState` — **not a confirmed gap.** It drives production-only manual UI
  (`#screen-light`, `#refocus-camera`, `#use-current-light` buttons) that don't exist in beta's
  markup. Beta already has its own, simpler automatic mechanism
  (`shouldUseScreenFlash()` + `exposureHalo.setLevel(1)`, `src/beta/beta.js:406-415`) with no manual
  offer/dismiss UI at all. Whether beta *should* grow the richer manual UI is a product decision,
  not a defect — left untouched.
- `requestCameraRefocus` — **the one real, confirmed gap.** `beta.js` already computes
  `opened.focusSupported` (`src/beta/beta.js:287`, via `ensureContinuousFocus`) but never used it —
  there was no equivalent of `app.js`'s 700ms soft-focus-loss refocus trigger
  (`src/ui/qise/app.js:474-481`) anywhere in beta's loop.

Implemented: added `requestCameraRefocus` to the `../qise/camera.js` import, added `softSince` /
`refocusStarted` state (mirroring `underexposureStartMs`'s pattern already in the file), and added
the same 700ms-threshold trigger block right after `gates.failures` is computed, gated on
`gates.failures.some(f => f.id === "filter")` — the same gate id `app.js` checks. `npm test` still
1344/1344 after the change; no gate threshold or shared `camera.js` function was touched.

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

## TASK 4 — real E2E assertions — DONE, and this is where the actual bug was

**Status: implemented and verified, by actually running the suite, not just reading it.**

The e2e test gap was worse than the original plan described. `e2e/beta-camera-integration.spec.js`
used `test.use({ launchArgs: [...] })` — **`launchArgs` is not a real Playwright Test option** (the
real one is `launchOptions.args`). It was silently ignored on every run, so Chromium launched with
**no fake camera device at all**. Verified directly, with the file as it stood on `main`:
`getUserMedia` failed `NotFoundError: Requested device not found`, `#preview`'s `srcObject` stayed
`false`, and the gate line read *"No front camera was found."* — on every one of the four "camera
integration" tests, on every run, presumably since the file was added. All four tests still
"passed" only because none of them asserted on that failure — exactly the false-green class of
defect `CLAUDE.md`'s verification protocol (§2) warns about.

The file was also missing `--use-fake-device-for-media-stream` — required alongside
`--use-file-for-fake-video-capture`, which does nothing without it (confirmed by testing the two
flags independently).

Fixed both flags and rewrote all four tests with real assertions, verified to actually pass against
a genuinely-attached synthetic stream (`srcObject: true`, `videoWidth/Height: 320x240`, MediaPipe's
"Created TensorFlow Lite XNNPACK delegate" log present, meaning inference is actually running) and
to actually fail against the old broken code (reproduced both states directly before writing the
final assertions — the negative and positive control CLAUDE.md's verification protocol §3
requires).

**What the fixture still cannot prove, honestly stated in the file's own header comment:**
`tests/fixtures/synthetic-face.y4m` is a procedurally-drawn skin-toned ellipse with texture noise,
not real facial geometry — MediaPipe's FaceLandmarker never finds a 478-point mesh in it, so the
gate line settles on "Bring your face into the frame." and stays there; a real burst/reading was
never achievable with this fixture and no assertion claims otherwise.

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

- [x] `npm test` passes, count quoted verbatim: `tests 1344 / pass 1344 / fail 0`, re-run after
      each of Task 2 and Task 4 (both source-affecting), no test deleted or skipped.
- [ ] `npm run lint:bundle` — run against `dist/`, not yet executed as part of this pass; run
      before merge.
- [x] Task 1 (halo DOM): investigated and withdrawn — no DOM/CSS change made, see its section.
- [x] Task 2 (beta.js parity): `requestCameraRefocus` wired in, matching `app.js`'s 700ms
      soft-focus trigger. `negotiateCaptureMode`/`canNegotiateCaptureMode`/`exposureAssistState`
      confirmed not to be gaps and left untouched.
- [ ] Task 3 (frame-duplication guard): **not attempted.** No diagnostic was run — this sandbox has
      no real 120Hz display to reproduce the claimed condition on, and inventing a fix for an
      unconfirmed condition is exactly what this repo's engineering culture (CLAUDE.md, items 30
      and 43) warns against. Left for whoever has real device access to run the diagnostic in this
      task's original section first.
- [x] Task 4 (e2e assertions): implemented; all four rewritten tests pass, verified against both
      the broken and fixed flag configuration (positive and negative control).
- [x] Explicit statement of which blockers (1-5) still stand: all five still stand. Nothing
      implemented touches a gate threshold, adds a new module, changes the halo's semantics, or
      touches `illumination.js`.
- [x] Playwright's browser project in this sandbox lacks the `chromium_headless_shell` binary
      Playwright 1.49's default project expects (`/opt/pw-browsers/chromium` is the full browser,
      not the headless-shell variant) — all e2e verification above used a temporary,
      **uncommitted** local config override (`executablePath` pointed at the full browser) that was
      removed before every commit. This is a sandbox tooling gap, not a repo defect; CI's own
      "browser" check already runs this suite with its own Playwright install.
