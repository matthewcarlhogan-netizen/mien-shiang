# Option B: Repository Truth and Gap Ledger

This ledger synthesizes the current state of the Mien Shiang codebase as required by B-010.

## 1. Executive Summary

- **B-000:** Complete.
- **B-010:** Status: **evidence-review** (Task B-010 remains blocked until this PR is merged).
- **Next Task:** B-015 (Qi Se foundation repair) remains blocked.

## 2. Baseline Reset and Lineage

- **Baseline:** Computed in `src/qise/baseline.js` (`computeBaseline`).
- **Reset Logic:** `src/qise/baseline.js` (`shouldResetBaseline`) defines conditions: device fingerprint change, capture mode change, or gap > `RESET_GAP_DAYS` (45).
- **Production Invocation:** `src/ui/qise/app.js` calls `interpretReading` (which invokes `computeBaseline`) but does not explicitly trigger `shouldResetBaseline` before the interpretation step. The lineage is effectively continued unless reset logic is explicitly integrated.

## 3. Persistence and Replay

- **Fields:** Persisted fields are strictly allow-listed in `src/qise/store.js` (`toRecord`).
- **Ming/Run:** `ming` and `run` components are computed in `src/qise/composition.js`, but production **does not persist the normalised z-scores** required by the composed passage course logic. Replay functionality is therefore incomplete for these values.
- **Replay:** Persisted readings are loaded, but full replay of passage course logic is constrained by missing persisted state.

## 4. Eligibility: Burst, Still, Expression

- **Burst:** `src/qise/gates.js` and `src/ui/qise/app.js` require 9 frames for burst capture.
- **Still-Fallback:** Implemented in `src/qise/exposure-halo.js` but is a research candidate, not a mature production gate.
- **Expression-State:** `src/qise/pose.js` calculates pose; `src/expression.js` defines expression state. They are treated as momentary state, not trait.

## 5. Tagged Patterns

- **Path:** `src/qise/patterns.js` and `src/qise/passages.js` define pattern matching logic.
- **Resolution:** Production writes empty tags and has no UI for pattern tagging; consequently, tagged-pattern resolution is **unreachable**.

## 6. Enduring Systems

### Implemented
- Twelve Palaces: `src/reading/twelve-palaces.js`
- Five Elements: `src/reading/five-elements.js`
- Three Courts: `src/reading/three-courts.js`
- Harmony: `src/reading/harmony.js`

### Absent
- Five Mountains: Absent from structural record.
- Five Officers: Absent from structural record.
- Four Rivers: Absent from structural record.
*(Note: Proposal documents exist in `docs/proposals/` but are not implemented.)*

## 7. Real-Device Validation Gap

- **Gap:** Missing validation on real Android devices (lighting, camera modes, motion).
- **Reference:** `docs/scanner-development-report.md`.
