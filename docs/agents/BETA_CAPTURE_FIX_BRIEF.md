# Beta capture fix — execution handoff, Gemini 2.5 Flash

Bounded execution package. The diagnosis is complete and is recorded in full below; do not
re-derive it. Every claim here was reproduced against the real modules in a Linux sandbox on
2026-09-05 and the reproducing commands are given so you can re-run them.

**Branch:** `claude/camera-detection-lighting-2g9c7j`.

**Reported symptom.** On Android/Chrome at `/beta/qise.html`, a live preview shows the user's
face, and the guidance line reads *"Turn off coloured lamps and use daylight or a white lamp
behind the phone."* — unchanged across three different rooms with different lighting, with
`LUMA` at 59, 62 and 64. Capture never completes. The user reported this as "the camera won't
detect my face".

**The face was detected.** That string is `CAPTURE_INSTRUCTIONS.illuminant.detail`
(`src/qise/gates.js:243`), reachable only *past* the no-face early return at
`src/beta/beta.js:331-337`, which would otherwise print "Bring your face into the frame."

---

## The defect, reproduced

`evaluateGates` records a gate that cannot be evaluated as `margin: -1, unevaluated: true`
(`src/qise/gates.js:337-345`). `-1` is the floor of `clampMargin` (`:64`), so it sorts first
(`:355`) and `captureInstruction` takes `failures[0]` (`:268`).

The `illuminant` gate returns `null` whenever `sclera.rawRatios` is null (`:169-173`), which is
exactly what `sampleSclera` returns on either named refusal — `too_few_pixels` or `too_dark`
(`src/qise/sclera.js:276-286`).

Re-run this to see it (read-only, no files written):

```bash
node --input-type=module -e '
import { evaluateGates, captureInstruction, canUseCurrentLight } from "./src/qise/gates.js";
const refused = { gains:null, pixelCount:60, rawRatios:null, personalDelta:null,
  confidence:"insufficient", confidenceValue:0, reason:"too_few_pixels",
  medianL:55, withinAbsoluteTolerance:false, stages:{} };
const perfect = { frameWidth:1280, pose:{yaw:0,pitch:0,roll:0},
  skinPixelCount:100000, skinPixelsAtOrAbove250:0, skinPixelsAtOrBelow12:0,
  cheekMedianL:{left:60,right:60}, landmarkDriftPx:1, validRoiCount:12, laplacianVariance:80 };
const lm = []; lm[33]={x:100,y:100}; lm[263]={x:500,y:100};
for (const t of [0, 3600, 10000]) {
  const r = evaluateGates(perfect, lm, refused, { elapsedMs: t });
  console.log(t, r.pass, r.failures.map(f=>f.id+"("+f.margin.toFixed(2)+(f.unevaluated?",UNEVAL":"")+")").join(" "));
  console.log("   SHOWN:", captureInstruction(r).detail, "| hatch:", canUseCurrentLight(r, t));
}'
```

Observed output — an otherwise **perfect** frame (dead-on pose, close enough, clean exposure,
even cheeks, sharp, all 12 ROIs valid, rock steady):

```
0 false illuminant(-1.00,UNEVAL) sclera(-0.60)
   SHOWN: Turn off coloured lamps and use daylight or a white lamp behind the phone. | hatch: false
3600 false illuminant(-1.00,UNEVAL) sclera(-0.60)
   SHOWN: Turn off coloured lamps and use daylight or a white lamp behind the phone. | hatch: false
10000 false illuminant(-1.00,UNEVAL) sclera(-0.60)
   SHOWN: Turn off coloured lamps and use daylight or a white lamp behind the phone. | hatch: false
```

There is no exit. The 3500 ms grace path excludes unevaluated failures (`:364`),
`canUseCurrentLight` excludes them twice (`:290`, `:296`), and `src/beta/beta.js:361` passes
only `{ elapsedMs }` — the beta never calls either valve. So `gates.pass` is permanently false,
`GreenLatch` never fires, the burst never starts, and the loop spins at 60 fps behind a live
camera with no timeout and a silent console.

