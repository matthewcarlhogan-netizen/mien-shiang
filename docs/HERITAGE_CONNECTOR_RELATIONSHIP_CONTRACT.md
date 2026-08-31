# D-2 — Heritage connector relationships: root cause, inventory, and the selection contract

Measured on `claude/heritage-connector-relationships-d2`, from `1cd96de`. Every number below
comes from running the production registries and resolver through the internal analytical seam
(`composeHeritageConnectionsWithRegistries()`), never from reading a field name and inferring
what it does.

**This document changes no runtime behaviour.** It records what the constraint actually is and
freezes the contract any expansion must satisfy.

---

## 1. Root cause of connector residue = 1

`scripts/heritage-readiness.mjs`'s `connectorResidue()` returns 1 whenever
`composeLatent(...).active.length <= 1` — "nothing to rotate". Measured, at full latent
authorisation (`captureQualityPassed: true`, `safetyPassed: true`), across all six constructs and
both lineages:

| construct/lineage | active | sourcePanelOnly | abstentions |
|---|---|---|---|
| threeSections/primary | **0** | 0 | 2 |
| fiveElements/primary | **0** | 0 | 2 |
| twelvePalaces/primary | **0** | 0 | 0 |
| fiveMountains/primary | **0** | 0 | 5 |
| **fourRivers/primary** | **1** | 0 | 5 |
| fourRivers/variant | 0 | 1 | 5 |
| fiveOfficers/primary | **0** | 1 | 0 |

`four-rivers-flow-and-banks` is **the only active heritage connector anywhere in the product.**

### The cause is a two-gate conjunction, and the gates are anti-correlated

`active` admission requires `runtimePolicy === "HERITAGE_PRESENTATION_ALLOWED"`
(`resolver.js:1050`, `:1065`, `:1084` — `RESEARCH_ONLY` and `SOURCE_PANEL_ONLY` are both
diverted before the `active.push`). Independently, `classifyRelationshipAvailability()`
(`resolver.js:201-219`) grades a connector `FULLY_AVAILABLE` only when the connector's own
`measurementAvailability` **and** every participant construct-lineage's **and** every
declared `historicalState`'s all classify as `capturable` (`SUPPORTED_2D` or
`CONDITIONALLY_SUPPORTED`).

Cross-tabulating the two over all 15 connector records:

| relationship availability | HERITAGE_PRESENTATION_ALLOWED | SOURCE_PANEL_ONLY | RESEARCH_ONLY |
|---|---|---|---|
| FULLY_AVAILABLE | **0** | 0 | **2** |
| PARTIALLY_AVAILABLE | **0** | **1** | 0 |
| HERITAGE_ONLY | **3** | 0 | 0 |
| UNAVAILABLE_FROM_CAPTURE | 0 | 0 | 9 |

**The diagonal is empty. No connector in the registry is both measurable and authorised.**

- The only two `FULLY_AVAILABLE` connectors — the only two relationships this product can
  actually observe in a front-on photograph — are both `threeSections`, and both are
  `RESEARCH_ONLY`.
- The only three `HERITAGE_PRESENTATION_ALLOWED` connectors are all
  `CAMERA_GEOMETRY_INSUFFICIENT`, so they can only ever be `HERITAGE_ONLY` — attributed
  tradition shown beside the reading, never conditioned on it.

That is the residue of one, stated exactly. Against the six candidate causes:

| candidate cause | verdict |
|---|---|
| 1. only one admitted relationship | **No.** 15 records exist; 11 are diverted by `runtimePolicy`, 1 to a source panel. |
| 2. relationships collapsing during normalisation | **No.** Every record survives to a disposition with a named `gateReason`. |
| 3. conditions never becoming reachable | **Partly** — the `fiveMountains` sub-case only (below). Not the general cause. |
| 4. selection logic discarding valid candidates | **No.** Selection never runs; nothing reaches `active` to be selected among. |
| 5. provenance / availability gates excluding them | **YES — this is the cause.** |
| 6. error in the readiness measurement | **No.** The harness reports `active.length` faithfully; `active` is genuinely 0 or 1. |

### The `fiveMountains` sub-case — a second, independent gate

Two of the three `HERITAGE_PRESENTATION_ALLOWED` connectors
(`five-mountains-mutual-facing`, `five-mountains-fullness`) still never reach `active`, because
the selected lineage carries its own `runtimeStatus`:

