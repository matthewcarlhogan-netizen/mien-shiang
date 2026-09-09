# Release gates

**Two gates. One target. Product-owner direction, 17 August 2026.**

---

## GATE 1 — FULL PRODUCT (the target)

**Qi Se measurement + personal history + Heritage + Reflection Engine.**

This is the product. Pattern × Co–Star × Mien Shiang, with the scholarly
heritage and reflection layer as the core differentiator — the thing no
competitor in this category can copy without dismantling their own claims.

### Open requirements

| Requirement | State |
|---|---|
| Engine correctness, coverage, traceability, variation | **Closed** — `docs/PARITY_2026-08-17.md`, 10/10 gates |
| Class-A dispositions R1–R14 | **14 of 14 closed** — `DR-2026-08-17-B020-CLASS-A` closed ten; R3, R6, R8 and R9 were approved 9 September 2026 by `DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9`, which records the product owner's disposition for each against `docs/OPTION_B_020_DISPOSITIONS.md`. R8's code consequence (an explicit suppression list in `src/reading/twelve-palaces.js`, distinct from the construct's general source-review withholding) is tracked separately — see that entry's Consequences. None of this changes any heritage family's `Blocked` commercial-release status. |
| Su Wen edition, designated edition families | **Closed** — `docs/EDITION_DECISIONS.md` |
| Three Sections primary source | **Open** — `docs/ACQUISITION_THREE_SECTIONS.md` |
| Twelve Palaces chapter body | **Open** |
| Corpus ownership determination | **Open** — Track 1, `docs/LEGAL_PARALLEL_TRACK.md` |
| Legal requirement 5 × 6 families | **Open** — Track 2 |
| Evidence hashed into the manifest | **Open** |

### Release condition

All six families `cleared` in `docs/commercial-rights-manifest.json`, verified by
`npm run audit:release`, **and** the public default flipped deliberately in a
recorded decision. Neither alone is sufficient.

---

## Current recommendation

**Stay on the target product.** The critical path is acquisition of the
remaining required evidence.
