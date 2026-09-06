# Capture journey — visual research note

Prerequisite for the structural capture-stage changes in
`DR-2026-09-06-SCANNER-CAPTURE-CORRECTION` (`docs/DECISION_REGISTER.md`), per
`docs/VISUAL_DIRECTION.md`'s "Research requirement before a major visual
change." Read that document's constraints (no Chinese characters, seals,
scrolls or "ancient" texture used as atmosphere; colour never the sole carrier
of a state; one persistent privacy line) before this note — they bound
everything below and are not repeated here.

## Scope, stated honestly

This is a **restoration and completion**, not a new visual system. The beta's
capture stage was missing markup its own JavaScript had queried for since it
shipped — `createExposureHalo`'s `[data-halo-progress]` lookup returned `null`
because the element it was mounted on had no children — and its guide oval was
sized independently of the gate it was meant to represent. The work is: give
the existing design tokens (cinnabar/orpiment/malachite/azurite, mono
typography, hairline borders — all already declared in `src/beta/beta.css`
before this correction) the real states and correct geometry they were always
meant to drive. No new colour, no new typeface, no new iconography was
introduced. That materially narrows what research is relevant: not "what
should this look like" but "what does a capture-guidance UI need to
communicate, and does the existing token vocabulary already have a state for
each thing it needs to say."

## Visual thesis and the user's moment

The person is holding a phone at arm's length, in whatever light their room
has, trying to hold still while a measurement happens with no shutter button
and no countdown. The moment has three needs, in order: **orient** (is my face
where it needs to be), **diagnose** (what, specifically, is still wrong), and
**confirm** (it is working, hold still). The existing three-colour ring
(seeking/adjust/perfect) already answered orient and confirm; it had no state
for "the app is actively correcting something" — a soft frame mid-refocus —
which is a fourth, distinct condition: not a problem the person must act on,
and not yet success. Conflating it with "adjust" told a person to fix
something the app was already fixing.

## References, across the required source families

**Digital interaction platforms (2):**