| construct/primary lineage | `runtimeStatus` | `measurementAvailability` |
|---|---|---|
| threeSections | `RESEARCH_ONLY` | `SUPPORTED_2D` |
| **fiveMountains** | **`RESEARCH_ONLY`** | `CAMERA_GEOMETRY_INSUFFICIENT` |
| **fourRivers** | **`RUNTIME_PROSE`** | `CAMERA_GEOMETRY_INSUFFICIENT` |
| fiveOfficers | `RUNTIME_PROSE` | `CONDITIONALLY_SUPPORTED` |
| fiveElements | `RUNTIME_PROSE` | `MODERN_MAPPING_UNSUPPORTED` |
| twelvePalaces | `RESEARCH_ONLY` | `CONDITIONALLY_SUPPORTED` |

`fourRivers/primary` is `RUNTIME_PROSE` and `fiveMountains/primary` is not — that single
difference is why exactly one connector is active in the whole product. `fiveMountains` is
CARD 7 (`ABSTRACT_LINEAGE_OVERRIDES` deliberately empty); this is a **withheld decision, not a
defect**, and must not be routed around.

### The third constraint, which is the deepest and was not previously recorded

Both measurable, verified relationships carry **fortune or status predicates in their source
text**:

- `three-sections-facial-proportion-taiqing` — 三停皆稱乃上相之人矣. 上相 is a rank/fortune
  claim.
- `five-officers-one-good-office-ten-years` — 或一官好則貴十年. 貴 is a rank/fortune claim.

The locked product decisions strip longevity, fortune, wealth and character semantics. So the
relationships this product *can* measure are precisely the ones whose classical predicates it is
*forbidden to state*. Promoting either verbatim would breach a locked decision, not merely a
style rule. Any promotion must carry the geometric predicate and abstain from the fortune
clause — which is a content decision, recorded here, not applied.

---

## 2. Relationship inventory

15 connector records. `constructs` is derived from `participants[].constructId`; two records are
concept-only and scope to no construct.

| connector | construct(s) | relType | policy | evidence | measAvail | availability |
|---|---|---|---|---|---|---|
| three-sections-equality-mayi-received | threeSections | COLLECTIVE_RULE | RESEARCH_ONLY | RECORDED_NOT_VERIFIED | SUPPORTED_2D | FULLY_AVAILABLE |
| three-sections-facial-proportion-taiqing | threeSections | COLLECTIVE_RULE | RESEARCH_ONLY | VERIFIED_PRIMARY | SUPPORTED_2D | FULLY_AVAILABLE |
| five-forms-generative-overcoming-system | fiveElements | COLLECTIVE_RULE | RESEARCH_ONLY | RECORDED_NOT_VERIFIED | MODERN_MAPPING_UNSUPPORTED | UNAVAILABLE |
| five-forms-like-with-like | fiveElements | COLLECTIVE_RULE | RESEARCH_ONLY | VERIFIED_PRIMARY | MODERN_MAPPING_UNSUPPORTED | UNAVAILABLE |
| five-mountains-mutual-facing | fiveMountains | COLLECTIVE_RULE | **HERITAGE_PRESENTATION_ALLOWED** | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | HERITAGE_ONLY |
| five-mountains-fullness | fiveMountains | COLLECTIVE_RULE | **HERITAGE_PRESENTATION_ALLOWED** | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | HERITAGE_ONLY |
| **four-rivers-flow-and-banks** | fourRivers | COLLECTIVE_RULE | **HERITAGE_PRESENTATION_ALLOWED** | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | **HERITAGE_ONLY — the one active** |
| four-rivers-mutual-facing | fourRivers | COLLECTIVE_RULE | RESEARCH_ONLY | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | UNAVAILABLE |
| four-rivers-shen-corresponds | fourRivers | CORRESPONDS_TO | RESEARCH_ONLY | VERIFIED_PRIMARY | UNMEASURABLE | UNAVAILABLE |
| five-mountains-four-rivers-corresponds | fiveMountains+fourRivers | CORRESPONDS_TO | RESEARCH_ONLY | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | UNAVAILABLE |
| heritage-qise-modifies-form-shen-mountains-rivers | fiveMountains+fourRivers | MODIFIES | RESEARCH_ONLY | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | UNAVAILABLE |
| yuebo-mountains-rivers-form-shen-configuration | fiveMountains+fourRivers | CONJUNCTIVE_CONFIGURATION | RESEARCH_ONLY | VERIFIED_PRIMARY | CAMERA_GEOMETRY_INSUFFICIENT | UNAVAILABLE |
| five-officers-one-good-office-ten-years | fiveOfficers | COLLECTIVE_RULE | SOURCE_PANEL_ONLY | VERIFIED_PRIMARY | NOT_RECORDED | PARTIALLY_AVAILABLE |
| shen-requires-form | (concept-only) | REQUIRES | RESEARCH_ONLY | RECORDED_NOT_VERIFIED | UNMEASURABLE | UNAVAILABLE |
| form-requires-shen | (concept-only) | REQUIRES | RESEARCH_ONLY | RECORDED_NOT_VERIFIED | UNMEASURABLE | UNAVAILABLE |