The real cause has its own correct message — `sclera`, "Open your eyes a little wider" — sitting
second in the list, permanently invisible.

**This is shared code, not beta-only.** `src/qise.html` / `src/ui/qise/app.js` use the same
`gates.js` and its escape hatch has the same `!failure.unevaluated` exclusion, so production
has the identical dead end.

### Why the sclera refuses

`kept` survives four stacked filters (`sclera.js:259-265`) with a ceiling of `0.6 x 0.7 = 0.42`
of the geometric set, so the four eye-corner triangles must yield about 360 raw pixels to clear
`SCLERA_MIN_PIXELS = 150`. Measured on MediaPipe's canonical mesh — wide-open eyes, the
optimistic case; a relaxed eyelid yields less:

| buffer | face 35% of W | 45% | 55% | 70% |
|---|---|---|---|---|
| 1280x960 | 208 pass | 345 pass | 496 pass | 816 pass |
| 960x1280 | 110 FAIL | 192 pass | 270 pass | 447 pass |
| 640x480  | 48 FAIL  | 87 FAIL  | 123 FAIL | 208 pass |

`too_dark` is nastier: `pixelCount >= 150` so the `sclera` gate *passes* while `illuminant` is
still `-1`, and every visible signal says the frame is fine.

### A second gate with the same shape

`filter` (`:197`) goes unevaluated whenever `spatialLaplacianVariance` returns `null` — fewer
than 32 pixels with all four 4-neighbours (`src/qise/framestats.js:42,54`) — because
`median([])` is `null`. Same permanent block, three slots further down the sort.

---

## STOP CONDITION — Task 2 only

**Task 2 (named-refusal tolerance) changes what the product measures, not just what it says.**
It lets a reading complete with no sclera-derived illuminant correction, attenuated. Record a
decision in `docs/DECISION_REGISTER.md` before implementing Task 2, or leave Task 2 out and ship
Tasks 1 and 3-8, which are unambiguous defect fixes.

The trade-off, stated so it can be ratified or refused:

- **For.** `finish()` already handles a null-gain sclera end to end — `correctLab` is applied
  only `if (sclera.gains)` (`src/beta/beta.js:494`), and `readingConfidence` already consumes
  `scleraConfidenceValue`, which is `0` on refusal. The reading would be stored uncorrected,
  tier `assisted`, with the existing confidence penalty. The alternative for a user whose eyes
  cannot yield 150 px is no reading at all, ever.
- **Against.** An uncorrected reading is a reading taken under an unknown illuminant. Every
  downstream value is a CIELAB delta against the subject's own baseline, and mixing corrected
  and uncorrected captures in one baseline is the `basis` hazard of CLAUDE.md item 18. If the
  owner prefers refusal, Task 2 becomes "state the refusal and stop" instead.

Tasks 1 and 3-8 do not depend on this and must proceed either way. **Task 1 alone removes the
misdiagnosis** — the user is told to open their eyes rather than to change their lamps, which
is actionable and may be sufficient on its own.

---

## Tasks

### Task 1 — an unmeasurable gate must not name a cause that was never measured

File: `src/qise/gates.js`.

1. Add `UNMEASURED_INSTRUCTIONS`, a frozen map keyed by gate id, next to `CAPTURE_INSTRUCTIONS`.
   Each entry names the **precondition** for measuring that gate, never a fix for the unmeasured
   cause. Required entries:
   - `illuminant` — title "Show both eyes to the lens", detail to the effect that the light
     check reads from the whites of the eyes, so both eyes need to be open and visible.
   - `filter` — title "Show more of your face", detail about bringing the whole face into the
     oval so sharpness can be measured.
   - `sclera`, `pose`, `roiValidity`, `motion` — same shape.
   - A generic fallback used when the id has no entry: says the measurement has not been taken
     yet. It must not invent an instruction.

