# Heritage connector architecture — stage status

Canonical freeze record for the heritage connector work. This is the file to
read before touching `src/heritage/` or proposing new heritage connector
work. It supersedes the WIP framing in `docs/HERITAGE_RECONCILIATION_2026-08-24.md`
and `docs/HERITAGE_RESEARCH_HANDOFF_2026-08-23.md`, which remain as
historical working notes but do not describe the current, frozen state.

## Stage 1 — heritage connector data spine

**APPROVED / FROZEN.**

The typed connector graph (`HERITAGE_REGISTRY`, `HERITAGE_CONNECTOR_REGISTRY`,
`HERITAGE_DISAGREEMENT_REGISTRY`, `HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY`,
`HERITAGE_COMPOSITION_POLICIES`, `HERITAGE_CONCEPT_REGISTRY`) and its schema
and validator (`src/heritage/schema.js`, `src/heritage/validator.js`,
`src/heritage/schema-helpers.js`) replaced the legacy
`attestedCombinations`/`validateHeritageCombination` model. Went through
multiple correction rounds, most recently reconciled against a
source-verification addendum (`docs/HERITAGE_RECONCILIATION_2026-08-24.md`).

## Stage 2 — deterministic heritage connector resolver

**APPROVED / FROZEN.**

`src/heritage/resolver.js` (`resolveHeritageConnections` and its exported
helpers) is a pure function mapping an interpreted reading state, the Stage 1
registries, and explicitly injected runtime evidence to eligible connector
presentations. It produces no prose — structured, traceable selections only.
Went through six correction rounds, each closing a specific semantic defect
identified in review; none weakened a test or a compliance gate to get green.

### Frozen Stage-2 code baseline

```
df8cf22b9257c2a7fb75affd30b5e7dc6d15caa0
```

This is the CODE baseline. Documentation commits (including this file) may
move the branch head beyond this SHA — that does not change what "frozen"
refers to. If a later commit changes `src/heritage/resolver.js` behaviour,
that commit is reopening Stage 2, not extending the freeze.

### Verification at freeze (branch `feature/heritage-connectors`, commit `df8cf22`)

- `tests/heritage/resolver.test.js`: **123/123**
- `node --test tests/heritage/validator.test.js tests/heritage/falsification.test.js tests/heritage/integration.test.js tests/heritage/resolver.test.js`: **219/219**
- `node --test tests/qise/reading-variation.test.js tests/ui-language.test.js`: **16/16**
- `npm test`: **1026/1026** across 71 discovered test files
- `npm run build`: clean
- `npm run lint:bundle`: clean (copy blocklist, attractiveness, egress allowlist, biometric egress all `ok`)
- `git diff --check`: clean
- `npm run audit:release`: `Release gate: BLOCKED` — blocked only by pre-existing
  release/evidence/store-approval gaps (rights clearance, source
  verification, store submissions), none introduced by Stage 1 or Stage 2

### Open source-review flag, carried forward rather than special-cased

`five-mountains-mutual-facing-fullness` carries `evidenceStrength:
"RECORDED_NOT_VERIFIED"` and is therefore correctly ceilinged at
`SOURCE_PANEL_CEILING`, not `ACTIVE`, even though its cited source is itself
`verified`. This is the resolver working as designed (a source being solidly
identified is not the same fact as this connector's specific predicate having
been checked against it) — it is flagged here as a source-evidence item for
separate research, not a resolver defect, and must not be special-cased in
the resolver to bypass it.

### Architectural locks

These are the contracts a regression test would need to demonstrably break
before Stage 2 is reopened. They are not aspirations — each is enforced by a
named test in `tests/heritage/resolver.test.js` or the surrounding heritage
suite.

- The historical graph and runtime/editorial composition are separate
  concerns; the resolver never composes prose (that is Stage 3).
- Static measurement/capture capability (`measurementAvailability`) is never
  used to decide whether a historical claim is true.
- Condition AST truth (`evaluateConditionExpression`) comes only from the
  explicitly injected `conditionContext` — never inferred, never guessed.
- `runtimeBindingContext` is a finite, registry-derived, fail-closed
  contract: recognised binding pairs are derived from the ACTIVE
  `FORBID_RUNTIME_BINDING` records in the injected
  `negativeRelationshipRegistry` (via `canonicalRef`), the context and every
  entry must be a genuine plain closed object (`isPlainRecord` +
  `Reflect.ownKeys`-based `hasExactOwnKeys`, not `Object.keys` alone, so a
  class instance, `Date`/`Map`, or a hidden symbol/non-enumerable property
  cannot pass), and a malformed context aborts the ENTIRE resolution
  (`abstentionReasonCode: "INVALID_RUNTIME_BINDING_CONTEXT"`) rather than
  failing closed only for the connectors it happens to implicate.
