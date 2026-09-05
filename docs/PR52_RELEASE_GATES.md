# PR #52 gate evidence and handoff

## Scope and versions

Task: close the lighting-consistency code gates before merging #52, then hand
merged main to the beta builder. Inputs: PR head
`2c75b69b13d1faa8981d10388fe560e1a572c2a6`, main `8b48c06`, the repository's
canonical instructions, and the product owner's 5 September 2026 landing
sequence. No diagnostic threshold, geometry mapping or persistence shape is
changed. ZKT remains a proposal; no telemetry is implemented.

The baseline run on Windows/PowerShell was `tests 1302 / pass 1302 / fail 0`.
Gate closure adds seven tests: five method-contract tests, one jitter test,
and one production-union background-swap test. Expected total: **1309**, not
1302. The beta's tests must be added to that total after rebasing; do not remove
tests to fit a stale count.

## Method tag and cross-version guard

`balanceFrame()` wraps the original arithmetic in `{data, methodVersion}`.
`shadesOfGray()` remains the byte-buffer API over that same implementation.
Tags describe the **effective** path, not the requested path:

| Path | Tag |
|---|---|
| Minkowski-6, sampled over ROI union | `sog6-roi-union-v1` |
| Minkowski-6, whole-frame sampling, including mask fallback | `sog6-whole-frame-v1` |
| Fewer than 16 alpha-eligible pixels, non-6 exponent, unknown caller | `null` |
| Existing longitudinal Qi Se corrected axes | `qise-sclera-corrected-v1` |

The scalar baseline carries `methodVersion`. Classic analysis and the benchmark
pass the returned effective method; the integrated caller passes its own actual
whole-frame method. An injected test balancer carries unknown provenance.

Qi Se's longitudinal axes are a separate pipeline: `finish()` computes
`metrics.corrected` from the burst and sclera gains, then stores
`axesOf(metrics.corrected)` under `baselineVersion: "v2"`. PR #52 does not
switch those axes to Shades-of-Gray. `qiseMethodOf()` therefore recognises
exactly existing v2 rows; it does not infer a method for unversioned rows or
override a present unknown tag. No mass relabelling or baseline deletion occurs.

`computeBaseline`, `noiseFloor`, `interpretReading`, `deltasFrom` and trajectory
segmentation consume the method guard. Different, missing or unknown methods
cannot contribute a comparison. The storage projection rejects explicitly
incompatible tags rather than dropping a tag and accidentally reclassifying
the row as legacy v2. Other methods need a separately versioned storage
contract; no field has been added to IndexedDB here.

`tests/measurement-method.test.js` pins positive same-method controls,
cross-version and unknown-method rejection, transparent-mask fallback, actual
caller wiring, and the projection boundary. One old flat-history fixture now
explicitly identifies its v2 provenance; its numerical assertions are unchanged.

## Caller attestation (grep plus alias inspection)

Command, run from repository root:

```powershell
rg -n 'balanceFrame|shadesOfGray|rawScalars\(' src scripts --glob '*.js' --glob '*.mjs'
```

Relevant executable matches after this patch (comments/imports also appeared
in the full grep and were reviewed):

```text
src/analysis.js:119 balanceFrame(img.data, 6, faceMask)
src/analysis.js:128 rawScalars(regions, { methodVersion })
src/qise/integrated.js:179 deps.shadesOfGray(image.data)
src/qise/integrated.js:180 balanceFrame(image.data)
src/qise/integrated.js:186 rawScalars(regions, { methodVersion: result.methodVersion })
scripts/engine-bench.mjs:177 balanceFrame(frame, 6, faceMask)
scripts/engine-bench.mjs:190 shadesOfGray(frame, 6, faceMask)
scripts/engine-bench.mjs:195 rawScalars(regions, { methodVersion })
scripts/engine-bench.mjs:198 rawScalars(regions, { methodVersion })
src/engine.js:79 balanceFrame(data, p, sampleMask).data
src/engine.js:1006 precomputed ?? rawScalars(regions)
```

Attestation: **the integrated Qi Se surface measurement deliberately remains
unmasked**, preserving its pre-#52 arithmetic. Its local dependency injection
is a test seam, not a second production estimator. The legacy `analyse()`
fallback receives already-extracted regions and cannot infer which white
balance produced them; its method is unknown unless precomputed raw scalars
are supplied. Classic analysis supplies them. There are no other production
white-balance callers in the inspected `src/` tree. This is not a claim that
the two application paths now use the same estimator.

## Jitter and erosion radius

`tests/boundary-sensitivity.test.js` moves a 26px square hull over **fixed
pixels**, using seven translations from -3 through +3 working-image pixels.
Across six boundary-contrast levels, it compares the independently measured
range of `regionStats().focalEi` against the full/eroded-mask diagnostic.
Observed Pearson correlation is 1 on this deliberately simple fixture.
Uniform control: variation 0 and no flag. Largest contrast: variation
103.91834385130414 EI units and a flag. The test requires correlation >0.9;
that is a synthetic regression criterion, not a calibrated probability.