2. Change `captureInstruction(report)` so the **worst measured** failure wins, and an
   unevaluated one is used only when no measured failure exists:

   ```js
   const failures = (report.failures || []);
   const measured = failures.filter((f) => !f.unevaluated);
   const failure = measured[0] || failures[0];
   if (!failure) return { id: "ready", ... };            // unchanged
   if (failure.unevaluated) {
     return { id: failure.id, unmeasured: true,
              ...(UNMEASURED_INSTRUCTIONS[failure.id] || UNMEASURED_FALLBACK) };
   }
   return { id: failure.id, ...(CAPTURE_INSTRUCTIONS[failure.id] || { ... }) };
   ```

   Do **not** reorder `report.failures`. `tests/qise/gates.test.js:268` pins worst-first
   ordering and must stay green.

3. `OVEREXPOSED_LEVEL` and `UNDEREXPOSED_LEVEL` (`:36-37`) are dead — nothing imports them, and
   the real thresholds are literals `250` and `12` in `src/qise/framestats.js:73-74`. Import them
   into `framestats.js` and use them, so there is one source of truth. Do not change the values.

New tests in `tests/qise/gates.test.js`:

- `a gate that could not be measured never names a fix for it` — the sandbox scenario above:
  assert the instruction is the eyes one and assert it is **not** the lamp string. Both halves,
  in the same test.
- `a measured failure outranks an unmeasurable one in the instruction` — construct a frame with
  both a real `underexposed` failure and an unevaluated `illuminant`, assert the exposure
  instruction is shown.
- `when nothing can be measured the instruction invents nothing` — all inputs missing, assert
  the generic fallback and assert `pass === false`.

### Task 2 — named-refusal tolerance (gated by the STOP CONDITION)

File: `src/qise/gates.js`, in `evaluateGates`.

After `CAPTURE_GRACE_MS`, an unevaluated `illuminant` failure may enter `tolerated` **only when
the sclera result carries an explicit refusal reason** — `scleraResult.reason` is
`"too_few_pixels"` or `"too_dark"`. Apply the same rule to a failing `sclera` gate above a hard
pixel floor (add `SCLERA_ASSIST_MIN_PIXELS`, and set it by measuring, not by taste — below it,
there is nothing to sample and the capture must still refuse).