`twelvePalaces` has **zero** connector records of its own.
`prohibitedForUserInference` is `true` on all 15 — that is **required** (`resolver.js:941`
requires it as `lockOk`), not a blocker.

### Per-construct counts

| construct | records | HERITAGE_PRESENTATION_ALLOWED | measurable (FULLY/PARTIALLY) | currently active |
|---|---|---|---|---|
| threeSections | 2 | 0 | **2** | 0 |
| fiveElements | 2 | 0 | 0 | 0 |
| twelvePalaces | **0** | 0 | 0 | 0 |
| fiveMountains | 5 | 2 | 0 | 0 |
| fourRivers | 6 | 1 | 0 | **1** |
| fiveOfficers | 1 | 0 | 1 | 0 |

### The one legitimate expansion the corpus already supports

`three-sections-predicate` (disagreement registry, `nature: PREDICATE`, `status: OPEN`) records
**two byte-pinned positions that assert different geometric predicates about the same measurable
construct**:

| position | source | predicate | locator |
|---|---|---|---|
| `taiqing-xiangcheng` | 太清神鑑 | **相稱** — the sections are *in proportion / mutually matching* | 卷一, 卷五, 卷六 — three internal byte-pinned witnesses |
| `yuguan-pingdeng` | 玉管照神局 | **平等** — the sections are *equal* | 卷下, `<pb:KR3g0044_WYG_003_13a>` |

"In proportion to one another" and "equal in length" are **not the same geometric claim**, and
`threeSections` is the one construct whose geometry is `SUPPORTED_2D`. This is a genuine,
source-attested, measurable relationship disagreement — the strongest legitimate candidate for
connector depth in the corpus, and it requires no new source acquisition.

`three-sections-boundaries` (`nature: MAPPING`, 4 positions) is weaker: `common-transmitted`
cites `mianxiang-unspecified` (no identified source) and `received-mayi-contradiction` records a
contradicted attribution. Treat as evidence, not as promotable positions.

---

## 3. The frozen D-2 selection contract

Any implementation of connector depth must satisfy every clause. These are constraints, not
suggestions; each exists because violating it produces a specific, named failure.

### C1 — Only heritage axes may select a relationship

`RESOLVER_DEPENDS_ON` stays `["heritageConstruct", "sourceLineage"]`. **No reading-state
measurement field — `region`, `direction`, `magnitudeBand`, `confidenceBand`, `historyStage`,
`trajectory`, `ascendant` — may select, rank, filter or weight a connector.** A connector
selected by measurement state is a measurement-conditioned heritage claim, which is exactly what
`prohibitedForUserInference: true` forbids and what the measurement/heritage separation exists to
prevent.

### C2 — Measurement state may affect presentation only, and only downstream

Tier 2 may place the reader's own record beside the heritage passage (D-1's `personalContext`)
and may state that a construct's geometry was or was not measurable today. It may **not** use
that to choose which relationship is shown.

### C3 — Several relationships qualify → deterministic rotation over the eligible set

Rotation is the existing coprime-stride walk over `renderPlan.relationshipOrder`
(`resolver.js:110-125`), seeded by `occurrence`. No `Math.random()`, no timestamp, no hostname.
Connector residue is then the count of genuinely eligible relationships and nothing else —
which is what makes the residue an honest measure of library depth rather than of template
count.

### C4 — No relationship qualifies → an honest no-match, never a substitute

The composition returns its existing abstention with a `reasonCode`. Tier 2 states that no
source-attested relationship is available for this construct today. It must not fall back to a
different construct, a weaker record, or generic prose.

### C5 — Lineage disagreement stays visible

Where two positions disagree (`three-sections-predicate`, `four-rivers-eye-mouth`), both are
carried and the disagreement is named. A disagreement is never silently resolved to a house
position, and rotation between two disagreeing positions is **not** a substitute for saying they
disagree.

### C6 — Provenance survives into the composed output

Every rendered relationship carries `sourceId`, locator, `evidenceStrength`, `textualLayer` and
`citationStatus` through to the reader-visible surface, as `heritage-view.js`'s
`connectorEvidenceCard` already does. A relationship whose provenance cannot travel is not
eligible.

