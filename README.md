# Mien Shiang

On-device facial zone analysis. Measures skin regions from a photo and
interprets them through a Traditional Chinese Medicine (Mien Shiang) rule base.

Runs entirely in the browser — no server, no upload, no account. Installs to an
Android home screen as a PWA and works offline after first run.

**Entertainment. Not a medical device. Not intended to diagnose, treat,
mitigate, cure or prevent any disease.** The reading is presented as tradition
throughout, and a "What the science says" screen is one tap from every result.

Two build flavours: `entertainment-only` and `wellness`, selected by
`MODULE_B_SAFETY_REFERRALS` in `src/flags.js`. See [COMPLIANCE.md](COMPLIANCE.md).

## Quick start

```bash
npm start     # http://localhost:5173
npm test      # 1400 tests (verify with the runner — this count ages quickly)
npm run build # dist/
npm run lint:bundle # compliance guards on dist/
```

No npm dependencies. The build performs no transform — `dist/` is a copy of
`src/`, with Module B stubbed out in the entertainment flavour.

## On your phone

Needs https. Run `npm run build` and deploy `dist/`.


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

## Product status and roadmap

Phase 1 (governance and structure) closed 9 September 2026. The product itself is not close to
shippable yet — most of the reading content exists, Daily Portrait does not, and none of the six
reading families are commercially cleared. `docs/GAP_ANALYSIS_2026-09-09.md` is the **Official
Phase 2 Development Roadmap**: an evidence-based audit of exactly what's built, what's missing, the
IP/sourcing constraints on writing more heritage content, and a sequenced plan for what comes next.
Read it before starting Daily Portrait, before writing more reading content, or before assuming any
content family is cleared for a paid release.

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
