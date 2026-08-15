# B-015 Claim-to-Evidence Checklist

| Item | Claim | Evidence (Production/Test Path) | Observed Result | Status |
|---|---|---|---|---|
| 1 | Baseline reset runs in production | `src/ui/qise/app.js` (finish) | Reset/Segmentation active | Complete |
| 2 | Algorithm/capture class segmentation | `src/qise/baseline.js` (interpretReading) | Versioned lineage | Complete |
| 3 | `ming`/`run` z-scores persisted | `src/qise/store.js` (toRecord), `src/ui/qise/app.js` | Schema change verified | Complete |
| 4 | Deterministic history replay | `src/qise/baseline.js`, `tests/qise/foundation-repair.test.js` | Deterministic z-scores | Complete |
| 5 | Canonical-day policy | `src/ui/qise/app.js` (overwrite logic) | Overwrite active | Complete |
| 6 | Tags remain unreachable | `src/qise/patterns.js` | Unreachable | Complete |