### C7 — Abstention prevents unsupported composition

`measurementAvailability` gates what may be *asserted*, independently of what may be *shown*. A
`CAMERA_GEOMETRY_INSUFFICIENT` relationship may be presented as attributed tradition
(`HERITAGE_ONLY`) and may never be presented as observed in this photograph.

### C8 — Deterministic replay

Same state, same occurrence, same registries → byte-identical composition. Pinned in the same
style as D-1's determinism test.

### C9 — The predicate a connector renders must be one the product may state

The fortune/status clause of a source passage (上相, 貴, longevity, wealth, character) is
excluded from reader-facing predicates even when the surrounding relationship is verified and
measurable. Carrying the geometric predicate while abstaining from the fortune clause is
permitted and must be explicit in the record; silently rendering the whole passage is not.

### Prohibited routes to Gate D

Synonyms; template multiplication; changing variant rotation; restating personal context;
manufactured combinations; state labels creating artificial uniqueness; lowering
`evidenceStrength` or `measurementAvailability` thresholds; routing around CARD 7 or CARD 10.
**Connector residue above 1 counts only when it comes from genuine, independently source-attested
relationship records.**

---

## 4. What this means for Gate D

Gate D's `DIVERSITY_TARGET` is 250. If the single strongest legitimate expansion were approved
and implemented in full — both `three-sections-predicate` positions promoted, `threeSections`
routed to `RUNTIME_PROSE` — the connector residue for `threeSections/primary` would be **2**, and
combined material would rise from 24 to roughly 48 against a prose period of 72.

**Gate D would still fail, and should.** The corpus does not contain 250 distinct, verified,
measurable, presentable relationships, and no legitimate amount of engineering produces them.
Reaching 250 requires source acquisition and rights clearance, not code.

The honest position: **connector depth is bounded by the evidence corpus and by what a
front-on photograph can observe, and both bounds are far below the current target.** Either the
target is revised against what the corpus can support, or the corpus is expanded first. That is
a product-owner decision and is recorded here, not taken.

---

## 5. Decisions taken (DR-2026-08-31-D2-CONNECTOR-PREDICATE)

D2-1 approved (must land with D2-2). D2-2 approved with enforcement. D2-3 approved with exactly
**two** records, not three. D2-4 hold the target — Gate D stays at 250, `NOT_READY` accepted,
passing the gate is not authorised.

The original §5 decision list is superseded; see the register entry for the binding wording.

---

## 6. The field-flow trace, and why D2-2 needs a bounded freeze exception

D2-2 requires that `excludedPredicateClauses` be *consumed or otherwise enforced by the
reader-facing path*, and that a project-owned translation of the geometric predicate be
exposed. Tracing that requirement against the real code produces a blocker that must be
recorded rather than routed around.

### 6.1 Neither field can reach a reader today, and two allow-lists are why

```
connector record            src/heritage/registry.js          editable
  -> toResolvedEntry()      src/heritage/resolver.js:754      FROZEN   <-- blocked
    -> connectorCard()      src/ui/qise/heritage-view.js:147  editable <-- also blocked
      -> heritageConnectorTier2Markup / Tier3Markup           -> reader
```

Both stages are **explicit field allow-lists**, not spreads — deliberately, and the design is
correct:

- `toResolvedEntry()` copies exactly 20 named fields off the connector. `relationshipPredicate`
  is **not** among them, and neither is any translation or exclusion field. Everything else on the
  record is dropped at this boundary.
- `connectorCard()` reduces further to 9 fields — `connectorId`, `relationshipLabel`,
  `participants`, `relationshipDirection`, `sourceId`, `sourceTitle`, `sectionLocator`,
  `disposition`, `prohibitedForUserInference`. `connectorEvidenceCard()` (Tier 3) spreads that
  base and adds 8 evidence fields; still no predicate.

So a connector's `relationshipPredicate` is invisible to every reader-facing surface, and adding
`excludedPredicateClauses` to the registry alone would be exactly the "unused metadata" D2-2
explicitly rejects. **The first allow-list that must change is in a frozen file.**

### 6.2 Two records differing only in source are not the distinction D2-3 asks for

Without the predicate, the two Three Sections records differ to a reader only by `sourceId`,
`sourceTitle` and `sectionLocator` — the reader sees *two different sources*, never *two
different claims*. D2-3 requires "a meaningful proportion/equality distinction in the permitted
surface". 相稱 (in proportion) versus 平等 (equal) is that distinction, and it cannot be shown
while the predicate stops at `toResolvedEntry()`.

