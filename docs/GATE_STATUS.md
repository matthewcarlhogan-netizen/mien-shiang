# Gate status — public-release readiness

**As at 19 August 2026, after the cultural-review retirement.** Regenerate by hand when a
gate moves; nothing here is automated, because nothing here can be
self-certified.

## Summary

| State | Count | Change |
|---|---|---|
| Closed | 15 | -1 |
| Waiting on legal — parallel track | 3 | — |
| Waiting on source acquisition | 2 | — |
| **Waiting on product owner** | **0** | **0** |

## Closed

| Gate | Evidence |
|---|---|
| Engine correctness, coverage, traceability | `docs/PARITY_2026-08-17.md` — 10/10 migration gates, 1,152 real records |
| State differentiation | 15,288 reachable states, exhaustive sweep, 0 collisions |
| Occurrence-indexed variation | 0.0% verbatim repeat over 365 simulated days vs 26.8% |
| Production-path dimension coverage | 10/10 expressed vs 1/10 |
| Abstention behaviour | 144 records where the old engine asserted and the new abstains; 0 reverse |
| Claim/safety profile | 0 new stems, 0 assertiveness increase, 0 future claims |
| Internal vs public default | Origin allowlist, fails closed, published origin asserted absent |
| R1, R2, R4, R5, R7, R10, R11, R12, R13, R14 | `DR-2026-08-17-B020-CLASS-A` |
| Charter amended | `PROJECT_CHARTER.md` — gates, constructs, claims, engine posture |
| Product invariants pinned | `docs/PRODUCT_INVARIANTS.md` + enforcing test |
| **Su Wen chapter reference** | **`docs/EDITION_DECISIONS.md` — 素問·脈要精微論第十七, edition recorded, `provenance.js` updated** |
| **Designated edition families** | **四庫全書 (1781) and 欽定古今圖書集成 (1726)** |
| Corpus authorship recorded | `docs/CORPUS_PROVENANCE.md` with SHA-256 |
| Release gates defined | `docs/RELEASE_GATES.md` |

## Waiting on legal — parallel track, send now

| Gate | Question |
|---|---|
| L1 corpus ownership | What is owned in machine-authored text |
| L2 consequential-use prohibition | ToS wording; whether to expose an API at all |
| L3 third-party licence positions | Confirmation of six determined positions |

## Waiting on source acquisition

| Gate | Task |
|---|---|
| Three Sections primary source | `docs/ACQUISITION_THREE_SECTIONS.md` |
| Twelve Palaces chapter body | 十二宮相論 transcription with folio |

## Waiting on product owner

**None.**

---

## Critical path

```
  legal Track 1 (corpus ownership)  ── send today
  Three Sections acquisition        ── library access, slow, independent
  Twelve Palaces chapter body       ── same researcher, same trip
```

**Engineering is not on the critical path.** The highest-value action is the legal Track 1 submission, followed by source acquisition for the remaining families.