- Shen remains heritage-only/unmeasurable; the only door from that into a
  runtime claim is the `shen-unmeasurable` `FORBID_RUNTIME_BINDING` rule.
- Modern Qi Se measurement cannot classify Five Forms/Five Elements
  (`no-qise-to-form-classification`); historical co-presence of the two in a
  source-backed connector is not, by itself, an attempted binding.
- Concept-only connectors (no `CONSTRUCT` participant) do not inherit an
  unrelated construct's selected lineage strength or restriction.
- Disagreements remain first-class (`CONSTRUCT`/`CONNECTOR`/`LINEAGE`
  targets), never silently harmonised.
- `prohibitedForUserInference` stays `true` on every surfaced connector
  entry, unconditionally.
- No `Math.random()` / `Date.now()` anywhere in content selection —
  everything is deterministic given its inputs (`occurrence`, registry
  content).
- No arbitrary/recursive graph traversal — concept-only connector candidacy
  is a single, explicit, caller-supplied anchor, not a walk.
- No Stage 3 integration has begun. `reflection.js`, `reading-tiers.js`,
  scanner geometry, historical source dispositions, and connector
  relationships were not touched by Stage 2.

**Do not reopen Stage 2 without a demonstrated regression against one of
these frozen contracts.**

## Stage 3 — PARTIAL / PENDING REVIEW

Heritage connector graph integrated with the Reflection Engine's reading
path, on top of the frozen Stage 1/2 baseline (`df8cf22b9257c2a7fb75affd30b5e7dc6d15caa0`).

