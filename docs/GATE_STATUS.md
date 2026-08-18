# Gate status — public-release readiness

**As at 17 August 2026, after the edition decisions.** Regenerate by hand when a
gate moves; nothing here is automated, because nothing here can be
self-certified.

## Summary

| State | Count | Change |
|---|---|---|
| Closed | 16 | +3 |
| Waiting on cultural reviewer | 10 | — |
| Waiting on legal — parallel track | 3 | newly separated |
| Waiting on legal — after cultural | 5 | — |
| Waiting on source acquisition | 2 | — |
| **Waiting on product owner** | **0** | **−2** |

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
| **Disposition ingest pipeline** | `scripts/ingest-disposition.mjs` + schema + template; refuses to clear a family |
| Corpus authorship recorded | `docs/CORPUS_PROVENANCE.md` with SHA-256 |
| Reviewer brief issued | `docs/CULTURAL_REVIEW_BRIEF.md` — approved as the engagement package |
| Release gates defined | `docs/RELEASE_GATES.md` |

## Waiting on cultural reviewer — the critical path

**No reviewer engaged.** Brief is ready; return format is machine-ingestible.

| Gate | Blocks |
|---|---|
| Q1 / R3 — Four Rivers lineage | Four Rivers; the `sourceLineage` dimension |
| Q2 / R6 — 五官 membership | Five Officers |
| Q3 / R8 — 妻妾宮 / 奴僕宮 | Twelve Palaces |
| Q4 / R9 — colour as classifier input | Five Elements (also legal) |
| Requirement 4 × 6 families | **All six. The long pole.** |
| Su Wen wording — 澤 and 地蒼 renderings | Qi Se colour vocabulary, and therefore **also the contingency path** |

## Waiting on legal — parallel track, send now

Independent of any cultural finding. `docs/LEGAL_PARALLEL_TRACK.md`.

| Gate | Question |
|---|---|
| L1 corpus ownership | What is owned in machine-authored text; what artifact replaces requirement 3 |
| L2 consequential-use prohibition | ToS wording; whether to expose an API at all |
| L3 third-party licence positions | Confirmation of six determined positions |

## Waiting on legal — after cultural review

R9 confirmation, R11 across territories, R12 gate copy, requirement 5 × 6
families, store-policy review. Reviewing these before the cultural log exists
means reviewing twice.

## Waiting on source acquisition

| Gate | Task |
|---|---|
| Three Sections primary source | `docs/ACQUISITION_THREE_SECTIONS.md` |
| Twelve Palaces chapter body | 十二宮相論 transcription with folio |

## Waiting on product owner

**None.** Both remaining rows closed this pass.

---

## Critical path

```
  ENGAGE CULTURAL REVIEWER  ──►  requirement 4 × 6 + Q1–Q4  ──►  legal Track 2  ──►  hash  ──►  audit:release  ──►  flip default
        (not started)
        ▲
        └─ THE ONLY THING ON THE CRITICAL PATH

  in parallel, off the path:
     legal Track 1 (corpus ownership)  ── send today
     Three Sections acquisition        ── library access, slow, independent
     Twelve Palaces chapter body       ── same researcher, same trip
```

**Engineering is not on the critical path and has not been since the parity gate
closed.** Neither is the product owner, as of this pass.

### The single highest-value action

Engage the reviewer. Everything in the second table waits on it, requirement 4 is
per-family across all six, and it is the only dependency whose duration we do
not control. Starting it late costs more than any other delay on the board.

### Second-highest

Send legal Track 1 today. It is genuinely independent, and if the corpus
ownership answer requires a different production method we would rather know
before commissioning more writing.

### Worth doing in the same motion

The Three Sections acquisition and the Twelve Palaces chapter body need the same
skills and probably the same library visit. Commission them together.

---

## Contingency posture

`docs/RELEASE_GATES.md` defines the measurement-only path. **Current
recommendation: do not take it.** It is not on the table until the reviewer
engagement has been made and has demonstrably stalled.

One correction to the earlier framing: the contingency is **not** entirely
gate-free. The Qi Se colour vocabulary draws on 素問 ch. 17, and two of its five
similes are interpretive renderings pending the same reviewer. That is one
narrow question about five sentences rather than six families of heritage
content — materially shorter, but not zero.
