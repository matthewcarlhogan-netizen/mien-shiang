# Retention experience contract

**Status: product-owner direction, 30 August 2026, implementing `docs/PRODUCT_NORTH_STAR.md`.**
This is the contract every retention mechanism — existing or proposed — is checked against. It
does not itself measure whether the product currently meets it; `docs/HERITAGE_LIBRARY_READINESS.md`
carries the measured result for the heritage dimension, and the four-analysis retention simulation
it reports on is a separate, dated measurement, not part of this contract.

## The core retention rule

A return to the product is legitimate — worth the user's time, and worth counting as a good
outcome for the product — only if it does **at least one** of the following real things:

1. adds a new real frame to the user's visual history;
2. reveals a changed self-relative measurement (Qi Se, against the user's own baseline only);
3. extends an existing trajectory (a pattern visible across several readings, not one);
4. establishes a more reliable personal baseline (more history behind Qi Se's own comparison);
5. gives richer historical context because more history now exists (a then/now comparison, a
   longer flick-book, a year-in-review — only possible once enough real frames exist);
6. exposes a genuinely different heritage relationship, witness, or disagreement the user has not
   seen before, drawn from real source-attested material (`docs/HERITAGE_LIBRARY_READINESS.md`);
7. provides a meaningful steady-state observation — see "Steady days" below, because "nothing
   changed" is itself sometimes the honest and useful thing to say;
8. lets the user view their accumulated timeline in a way they could not before (a new playback
   mode operating on real, growing data — never a mode that requires more history than exists).

This list maps to `docs/PRODUCT_INVARIANTS.md`: item 2 is I3 (history materially affects
readings); item 6 is I7 (heritage passages do not mutate merely for variety — the rotation must be
a genuinely different relationship, not a reshuffled presentation of the same one); item 3 and 4
depend on I1/I2 holding (materially different states read as materially different, returning
states get meaning-preserving variation, not cosmetic variation mistaken for it).

## Prohibited retention mechanics

None of the following may ship, in any tier, on any surface:

- streak loss or "don't break your streak" framing;
- fear-based urgency ("your reading expires", "last chance");
- loot-box or randomised-reward mechanics of any kind;
- fabricated scarcity ("only available today");
- manipulative countdowns;
- shame, guilt, or any negative framing for a missed day.

**This list is a design constraint, not a vocabulary ban.** This document, and the tests that
enforce it once there is a real reader-facing surface to scan (Daily Portrait UI copy, landed in
PR C), must be able to name "streak" and "countdown" to explain why they are prohibited, and a
test fixture may need to construct one to prove a guard actually fires. A repository-wide
banned-word scan would therefore fail this very document. The correct enforcement, when built, is
scoped to production UI/copy registries and reader-facing strings only, with documentation, design
notes and test fixtures explicitly exempted — and it tests **behaviour** (does the product treat a
missed day as a failure state, visually or textually?), not the mere absence of a word from a
markdown file.

**No-notification direction is preserved.** The product does not push notifications to remind,
nag, or re-engage. This retention program does not reopen that decision; if it is reopened, that
is a separate, explicit product-owner decision recorded in `docs/DECISION_REGISTER.md`, not an
inference from anything in this document.

## A missed day is a gap, not a failure

The visual record may have gaps. A gap is simply the honest state of the data — the user did not
capture that day. The product must never:

- interpolate a fake photograph for a missing day;
- AI-generate a face to fill a gap;
- morph between the two real photographs on either side of a gap to fabricate a frame that never
  existed;
- present a gap with language implying the user did something wrong.

Playback (flip, scrub, year timelapse) may visually **traverse** a gap — moving from the last real
frame before it to the first real frame after — but the underlying data always preserves the gap
as a gap, and no synthetic frame is ever generated, stored, or counted as if real. See
`docs/DAILY_PORTRAIT_ARCHITECTURE.md` for the exact data-model expression of this rule.

## Milestones are unlocked capabilities, not badges

Day 1, 7, 30, 90, 180, 365 and multi-year use are not rewarded with a badge, a checkmark, or
congratulatory copy for its own sake. Each is meaningful only because enough real history now
exists to support a **new capability that did not exist before**:

| Milestone | What becomes possible, because it is now true |
|---|---|
| Day 1 | The timeline exists. Qi Se begins forming a baseline. Heritage is shown once, honestly labelled as the first of an ongoing rotation. |
| Day 7 | A one-week flick-book is watchable. Qi Se can begin to speak to a very short trajectory, cautiously. |
| Day 30 | A month flick-book. Qi Se's baseline is materially more reliable (`historyStageOf` in `src/qise/reading-state.js` already distinguishes `calibrating`/`establishing`/`established`). The heritage rotation has cycled through enough constructs that its cyclical nature itself becomes visible and legible, which is the point of `heritageRotation()`'s design (`src/qise/reading-pipeline.js`). |
| Day 90 | A quarter's worth of then/now comparisons across a real range of dates. Established Qi Se baseline throughout. |
| Day 180 | Half a year of playback; genuinely long-baseline trajectory language becomes honest to use. |
| Day 365 | A year-in-review is possible against real seasonal/lifestyle variation the user actually lived through, not a synthetic approximation of it. See `docs/PRODUCT_NORTH_STAR.md`'s "Day 365 experience" acceptance test. |
| Multi-year | The archive itself becomes the asset — see `docs/BACKUP_ARCHIVE_FORMAT.md`'s portability requirement, because a multi-year face-photo archive is exactly the kind of thing that must survive this product disappearing. |

No milestone is granted early by manufacturing data to simulate having reached it. If a metric
requires 90 days of real capture, showing it at day 40 with synthetic padding is exactly the
"loot-box"/fabrication failure this contract exists to prevent, even though it is not literally a
loot box.

## Determinism is preserved — novelty comes from real dimensions, never from randomness

`docs/PRODUCT_INVARIANTS.md` I2 already requires that returning states receive **deterministic
but meaning-preserving** variation. This program does not weaken that to manufacture daily
novelty. Legitimate sources of novelty, all already present in the codebase's design or specified
in this program's architecture docs:

- accumulated history (more segment data => `historyStageOf`, `recentMovements` genuinely differ);
- trajectory (`trajectoryOf()` in `src/qise/reading-state.js`);
- occurrence (`occurrenceIndexFor()` walks the same deterministic state-key history every time);
- heritage rotation (`heritageRotation()` — a legible cycle, not a hash);
- a new real capture (a new frame exists that did not exist yesteday);
- a new Daily Portrait baseline stage (PR C);
- a new actual measurement (Qi Se's own delta-vs-baseline arithmetic);
- timeline playback modes newly available because enough history exists;
- newly-available longitudinal comparisons (then/now pairs that did not exist until both ends of
  the pair were captured).

Explicitly not a legitimate source of novelty: `Math.random()`, a date-derived seed used as a
substitute for a real state dimension, cosmetic noise injected into otherwise-identical output, or
fabricated "daily fortune" content unconnected to any measured or historical fact. Any future
retention mechanism proposed against this contract is checked against this list before it ships.

The compatibility passage path follows the same rule: `passageFor()` accepts an explicit numeric
occurrence, and `passageOccurrenceFor()` derives that number from the reader's preceding valid
history in the same visible passage cell. A timestamp may identify a stored row for reopening, but
it cannot select new words. The Reflection Engine's state identity and the passage engine's
presentation occurrence are therefore separate by design.

## Steady days are a first-class experience

Retention must work when the face does not materially change — most days, for most users, this is
the common case, not the edge case. A steady day still legitimately gains value from: another real
timeline frame existing (item 1 above); the baseline maturing (item 4); recurrence context (a
"this is the fourth time you've measured `ping`/level this month" kind of honest observation,
built from real occurrence counts, never invented); a genuine return-to-usual event (the state
changed and then changed back — that is real information, not padding); a heritage discovery the
user has not seen in this rotation before; or a user-initiated reflection (a journalling prompt,
already part of the product's layered-reading design in `docs/PROJECT_CHARTER.md`).

**What is not acceptable:** manufacturing a "finding" because a steady day is otherwise
uneventful. If nothing changed and no new heritage content is due, the honest response is calm,
plain language saying so — not an invented observation dressed up to look like news.

## No appearance judgment, ever, from any retention mechanism

Retention copy may never imply "better", "worse", "younger", "older than expected",
attractiveness, weight change, health, stress, beauty, or symmetry quality — regardless of how the
underlying measurement actually moved. This applies to every milestone, every steady-day message,
and every playback caption. See `docs/PRODUCT_NORTH_STAR.md`'s non-goals and
`docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s "no appearance judgment from the timeline" for the copy
vocabulary this implies.

## The hard retention question, and how it is measured

*When does this app run out of interesting things to say or show?* — is a first-class, measured
question, not a design aspiration. `docs/HERITAGE_LIBRARY_READINESS.md` reports the measured
answer for the heritage dimension specifically (exact repetition intervals, material diversity,
exhaustion point) across the four separately-labelled retention analyses defined there
(`PUBLIC_SHIPPED_RETENTION`, `INTERNAL_REFLECTION_RETENTION`, `LATENT_HERITAGE_EXHAUSTION`,
`DAILY_PORTRAIT_COMPOUNDING_MODEL`). This contract does not restate those numbers — they are
measured, dated evidence, not a durable product commitment, and belong in one place so they cannot
drift out of step with the code that produces them.

## Product-moat check

Before any future feature is added under this contract, it should be able to answer: does this
strengthen the combination named in `docs/PRODUCT_NORTH_STAR.md` (disciplined guided capture +
self-relative baseline + provenance-rich heritage + honest measurement/tradition separation +
portable long-lived archive), or does it strengthen only one part in a way a generic selfie app
could copy in a week on its own? Work that does not strengthen the combination is deprioritised,
not necessarily rejected outright — but it does not draw on this contract's retention-legitimacy
list to justify itself.