### 6.3 Where project-owned translations actually live — and why the connector has none

Translation is an established, validated contract, but it exists **only on lineage records**:

| field | on | purpose |
|---|---|---|
| `definition` | lineage | the project-owned English prose; `heritageMaterialFor()` renders it as Tier 2's passage |
| `translationProvenance` | lineage | `PROJECT_ORIGINAL` / `PUBLIC_DOMAIN_TRANSLATION` / `NOT_TRANSLATED_HERITAGE_ONLY`, validated at `validator.js:370,380` |
| `translationAgentId` | lineage | who produced it |

**Connector records carry no translation field of any kind.** They hold `sourceText` (Han),
`note` (an English research note, not reader copy), and — proposed — `relationshipPredicate`
(Han). There is therefore no existing verified path by which an English rendering of 相稱 or
平等 could reach a reader, and none may be invented in an execution handoff.

### 6.4 `englishSafe()` blocks Han, and does not block an English fortune claim

`heritage-view.js`'s `englishSafe()` omits any string containing a Han character, whole, with a
deliberate no-fragment policy: *"a surgically-edited fragment is not a verified translation, it
is a guess with the evidence removed."*

That gives D2-2 half its enforcement for free — 上相 and 貴 are Han, so they can never survive
`englishSafe()` into a reader-facing field. **It gives none of the other half.** D2-2 also bans
"any English rank, status or fortune interpretation", and a project-owned English translation
reading *"a person of superior physiognomy"* would pass `englishSafe()` untouched. A second,
English-vocabulary guard on the translation field is therefore required, not optional.

### 6.5 The smallest explicit architecture exception — PROPOSED, NOT APPROVED

Minimal change set, in dependency order. It reuses the existing validated translation contract
rather than inventing a second one.

1. **`src/heritage/connectors.js`** — three optional fields on `HERITAGE_CONNECTOR_FIELDS`:
   `relationshipPredicate` (already present), `predicateTranslation` (project-owned English),
   `excludedPredicateClauses` (array of excluded source clauses, audit-only, never rendered), and
   reuse of the existing `HERITAGE_TRANSLATION_PROVENANCE` enum for a
   `predicateTranslationProvenance`. **No new enum.**
2. **`src/heritage/resolver.js:754` `toResolvedEntry()` — the freeze exception.** Add exactly two
   pass-through entries, `predicateTranslation` and `excludedPredicateClauses`. No logic change,
   no new branch, no effect on disposition, ordering or selection.
3. **`src/ui/qise/heritage-view.js` `connectorCard()`** — add `predicateTranslation` to the
   allow-list, passed through `englishSafe()` **and** a new `fortuneFree()` guard that omits the
   value if it carries rank/status/fortune vocabulary. `excludedPredicateClauses` is deliberately
   **not** added: it is audit metadata whose enforcement is the guard, and rendering the list of
   things withheld would reintroduce the very clause it excludes.

Step 2 is a Stage 1/2 freeze exception. Under this document's own §3 rules an
`ARCHITECTURE_AFFECTING` change stops and becomes a decision card rather than being smuggled in,
so **it is proposed here and is not authorised.** It is the narrowest form available: two
pass-through fields in one object literal, adding no behaviour to the resolver.

If the product owner declines the exception, D2-2's enforcement clause cannot be satisfied, and
therefore D2-1 (which must land with D2-2) and D2-3's "meaningful distinction" requirement cannot
be satisfied either. The honest fallback is to leave all three unimplemented rather than ship
`excludedPredicateClauses` as unused metadata.

---

## 7. Superseded — original decision list

| # | Decision | Blocking |
|---|---|---|
| D2-1 | Promote `three-sections-facial-proportion-taiqing` from `RESEARCH_ONLY`, and route `threeSections/primary` to `RUNTIME_PROSE`? | The only measurable+verified relationship available. |
| D2-2 | May a promoted connector carry the geometric predicate while abstaining from the fortune clause (C9)? | Both measurable relationships carry 上相 / 貴. |
| D2-3 | Split `three-sections-predicate`'s two positions into two connector records? | The only genuine source of residue > 1. |
| D2-4 | Revise Gate D's target against corpus capacity, or hold it and accept indefinite `NOT_READY`? | Gate D is currently unreachable by legitimate means. |

None is taken here. CARD 7 (`fiveMountains` routing) and CARD 10 (`twelvePalaces`) remain open
and untouched.