**This section records that code exists and passes its own tests. It is not
a freeze record, it does not itself approve Stage 3, and it is not a
product-owner decision.** `docs/DECISION_REGISTER.md`'s
DR-2026-08-24-HERITAGE-CONNECTOR-STAGES-1-2-FREEZE approves and freezes only
Stages 1 and 2, and explicitly states that doing so does not authorise Stage
3 to begin. This document does not change that. Stage 3 remains a proposal —
code on a review branch, not an approved stage — until a separate,
independent review and a separate product-owner decision both say otherwise.
Status is recorded as **PARTIAL** rather than IMPLEMENTED because an
independent review of the first pass (PR #40) found four architectural
defects, listed below with what changed in response; PARTIAL reflects that a
second review has not yet happened.

- **Branch:** `feature/heritage-stage3-reflection-integration`
- **Base:** `main` at `f1fc55e8e9bae082ac2fa7e89e256f6b95609138`

### What review found, and what changed in response

The first pass (recorded in this document as "IMPLEMENTED / PENDING REVIEW")
had four architectural defects, each raised independently by review and each
fixed on this branch rather than argued with:

1. **Gate flags defaulted to `true`.** A caller that never wired real gate
   state — which is exactly what `app.js` was, before this revision — got
   heritage output authorised by omission, defeating
   `docs/PRODUCT_DESIGN_V2.md`'s "any gate firing suppresses everything
   downstream" precedence. Fixed: gates now have no default. Only the
   literal boolean `true` passes; `false` and anything else (`undefined`,
   `null`, a stray non-boolean) both suppress, under distinct reason codes
   (`*_FAILED` vs `*_UNKNOWN`) — see `gateStatus()` in `composition.js`.
2. **Gate suppression was reported as a Stage 2 abstention.** `suppressed`
   and `abstained` were conflated in the same result shape
   (`abstained: true` on a suppressed result), which is exactly the
   "suppression is a Stage 2 verdict" confusion the file's own header argued
   against. Fixed: a suppressed result always carries
   `abstained: false, abstentionReasonCode: null` — the resolver was never
   asked, so it has no verdict to report.
3. **`reading-tiers.js` (Tier 1's module) statically imported
   `composition.js`.** Any consumer of `tierOne` alone transitively loaded
   the Stage 2 resolver and every heritage registry, contradicting the
   documented "Tier 1 does not import connector architecture" invariant, and
   the test meant to guard it only searched `tierOne`'s function body, not
   the module's actual import graph. Fixed: `reading-tiers.js` is reverted
   to byte-for-byte its frozen Stage 2 content (`git diff` against it is
   empty). The Stage 3 integration now lives in a new file,
   `src/qise/heritage-connections.js`, which is the only thing that imports
   `composition.js` from the `qise/` tree.
4. **The integrated tiers were never called from the production reading
   path.** `src/ui/qise/app.js` still called bare `readingTiers()`; the new
   exports were reachable only from tests. Fixed: `app.js`'s
   `renderReflection()` now calls `readingTiersWithHeritage()` (see below).

Three further, narrower findings were fixed alongside these:

- **Canonical registries were injectable in the "production" function.**
  `composeHeritageForReading` accepted the same registry parameters as the
  Stage 2 resolver, so nothing stopped a caller from substituting a
  different registry. Fixed: it now accepts only the finite runtime contract
  (`RUNTIME_CONTRACT_KEYS`) and throws on anything else; canonical registries
  are bound via a static import (`CANONICAL_REGISTRIES`) inside the module.
  Registry injection survives as a separately named function,
  `composeHeritageConnectionsWithRegistries`, documented as a test/internal
  seam only.
- **Tier 2's editorial items could outrun its own detail.** With 2+ active
  connectors, an editorial juxtaposition's `items` could name connectors
  Tier 2 attaches no detail to, making `requiresSeparateAttribution`
  unmeetable. Fixed: Tier 2 never returns an `editorial` field at all;
  editorial juxtapositions are Tier 3-only, where every item is guaranteed
  to already have full detail in `active`/`sourcePanelOnly` at the same
  depth.
- **Tier 2 had no rotation disclosure.** Fixed: a Tier 2 connector selection
  now carries `rotationDisclosure` (reusing `reflection.js`'s own
  `ROTATION_DISCLOSURE` string — one wording, two consumers, rather than a
  second hand-authored sentence for the same mechanism), `null` when no
  connector was selected.
- **Category E dropped `prohibitedForUserInference`.** Fixed: it is now
  copied through from the resolver onto every abstention entry, alongside
  `disposition` and `gateReasons`.

### What was built (current state)

`src/heritage/composition.js` is the sole product-facing entry point into
`resolveHeritageConnections` — no other file outside `src/heritage/` and
`tests/heritage/` calls the Stage 2 resolver directly. It:

- fails closed on gate evidence: only literal `true` for both
  `captureQualityPassed` and `safetyPassed` proceeds; anything else
  suppresses under one of four named reasons
  (`CAPTURE_QUALITY_GATE_FAILED` / `_UNKNOWN`, `SAFETY_GATE_FAILED` /
  `_UNKNOWN`), checked **before** the resolver is ever invoked;
- keeps `suppressed`/`suppressionReason` (this module's own upstream
  decision) strictly separate from `abstained`/`abstentionReasonCode` (the
  resolver's own verdict) — a result is never both;
- reconstructs `readingState` from exactly the resolver's own declared
  dependency surface (`heritageConstruct`, `sourceLineage` —
  `RESOLVER_DEPENDS_ON` in resolver.js), never forwarding a caller's compass,
  history, self-report or full interpreted state;
- binds canonical registries internally (`CANONICAL_REGISTRIES`, a static
  import) for its product-facing export, `composeHeritageForReading`, which
  accepts only the finite runtime contract and throws on any other field —
  including any of the seven registry parameters;
- keeps registry injection alive only as
  `composeHeritageConnectionsWithRegistries`, an explicitly named
  test/internal seam that product code must not call;
- maps the resolver's output into five distinct, never-flattened categories:
  `active` (A), `sourcePanelOnly` (B, populated only at `SOURCE_DEEP`),
  `disagreements` (C), `editorialJuxtapositions` (D — always carrying
  `historicalRelationshipAsserted: false` and
  `disclosure: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER"`, copied verbatim from the
  Stage 1 policy record, never computed here), and `abstentions` (E, now
  including `prohibitedForUserInference`).

`src/qise/heritage-connections.js` is the new, separate integration point
between the connector graph and the actual reading path:

- `tierTwoHeritageConnections(reflection, compose)` / `tierThreeHeritageConnections(reflection, compose)`
  take the full `reflection` object (`{state, composed, occurrence}`, as
  `reading-pipeline.js`'s `reflectionFor()` already produces) rather than a
  bare `state` — because **occurrence is read from `reflection.occurrence`
  and any `occurrence` field on `compose` is ignored.** This is what keeps
  the connector graph's rotation on the SAME lifecycle as `reflection.js`'s
  own prose-variant rotation (`occurrenceIndexFor()` in
  `reading-pipeline.js`), rather than a second, independently driven one.
- Both hardcode their `depthMode` (`STANDARD` / `SOURCE_DEEP`) after
  spreading `compose`, so a caller cannot leak `SOURCE_PANEL_CEILING`
  material into Tier 2 by passing `depthMode` through. Tier 2 exposes at
  most **one** bounded connector — the resolver's own deterministic top
  pick, `renderPlan.relationshipOrder[0]`, via the separately exported pure
  function `deriveTier2FromComposition` — never a second, independent
  selection mechanism.
- `readingTiersWithHeritage(reflection, compose)` wraps the frozen
  `readingTiers()` unchanged (`tier1` is copied through verbatim) and adds
  `.connectors` onto `tier2`/`tier3`. This is the one function product code
  should call instead of calling `readingTiers()` and the connector boundary
  separately.
- `src/qise/reading-tiers.js` itself is untouched — `git diff` against the
  Stage 2 baseline is empty. Tier 1 (and every other consumer of
  `reading-tiers.js` alone) genuinely does not import the connector
  architecture; `tests/qise/heritage-connections.test.js` asserts this
  against the file's actual source, not against one function's body.

`src/ui/qise/app.js`'s `renderReflection()` now calls
`readingTiersWithHeritage(reflection, { captureQualityPassed: Boolean(reading) })`
instead of bare `readingTiers(reflection)`. `captureQualityPassed` is
honestly `true` there because `reading` is an already-completed, stored
capture record — it could not exist if `src/qise/gates.js`'s capture-quality
gates had not passed. `safetyPassed` is deliberately left unset: the Qi Se
tracker has no safety-referral gate of its own (unlike the legacy Module A/B
malar gate), so there is nothing true to assert, and per the fail-closed
fix above, an unasserted gate suppresses rather than silently passing. **The
practical consequence, stated plainly: heritage-connector output is wired
into the production call path, and is currently always suppressed there,
because no real safety-gate signal exists to assert.** This is not a bug
being reported here — it is the honest, correct behaviour until a real Qi Se
safety gate is designed and built, which is out of scope for this stage.

No change was made to any Stage 1/2 file
(`src/heritage/resolver.js`, `registry.js`, `validator.js`, `connectors.js`,
`concepts.js`, `negative-relationships-registry.js`,
`composition-policies-registry.js`), to scanner geometry, thresholds,
historical source data, or commercial-rights state.

### Exact changed modules

- `src/heritage/composition.js` — rewritten (fail-closed gates, canonical
  registries bound internally, suppression/abstention separated,
  `prohibitedForUserInference` preserved on Category E)
- `src/qise/heritage-connections.js` — new (the actual Stage 3 integration
  point; `tierTwoHeritageConnections`, `tierThreeHeritageConnections`,
  `deriveTier2FromComposition`, `readingTiersWithHeritage`)
- `src/qise/reading-tiers.js` — reverted to the frozen Stage 2 baseline,
  byte-for-byte (`git diff` against it is empty)
- `src/ui/qise/app.js` — one call site changed (`renderReflection`) to call
  `readingTiersWithHeritage` instead of `readingTiers`
- `tests/heritage/composition.test.js` — rewritten (26 tests)
- `tests/qise/heritage-connections.test.js` — new (18 tests)

### Test counts (this branch, this session)

- `node --test tests/heritage/resolver.test.js`: **123/123** (unchanged —
  proves Stage 2 was not reopened)
- `node --test tests/heritage/validator.test.js tests/heritage/falsification.test.js tests/heritage/integration.test.js tests/heritage/resolver.test.js`: **219/219** (unchanged)
- `node --test tests/heritage/composition.test.js`: **26/26**
- `node --test tests/qise/heritage-connections.test.js`: **18/18**
- `node --test tests/qise/reading-tiers.test.js`: **14/14** (unchanged —
  proves Tier 1/2/3's own Stage 2 contract was not reopened)
- `npm test`: **1075/1075** across 74 discovered test files
- `npm run build`: clean — 95 files copied, Module B shipped (wellness
  flavour)
- `npm run lint:bundle`: clean — copy blocklist / attractiveness / egress
  allowlist / biometric egress all `ok`
- `git diff --check`: clean
- `npm run audit:release`: `Release gate: BLOCKED` — the same pre-existing
  rights/citation/manifest/store-evidence categories as at the Stage 2
  freeze (five-elements-v1, three-courts-v1, twelve-palaces-v1/v2,
  qi-se-reading-v1, harmony-v1, qise-passages-v1, plus store/perf evidence).
  No new blocker category was introduced by Stage 3.
- `npm run test:browser`: **7/7** Playwright specs pass

### Negative tests added

`tests/heritage/composition.test.js`: gate suppression on an explicit
failure AND on missing/unknown evidence (including non-boolean values),
independently for both gates; suppression never reported as a Stage 2
abstention, and a genuine abstention (`INVALID_RUNTIME_BINDING_CONTEXT`)
proven not suppressed, in the same test; `composeHeritageForReading` throws
on every one of the seven registry parameters and on any other
out-of-contract field; it resolves correctly against the real registries
with zero registries supplied; a heritageQiSe historical STATE cannot be
satisfied by "read" modern availability; historical heritageQiSe/Five
Elements co-presence may reach ACTIVE but an attempted runtime
classification is blocked; Shen cannot acquire a measurement binding,
structurally or via an attempted runtime binding; an invalid
`runtimeBindingContext` aborts the whole composition; `SOURCE_PANEL_CEILING`
material is confined to `sourcePanelOnly` at `SOURCE_DEEP`;
`prohibitedForUserInference` stays `true` on active/source-panel entries
across all six constructs AND on abstentions; every editorial item is
provably backed by full detail in the same result; a CONSTRUCT-level
disagreement survives with every position intact; an unavailable third
participant blocks an otherwise-satisfied PRESENT condition; ABSENT/UNKNOWN
stay distinguishable; a concept-only connector's eligibility is unaffected
by an unrelated anchor construct's lineage; determinism, through both the
seam and the product-facing entry point.

`tests/qise/heritage-connections.test.js`: gate precedence reaches Tier 2 and
Tier 3 identically, including through `readingTiersWithHeritage`; occurrence
comes only from `reflection.occurrence` and a `compose.occurrence` is
provably ignored, for both tiers; `reading-tiers.js`'s actual source contains
no reference to the connector architecture (a real import-graph check, not a
text search on one function), and is confirmed unchanged from Stage 2;
Tier 2 never returns an `editorial` field; Tier 2's selection logic
(`deriveTier2FromComposition`) never reads `sourcePanelOnly`, provably, even
when it is non-empty and `active` is not; Tier 3 always requests
`SOURCE_DEEP` regardless of a requested override; Tier 2's `depthMode` is
hardcoded after `...compose` in source (an override cannot win); the pure
selection function picks exactly the resolver's own rotation, never invents
a connector on a suppressed or abstained result; and `app.js`'s actual
source calls `readingTiersWithHeritage`, not the bare Stage 2 function.

### Known limitations / remaining work

- **Stage 3 is not approved.** See the framing at the top of this section —
  PARTIAL/PENDING REVIEW here means exactly that, and nothing in this
  document should be read as product-owner sign-off.
- **No new heritage connector relationships, prose registry, or corpus
  content were added.** Stage 3 establishes the composition contract;
  populating it with additional source-backed connectors or a Tier-2 prose
  schema is separate work.
- **The real corpus currently has no construct/lineage with two or more
  ACTIVE connectors**, and `reflection.state.sourceLineage` (constrained to
  `"primary"`/`"variant"` by `reading-state.js`'s `SOURCE_LINEAGES`) cannot
  reach several of the named witness lineages that DO carry richer content
  (e.g. fiveMountains' `"taiqing-siku"`, which is where
  `five-mountains-mutual-facing-fullness` actually reaches
  `SOURCE_PANEL_CEILING` — under `"primary"` that same lineage is
  `RESEARCH_ONLY` and the connector is blocked outright). This is not a
  defect introduced by Stage 3; it is a pre-existing mismatch between the
  two-value `sourceLineage` enum the Qi Se rotation was built around and the
  connector graph's richer per-construct lineage IDs. It means Tier 2's
  rotation/top-pick logic is currently untested against real multi-connector
  data (tested instead against a hand-built composition-result fixture —
  see `deriveTier2FromComposition`'s tests) and that Tier 3's
  `sourcePanelOnly` will rarely populate in production today. Resolving it
  — whichever direction that takes — is a product/architecture decision
  outside this stage's scope, not a mechanical fix.
- **`safetyPassed` has no real signal to assert for the Qi Se tracker.**
  Stated above; repeated here because it is the reason connector output is
  currently always suppressed in production, honestly rather than silently.
- Repetitive follow-on work — designing and wiring a real Qi Se safety
  signal (a product decision, not mechanical), formatting the structured
  Tier 2/3 output into UI strings once something can actually reach ACTIVE
  end to end, and any bulk connector/prose authoring — has **not started**
  and should go to Gemini Flash against this document plus
  `src/heritage/composition.js`'s and `src/qise/heritage-connections.js`'s
  own header comments as the bounded specification, once a further
  independent review has actually approved the architecture recorded here.
