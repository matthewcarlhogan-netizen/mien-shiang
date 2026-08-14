# Interpretation-system expansion

## Objective

Produce the broadest useful set of readings that the face scan can support **without inventing evidence**. “Maximum” means maximising verified coverage, variety and contextual usefulness inside a finite, testable system—not generating an unbounded Cartesian product of regions, elements and generic prose.

## Separation of concerns

The pipeline is:

`capture → quality gates → measurements → verified features → eligible traditions → reading candidates → deterministic selection → rendered reading`

Measurements never contain prose. Content never decides whether a measurement is valid. Every reading can be traced to a feature, rule version, source record and copy version.

## Core records

Define versioned schemas for:

- `SourceRecord`: edition/translation, location, quotation or bounded paraphrase, allowed use, disagreement and reviewer.
- `RegionDefinition`: tradition/system, geometry, MediaPipe evidence, confidence, `needsVerification` and exclusions.
- `FeatureSignal`: measurement, unit, capture quality, confidence, baseline relationship and eligibility.
- `InterpretationRule`: required/forbidden signals, confidence floor, tradition, source IDs, sensitivity class and precedence.
- `ReadingVariant`: stable ID, feeling/observation, reflective action, tone, locale, source IDs and blocked-copy scan result.
- `CompositionRule`: compatible slots, conflict resolution, repetition limit and maximum reading length.
- `ReadingTrace`: input versions, eligible candidates, selected IDs, rejected reasons and seed/version for reproducibility.

## Coverage axes

Build a coverage matrix before adding prose. It may include only verified, approved axes:

- classical system and region;
- signal state and confidence band;
- personal baseline state where valid;
- time/context stage supported by the product;
- compatible secondary signal;
- tone and action family;
- novelty relative to recent local readings.

Each cell is `supported`, `abstain`, `source-needed`, `geometry-needed` or `copy-needed`. Coverage targets count supported cells, not theoretical combinations.

## Composition rules

- Lead with one dominant, high-confidence observation. Add at most the number of secondary observations proven readable in UX tests.
- Never combine contradictory traditions as if they agree. Label the system or choose one according to an explicit rule.
- Qi Se is personal-baseline deviation, not comparison with other users and not an assertion about health or protected traits.
- Prefer a specific feeling or tension followed by a bounded reflective action. If swapping the named element/region leaves the text equally plausible, revise it.
- Use deterministic selection with controlled recent-history suppression so the same inputs remain explainable while copy does not feel repetitive.
- Abstain when quality, geometry, source or confidence requirements fail.

## Quality gates

- Schema validation and stable unique IDs.
- Every production rule references verified geometry and an allowed source use.
- No orphan content and no unreachable rules.
- Enumerate the finite eligible state space at a fixed schema/corpus version.
- Pairwise and within-rule copy-similarity thresholds are measured and reported; thresholds are decisions, not magic numbers.
- Blocked medical, divinatory and protected-trait terms fail the build, with narrowly reviewed source-attribution handling where permitted.
- Golden fixtures prove determinism, conflict handling, abstention and traceability.
- Fairness tests cover capture quality and personal-baseline behaviour across representative devices and appearances without creating cross-user skin-tone norms.

## Definition of done for an expansion

An interpretation is shippable only when its source use, geometry, signal eligibility, copy, trace and rendered UI all pass review. A large corpus with unreachable, repetitive or unsupported entries is not progress.
