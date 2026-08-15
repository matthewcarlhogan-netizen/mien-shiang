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
- **Baseline Reset:** Triggered on capture mode change or gap > 45 days. Production path: `src/ui/qise/app.js` (finish). Baseline reset preserves historical data without deletion (lineage segmentation).
- **`ming`/`run` Course:** Persist normalised z-scores (schema change) and ensure deterministic replay.
- **Canonical-Day:** Deterministic daily outcome based on the persisted timestamp; same-day retakes overwrite the previous entry based on the persisted canonicalDay (`src/ui/qise/app.js`).
- **Parking:** Tags remain unreachable; marked with rationale for future decision.
- **Verification:** All claims subject to test suite `tests/qise/foundation-repair.test.js` verification. Status: Evidence pending.

## Inputs/Exclusions
- **Inputs:** Capture sequence (burst), timestamp, local baseline state.
- **Exclusions:** No medical/diagnostic language, no cross-user comparisons, no biometric identification.

## Abstentions
- Any signal failing the source/measurement gate abstains (returns neutral/null).
- Any unsupported facial geometry abstains.
