# Reading Experience & Personalisation Contract

**Status: product-owner direction. Binding.**
Recorded 17 August 2026. Supersedes any conflicting guidance in design notes.

These are hard product requirements for the reading engine and user experience.
They are written to survive future architecture, corpus, UX and implementation
decisions. Where a clause is machine-enforced, the enforcing test is named — a
requirement that only exists in prose is not a requirement.

---

## 1. The experience

**The Pattern × Co–Star × Mien Shiang.**

The system underneath may be deterministic, rigorous and evidence-aware. The
reading on the surface must not feel technical. It should feel personal,
perceptive, specific to today, reflective, occasionally confronting, poetic
without becoming meaningless, worth returning to, different when the underlying
state is meaningfully different, and deep enough to explore on demand.

The user should feel: *this reading was assembled for my state today, in the
context of my own history.*

Not: *another generic face-reading paragraph.* Not: *a diagnostic dashboard.*

## 2. HARD RULE — materially different states produce materially different readings

Non-negotiable. No two materially different interpreted states may resolve to
the same reading unless the difference has been explicitly classified as
non-reading-affecting.

The pipeline preserves difference end to end:

```
face → measurements → personal baseline comparison → interpreted state
     → heritage / reflection context → personalised reading
```

Raw landmarks are not reading states. The engine operates on derived meaning:
region, axis, direction, magnitude band, confidence band, baseline state,
history stage, persistence, trajectory, capture eligibility, heritage construct,
heritage region, source lineage, availability, optional self-report.

*Enforced:* `tests/qise/reading-collision.test.js` — "no two materially
different states produce the same reading".

## 3. Deterministic state identity

Every reachable reading state has a deterministic `stateKey`:

```
region | ascendant | direction | magnitudeBand | confidenceBand
       | historyStage | trajectory | heritageConstruct | sourceLineage | availability
```

Not every field must affect every reading. Every field **declared**
reading-affecting must be **capable** of affecting the reading. The system must
not calculate meaningful context and then silently discard it.

Fields that are intentionally non-identifying are declared as such in
`NON_READING_AFFECTING` — explicitly, in the schema, not by omission.

*Enforced:* `tests/qise/reading-state.test.js` — the key is pinned literally, so
a reorder or rename is a visible change rather than a silent invalidation of
every stored key and declared equivalence.

## 4. Collision detection is enforced in tests

The build fails when:

1. two materially different state keys produce the same final reading without an
   explicit exemption;
2. a reachable state has no valid reading or controlled fallback;
3. a supposedly distinct reading differs only cosmetically;
4. a reading-affecting field is calculated but has no effect anywhere downstream;
5. randomness makes identical states produce unrelated interpretations;
6. an abstention state receives prose assuming the unavailable observation was
   successfully measured.

Intentional collisions may exist. They are declared in `DECLARED_EQUIVALENCES`
with a `sharedReadingReason`. An undeclared collision is a defect.

*Enforced:* `tests/qise/reading-collision.test.js`, fourteen tests, sweeping the
full reachable space exhaustively rather than by sample.

## 5. Compositional personalisation, not a paragraph per combination

Readings are assembled from controlled components: headline, primary
observation, change description, historical context, trajectory, heritage
passage, reflective bridge, question, confidence language, availability
explanation, optional self-report connection.

The objective is **maximum meaningful variation, not maximum random variation.**

## 6. The quality bar

From **The Pattern**: depth, psychological resonance, the sense that several
signals were synthesised, language that makes the user stop.
From **Co–Star**: ritual, concise headline, distinctive voice, immediate
relevance, progressive disclosure.

Both are experiential references. Neither is a content source.

What Mien Shiang adds and neither has: the user's own face as a longitudinal
input, plus a deep physiognomy heritage system with original passages, source
provenance, competing lineages, historical disagreement, transparent
measurement limits, and abstention where the camera cannot support an
observation. **That combination is the identity of the product.**

## 7. Three epistemic layers

| Layer | Content | Constraint |
|---|---|---|
| **Observation** | What the camera and the longitudinal system can support | Must be traceable to measurement |
| **Heritage** | What the tradition says | Must be attributed and provenance-aware; never presented as evidence about the user |
| **Reflection** | Today's observation placed beside an appropriate heritage idea | Symbolic, not inferential — and the prose says so |

