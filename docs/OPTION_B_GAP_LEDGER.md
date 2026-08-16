# Option B: Repository Truth and Gap Ledger

This ledger synthesizes the current state of the Mien Shiang codebase as required by B-010.

## 1. Executive Summary

- **B-000:** Complete.
- **B-010:** Status: **evidence-review** (Task B-010 remains blocked until this PR is merged).
- **B-015:** Complete (PR #27 as remediated by B-015-R1/R2).
- **Next Task:** B-020 (source and terminology dossier) is ready.

## 2. Baseline Reset and Lineage

- **Baseline:** Computed in `src/qise/baseline.js` (`computeBaseline`).
- **Reset Logic:** `src/qise/baseline.js` (`shouldResetBaseline`) defines two conditions: capture-class change, or gap > `RESET_GAP_DAYS` (45). Device fingerprinting was removed and is not reintroduced.
- **Production Invocation:** `planSegment()` in `src/qise/baseline.js` runs `shouldResetBaseline` and returns the segment plan; `finish()` in `src/ui/qise/app.js` applies it before calling `interpretReading`. Both reset reasons are reachable from the production argument shape and are covered by tests in `tests/qise/foundation-repair.test.js`.

## 3. Persistence and Replay

- **Fields:** Persisted fields are strictly allow-listed in `src/qise/store.js` (`toRecord`).
- **Ming/Run:** `ming` and `run` are carried as compass axes and their normalised z-scores are persisted by `toRecord` in `src/qise/store.js` under an explicit allow-list. `axes.ming`, `axes.run`, `z.ming`, `z.run` and `lineageId` are covered by a round-trip test in `tests/qise/store.test.js`.
- **Replay:** Persisted readings replay the course logic. Band edges remain provisional; see `CALIBRATION_TODO.md` for the open `AXIS_MAD_FLOOR.ming` unit question.

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
