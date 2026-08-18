# Product invariants

**Status: permanent product requirements. Product-owner direction, 17 August 2026.**

These survive every future architecture, corpus and UX decision. Each names the
test that enforces it. An invariant without an enforcing test is an intention,
and `tests/qise/product-invariants.test.js` fails the build if this file and the
suite drift apart.

| # | Invariant | Enforced by |
|---|---|---|
| I1 | Materially different interpreted states produce materially different readings. | `tests/qise/reading-collision.test.js` |
| I2 | Returning states receive deterministic but meaning-preserving variation. | `tests/qise/reading-variation.test.js` |
| I3 | History materially affects readings. | `tests/qise/reading-production-path.test.js` |
| I4 | Confidence materially affects language. | `tests/qise/reading-production-path.test.js` |
| I5 | Abstention never masquerades as measurement. | `tests/qise/reading-collision.test.js` |
| I6 | Observation, Heritage and Reflection remain traceable as separate layers. | `tests/qise/reading-tiers.test.js` |
| I7 | Heritage passages do not mutate merely for variety. | `tests/qise/reading-variation.test.js` |
| I8 | Pattern × Co–Star × Mien Shiang remains the reading-quality target. | `tests/qise/reading-similarity.test.js` |
| I9 | Evidence may remove an unsupported mechanism; it may not be used to make the product shallow. | `tests/qise/reading-parity.test.js` |

## On I8 and I9

Neither is fully mechanisable, and pretending otherwise would be worse than
admitting it.

**I8** is enforced negatively. No test can score prose as good. The similarity
audit can prove the corpus is not saying one thing many ways — no near-duplicate
components within or across slots, and a one-dimension change that moves more
than a synonym. That rules out the specific failure the quality target is
about; it does not certify the writing. Human editorial review is the rest, and
it has not happened yet.

**I9** is enforced through the parity gate's classification. Every divergence
from the engine being replaced is typed, and "unsupported old behaviour
intentionally removed" is a class that must be justified per record rather than
assumed. Removing a mechanism is allowed. Removing it and leaving a hole is a
regression, and the gate names it as one.

## What this file is not

It is not a record of decisions — those go to `DECISION_REGISTER.md`. It is not
a specification — that is `READING_EXPERIENCE_CONTRACT.md`. It is the short list
of properties that may not be traded away for anything, including for a green
build, a smaller diff, or a deadline.
