# Mien Shiang

On-device facial zone analysis. Measures skin regions from a photo and
interprets them through a Traditional Chinese Medicine (Mien Shiang) rule base.

Runs entirely in the browser — no server, no upload, no account. Installs to an
Android home screen as a PWA and works offline after first run.

**General wellness tool. Not a medical device. Not intended to diagnose, treat,
mitigate, cure or prevent any disease.**

## Quick start

```bash
npm start     # http://localhost:5173
npm test      # 159 tests
```

No dependencies, no build step.

## On your phone

Needs https. Drag `src/` to [Netlify Drop](https://app.netlify.com/drop), open
the URL in Chrome on Android, then ⋮ → **Add to Home screen**.

## What it measures

| Reading | Method |
|---|---|
| Redness | Erythema Index — 100·log₁₀(R_red/R_green) |
| Paleness | same measurement, reversed |
| Darkening | Melanin Index — 100·log₁₀(1/R_red) |
| Deep lines | Multi-scale Hessian ridge detection, orientation-gated |
| Rough texture | GLCM contrast (Haralick) |

Everything is measured **against other regions of your own face**, never a
population scale — that's the main defence against skin-tone bias.

**Never measured, and stated on screen:** acne, cysts, comedones, ulcers,
dermatitis, pigmented lesions, telangiectasia, eye puffiness, earlobe crease.
Those need a model trained on labelled clinical images.

**On deep skin it refuses to report redness.** Melanin absorbs across the same
range as haemoglobin, so the signal falls below the noise floor — a physical
limit, not a bug. The app says so rather than guessing.

**Severity grades are uncalibrated.** The measurements are real; the 0–1 scores
are reasoned starting points, not fitted to labelled data.

## Working on this

Read **CLAUDE.md** first. It documents six constraints that look like tidy-up
targets but are load-bearing — each was a real bug with a test pinning it.

```
src/index.html    UI + styles
src/ui.js         screen wiring, overlay
src/analysis.js   MediaPipe landmarking, zone masking
src/landmarker.js GPU→CPU delegate fallback
src/geometry.js   facial proportions + face-shape classifier (pure)
src/expression.js blendshapes → expression state (pure)
src/debugview.js  renders the geometry trace (pure)
src/engine.js     colorimetry + texture measurement
src/rules.js      zones + forward-chaining rule engine
src/sw.js         offline cache
```

The four `pure` modules have no DOM and no MediaPipe import, so they are tested
under `node --test` with no browser and no face photo.