`BOUNDARY_EROSION_PX = 3` is an **uncalibrated design assumption**: a 2px probe
plus a 1px rasterisation margin. It is not a measured GPU/CPU jitter bound.
The Chebyshev neighbourhood covers shifts in both axes. The radius is measured
on the working image, not CSS pixels or original sensor resolution. At small
ROI sizes it removes a larger fraction of the region. Fewer than 32 surviving
samples produces a sensitive/unknown diagnostic, never a false stable result.
No radius or sample floor was relaxed.

The test proves one failure mechanism. It does not prove sensitivity to every
colour boundary, real subpixel landmark jitter, or temporal repeatability.
In particular an EI diagnostic can stay quiet at neutral contamination.

## Uncalibrated constants and low-end tuning protocol

| Constant | Current value and meaning | Limitation |
|---|---|---|
| Boundary centre/focal thresholds | 1.5 / 1.5 EI units | Not Delta E, error bounds or probabilities; no device-labelled fit. |
| Erosion radius | 3 working-image pixels | Resolution- and ROI-size-dependent; not an empirical jitter quantile. |
| Boundary sample floor | 32 | Defensive numerical floor, not a validated sample-size study. |
| Sensor-noise variance ceiling | 200 in squared 8-bit-grey Laplacian-response units | Measures high-frequency energy, not ISO; texture and ISP sharpening can raise it, denoising can conceal grain. |
| Noise sample floor | 256 fully interior responses | Unknown below this floor; no device-calibrated sufficiency claim. |
| Masked WB fallback floor | 16 alpha-eligible samples | Falls back to whole-frame and tags that path; no masked result is implied. |

Before proposing tuning, use consented repeated captures on named low-, mid-
and high-tier phones, logging derived aggregates only. Include working
resolution, ROI dimensions/surviving fraction, delegate, achieved camera mode,
lighting condition, boundary deltas, Laplacian variance and repeated-capture
variation. Include smooth controls, textured regions, facial hair, sharpening,
denoising, and several appearances without building cross-user norms. Record
abstentions and failures as well as successful captures.

On low-end phones specifically, measure warm/cold p50/p95 wall time for mask
union construction, erosion, colour statistics and the complete capture, plus
thermal slowdown and missing-data frequency. `engine-bench.mjs` times WB,
statistics and scalars; its total **does not include union construction or
boundary erosion**, so it cannot certify this budget. A desktop result or CPU
throttle alone is not physical-device evidence.

Compare radius/threshold candidates offline under a pre-registered protocol
against repeatability and false-sensitive rates; retain the current runtime
constants until the colour owner and independent reviewer approve a versioned
change. Do not lower floors or suppress flags to meet a time/pass-rate target.
Bit-exact optimisation may be considered separately, with fingerprint and
paired mechanism controls. Until then these are advisory diagnostics, not
new eligibility gates or biological claims.

## Background swap and numerical evidence

`tests/masked-white-balance.test.js` checks every face pixel for the rectangle
fixture and adds a test using the actual ROI union on the canonical reference
mesh. Identical foreground with dim-wall versus bright-window backgrounds is
identical after masked correction. In the same fixtures, the unmasked path
changes. The same-colour inside/outside-mask control also proves correction is
still applied once over the entire frame, never independently per region.

Windows benchmark before/after this gate patch: 408 → 409 fingerprint entries;
five observations both times, maximum severity 0.534. The **only** fingerprint
diff is `baseline.methodVersion=sog6-roi-union-v1`. No numeric scalar changed.
The original #52 masked-estimator change versus main is intentionally not
bit-identical; its original commit records that distinct numerical delta.

## Verification and next owner

Observed on Windows/PowerShell on 5 September 2026:

```text
npm test: tests 1309 / pass 1309 / fail 0 / skipped 0
npm run build: 97 source files and 6 pinned MediaPipe assets copied
npm run lint:bundle: 98 files / 1495 strings / all four guards ok
git diff --check: no whitespace errors (Windows line-ending notices only)
```

The new shared method module is included in the service-worker shell; cache
generation and the entry redirect advance together from 23 to 24.

Files/contracts changed: effective WB result and scalar baseline metadata;
shared comparability helper; Qi Se baseline/trajectory/projection guards;
classic/integrated/benchmark call wiring; cache/redirect; mechanism and method
tests; this evidence note. No new persisted shape, network request, medical
claim, geometry mapping or tuned diagnostic constant.

Independent Release Gatekeeper review is **pending**: the delegated reviewer
hit an account usage limit before issuing any findings or verdict. Do not treat
that attempt as an approval. Physical-device repeatability/performance and
calibration remain unverified. Next owner: independent Release Gatekeeper for
this patch and #52, then the beta integrator after #52 is merged. The beta is
not testable on the strength of this handoff.