1. Google's ML Kit + CameraX face-detection guidance describes the standard
   pattern this app already follows structurally: an overlay bounding box or
   guide drawn over a live preview, updated once per analysed frame, never
   redrawn more often than the analysis itself runs (`ImageAnalysis.STRATEGY_
   KEEP_ONLY_LATEST` exists specifically to stop a UI redrawing faster than
   real analysis produces new results — the same distinct-frame problem this
   correction's frame scheduler solves at the measurement layer, described
   here at the display layer). — [Detect faces with ML Kit on Android](https://developers.google.com/ml-kit/vision/face-detection/android)
2. Apple's Human Interface Guidelines on Feedback: "make sure all feedback is
   accessible by using multiple ways to provide feedback, such as color, text,
   sound, and haptics" — directly the reason `docs/VISUAL_DIRECTION.md`'s
   existing rule ("colour must never be the only carrier of a state") is
   correct, and why every ring colour in this correction is paired with its
   own `#gate-line` text and its own `.capture-guide` chip label. —
   [Feedback — Human Interface Guidelines](https://developers.apple.com/design/human-interface-guidelines/patterns/feedback/)

**Standards / technical guidance (2):**

3. ISO/IEC 29794-5:2025, *Biometric sample quality — Part 5: Face image data*,
   and the NIST FATE Quality programme both treat **illumination, pose and
   focus** as the three dominant, independently-assessed quality axes for a
   face capture — not one blended "quality" score. This app's own
   ten-gate structure (pose, distance, exposure ×2, sidelight, illuminant,
   sclera, motion, filter, roiValidity) already reflects that separation; the
   gate-dependency fix in this same correction (CLAUDE.md item 54) exists
   specifically because collapsing "illumination could not be assessed" into
   the same signal as "focus is bad" is exactly the failure mode these
   standards' separation is meant to prevent. — [ISO/IEC 29794-5:2025](https://www.iso.org/standard/81005.html);
   [NIST FATE Quality](https://lab.neurotechnology.com/awards-fate-quality.html)
4. NIST's archived face-pose best-practice guidance: "Lighting shall be
   equally distributed on the face with no significant direction of the light
   from the point of view of the photographer" — the published rationale
   behind this app's own `sidelight` gate, unrelated to this correction but
   confirming the existing gate measures a recognised, named quality axis
   rather than an invented one. — [ANSI/NIST face pose best practice](https://www.nist.gov/system/files/documents/2021/03/18/ansi-nist_archived_2010_best_practice_face_pose_value.pdf)

**Commercial capture-UX practice (1):**

5. Public identity-verification vendor documentation (SEON, Veriff,
   Innovatrics) converges on two patterns relevant here: a guided oval the
   person frames their face inside, and **real-time corrective messaging**
   ("if the angle is wrong" the system says so as it happens, "preventing
   [users] from having to start the process over again") rather than a single
   pass/fail verdict at the end. Both are already this app's architecture
   (the guide oval predates this correction; the corrective one-line
   instruction is `captureInstruction()`). What these sources do NOT converge
   on, and what this app deliberately does NOT copy, is passive,
   no-feedback liveness capture — the opposite of the transparent,
   per-gate coaching this product's whole design commits to. — [SEON: selfie and liveness detection](https://docs.seon.io/knowledge-base/idv/selfie-and-liveness-detection)

**Cultural family — substituted with internal precedent, not fabricated:**

`docs/VISUAL_DIRECTION.md` asks for a contemporary Chinese visual culture
reference as one of (at least) three source families. Because this work
introduces no new cultural imagery — it extends the *existing* mineral-pigment
naming already in `src/beta/beta.css` (cinnabar 朱砂, malachite 孔雀石,
azurite 石青, orpiment 雄黄, all named as pigments before this correction) to
the ring states those pigments were already earmarked for — a fabricated
external citation would misrepresent what was actually consulted. The real
precedent is internal: `src/ui/qise/palette.js`'s five-colour Su Wen compass,
which already assigns a documented classical simile to each hue used
anywhere in this product. This correction follows that same discipline for
the fourth beta-only state (azurite/"recovering") rather than inventing a new
one, and adds no pigment beyond what `beta.css` already declared.

## What will NOT be copied from any of the above

- **Not** passive/no-feedback liveness capture (source 5) — this product's
  entire design commits to naming, out loud, what a person can do next; a
  silent pass/fail would contradict `docs/VISUAL_DIRECTION.md` outright.
- **Not** a single blended "quality score" ring (contrary to some commercial
  SDK patterns) — the ten-gate separation stays legible per-axis via the
  four-chip strip, consistent with sources 3–4 treating illumination/pose/
  focus as independent.
- **Not** ML Kit's bounding-box-around-the-face visual style (source 1) — this
  product's oval guide, established before this correction, is kept; only its
  *sizing math* changed (see CLAUDE.md item 57), not its shape or chrome.
- **Not** any new Chinese-culture imagery, seal, scroll or character, per
  `docs/VISUAL_DIRECTION.md`'s standing rule — the "cultural" reference here
  is internal continuity, not a new motif.

## Asset provenance and licence

No new asset. No webfont, no icon font, no raster image. The ring is inline
SVG (`<ellipse>`), drawn with the same vector-only discipline `sharecard.js`
already documents (CLAUDE.md item 35) and using colours declared as CSS custom
properties already present in `beta.css` before this correction
(`--t-cin`, `--t-mal`, `--t-azu`, `--t-orpiment`). Nothing here requires a
licence beyond the code itself.

## States covered (resting, loading, empty/abstaining, error, long-text)

- **Resting / seeking** — no face yet: neutral ring, "Bring your face into the
  frame."
- **Loading / adjust** — a named, measured problem: orpiment ring, one
  `#gate-line` instruction, matching `.capture-guide` chip in `adjust` state.
- **Recovering** — new in this correction: azurite ring, "Hold still —
  sharpening," while `RefocusRecovery` runs an autofocus attempt the person
  did not have to ask for.
- **Ready / perfect** — malachite ring, pulsing per the existing
  `beta-halo-perfect` keyframe (suppressed under `prefers-reduced-motion`,
  unchanged from before this correction).
- **Empty/abstaining** — `renderAbstain()` remains reachable only from tests
  (`__test__` export) after this correction; the live loop instead adapts its
  guidance indefinitely rather than ending the attempt (see the decision
  record's note on this — production has never had a live-loop abstain path
  either, and inventing one was judged out of scope for this correction).
- **Error** — a model-load failure now gets its own message
  ("The reading model failed to load. Refresh the page.") distinct from a
  camera-permission failure, which `describeCameraError` previously
  misattributed it to.
- **Long-text** — unaffected; `#gate-line` and the chip labels are short by
  construction and were not touched for length.

## Mobile-first sketch plan

No new artboard was produced — the change is additive markup inside an
existing, already-responsive layout (`src/beta/qise.html`'s `.plate`, sized by
`aspect-ratio` from the live video stream). The four states above are each
directly screenshotted from the real running page as part of this
correction's verification (`e2e/beta-capture-finalisation.spec.js` reaches
"ready"; manual review reaches "adjust" and "seeking" trivially by camera
framing). A dedicated Playwright visual-regression snapshot per ring state is
a reasonable follow-up but was not required to satisfy this prerequisite,
since no new layout was introduced for it to regress.
