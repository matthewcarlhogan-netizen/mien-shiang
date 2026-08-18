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
| Class-A dispositions R1–R14 | **Closed** — `DR-2026-08-17-B020-CLASS-A` |
| Su Wen edition, designated edition families | **Closed** — `docs/EDITION_DECISIONS.md` |
| Cultural review — Q1–Q4 and requirement 4 × 6 families | **Open** — brief issued, no reviewer engaged |
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

## GATE 2 — MEASUREMENT-ONLY CONTINGENCY

**Qi Se measurement + personal history. Heritage layer disabled.**

### What this is

A fallback for one specific scenario: **external review becomes the only thing
preventing release.** Not a smaller product we are aiming at. Not a phase one.
A hedge against a dependency we do not control.

### Why it exists as a formal path rather than an improvisation

If the reviewer engagement takes six months, the choice is between shipping
nothing and improvising a cut-down build under time pressure. Improvised cuts
are where safety gates get dropped. Defining the contingency now means the cut
is a configuration, not a scramble.

### What it contains

- Qi Se measurement against the user's own baseline
- Personal history, trajectory, confidence, abstention
- The Observation layer of the Reflection Engine
- **No heritage passages. No source attributions. No reflection questions** —
  those are the Heritage and Reflection layers, and both carry the blocked
  content.

### Why it has no open cultural or rights gate

The measurement layer makes no traditional claim. It compares a user to their
own previous photographs and abstains when it cannot. The Qi Se **colour
vocabulary** does draw on 素問 ch. 17, whose edition is now recorded and whose
rights are public domain — but the two flagged renderings (澤 as "dampened",
地蒼 as "charcoal") are still pending cultural review.

**So this path is not entirely gate-free.** It is gated on one narrow question
about five colour similes, rather than on six families of heritage content.
That is a materially shorter dependency, and it should be stated that way rather
than as "no gates".

### Release condition

`qi-se-reading-v1` cleared, heritage families **not required**, plus a recorded
decision that the contingency is being taken and why.

---

## The rule that keeps these apart

**Engineering does not treat Gate 2 as the north star.**

Concretely, that means:

- New work is specified against the full product. If a feature only makes sense
  without heritage, it is contingency work and is labelled as such.
- The Heritage and Reflection layers stay in the codebase, tested, and running
  on internal builds. They are not "removed pending review" — they are gated.
- The contingency is a **flag state**, not a branch. A long-lived
  measurement-only branch would drift, and the drift would quietly become the
  product.
- No roadmap item is deferred *because* it is heritage-dependent. Deferring
  those is how a hedge becomes a direction.

### The signal that we have drifted

If someone proposes a change that improves Gate 2 at the cost of Gate 1, and the
argument is "we can ship it sooner" — that is the drift, and it should be named
as a Gate 1 regression rather than debated on its merits.

---

## Current recommendation

**Stay on Gate 1.** The critical path is one hire and it has not been attempted
yet. Gate 2 is not on the table until the reviewer engagement has been made and
has demonstrably stalled.

Price the contingency; do not take it.