The distinction exists in the data model even where the UX presents it
elegantly. *Enforced:* components declare a `layer`; every reading must produce
content in all three.

## 8. The target reading

State: central region, warmer than baseline, moderate magnitude, moderate
confidence, established baseline, recent upward movement, Central Mountain
rotation, eligible capture.

The user must **not** see: `Ming +0.37 SD. Warmth elevated. Central Mountain
state activated.`

The user sees prose, then: *Why am I seeing this? · Explore the tradition →
· Compare with my history →*

## 9. Personal without unsupported claims

The writing may feel highly personal without claiming that facial measurements
reveal personality, character, health, destiny, wealth, longevity or future
events. **Compliance is not solved by making the writing bland.**

The distinction is between *your face proves you are experiencing X* and
*today's pattern gives us a reason to place these two ideas beside each other.*

## 10. History materially changes the reading

First occurrence, repeated occurrence, persistent movement and return toward
baseline are four different readings of the same region and the same
measurement. This is the largest legitimate source of personalisation available.

*Enforced:* `trajectory` is reading-affecting and must move the output.

## 11. Confidence affects language

Not a badge. High confidence speaks plainly; moderate hedges; limited names the
capture conditions; below threshold abstains. **Never manufacture certainty to
make a reading more exciting.**

## 12. Abstention is part of the experience

An unavailable reading is not a broken reading. Each abstention states its
reason. The product should become known for saying *we don't know* where
competitors invent an answer.

*Enforced:* every abstention must give a reason, and components that assume a
measurement must return nothing at all.

## 13. Heritage rotation must not fake personalisation

The daily passage rotates deterministically. The UX must distinguish *this
appeared because your measurement changed* from *this is today's scheduled
heritage study*, and must never imply the second is the first.

*Enforced:* `rotationDisclosure` is returned outside the prose so a surface
cannot drop it while keeping the passage.

## 14. Self-report is a legitimate personalisation axis

Energy, sleep, jaw tension, mood — explicitly user-reported, always. It creates
longitudinal context far stronger than pretending the camera inferred tiredness.
Correlation is described carefully and never becomes causation or diagnosis.

Self-report is declared **non-identifying**: it enriches a reading, it does not
change which state the reading is.

## 15. Progressive depth

**Tier 1 — Today.** Observation plus primary reflection. Fast.
**Tier 2 — Reading.** The richer interpretation.
**Tier 3 — Why / Study.** Measurements, personal history, confidence, source,
original Chinese, translation, edition, authorship status, competing lineages,
disagreement, availability, and why this reading was assembled — what was
measurement, what was heritage, what was reflection.

Complexity belongs underneath the experience, not in front of it.

## 16. Determinism over randomness

Given the same state, history, settings, corpus version and rotation state, the
system reproduces and explains the reading. Variation may be deterministic and
seeded. `Math.random()` must never determine substantive meaning.

The system must always be able to answer **"why did I receive this reading?"**

*Enforced:* a source scan fails the build on `Math.random` or a wall-clock read
in any reading module; `explainReading()` returns the per-sentence causes.

## 17. Corpus quality over quantity

Do not inflate combination counts with weak fragments. A smaller collection of
excellent modular writing that combines intelligently beats an enormous corpus
of generic horoscope language. Review tests: specificity, repetition, semantic
duplication, tone, cultural accuracy, unsupported inference, internal
contradiction, and whether the component actually responds to its state inputs.

## 18. The north-star test

> Does this make today's reading more personally relevant, more trustworthy,
> more beautiful or more useful **without pretending the camera knows something
> it cannot know?**

If yes, it belongs. If it creates apparent personalisation by inventing
certainty, it does not.

## 19. The two non-negotiable markers

**MARKER 1 — State differentiation.** Materially different interpreted states
produce materially different readings. Enforced programmatically.

**MARKER 2 — Reading quality.** Every reading reaches a Pattern/Co–Star level of
perceived personal relevance while remaining completely traceable to the
observation, history, heritage and reflection inputs that generated it.

These are not temporary implementation guidance. They define the product.

## 20. North star

Mien Shiang should feel like it knows today's pattern because it **remembers the
user's own history** — not because it pretends to know who they are from the
shape of their face.

Measurement provides today's evidence. History provides personal context. The
classical tradition provides depth. The Reflection Engine brings them together.
The user receives something worth thinking about.
