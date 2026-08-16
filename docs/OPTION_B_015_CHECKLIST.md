# B-015 Claim-to-Evidence Checklist

| Item | Claim | Evidence (Production/Test Path) | Observed Result | Status |
|---|---|---|---|---|
| 1 | Baseline reset runs in production | `planSegment()` in `src/qise/baseline.js`, called from `finish()`; `tests/qise/foundation-repair.test.js` (capture-class reset from the production argument shape; fresh lineage on class change) | Both reset reasons fire from the real call shape | Complete |
| 2 | Algorithm/capture class segmentation | `interpretReading` in `src/qise/baseline.js`; `tests/qise/foundation-repair.test.js` (off-version and off-class rows excluded from the baseline) | Contaminant rows do not move the baseline centre; in-segment control does | Complete |
| 3 | `ming`/`run` z-scores persisted | `toRecord` in `src/qise/store.js`; `tests/qise/store.test.js` (round-trip through put -> reopen -> all) | `axes.ming`, `axes.run`, `z.ming`, `z.run` and `lineageId` all survive reopen | Complete |
| 4 | Deterministic history replay | `computeBaseline`/`projectCompass` in `src/qise/baseline.js`; `tests/qise/foundation-repair.test.js` (z produced once the baseline is ready) | z replays from persisted axes | Complete |
| 5 | Canonical-day policy | `planSegment()` returns `replacedTimestampIso`; `finish()` performs the delete; `tests/qise/foundation-repair.test.js` (same-day row nominated and dropped; new day nominates nothing) | Overwrite active, and tested through production code rather than a local re-implementation | Complete |
| 6 | Tags remain unreachable | `src/qise/patterns.js` | Unreachable | Complete |


**Falsifiability.** Every row above was verified by breaking the production code it names and confirming the cited test fails. See the T0 table in the pull request.
