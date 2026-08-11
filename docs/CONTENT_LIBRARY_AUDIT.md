# Face-reading content library audit

Status: expansion foundation, 11 August 2026.

## What exists

The current application contains six governed content families:

| Family | Current coverage | Provenance ID |
|---|---:|---|
| Five Elements | five elements mapped across six face-shape classes | `five-elements-v1` |
| Three Courts | three courts; the upper boundary substitutes the face oval for the unmeasured hairline | `three-courts-v1` |
| Twelve Palaces | twelve listed, six sampled from the current regions | `twelve-palaces-v1` |
| Qi Se reading | three bands over measured colour signals | `qi-se-reading-v1` |
| Proportion harmony | four possible components, with unavailable components dropped | `harmony-v1` |
| Qi Se passages | 12,000 theoretical compositions from the current keyed fragments | `qise-passages-v1` |

Twelve thousand compositions are narrative variety, not twelve thousand
independently sourced interpretations. Completeness is measured by supported
regions, source quality and reviewed content, never by multiplying sentence
fragments.

## What does not exist yet

The explicit expansion queue is exported from `src/reading/provenance.js` and
currently covers the six unsampled Palaces, brows, eyes and lids, ears, nose
structure, mouth and philtrum, visible lines and markings, and traditional
position/life-stage maps.

An item in that queue is not permission to infer it. Each addition needs:

1. a facial region the scanner can measure reliably;
2. real-device repeatability and abstention results;
3. a named source and precise locator;
4. edition or translation rights review;
5. contributor attribution and an agreement on file;
6. cultural review, including contested interpretations;
7. bounded entertainment copy that does not become identity, demographic,
   attractiveness, health, personality or future-event profiling.

## Publication gate

`auditContentProvenance()` is intentionally red for all existing families. The
repository currently records unresolved source references, unverified rights
and pending cultural review. No content family may be described as commercially
cleared until those states are replaced with evidence and the repository's
commercial-rights audit exists.

New prose must not be added directly to a reading module without a stable
content ID. New content IDs must resolve to known source and contributor IDs;
unknown references fail the provenance tests. A source ID is not evidence by
itself: its citation and rights states must also be verified and cleared.

## Deliberate exclusions

The library is expandable but not unlimited in the sense of making every
possible claim. It does not use a face to identify a person, estimate protected
demographics, diagnose a condition, score attractiveness, assert stable
personality traits or predict events. Those are product-boundary changes, not
additional passages.
