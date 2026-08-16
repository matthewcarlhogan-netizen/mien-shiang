# Calibration TODO

## Status

Phase 1 implements nine calibration blind-spot fixes. Several constants are
analytically derived rather than fitted to labelled ground truth. This file
records what validation is still outstanding.

---

## RIDGE_STRUCTURE_SCALE is analytically derived, not empirically validated

`calculateAdaptiveScale` in `src/utils/calibrationEngine.js` computes a
per-image scale from the whole-frame 90th-percentile Hessian structureness,
using the formula:

```
scale = 2 * (p90 / 0.06)
```

The constant `0.06` was measured on **synthetic** flat-skin patches using the
3-point Laplacian in `ridgeResponse()`. Genuine furrows reached ~2.5 on the
same patches; sensor noise sits around 0.06.

**This has not been validated on real phone photos.**

### Highest-value single improvement

Collect ~20 real phone photos covering:
- Varied skin tones (Fitzpatrick I–VI)
- Mixed ages (20s through 60s)
- Mixed lighting conditions (indoor ambient, outdoor daylight, flash)

Label each forehead and glabella zone as **smooth** or **wrinkled** by visual
inspection. Then:

1. Run `ridgeResponse()` with the current static `RIDGE_STRUCTURE_SCALE = 1.0`
   and the new `calculateAdaptiveScale()` output.
2. Compare the resulting `ridgeDelta` distributions between the two groups.
3. Choose the scale constant (or adaptive formula constant) that maximises the
   separation between smooth and wrinkled distributions per skin-tone stratum.

Target: at least 0.5 standardised mean difference per stratum before the
adaptive scale is considered validated.

---

## Per-zone RHYTIDE_FULL_SCALE (ZONE_FULL_SCALE) — judgement call

The values in `ZONE_FULL_SCALE` are based on known anatomical wrinkle depth
differences but have not been fitted to labelled data:

| Zone        | Scale | Rationale                                    |
|-------------|-------|----------------------------------------------|
| forehead    | 0.08  | Deep horizontal expression lines             |
| glabella    | 0.09  | Deepest inter-brow furrows                   |
| periorbital | 0.04  | Fine crow's-feet, thin skin                  |
| nasolabial  | 0.05  | Moderate fold depth                          |
| cheeks      | 0.06  | Baseline (matches original constant)         |
| chin        | 0.05  | Moderate                                     |

These should be calibrated against the same labelled photo set described above.

---

## ITA_CONFIDENCE values — literature-grounded but not fitted

The values in `ITA_CONFIDENCE` are derived from Lee et al. 2026, Wilkes et al.,
and the Chardon 1991 ITA banding. They have not been fitted to a validation set
for this specific app configuration.

---

## Angular tolerance in ridgeResponse (FIX 8)

The ±30° tolerance was chosen to balance sensitivity (catching oblique wrinkles)
against specificity (rejecting noise). It should be evaluated on the same photo
set: if too many false positives appear on smooth cheeks, tighten toward 20°.

---

## Next steps (priority order)

1. **Collect labelled phone photos** (20 minimum, see above).
2. **Fit RIDGE_STRUCTURE_SCALE** per skin-tone stratum.
3. **Fit ZONE_FULL_SCALE** values from labelled zones.
4. **Validate ITA_CONFIDENCE** asymmetry against erythema ground truth.
5. Consider isotonic calibration of severity → confidence mapping once
   sufficient labelled data exists (target n ≥ 100 per stratum).

## `AXIS_MAD_FLOOR.ming` — unit mismatch (needsVerification)

`src/qise/baseline.js` sets `ming: 0.15` and `run: 0.15`, copied from the
CIELAB axes. The comment above the constant warns that the units differ.

- `ming` is `L*(P90) / L*(P50)` (`src/qise/metrics.js`, `lumRatioP90P50`) —
  dimensionless, typically a little above 1. The floor is
  `max(2 * MAD, AXIS_MAD_FLOOR)`, so whenever the personal MAD is small the
  constant binds. `courseKey` in `src/qise/passages.js` thresholds at 1, so
  lustre only leaves `"level"` once the ratio moves by 0.15 or more — a very
  large day-to-day swing for that quantity.
- `run` is `C * (1 + 0.045 * C)` (`src/qise/metrics.js`, `src/qise/color.js`),
  roughly 25 at C ≈ 15. Its own MAD dominates the 0.15 floor, so `run`
  self-scales correctly and needs no change.

**Prediction if unaddressed:** `ming` reads `"level"` nearly always and
`courseKey` collapses toward `moistureLed`/`level`, i.e. `run` alone drives the
course.

**Measurement that would settle it:** the personal MAD of `ming` across a real
multi-day capture series, per capture class. Until that exists there is no
basis for a value, so the constant is left untouched. `needsVerification: true`.