A sclera result that is simply absent has no named reason and still blocks. That is what keeps
`tests/qise/gates.test.js:255` ("a gate whose input is missing FAILS rather than passing
silently") meaningful, and it must stay green.

New test: `a NAMED sclera refusal becomes assisted after grace, an absent one never does` — both
halves in one test, asserting `captureTier === "assisted"` in the first case and
`pass === false` in the second.

### Task 3 — the oval must mean what the distance gate measures

Files: `src/beta/beta.js`, `src/beta/beta.css`, `src/beta/qise.html`.

`#preview` is `object-fit: cover` (`beta.css:475`) inside `.plate { aspect-ratio: 3/4 }`
(`beta.css:119`), while the stream is requested at 1280x960 — 4:3 (`src/qise/camera.js:37`).
Under cover only the central `(3/4)/(4/3) = 56.25%` of the buffer width is visible, but
`distance` measures the outer-canthi span against `canvas.width`, the **full buffer**
(`beta.js:316`, `gates.js:129-134`).

Measured: `canthi ~= 0.58 x bizygomatic`, so clearing `DISTANCE_MIN_FRACTION = 0.22` needs
bizygomatic >= 37.9% of buffer width — which is **67% of the visible plate width**. The dashed
oval is 52% (`beta.css:163`). A face that exactly fills the guide is about 30% short of the
gate, and the guide is what taught the user where to sit.

1. Set `.plate`'s aspect ratio from the real stream once dimensions are known.
   `attachCameraPreview` already waits for `videoWidth > 0 && videoHeight > 0`
   (`src/qise/camera.js:134-176`), so read them there and set a CSS custom property. With no
   crop, buffer coordinates and screen coordinates agree and the whole class of bug is gone.
   This must be correct for **either** buffer orientation — do not assume Android returns 4:3.
2. Derive the oval's width from `DISTANCE_MIN_FRACTION` in a **pure exported helper** in
   `src/beta/beta-model.js` (it is the DOM-free module; `beta.js` is wiring only). Signature
   roughly `captureGuideEllipse({ bufferWidth, bufferHeight, plateWidth, plateHeight })`.
3. Unit-test the helper in a new `tests/beta/capture-guide.test.js`: a face whose outer-canthi
   span exactly fills the returned ellipse width clears `DISTANCE_MIN_FRACTION`, at both buffer
   orientations, with a negative control at 90% of that width that does not clear it.

### Task 4 — the lighting controls are inert; wire what already exists

Files: `src/beta/qise.html`, `src/beta/beta.css`, `src/beta/beta.js`, `src/beta/beta-model.js`.

`createExposureHalo` queries `[data-halo-progress]` and `[data-halo-value]`
(`src/ui/qise/exposure-halo.js:34-35`) but the beta root is an empty
`<div class="halo" id="exposure-halo">` (`src/beta/qise.html:28`), so both are `null` and every
text update writes nowhere. `beta.css` has **zero `[data-state]` rules**, so `seeking`,
`adjust` and `perfect` look identical. `onLevel` fires only from `setLevel`, and beta only calls
`reset()` -> `setLevel(0)`, so `--halo-screen-strength` is frozen at `0.18` (`beta.js:630`) — a
permanent flat white veil over the preview with no control to raise it.

Meanwhile `CAPTURE_INSTRUCTIONS.underexposed.detail` (`gates.js:235`) says *"…or use the screen
light below"*, pointing at a control that does not exist on that screen.

1. Add the halo's `[data-halo-progress]` / `[data-halo-value]` children, mirroring
   `src/qise.html:418-424`. Add `[data-state="seeking"|"adjust"|"perfect"]` rules to
   `beta.css` so the three states are visually distinct — and per
   `docs/VISUAL_DIRECTION.md`, colour must never be the **only** carrier of a state.
2. Add a real screen-light control that calls `exposureHalo.setLevel`, as `app.js:179` does.
3. Port, from `src/ui/qise/app.js`, in this order of value: `exposureAssistState` +
   `data-preview-lift` dark assist (`app.js:446,451`, `camera.js:221`);
   `shouldUseScreenFlash` auto-flash (`exposure-halo.js:14`, `app.js:464`);
   `canUseCurrentLight` button (`app.js:457`); `requestCameraRefocus` (`camera.js:78`).
4. The halo currently paints white **over the preview**, hiding the face it is meant to light.
   Move the screen-light emission to page area outside `.plate`.
5. Rename the `LUMA` line in `beta-model.js:78`. It is the mean of `cheekMedianL`, which is
   CIE L* on 0-100 (`framestats.js:92`), not luma on 0-255. "LUMA 62" reads as a dim frame and
   actually means a well-exposed cheek.

`tests/beta/halo-theme.test.js` must stay green: the strength expression stays a function of
`level` alone and must not reference the theme, and the `halo-white` block stays skin-tokens-only.

### Task 5 — a stuck capture must say so

Files: `src/beta/beta.js`, `src/beta/qise.html`.

1. Watchdog: if the latch has not fired within a few seconds, replace the single instruction line
   with `captureGuide(report)`'s four groups (`gates.js:299`) so the user sees what is actually
   blocking. The beta could already import it and does not.
2. `#gate-line` (`src/beta/qise.html:32`) needs `aria-live` — nothing announces state changes.
3. `describeCameraError` (`src/qise/camera.js:108-126`) is a *camera*-error mapper. A MediaPipe
   import or model-fetch failure has no matching `.name` and falls through to `:125`: "The camera
   did not open. Retry, check this site's camera permission, or choose a selfie below" — a model
   failure reported as a permission problem, pointing at a selfie fallback the beta does not
   have. Give `buildLandmarker` (`beta.js:211-227`) its own catch and its own message. There is
   also **no timeout** on the 3.7 MB model or 9.5 MB WASM fetch; a stalled load leaves the same
   frozen screen. Add one.
4. `#go-capture` (`src/beta/qise.html:34`) is never hidden, disabled or relabelled, so the only
   control on screen is the one the user already pressed — and a second tap re-enters
   `runCapture()`, tearing down the stream and discarding the 1500 ms exposure warm-up
   (`beta.js:231-232`, `camera.js:204`). Disable or relabel it while a run is live.
5. `renderAbstain` (`beta.js:580-588`) is exported only through `__test__` and is called by
   nothing — the abstain surface is unreachable. Wire it.

### Task 6 — structural UI: stop rendering a reading that does not exist

Files: `src/beta/qise.html`, `src/beta/beta.js`, `src/beta/beta.css`.

`src/beta/qise.html:21-65` renders the entire reading skeleton — ring, ledger, legend, readout,
share artifact canvas, footnote — in one section visible from the moment consent is granted.
`renderArtifact()` runs unconditionally at boot (`beta.js:656`), so a user who has never
completed a capture can scroll to a "Share artifact" card for a reading that never happened.

Split the tracker section into capture and reading states. The reading surfaces render only once
at least one reading exists in the store. `store.all()` is already read at `beta.js:288`.

**This task is structural only.** A full visual redesign — new type scale, colour, layout — is
**out of scope for this brief** and is blocked on `docs/VISUAL_DIRECTION.md:57-66`, which
requires a visual research note (visual thesis; at least six verifiable references across at
least three source families; an explicit statement of what will not be copied from each; asset
provenance and licence; a mobile-first sketch plan for the resting, loading, empty/abstaining,
error and long-text states) before a complete journey or results screen may change. Do not
attempt the visual redesign. Do not add Chinese characters, seals, scrolls or "ancient" texture
(`VISUAL_DIRECTION.md:46-50`; enforced by `tests/ui-language.test.js:115-129`).

### Task 7 — the verification that was missing

New file: `e2e/beta-capture.spec.js`.

**No test in this repo has ever executed the capture loop.** `e2e/` contains no `getUserMedia`
stub, no `--use-fake-device-for-media-stream` and no `FaceLandmarker` stub; the existing specs
seed IndexedDB and mutate the DOM to reach the screens. That is CLAUDE.md items 18a and 23 again
— coverage is what the tests can reach, and the capture path is reachable by nothing. This is
why the defect shipped.

- `page.addInitScript` replaces `navigator.mediaDevices.getUserMedia` with a
  `canvas.captureStream()` painting a synthetic face from `tests/qise/fixtures/synthetic.js`
  (`syntheticFace`, `:79`), built on the canonical mesh (`tests/fixtures/canonical-face.js:116`).
  A reference mesh, never a real subject — a 478-point mesh of a real face is a biometric
  template and does not belong in this repo.
- Stub the MediaPipe module so `detectForVideo` returns the canonical mesh. This exercises the
  gate chain, instruction selection, latch, burst, store write and render — where every defect
  above lives — without depending on MediaPipe detecting a synthetic polygon face.
- Assertions, each with its paired control in the same run:
  1. A good frame reaches a sealed reading. (positive control)
  2. A refusing sclera shows the eyes instruction and **not** the lamp string, and — if Task 2
     ships — still completes as `assisted`. (negative control)
  3. A face filling the rendered oval clears `distance`; at 90% of that width it does not.
  4. The three halo states render differently.
- `playwright.config.js` runs `node scripts/serve.js --dist`, so **`npm run build` must run
  first** or the spec serves a stale artefact.

### Task 8 — close the loop on the docs

File: `CLAUDE.md`.

Add a numbered item in the house format (symptom / cause / pinned by). Suggested wording for the
heading: **an unmeasurable gate must not print a fix for a cause that was never measured.**
Symptom: a permanent, unchanging instruction about a condition nobody measured, identical in
every room, with the real cause sitting invisible behind it. Cause: `margin: -1` sorting ahead
of every real failure while both relief valves exclude unevaluated failures. Pinned by: the
tests added in Tasks 1 and 2. A constraint without a failing test to protect it gets tidied away.

Two stale lines to correct in the same commit: item 15 says "Currently `mienshiang-v19`" but
`src/sw.js:8` is `mienshiang-v24`, and the test-count line says 1194 across 76 files — re-run
and quote what the runner actually prints.

---

## Constraints — tests that must stay green

Run `npm test` before and after; the count must be greater than zero and must not fall.

- `tests/qise/gates.test.js:255` — a gate whose input is missing FAILS rather than passing
  silently. Task 2 must not weaken this; key the tolerance on the **named refusal reason**, not
  on `unevaluated`.
- `tests/qise/gates.test.js:268` — failures are ordered worst-first. Task 1 changes only
  `captureInstruction`'s selection, never `report.failures`.
- `tests/qise/gates.test.js:87` — the light escape hatch never accepts clipping, blur, pose or
  missing inputs. Do not touch `canUseCurrentLight`'s exclusions.
- `tests/beta/claim-structure.test.js` — no beta string may name a disease, carry health
  vocabulary, or make a claim about the reader. Every new instruction string you write is
  scanned by this.
- `tests/beta/abstain-vocabulary.test.js` — the abstain line names the light, never the person,
  and the instruction is the gate's own message, not a rewrite.
- `tests/beta/halo-theme.test.js` — halo strength is a function of level alone.
- `tests/qise/no-network.test.js` — scans `src/beta` for `fetch`/`XHR`/`WebSocket`/`sendBeacon`/
  `EventSource`. The beta's CSP is `connect-src 'self'` and MediaPipe is vendored same-origin.
- `tests/qise/no-medical-language.test.js`, `tests/qise/no-absolutes.test.js` — banned stems and
  cross-user comparison language across `src/qise` and `src/ui/qise`.
- `tests/source-integrity.test.js` — every source file parses and every local import resolves.
- `tests/ui-language.test.js:115-129` — no Han characters under `src/`.

Note the beta writes to the **same IndexedDB as production** (`beta-model.js:172-181`), same
origin, same person. A malformed beta reading corrupts a shared baseline, not a private one.

## Verification

```bash
npm test                # count must be > 0; quote it verbatim
npm run build           # e2e serves dist/, not src/
npm run test:browser    # includes the new beta-capture spec
npm run lint:bundle     # compliance guards, run on dist/
```

`scripts/engine-bench.mjs` is **not** required — no file under items 45-49 of CLAUDE.md
(`engine.js`, `textureAnalyzer.js`, `calibrationEngine.js`) is touched by this brief. If you find
yourself editing one, stop: that path requires a bit-exact fingerprint diff.

Report against CLAUDE.md section 8. Every unchecked box must appear in your final message:

```
[ ] Host OS/shell stated; sandbox-vs-target divergence resolved
[ ] Test count > 0 and quoted verbatim
[ ] Positive + negative controls both run, both quoted
[ ] Shipped artifact extracted to a clean dir and run from README commands
[ ] Every referenced file confirmed present (both directions)
[ ] No new swallowed errors; existing ones flagged
[ ] Anything unverified listed under "NOT VERIFIED" with the exact command
```

**Standing limitation, and it must appear in your report.** Nothing in this brief can be
verified on the reporter's Android phone from a sandbox. The synthetic harness proves the gate
chain, the instruction selection and the burst. It cannot prove what that camera returns for
`videoWidth`/`videoHeight`, whether Android hands back 1280x960 or 960x1280, or how many sclera
pixels those eyes actually yield. Task 3 is therefore specified to be correct for either buffer
orientation rather than assuming one. Do not claim the reported symptom is fixed on device —
claim only that the deadlock is removed and the misdiagnosis is gone, and quote the tests.
