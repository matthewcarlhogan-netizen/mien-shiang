# B-015 Technical Contract: Qi Se Foundation

## Objective
Repair the Qi Se foundation: baseline reset, lineage, personal `ming`/`run` replay, and canonical-day/reroll policy, while parking unreachable tags.

## Invariants
- Raw frames, pixels, landmarks and embeddings remain volatile and non-persisted.
- No new signals (Shen, gaze, tension, jaw-asymmetry).
- `EXPRESSION_IS_STATE_NOT_TRAIT` is strictly preserved.
- No change to product interpretation or interpretation copy.
- No weakening of compliance gates.

## Semantics
- **Baseline Reset:** Triggered on capture-class change or gap > 45 days. Production path: `planSegment()` in `src/qise/baseline.js`, called by `finish()` in `src/ui/qise/app.js`. A reset writes no deletion: it starts a new `lineageId`, and subsequent readings load only that lineage, so pre-reset rows remain in the store and out of the baseline. `baselineVersion` and `captureClass` filtering in `interpretReading` is a second, independent guard covering rows that predate lineage or were captured a different way.
- **`ming`/`run` Course:** Persist normalised z-scores (schema change) and ensure deterministic replay.
- **Canonical-Day:** Deterministic daily outcome based on the persisted timestamp; same-day retakes overwrite the previous entry based on the persisted canonicalDay (`src/ui/qise/app.js`).
- **Parking:** Tags remain unreachable; marked with rationale for future decision.
- **Verification:** All claims subject to test suite `tests/qise/foundation-repair.test.js` verification. Status: Verified.

## Product Decisions & Rationale
- **Legacy Baselines Discarded:** Pre-v2 legacy readings (without `baselineVersion === 'v2'`) are segmented out from baseline calculations upon upgrading to B-015. This clean break preserves historical data in the IndexedDB store for user records/sharing, but prevents unversioned or legacy-format data from polluting the v2 baseline calculations.
- **Device-Fingerprint Reset Deletion:** Device fingerprinting has been explicitly excluded from this repository to protect user privacy and avoid any tracking/biometric profile creation. Lineage segmentation relies strictly on versioning (`baselineVersion`) and standardizing on a single capture segmentation field (`captureClass`), rather than device-fingerprint matching.

## Inputs/Exclusions
- **Inputs:** Capture sequence (burst), timestamp, local baseline state.
- **Exclusions:** No medical/diagnostic language, no cross-user comparisons, no biometric identification.

## Abstentions
- Any signal failing the source/measurement gate abstains (returns neutral/null).
- Any unsupported facial geometry abstains.
