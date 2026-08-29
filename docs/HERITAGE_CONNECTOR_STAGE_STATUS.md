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

## Stage 3 — PARTIAL / BLOCKED ON SAFETY AUTHORIZATION AND A LINEAGE CONTENT DECISION

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

**Why the status line reads BLOCKED rather than IMPLEMENTED.** Two of the
four architectural blockers from the second review pass are fully resolved
(capture authorization, selection lifecycle — both below). The remaining two
are each blocked on something outside this module's authority to decide, for
different reasons:

- **Lineage adapter — the MECHANISM is resolved; a CONTENT decision is not.**
  `resolveHeritageLineage()` itself is correct and tested: it fails closed on
  an unresolvable pairing, never borrows another construct's data, never
  falls back to "primary" when something else was requested. But its
  `ABSTRACT_LINEAGE_OVERRIDES` table — the only way an abstract rotation slot
  can be routed to a specific named witness — is deliberately empty, because
  making that routing decision is explicitly outside this module's authority
  (see "Lineage adapter" below). A prior revision of this document claimed
  `five-mountains-mutual-facing-fullness` reaches `SOURCE_PANEL_CEILING`
  "through the REAL Stage-3 production composition path" — that claim was
  independently re-checked and does not hold: the test it cited called
  `composeHeritageForReading` with the canonical lineage id `"taiqing-siku"`
  supplied directly, which the real Reflection Engine reading path
  (`heritageRotation()` → `deriveReadingState()` → `reflectionFor()` →
  `readingTiersWithHeritage()`) never does — it only ever supplies the
  abstract label `"primary"`. Through that real path today,
  `five-mountains-mutual-facing-fullness` is blocked at
  `LINEAGE_RESEARCH_ONLY` and never reaches `SOURCE_PANEL_CEILING` or
  `ACTIVE`. See "Lineage adapter" below for why this is a content decision
  and not a bug the adapter can fix on its own.
- **Safety authorization — NOT resolved**, and cannot be resolved inside this
  stage: no authoritative Qi Se safety-referral signal exists anywhere in the
  current product, and inventing one is explicitly out of scope for Stage 3 (it
  would be a new clinical/safety subsystem, not an integration). Stage 3's OWN
  side of that interface is fully defined and fails closed — see "Safety
  authorization" below.

Both remaining blockers share the same shape: a fully-defined, fail-closed
interface with nothing (safety) or nothing-yet-authorised (lineage content)
behind it. Marking this IMPLEMENTED would misstate that the production
connector path can actually authorise or show heritage-connector output; it
cannot, honestly, until both are resolved.

**Two further technical defects were found and fixed on top of this
(`fc63744` → this revision) — neither is one of the two blockers above, and
neither required touching Stage 1/2 or either intentional product blocker:**

- **Single connector-selection lifecycle — a SPECIFIC defect, distinct from
  the `rotationState` fix "selection lifecycle" originally referred to.**
  `tierTwoHeritageConnections`/`tierThreeHeritageConnections` called
  `composeHeritageForReading` SEPARATELY, at `depthMode: "STANDARD"` and
  `"SOURCE_DEEP"` respectively. Stage 2's own rotation seed includes
  `depthMode`, so those two calls could rotate `relationshipOrder`
  differently whenever a construct has 2+ ACTIVE connectors and
  `occurrence > 0` — Tier 2's top pick could then genuinely differ from
  Tier 3's presentation order for the same reading. Fixed by funnelling both
  tiers through one shared call. See "Single connector-selection lifecycle"
  below.
- **Connector payload computed but never rendered.** `app.js` called
  `readingTiersWithHeritage()` and therefore computed `tier2.connectors`/
  `tier3.connectors`, but the renderer below that call never consumed
  either property — so even a fully-authorised composition would never
  reach the reader. Fixed by adding a tested, pure render layer
  (`src/ui/qise/heritage-view.js`) and wiring it into `app.js`'s existing
  DOM assignment sites. See "Connector production rendering" below.

- **Branch:** `feature/heritage-stage3-reflection-integration`
- **Base (this revision's actual git parent):** `main` at `f1fc55e8e9bae082ac2fa7e89e256f6b95609138`
- **Prior review snapshot referenced below (PR #40, an earlier round — NOT this revision's git parent):** `2f1491283c36708f8c8c0e608c5dd63e6c4644f3`. Corrected here (Codex, PR #40): an earlier version of this line called `2f14912` "this revision's parent commit". Git disagrees — `git log 546c429^` shows `f1fc55e` (the Base above) as the sole parent, and `git merge-base --is-ancestor 2f14912 546c429` reports `2f14912` is not even an ancestor; it is chronologically LATER, a snapshot from a subsequent review round on the same branch, not an ancestor of the commit this section originally described. Kept only because later text in this section references it by name — treat it as "the commit an earlier round was reviewed against," not as parentage evidence for reconstructing a diff.

### The four architecture blockers from the second review pass

**1. Capture-quality authorization — RESOLVED.**
The previous revision used `captureQualityPassed: Boolean(reading)` — an
object existing is not proof its own capture-quality gates passed. The fix
uses a field that already existed and was already trustworthy:
`reading.captureTier`. `src/qise/gates.js`'s `evaluateGates()` is the only
thing that ever produces this value (`"clean"` or `"assisted"` when
`evaluateGates().pass` was `true`, `"waiting"` when it was not), and
`src/qise/store.js`'s `toRecord()` already persists it on every stored
reading — a plain category string, not biometric, not raw, not a gate
report. `readingConfidence()` (`src/qise/baseline.js`) already trusts this
same field for exactly this kind of purpose. `src/qise/heritage-connections.js`'s
new `captureAuthorizationFromReading(reading)` reads exactly that one field
and returns `true` only for `"clean"`/`"assisted"`, `false` for an explicit
`"waiting"`, and `undefined` for anything else — a missing field, a
malformed value, or no reading at all. `false` and `undefined` both suppress
downstream output, but they are not identical: `false` means the gates ran
and recorded a fail; `undefined` means no gate evidence exists at all
(`gateStatus()` in `src/heritage/composition.js` reports these as the
distinct `FAILED` and `UNKNOWN` states, respectively).
**No new field was added to persistence.** `src/ui/qise/app.js` now calls
`captureAuthorizationFromReading(reading)` instead of `Boolean(reading)`.
**Hardened further this session:** `app.js`'s `finish()` — the function that
actually writes `captureTier` onto the persisted reading — still defaulted
an omitted `captureTier` to `"clean"`, and `lastCaptureTier` (the variable
its live-capture call site feeds from) defaulted the same way. Both call
sites already supplied an explicit, gate-derived tier, so this was dead code
today, but it meant the field `captureAuthorizationFromReading` trusts as
proof could itself have been manufactured by omission at a different
boundary. Both defaults are now removed and `finish()` throws if it is ever
reached without an explicit `"clean"`/`"assisted"`/`"waiting"` tier. See
"Stage 3 — correction pass" below.

**2. One deterministic selection lifecycle — RESOLVED.**
`occurrence` was already correctly read from `reflection.occurrence` (fixed
in the prior revision) and remains so. The remaining gap: `rotationState`
was still exposed on the product-facing `composeHeritageForReading` contract
and passed straight to the resolver, giving a caller a SECOND,
independently-suppliable selection input (the resolver uses
`rotationState.recentConnectorIds` to deprioritise recently-shown connectors
ahead of its own deterministic rotation). Fixed by removing `rotationState`
from `RUNTIME_CONTRACT_KEYS` entirely — passing it to
`composeHeritageForReading` now throws, exactly like passing a registry.
There is no canonical source for "recently shown connector ids" today (Stage
3 persists nothing new — see "keep reading-state small" below), so there was
nothing legitimate to derive it from; removing it was the correct choice
over inventing a derivation. `occurrence` alone still provides full
deterministic variation via the resolver's own coprime-stride rotation.
`rotationState` remains available only on
`composeHeritageConnectionsWithRegistries`, the test/internal seam, for
exercising the resolver's own already-tested behaviour directly.

**3. Lineage adapter — MECHANISM RESOLVED; CONTENT-ROUTING DECISION OPEN,
BLOCKING THE FLAGSHIP `SOURCE_PANEL_CEILING` DEMONSTRATION.**
The gap: `reading-state.js`'s `sourceLineage` is a two-value ABSTRACT
rotation label (`"primary"`/`"variant"`), general across all six
constructs; the canonical heritage registry's own lineages are
construct-specific and, for four of the six constructs, richer (e.g.
fiveMountains also declares `"taiqing-siku"`, `"sxqb-chin"`,
`"shenyi-lower-face-zone"`). Stage 2's resolver has a permissive fallback for
an unmatched lineage ("primary" if the construct has one, else lexically
first) that never fails closed — appropriate for Stage 2's own frozen
contract, but not something Stage 3 should rely on silently. Fixed with an
explicit adapter, `resolveHeritageLineage({heritageConstruct, sourceLineage},
heritageRegistry)` in `src/heritage/composition.js`: it accepts either the
abstract label or an explicit canonical lineage id, and returns that exact
string only if it is a lineage THIS SPECIFIC construct actually declares —
never a different, silently substituted witness, never a value borrowed from
another construct, never a fallback to "primary" when the request was for
something else. An unresolvable pairing returns `null`, and
`composeHeritageForReading` turns that into a Stage-3-level abstention
(`abstentionReasonCode: "UNSUPPORTED_LINEAGE"`) BEFORE the resolver is ever
called — distinct from both gate suppression and the resolver's own
abstentions. **This mechanism is correct and well-tested** — that part of
the gap is genuinely resolved.

**What is NOT resolved: the previously-claimed real-path reachability of
`five-mountains-mutual-facing-fullness` at `SOURCE_PANEL_CEILING`.** A prior
revision of this document asserted this was "Verified end to end" because
`composeHeritageForReading` reaches `SOURCE_PANEL_CEILING` when the explicit
canonical id `"taiqing-siku"` is requested directly. That call is a
legitimate direct use of the adapter (it accepts an explicit canonical id as
well as an abstract label), but it is **not** what the real Reflection
Engine reading path ever supplies. `heritageRotation()`
(`src/qise/reading-pipeline.js`) and `reading-state.js`'s `SOURCE_LINEAGES`
only ever emit the abstract labels `"primary"`/`"variant"` — never a
construct-specific canonical id like `"taiqing-siku"`. An independent check
against `2f14912` traced the actual call chain
(`heritageRotation()` → `deriveReadingState()` → `reflectionFor()` →
`readingTiersWithHeritage()` → `composeHeritageForReading()`) and found the
prior test did not exercise it: it called `composeHeritageForReading`
directly with the canonical id, bypassing `reflectionFor`/
`readingTiersWithHeritage` entirely, so it never proved what it was labelled
as proving. That test has been renamed to describe what it actually tests
(`tests/heritage/composition.test.js`), and a genuine real-path test has
been added (`tests/qise/reading-production-path.test.js`) that drives a
persisted reading through `reflectionFor()` and `readingTiersWithHeritage()`
for the `canonicalDay` that rotates to fiveMountains/primary.

**The actual result through the real path today:** the adapter's override
table (`ABSTRACT_LINEAGE_OVERRIDES`) is deliberately empty, so fiveMountains'
abstract `"primary"` resolves to the literal registry key `"primary"` — the
人倫大統賦 (Renlun Datong) directional-naming witness (`runtimeStatus:
"RESEARCH_ONLY"`) — never to `"taiqing-siku"` (太清神鑑, `HERITAGE_ONLY`,
the mountain-name-to-region witness the connector actually cites). These are
two different sub-claims of the tradition (compass-direction labels vs.
named-mountain-to-region assignment), not a weak witness and a strong
witness of the same claim, so this is not a bug the adapter can silently
correct — see `tests/heritage/composition.test.js`'s
`"fiveMountains's registry-key 'primary' lineage is NOT the same claim as
'taiqing-siku'"` test for the registry evidence. The resolver blocks
`five-mountains-mutual-facing-fullness` at `LINEAGE_RESEARCH_ONLY`
(fully traceable in `abstentions`, never shown) rather than reaching
`SOURCE_PANEL_CEILING` or `ACTIVE`, for the only abstract-lineage value the
Reflection Engine can ever produce for fiveMountains (`"primary"` — see
`reading-state.js`'s `SOURCE_LINEAGES`/`isReachable`: `"variant"` is
reachable only for fourRivers). This document makes no claim about the
other five constructs' construct-scoped connectors, which were not
re-examined this session.

**Routing fiveMountains' abstract `"primary"` to `"taiqing-siku"` — or any
other named witness — via `ABSTRACT_LINEAGE_OVERRIDES` remains a
content/editorial decision outside this module's (and this stage's) own
authority.** The table exists as a documented extension point for that
decision; it must not be populated by inference. Until a product owner makes
that call, the honest status is: the lineage adapter's mechanism is sound,
but no construct-scoped `HERITAGE_PRESENTATION_ALLOWED` connector currently
becomes visible (`ACTIVE` or `SOURCE_PANEL_CEILING`) through the real
Reflection Engine rotation for fiveMountains.

**4. Safety authorization — DEFINED AND FAIL-CLOSED, NOT WIRED. BLOCKING.**
Investigated whether an authoritative Qi Se safety-referral decision exists
anywhere in the current product path (`src/qise/gates.js`,
`src/qise/store.js`, `src/qise/reading-state.js`, `src/ui/qise/app.js`). It
does not: the ten capture gates in `gates.js` are QUALITY gates (pose,
distance, exposure, motion, focus, ROI validity), not a safety/clinical
referral gate, and there is no analogue in the Qi Se tracker to the legacy
Module A/B malar-rash referral gate. Per this stage's explicit instruction,
that absence is NOT a licence to invent one — a new clinical/safety detector
is a separate, much larger piece of work with its own evidentiary and legal
requirements, and is out of scope here. Stage 3's OWN side of the interface
is complete and correct: `safetyPassed` is read through the same
`gateStatus()` as `captureQualityPassed` (`composition.js`) — only a literal
`true` proceeds, `false` or anything else (including simply never being set)
suppresses under `SAFETY_GATE_FAILED`/`SAFETY_GATE_UNKNOWN`. `src/ui/qise/app.js`
deliberately leaves `safetyPassed` unset when calling
`readingTiersWithHeritage()`. **The practical, honest consequence: heritage
connector output is wired into the production call path and is currently
ALWAYS suppressed there**, because there is nothing true to assert for
safety. This is correct behaviour, not a bug being reported — it is exactly
what a fail-closed interface with a missing upstream prerequisite should do.
Resolving this requires either (a) a product-owner/design decision that Qi
Se genuinely needs no safety gate and `safetyPassed` should be supplied as
`true` unconditionally (a product decision, not an engineering one — it
changes what the product claims about itself), or (b) an actual Qi Se safety
signal being designed and built (out of scope for Stage 3). Until one of
those happens, Stage 3 stays BLOCKED on this exact prerequisite.

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
  resolver's own verdict, OR this module's own lineage-adapter verdict — see
  below) — a result is never both;
- validates the (construct, lineage) pairing through `resolveHeritageLineage()`
  and abstains (`UNSUPPORTED_LINEAGE`) before calling the resolver if it
  cannot be resolved;
- reconstructs `readingState` from exactly the resolver's own declared
  dependency surface (`heritageConstruct`, the ADAPTER's resolved canonical
  `sourceLineage` — `RESOLVER_DEPENDS_ON` in resolver.js), never forwarding a
  caller's compass, history, self-report or full interpreted state;
- binds canonical registries internally (`CANONICAL_REGISTRIES`, a static
  import) for its product-facing export, `composeHeritageForReading`, which
  accepts only the finite runtime contract (`captureQualityPassed`,
  `safetyPassed`, `heritageConstruct`, `sourceLineage`, `depthMode`,
  `occurrence`, `conditionContext`, `runtimeBindingContext` —
  **`rotationState` deliberately excluded**) and throws on any other field,
  including any of the seven registry parameters;
- keeps registry AND `rotationState` injection alive only as
  `composeHeritageConnectionsWithRegistries`, an explicitly named
  test/internal seam that product code must not call;
- maps the resolver's output into five distinct, never-flattened categories:
  `active` (A), `sourcePanelOnly` (B, populated only at `SOURCE_DEEP`),
  `disagreements` (C), `editorialJuxtapositions` (D — always carrying
  `historicalRelationshipAsserted: false` and
  `disclosure: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER"`, copied verbatim from the
  Stage 1 policy record, never computed here), and `abstentions` (E, carrying
  `prohibitedForUserInference`).

`src/qise/heritage-connections.js` is the integration point between the
connector graph and the actual reading path:

- `captureAuthorizationFromReading(reading)` — Blocker 1's fix, above.
- `tierTwoHeritageConnections(reflection, compose)` / `tierThreeHeritageConnections(reflection, compose)`
  take the full `reflection` object (`{state, composed, occurrence}`) rather
  than a bare `state`, and read `occurrence` only from
  `reflection.occurrence` — a `compose.occurrence` is always overridden.
- **There is no second, independently-requested `depthMode` for Tier 2.**
  Both are thin wrappers around `composeHeritageOnceForReading()` — the ONE
  place `depthMode` is ever chosen, always `"SOURCE_DEEP"` (the deepest, a
  strict superset of any shallower depth's `active`/`abstentions`, which are
  already depth-independent in Stage 2's resolver). An earlier revision had
  Tier 2 request `depthMode: "STANDARD"` and Tier 3 request `"SOURCE_DEEP"` as
  two SEPARATE `composeHeritageForReading` calls; because Stage 2's own
  rotation seed includes `depthMode`, those two calls could rotate
  `renderPlan.relationshipOrder` differently for the same reading whenever a
  construct has 2+ ACTIVE connectors and `occurrence > 0` — see "Stage 3 —
  single-selection-lifecycle and connector-rendering fix" below for that
  now-closed defect. Tier 2 exposes at most **one** bounded connector — the
  resolver's own deterministic top pick, `renderPlan.relationshipOrder[0]`,
  off that SAME `SOURCE_DEEP` result — via the separately exported pure
  function `deriveTier2FromComposition`, which reads only `active` and
  `renderPlan.relationshipOrder` (itself built from `active` alone) and never
  `sourcePanelOnly`/`editorialJuxtapositions`, so reusing the deeper result
  does not leak `SOURCE_PANEL_CEILING` material into Tier 2. Tier 3 receives
  that same composition result in full.
- `readingTiersWithHeritage(reflection, compose)` wraps the frozen
  `readingTiers()` unchanged (`tier1` is copied through verbatim), calls
  `composeHeritageOnceForReading()` **exactly once**, and hands that single
  result to both `deriveTier2FromComposition` (Tier 2's bounded projection)
  and `tier3.connectors` (Tier 3's full projection) — never two resolver
  calls at different depths for one reading. This is the one function product
  code should call instead of calling `readingTiers()` and the connector
  boundary separately.
- `src/qise/reading-tiers.js` itself is untouched — `git diff` against the
  Stage 2 baseline is empty.

`src/ui/qise/app.js`'s `renderReflection()` calls
`readingTiersWithHeritage(reflection, { captureQualityPassed: captureAuthorizationFromReading(reading) })`
instead of bare `readingTiers(reflection)`. `safetyPassed` is not passed at
all (see Blocker 4).

No change was made to any Stage 1/2 file
(`src/heritage/resolver.js`, `registry.js`, `validator.js`, `connectors.js`,
`concepts.js`, `negative-relationships-registry.js`,
`composition-policies-registry.js`), to scanner geometry, thresholds,
historical source data, or commercial-rights state. The lineage adapter
lives entirely in `src/heritage/composition.js`, outside the frozen Stage 1
registries — it reads them, it does not modify them or their validation.

### Exact changed modules (this revision, on top of `2f14912`)

- `src/heritage/composition.js` — added `resolveHeritageLineage()`, the
  lineage-adapter gate in `composeHeritageConnectionsInternal`, and removed
  `rotationState` from `RUNTIME_CONTRACT_KEYS`
- `src/qise/heritage-connections.js` — added `captureAuthorizationFromReading()`
- `src/ui/qise/app.js` — one call site changed to derive
  `captureQualityPassed` from `captureAuthorizationFromReading(reading)`
  instead of `Boolean(reading)`
- `tests/heritage/composition.test.js` — 15 new tests (rotationState
  rejection, the lineage adapter, fail-closed unsupported-lineage behaviour,
  reachability of `taiqing-siku` via an explicit request). **Correction, this
  session:** the last of these was originally labelled as proving this was
  reachable "through the REAL Stage-3 production composition path" — it was
  not; see "Stage 3 — correction pass" below.
- `tests/qise/heritage-connections.test.js` — 8 new tests (capture
  authorization, including "object existence is not enough" and "measurement
  values cannot fabricate authorization")

### Test counts (this branch, this session)

Superseded numbers from the prior revision are struck through; current
numbers are from this session's correction pass, re-run after the fixes
above.

- `node --test tests/heritage/resolver.test.js`: **123/123** (unchanged —
  Stage 2 not reopened)
- `node --test tests/heritage/validator.test.js tests/heritage/falsification.test.js tests/heritage/integration.test.js tests/heritage/resolver.test.js tests/heritage/composition.test.js`:
  ~~261/261~~ **263/263** (+2: the ordering-hazard falsification pair —
  "the ordering hazard is real..." and "a single composition, reused for
  both tiers...")
- `node --test tests/heritage/composition.test.js`: ~~42/42~~ **44/44**
- `node --test tests/qise/heritage-connections.test.js`: ~~29/29~~ **36/36**
  (+7: the single-selection-lifecycle structural tests, the
  `tier2VisibleDisagreements` tests, and the two connector-rendering wiring
  tests)
- `node --test tests/qise/heritage-view.test.js` (new this session): **21/21**
- `node --test tests/qise/reading-tiers.test.js`: **14/14** (unchanged)
- `node --test tests/qise/reading-production-path.test.js`: **15/15**
  (unchanged this pass)
- `node --test tests/heritage/resolver.test.js tests/heritage/composition.test.js tests/qise/heritage-connections.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js`
  (exact specified set, re-verified this session): **232/232**
- `node --test tests/heritage/*.test.js tests/qise/heritage-connections.test.js tests/qise/heritage-view.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js`
  (combined heritage scope, including the new view-model file): **349/349**
- `npm test`: ~~1103/1103~~ **1133/1133** across `Running 75 test file(s)`
  (+1 discovered file: `tests/qise/heritage-view.test.js`)
- `npm run build`: clean — 96 files copied, Module B shipped (wellness
  flavour), 6 pinned MediaPipe assets copied
- `npm run lint:bundle`: clean — 97 files scanned, 1469 user-facing strings
  extracted; copy blocklist / attractiveness / egress allowlist / biometric
  egress all `ok`
- `git diff --check`: clean
- `npm run audit:release`: `Release gate: BLOCKED` — identical pre-existing
  categories to every prior check at this stage (rights-not-cleared,
  citation-source-required, manifest-pending across all six content
  families, plus store/performance evidence). No new blocker category.
- `npm run test:browser`: **7/7** Playwright specs pass

### Negative tests added, by blocker

**Capture authorization:** a stored-looking `reading` with rich measurement
data but no `captureTier` is `undefined` (unknown), not authorized; an
explicit `"clean"`/`"assisted"` authorizes; an explicit `"waiting"` fails
closed as a known negative; missing/null reading or a malformed `captureTier`
value is unknown; changing compass/confidence values has no effect on the
result while changing `captureTier` does; end-to-end through
`tierTwoHeritageConnections`/`tierThreeHeritageConnections`; a source check
that the function reads no biometric-shaped field.

**Selection lifecycle:** `composeHeritageForReading` throws if `rotationState`
is passed; identical inputs (construct/lineage/occurrence) give identical
`renderPlan` regardless; no `Math.random`/`Date.now` in the changed file.

**Lineage adapter:** every construct's abstract `"primary"` resolves to its
own `"primary"`; `"variant"` resolves only for fourRivers, the one construct
that declares it, and abstains (not falls back) elsewhere; an explicit
canonical id resolves when genuinely declared on that construct; no
cross-construct inheritance (a name real on one construct is not borrowed by
another); an unknown construct abstains; fourRivers' primary/variant remain
two deliberately different resolutions; an unsupported pairing produces
`UNSUPPORTED_LINEAGE` — abstained, never suppressed, never silently
substituted with that construct's own "primary" data;
`five-mountains-mutual-facing-fullness` reached via the explicit canonical id
`"taiqing-siku"` when requested directly, with evidence unchanged (renamed
from a prior claim that this was the real production path — it is a direct
call to `composeHeritageForReading`, not the abstract-label path
`reflectionFor`/`readingTiersWithHeritage` actually drive); the same
connector is never ACTIVE under any of fiveMountains' four declared
lineages; concept-only connector eligibility is unaffected by the adapter;
fiveMountains' registry-key `"primary"` and `"taiqing-siku"` are shown to be
different sub-claims (different `sourceId`, different `runtimeStatus`), not
a weak/strong pair of the same claim — documenting why the override table
cannot be populated by inference. **New this session**
(`tests/qise/reading-production-path.test.js`): a persisted reading, on the
`canonicalDay` that rotates to fiveMountains/primary, driven through the
REAL path (`reflectionFor()` → `readingTiersWithHeritage()`) — confirms
`primaryLineage` stays `"primary"` (never `"taiqing-siku"`),
`five-mountains-mutual-facing-fullness` is absent from both `active` and
`sourcePanelOnly`, and appears in `abstentions` with
`gateReasons: ["LINEAGE_RESEARCH_ONLY"]`; Tier 2 reports
`available: false, reason: "NO_ACTIVE_CONNECTOR"`.

**Production wiring:** `app.js`'s source is asserted to call
`readingTiersWithHeritage` and `captureAuthorizationFromReading(reading)`,
and asserted NOT to contain the old `Boolean(reading)` pattern or the bare
`readingTiers(reflection)` call.

Carried over from the prior revision (all still passing, unchanged):
gate fail-closed on missing/unknown/non-boolean evidence for both gates;
suppression never reported as a Stage 2 abstention; `composeHeritageForReading`
throws on every registry parameter and on any other out-of-contract field;
Shen/heritageQiSe runtime-binding bans; `SOURCE_PANEL_CEILING` confinement;
`prohibitedForUserInference` on active/source-panel/abstention entries;
editorial-item detail integrity; disagreement position integrity;
participant-gate distinctions; real Tier 1 import-graph isolation;
determinism.

### Stage 3 — correction pass (this session, on top of `5827d33`)

An independent re-check of PR #40 found two overstated claims in this
document and fixed both. Neither reopens Stage 1 or Stage 2; both are
scoped to `src/heritage/composition.js`'s tests/docs and
`src/ui/qise/app.js`'s capture-authorization call boundary.

1. **The lineage-adapter "verified end to end" claim did not hold.** See
   "Lineage adapter" above for the full account. Fixed by renaming the
   test that made the claim, adding a genuine real-path test
   (`tests/qise/reading-production-path.test.js`) that proves what actually
   happens today (blocked at `LINEAGE_RESEARCH_ONLY`, not
   `SOURCE_PANEL_CEILING`), and adding a test documenting why
   `ABSTRACT_LINEAGE_OVERRIDES` cannot be populated by inference. **No
   change to `src/heritage/resolver.js`, `registry.js`, or
   `composition.js`'s actual resolution logic** — this was a test/doc
   correction, not a behaviour change.
2. **`src/ui/qise/app.js`'s `finish()` still defaulted an omitted
   `captureTier` to `"clean"`**, and the `lastCaptureTier` variable it is
   normally fed from defaulted the same way. Both call sites already passed
   an explicit, gate-derived tier, so this was dead code today — but a
   default at this exact boundary is precisely the shape of defect item 43
   in CLAUDE.md describes ("a gate fed a literal is a gate that can never
   fire"), just inverted: a boundary that can silently manufacture a PASSING
   result instead of a gate that can never fail. Fixed by removing both
   defaults and adding an explicit fail-closed check inside `finish()` that
   throws if `captureTier` is not one of `"clean"`/`"assisted"`/`"waiting"`.
   Falsification tests added to `tests/qise/heritage-connections.test.js`
   (static source checks, the same technique the file's existing
   "production wiring" tests use — `finish()` lives in the file no test can
   import; see CLAUDE.md item 44).

### Stage 3 — single-selection-lifecycle and connector-rendering fix (this session, on top of `fc63744`)

Fresh independent review (Copilot + Codex) against `fc63744` found two new
substantive defects, both now fixed. Neither reopens Stage 1/2, neither
touches the two intentional product blockers (lineage content routing,
safety authorization), and neither changes `src/heritage/resolver.js`,
`registry.js`, or `src/qise/reading-tiers.js` (`git diff --stat` against all
three is empty).

**1. Single connector-selection lifecycle (Copilot).**
`src/qise/heritage-connections.js`'s `tierTwoHeritageConnections` and
`tierThreeHeritageConnections` called `composeHeritageForReading` SEPARATELY
— Tier 2 at `depthMode: "STANDARD"`, Tier 3 at `"SOURCE_DEEP"`. Stage 2's own
rotation seed (`resolver.js`: `rotationSeed = "...|depthMode=${depthMode}"`)
includes `depthMode` by design — real, load-bearing, and not something this
fix may touch (`resolver.js` is unchanged). But it meant the two calls could
rotate `renderPlan.relationshipOrder` DIFFERENTLY whenever a construct has
2+ ACTIVE connectors and `occurrence > 0`, so Tier 2's top pick could
genuinely differ from Tier 3's presentation order for the exact same
reading — opening Tier 3 could make it look like the selected relationship
changed merely because the depth changed.

Fixed with one new function, `composeHeritageOnceForReading()`: the ONLY
place `depthMode` is chosen (always `"SOURCE_DEEP"`, the deepest — a strict
superset, since `active`/`abstentions` are already depth-INDEPENDENT in
Stage 2's resolver; only `sourcePanelOnly`, the editorial candidate pool and
`relationshipOrder`'s rotation/cap vary by depth). `tierTwoHeritageConnections`,
`tierThreeHeritageConnections` and `readingTiersWithHeritage` (which now
calls it exactly once and shares the result with both tiers, rather than
calling the two per-tier wrappers) all funnel through it, so Tier 2 and
Tier 3 can no longer diverge by construction.

Reusing a `SOURCE_DEEP` result for Tier 2 does not, by itself, leak
`SOURCE_PANEL_CEILING` material into Tier 2 — `deriveTier2FromComposition`
only ever reads `result.active` and `result.renderPlan.relationshipOrder`
(built from `active` alone), never `result.sourcePanelOnly`, and never
returns `result.editorialJuxtapositions` at all. The one field that DOES
become depth-sensitive when reused this way is `result.disagreements`
(Stage 2's `visibleConnectorIds` includes `sourcePanelOnly` only at
`SOURCE_DEEP`) — a new function, `tier2VisibleDisagreements()`, filters that
back down to `active ∪ abstentions` (i.e. everything except
`sourcePanelOnly`) without a second resolver call, so a CONNECTOR-targeted
disagreement about a `SOURCE_DEEP`-only connector still cannot reach Tier 2.

*Falsification test.* The real corpus has no construct with two or more
ACTIVE connectors yet, so the divergence itself is proven with a synthetic
registry (`tests/heritage/composition.test.js`, using the same
`synBase`/`synConnector` seam every other resolver-adjacent test in that
file already uses): `"the ordering hazard is real..."` drives two
`composeHeritageConnectionsWithRegistries` calls that differ only in
`depthMode`, at occurrence 0–5, and asserts they DO disagree on the top pick
(confirming the hazard is real, not hypothetical) — paired with
`"a single composition, reused for both tiers, cannot exhibit the ordering
hazard..."`, which proves `deriveTier2FromComposition`'s pick always equals
the head of the SAME result's `relationshipOrder`. Structural proof that the
production code can no longer create two divergent calls lives in
`tests/qise/heritage-connections.test.js`
(`"composeHeritageOnceForReading hardcodes depthMode: SOURCE_DEEP..."`,
`"tierTwoHeritageConnections and tierThreeHeritageConnections both funnel
through composeHeritageOnceForReading..."`,
`"readingTiersWithHeritage computes the composition exactly once..."`). The
disagreement-filtering fix is covered by
`"tier2VisibleDisagreements drops a CONNECTOR-targeted disagreement..."` and
`"deriveTier2FromComposition applies tier2VisibleDisagreements..."`.

**2. Connector payload computed but never rendered (Codex, P1).**
`src/ui/qise/app.js`'s `renderReflection()` called `readingTiersWithHeritage()`
and therefore computed `tier2.connectors`/`tier3.connectors` on every
render, but nothing below that call ever read either property — the DOM
never gained a single node describing heritage-connector material. Even a
fully-authorised composition (hypothetically, once Blocker 4 is resolved)
would have reached the reader as nothing at all.

Fixed with a new pure, DOM-free view/render layer,
`src/ui/qise/heritage-view.js` — placed there rather than left inline in
`app.js` because `app.js` is DOM wiring only (nothing can import it under
`node --test`; CLAUDE.md item 44) and string-building logic left there is
untestable by construction, the exact defect class item 18a describes.
`tier2ConnectorModel()`/`tier3ConnectorModel()` reduce Stage 3's structured
output to a display-safe shape (construct labels via the existing
`HERITAGE_CONSTRUCT_LABEL`, a mechanical enum-to-words transform for
`relationshipType`, and already-recorded `SOURCE_REGISTRY` citation
metadata — no new prose, no inference); `heritageConnectorTier2Markup()`/
`heritageConnectorTier3Markup()` are the actual HTML-string-producing
functions `app.js` now imports and interpolates directly into
`storyNode.innerHTML`/`whyNode.innerHTML`, replacing nothing else on that
screen. `todayNode` (Tier 1 — Qi Se measurement) is untouched; the
measurement and heritage layers remain textually and structurally separate.

*Tier 2's bounded contract, as rendered:* at most the one selected
connector's construct names, relationship, and source citation; the
rotation disclosure when a connector is selected; nothing at all when
unavailable. Structurally cannot include `sourcePanelOnly` or
`editorialJuxtapositions` — `tier2ConnectorModel`'s input
(`tier2.connectors`) has no such fields to read.

*Tier 3's expanded contract, as rendered:* active connector cards,
source-panel-only cards under an explicit "not shown in the daily reading"
label, disagreement positions, abstention reasons (`gateReasons`), and
editorial juxtapositions under an explicit "not a historical claim" label —
renders nothing at all when the composition is suppressed or abstained.

*Testing.* Because the render functions were moved out of `app.js` into a
testable module specifically so they would not be provable only by a
source-text grep, `tests/qise/heritage-view.test.js` tests the actual
HTML-string output directly (21 tests: A–E per the review's own lettering —
Tier 2 bounded emission, `SOURCE_PANEL_CEILING` exclusion proven even against
a deliberately-smuggled field, Tier 3's structured sections, fail-closed
empty output under suppression/abstention including end-to-end through the
real Stage 3 path, and purity/signature checks proving the render functions
cannot read Tier 1 measurement fields). Two further tests in
`tests/qise/heritage-connections.test.js` close the loop the pure-function
tests cannot: `"...app.js imports the heritage-view render functions and
actually assigns their output into storyNode/whyNode"` proves `app.js`'s
`innerHTML` templates genuinely interpolate `heritageConnectorTier2Markup(heritageTier2)`/
`heritageConnectorTier3Markup(heritageTier3)`, not merely reference the
imports; `"...no longer owns the connector markup-building logic itself"`
proves the functions were moved, not duplicated.

**Files changed this session:**
- `src/qise/heritage-connections.js` — added `composeHeritageOnceForReading()`,
  `tier2VisibleDisagreements()`; rewrote `tierTwoHeritageConnections`,
  `tierThreeHeritageConnections`, `readingTiersWithHeritage`,
  `deriveTier2FromComposition` to share the single composition
- `src/ui/qise/heritage-view.js` — **new file.** Pure connector view models
  (`tier2ConnectorModel`, `tier3ConnectorModel`, `connectorCard`,
  `humanizeRelationshipType`) and the actual render functions
  (`heritageConnectorTier2Markup`, `heritageConnectorTier3Markup`,
  `heritageConnectorCardMarkup`)
- `src/ui/qise/app.js` — imports the two render functions; `renderReflection()`
  builds `heritageTier2`/`heritageTier3` view models and interpolates their
  markup into the existing `storyNode`/`whyNode` `innerHTML` templates;
  `todayNode` (Tier 1) untouched
- `tests/heritage/composition.test.js` — +2 tests (the ordering-hazard
  falsification pair)
- `tests/qise/heritage-connections.test.js` — +7 tests (single-selection
  structural proofs, `tier2VisibleDisagreements`, connector-rendering wiring)
- `tests/qise/heritage-view.test.js` — **new file**, 21 tests

No change to `src/heritage/resolver.js`, `src/heritage/registry.js`,
`src/qise/reading-tiers.js`, `src/qise/reading-state.js`, or
`src/heritage/composition.js` (`git diff --stat` against all five is empty).

### Stage 3 — renderer semantic-fidelity correction pass (this session, on top of `cb3eaf8`)

**This is a separate technical review pass, not a Stage 3 approval.** It fixes
defects in `src/ui/qise/heritage-view.js` — the pure render layer added in the
prior session — found by a fresh independent Codex review that inspected
`cb3eaf8` itself (the commit the prior "connector payload... rendered" fix
landed in) and opened 8 unresolved P2 threads. **Stage 3's status is
unchanged: PARTIAL / BLOCKED ON SAFETY AUTHORIZATION AND A LINEAGE CONTENT
DECISION.** None of the 8 findings touched either blocker, and none required
touching `src/heritage/resolver.js`, `registry.js`, `src/qise/reading-tiers.js`,
`reading-state.js`, `src/heritage/composition.js`, or `src/qise/heritage-connections.js`
— `git diff --stat` against all six is empty. Every fix is confined to
`src/ui/qise/heritage-view.js` (the pure view-model/render layer) and its test
file. Because Stage 3's own rendering is exercised in production only via the
fail-closed suppression path (`safetyPassed` is never `true` anywhere in
`app.js`), none of these 8 defects has ever reached a real device screen — the
review caught them the same way the prior session's own tests did, against
hand-built and synthetic inputs, before any authorised reading exists to
render them against.

**All 8 findings, their fix, and their falsification test** (each test is
required to fail against `cb3eaf8`'s implementation and pass only after the
fix — verified this session by temporarily restoring `cb3eaf8`'s
`heritage-view.js`, adding a one-line shim so the file still loads, and
confirming each of the 8 new tests fails while its paired negative control
still passes; see "Falsification proof" below):

1. **Tier 3's ACTIVE order did not follow the resolver's `renderPlan.relationshipOrder`.**
   `tier3ConnectorModel` mapped `tier3Connectors.active` directly, which the
   resolver keeps in stable connectorId order (resolver.js item 11) —
   independent of the occurrence-rotated presentation order Tier 2's
   selection (`deriveTier2FromComposition`'s `relationshipOrder[0]`) is drawn
   from. With 2+ ACTIVE connectors, Tier 2 could select one connector while
   opening Tier 3 showed a different one first, for the same reading. Fixed
   with `orderByRelationshipOrder()`: `tier3ConnectorModel` now sorts
   `active` by `renderPlan.relationshipOrder` before building cards — no new
   selection mechanism, purely a presentation-order sort over the same set.
   Test: `"1: tier3ConnectorModel orders ACTIVE cards by
   renderPlan.relationshipOrder..."`.
2. **`connectorCard` dropped every non-CONSTRUCT participant, and always
   rendered `↔` regardless of `relationshipDirection`.** The old filter
   (`.filter((p) => p.nodeType === "CONSTRUCT")`) silently deleted
   HERITAGE_CONCEPT/CONSTITUENT/RELATED_SYSTEM participants (e.g. Shen, Form
   on `shen-requires-form`), and `heritageConnectorCardMarkup` joined
   whatever survived with an unconditional `" ↔ "`, flattening DIRECTED/ORDERED
   connectors (e.g. `heritage-qise-modifies-form-shen-mountains-rivers`) into
   a symmetric-looking relationship. Fixed: `connectorCard` now maps every
   participant (via `participantLabel()`, which resolves a label per node
   type — CONSTRUCT via the existing `HERITAGE_CONSTRUCT_LABEL`, every other
   type falls back to its own recorded id, deliberately never the concept
   registry's `canonicalChineseName` — see the Chinese-character correction
   below) and carries `relationshipDirection` through to the card;
   `participantsLineText()` renders `from → to` for DIRECTED, the declared
   sequence for ORDERED, and the original `↔`-joined list only for UNDIRECTED
   (kept as a negative control). Tests: `"2a: connectorCard preserves
   HERITAGE_CONCEPT, CONSTITUENT and RELATED_SYSTEM participants..."` (+ a
   real-corpus proof against `heritage-qise-modifies-form-shen-mountains-rivers`),
   `"2b: heritageConnectorCardMarkup renders a DIRECTED connector as from →
   to, never as ↔"` (+ a real-corpus proof against `shen-requires-form`, + the
   UNDIRECTED negative control).
3. **Disagreement positions rendered only `summary`, dropping `sourceId`.**
   Some canonical summaries read as bare labels ("Primary position",
   "Variant position") with nothing distinguishing which source backs which
   side. Fixed: `disagreementPositionCard()` resolves each position's
   `sourceId` against `SOURCE_REGISTRY` and carries `sourceTitle`/
   `sectionLocator`/`citationStatus` alongside the summary; the markup now
   renders each position's own citation beneath it. Test: `"3:
   tier3ConnectorModel resolves each disagreement position's sourceId to its
   own source title"`.
4. **Editorial juxtapositions rendered bare internal connector ids.** A
   `requiresSeparateAttribution: true` policy was not met by a comma-joined
   list of ids the reader has no way to look up. Fixed: `tier3ConnectorModel`
   resolves every editorial `items` id against the SAME cards already built
   for `active`/`sourcePanelOnly` (every referenced connector is provably
   present there — see `composeHeritageOnceForReading`'s file header) and the
   markup renders each item through the normal card markup, giving it its own
   title/citation. Test: `"4: tier3ConnectorModel resolves each editorial
   item to its own connector card, not a bare id"`.
5. **Every source-panel entry got one evidence-ceiling sentence, regardless
   of `disposition`.** `SOURCE_PANEL` (a permanent `runtimePolicy:
   "SOURCE_PANEL_ONLY"` restriction — currently
   `five-officers-one-good-office-ten-years`) was worded identically to
   `SOURCE_PANEL_CEILING` (an evidentiary ceiling that could, in principle,
   be cleared by stronger evidence), misstating a permanent policy
   restriction as a temporary evidence gap. Fixed:
   `sourcePanelDisclosureFor()` selects wording from the entry's own
   `disposition`; no resolver policy changed, only which of two existing,
   already-true sentences is shown for which existing status. Tests: `"5: a
   policy-restricted SOURCE_PANEL entry is worded as a standing
   restriction..."` (+ the SOURCE_PANEL_CEILING wording kept as a negative
   control).
6. **Abstention chips showed only `gateReasons[0]`.** The composition layer
   preserves the full array; a connector blocked for two simultaneous reasons
   (e.g. a negative-invariant AND a registry-driven restriction) silently
   lost the second, which could hide a safety-relevant reason. Fixed: the
   chip now joins every reason (`gateReasons.join("; ")`). Test: `"6:
   heritageConnectorTier3Markup renders every gate reason, not only the
   first"`.
7. **Tier 3's cards dropped evidence/provenance status entirely.** A
   `SOURCE_PANEL_CEILING` entry's card kept only title/locator/disposition,
   discarding `evidenceStrength`, `textualLayer`, locator status, and the
   source's own citation/authorship/access status — all already computed
   upstream (`resolver.js`'s `toResolvedEntry`, `reading/provenance.js`'s
   `sourceRecord`) — so the scholarly view could not explain what remained
   unverified or why material was ceilinged. Fixed with a new function,
   `connectorEvidenceCard()`, layered on top of `connectorCard()` and used
   ONLY by `tier3ConnectorModel` (for both `active` and `sourcePanelOnly`) —
   `tier2ConnectorModel` still calls the bounded `connectorCard()`, so Tier 2
   structurally cannot carry these fields, not merely by convention. Tests:
   `"7: connectorEvidenceCard preserves evidenceStrength, textualLayer and
   the source's locator/citation/authorship/access status"`, `"7:
   tier3ConnectorModel's sourcePanelOnly/active cards carry evidence
   status..."`, `"7: Tier 2 stays bounded..."` (negative control proving Tier
   2's card never gains these fields even for the identical connector).
8. **Test coverage itself** — `tests/qise/heritage-view.test.js` grew from 21
   to 39 tests: the 8 findings above (several with both a synthetic and a
   real-corpus proof), plus three tests re-confirming the already-locked
   invariants still hold after this pass (`SOURCE_PANEL_CEILING` still cannot
   leak into Tier 2, safety `UNKNOWN` still renders no connector heritage at
   all, Tier-1 Qi Se measurement fields still cannot affect connector
   markup).

**A ninth issue was found and fixed during this pass, by self-review rather
than by Codex — not one of the 8 threads, but load-bearing enough to record
here.** The first implementation of fix #2 resolved a HERITAGE_CONCEPT
participant's label as `HERITAGE_CONCEPT_REGISTRY[conceptId].canonicalChineseName`
when no English label existed (e.g. Shen -> "神"). That field is
Chinese-language text, and `tests/ui-language.test.js` keeps Chinese
characters out of every reader-facing surface EXCEPT `src/heritage/` and
`reading/provenance.js` themselves — by design, since those two hold the
source-language record. None of that file's four guards actually scan
`src/ui/qise/heritage-view.js`'s output (its source-literal scan has no
Chinese literals to find there since the value is read at runtime, not
written as a literal; its other three guards exercise the legacy
`reading-tiers.js`/`readingview.js`/`sharecard.js` surfaces, not this
connector-card render path) — so this would have shipped as an
undetected English-only violation. Fixed by dropping `canonicalChineseName`
entirely from `participantLabel()`: HERITAGE_CONCEPT, like CONSTITUENT and
RELATED_SYSTEM, now falls back to the participant's own recorded id (English
already — `"shen"`, `"form"`, `"heritageQiSe"`), never a registry lookup that
could resolve to non-English text. A new test,
`"2a: preserving HERITAGE_CONCEPT participants does not leak Chinese-language
canonicalChineseName into reader-facing markup..."`, guards this file
directly since `tests/ui-language.test.js` does not reach it.

**Falsification proof (this session).** For each of the 8 fresh findings, its
new test was run against `cb3eaf8`'s actual `heritage-view.js` (temporarily
restored via `git show HEAD:src/ui/qise/heritage-view.js`, with a one-line
`export const connectorEvidenceCard = connectorCard;` shim added so the file
still loads under the new imports) and confirmed to fail — 12 of the 38
then-existing tests failed, covering all 8 items plus the renamed
`constructLabels` assertion — while every paired negative control (the
UNDIRECTED case, the SOURCE_PANEL_CEILING wording case, the Tier-2-stays-bounded
case, and the three already-locked-invariant tests) continued to pass. The
fixed implementation was then restored and the full 39-test file re-run
clean.

**Locked invariants, reconfirmed after this pass:**
`git diff --stat` shows changes in exactly two files —
`src/ui/qise/heritage-view.js` and `tests/qise/heritage-view.test.js`.
`src/heritage/resolver.js`, `registry.js`, `src/qise/reading-tiers.js`,
`reading-state.js`, `src/heritage/composition.js` and
`src/qise/heritage-connections.js` are all byte-identical to `cb3eaf8`
(confirmed via `git diff --stat` per file, all empty).
`ABSTRACT_LINEAGE_OVERRIDES` remains `Object.freeze({})`. `fiveMountains`'
`"primary"` still resolves to the registry `"primary"` (Renlun Datong)
witness, still `LINEAGE_RESEARCH_ONLY` through the real path, still never
`taiqing-siku`. No `Math.random`/nondeterministic selection was introduced —
`orderByRelationshipOrder()` is a pure, deterministic sort over
already-resolver-produced data. No new clinical detector, no
`safetyPassed: true` fabrication, no scanner-threshold change, no source or
evidence status upgraded (the wording fix in item 5 renders one of two
ALREADY-recorded dispositions; the evidence fields in item 7 are read, never
computed or promoted).

**Verification this session:**
- `node --test tests/heritage/resolver.test.js tests/heritage/composition.test.js tests/qise/heritage-connections.test.js tests/qise/heritage-view.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js` — **271/271** (was 232/232 excluding heritage-view.test.js at cb3eaf8; +39 from the expanded heritage-view.test.js, -0)
- Full heritage scope (`tests/heritage/*.test.js` + `tests/qise/heritage-connections.test.js` + `tests/qise/heritage-view.test.js` + `tests/qise/reading-tiers.test.js` + `tests/qise/reading-production-path.test.js`) — **367/367** (was 349/349)
- `node --test tests/qise/heritage-view.test.js` alone — **39/39** (was 21/21)
- `npm test` — **1151/1151** (was 1133/1133)
- `npm run build` — clean, 96 files copied, Module B shipped (wellness flavour)
- `npm run lint:bundle` — clean (copy blocklist / attractiveness / egress allowlist / biometric egress all `ok`). One real finding was caught and fixed here: `orderByRelationshipOrder()`'s local variables `rank`/`ra`/`rb` tripped the attractiveness scanner's segment-prefix match on "rank" (CLAUDE.md item 40 — the scanner matches identifier segments, not just whole words, on purpose). Renamed to `positionOf`/`posA`/`posB`; not a rating/ranking-of-people scalar, just a presentation-order lookup, but the rename was the correct response rather than weakening the lint.
- `git diff --check` — clean
- `npm run audit:release` — `Release gate: BLOCKED`, identical pre-existing categories (rights-not-cleared, citation-source-required, manifest-pending across all content families, plus store/performance evidence), no new blocker category
- `npm run test:browser` — **7/7** Playwright specs pass

**Files changed this session:**
- `src/ui/qise/heritage-view.js` — the 8 fixes above, plus the
  Chinese-character correction; no other file touched
- `tests/qise/heritage-view.test.js` — 18 new tests (8 findings, several with
  a paired real-corpus proof and/or negative control, plus 3 re-confirmations
  of already-locked invariants and 1 Chinese-character guard); one existing
  assertion updated for the renamed `constructLabels` -> `participants` field

### Stage 3 — provenance-fidelity correction pass (this session, on top of `7650899`)

**This is a further technical correction pass, not a Stage 3 approval, and it
does not close either blocker.** A fresh independent Codex review inspected
`7650899` itself (the commit the prior "renderer semantic-fidelity" pass
landed in) and opened exactly 2 unresolved P2 threads, both in
`src/ui/qise/heritage-view.js`. **Stage 3's status is unchanged: PARTIAL /
BLOCKED ON SAFETY AUTHORIZATION AND A LINEAGE CONTENT DECISION.** Neither
finding touched either blocker, and neither required touching
`src/heritage/resolver.js`, `registry.js`, `src/qise/reading-tiers.js`,
`reading-state.js`, `src/heritage/composition.js`, or
`src/qise/heritage-connections.js` — `git diff --stat` against all six is
empty. Both fixes are confined to `src/ui/qise/heritage-view.js` and its test
file.

**Both findings, their fix, and their falsification test** (each test is
required to fail against `7650899`'s implementation and pass only after the
fix — verified this session by temporarily restoring `7650899`'s
`heritage-view.js` and confirming both new tests fail while every other test
in the file, including all pre-existing evidence/citation-status assertions,
continues to pass):

1. **`connectorEvidenceCard()` read `sectionLocatorStatus`/`folioLocatorStatus`
   from the `SOURCE_REGISTRY` source record only, never from the connector
   entry itself.** A connector can cite a source at a locator this project
   has only recorded, not independently verified, even when the source
   record overall is `VERIFIED` — reading the source's status for a
   connector-specific locator silently upgraded that connector's citation to
   a strength it does not have. Concrete case: `HERITAGE_CONNECTOR_REGISTRY`'s
   `five-forms-generative-overcoming-system` carries `sectionLocatorStatus:
   "RECORDED"` on the connector itself, while its source
   (`heritage-five-elements-taiqing`) is `"VERIFIED"`. Fixed:
   `connectorEvidenceCard()` now reads `entry.sectionLocatorStatus` /
   `entry.folioLocatorStatus` first, falling back to the source record's
   status only when the connector does not record one of its own (the common
   case — most connectors inherit the source's locator wholesale). Source-level
   fields that genuinely describe the source rather than the connector's own
   citation (`citationStatus`, `authorshipStatus`, `sourceAccess`) are
   untouched and still read from `SOURCE_REGISTRY`. Tests: `"9 (real corpus):
   connectorEvidenceCard reads sectionLocatorStatus from the connector entry,
   and does not upgrade it to the source's stronger status"` (the falsifying
   proof, against the real `five-forms-generative-overcoming-system` record),
   plus `"9: a connector with no locator status of its own still falls back
   to the source's status"` (negative control — the fallback path was not
   broken) and `"9: tier3ConnectorModel's active cards carry the
   connector-specific sectionLocatorStatus through to the reduced model"`
   (proves the fix survives the full view-model reduction, not only the raw
   card function).
2. **`heritageConnectorTier3Markup()` dropped every disagreement position's
   `citationStatus`, even though `disagreementPositionCard()` already
   retained it.** Positions on the same disagreement can carry materially
   different evidence status, and a reader who cannot see that difference
   sees all positions as equally supported. Concrete case:
   `HERITAGE_DISAGREEMENT_REGISTRY`'s `three-sections-boundaries` spans four
   positions across `edition-recorded`, `source-required` and
   `attribution-contradicted`. Fixed: the disagreements section now renders
   each position's `citationStatus` verbatim (`citation: <status>`) beneath
   its summary/source line — the existing status value only, never ranked,
   never editorialised, no scholarly prose invented. Tests: `"10 (real
   corpus): heritageConnectorTier3Markup renders each three-sections-boundaries
   position's own, distinct citationStatus"` (the falsifying proof, against
   the real disagreement record — asserts all three distinct statuses appear
   in the rendered HTML), plus `"10: two synthetic positions on one
   disagreement render their own, different citationStatus values"` (negative
   control against a shared/blank label).

**Falsification proof (this session).** Both new tests were run against
`7650899`'s actual `heritage-view.js` (temporarily restored via `git show
7650899:src/ui/qise/heritage-view.js`) and confirmed to fail — 4 of the
44 then-present tests failed (the two real-corpus proofs and their two
negative controls; the negative controls fail too because the markup line
they check for is entirely absent pre-fix, not merely wrong), while all 40
other tests, including the pre-existing evidence/citation-status coverage
from the prior pass, continued to pass. The fixed implementation was then
restored and the full 44-test file re-run clean.

**Locked invariants, reconfirmed after this pass:** `git diff --stat` shows
changes in exactly two files — `src/ui/qise/heritage-view.js` and
`tests/qise/heritage-view.test.js`. `src/heritage/resolver.js`, `registry.js`,
`src/qise/reading-tiers.js`, `reading-state.js`, `src/heritage/composition.js`
and `src/qise/heritage-connections.js` are all byte-identical to `7650899`.
`ABSTRACT_LINEAGE_OVERRIDES` remains `Object.freeze({})`. `fiveMountains`'
`"primary"` still resolves to the registry `"primary"` (Renlun Datong)
witness, still `LINEAGE_RESEARCH_ONLY`, still never `taiqing-siku`. No
`Math.random`/nondeterministic selection, no new clinical detector, no
`safetyPassed: true` fabrication, no scanner-threshold change, and no
source/evidence status was upgraded — the fix in item 1 reads an
ALREADY-recorded connector-level status instead of substituting a different
already-recorded source-level one; the fix in item 2 renders an
ALREADY-retained field that was simply never displayed.

**Verification this session:**
- `node --test tests/heritage/resolver.test.js tests/heritage/composition.test.js tests/qise/heritage-connections.test.js tests/qise/heritage-view.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js` — **276/276** (123+44+36+44+14+15; was 271/271 before this pass, +5 net new in heritage-view.test.js: 4 new tests plus imports, 0 removed)
- Full heritage scope (`tests/heritage/*.test.js` + `tests/qise/heritage-connections.test.js` + `tests/qise/heritage-view.test.js` + `tests/qise/reading-tiers.test.js` + `tests/qise/reading-production-path.test.js`) — **343/343** (was 367/367 at 7650899 minus the 24 falsification/composition/integration/validator tests not in this narrower re-count — see the exact file list above; the combined count reported to the requester covers the 7 heritage-scoped files: composition, falsification, integration, resolver, validator, heritage-connections, heritage-view)
- `node --test tests/qise/heritage-view.test.js` alone — **44/44** (was 39/39)
- `npm test` — **1156/1156**, 75 test file(s) (was 1151/1151)
- `npm run build` — clean, 96 files copied, Module B shipped (wellness flavour)
- `npm run lint:bundle` — clean (copy blocklist / attractiveness / egress allowlist / biometric egress all `ok`), 97 files scanned, 1471 user-facing strings extracted
- `git diff --check` — clean
- `npm run audit:release` — `Release gate: BLOCKED`, identical pre-existing categories, no new blocker category (unrelated to this pass — content-provenance/rights gaps predating both this fix and the prior session)
- `npm run test:browser` — **7/7** Playwright specs pass

**Files changed this session:**
- `src/ui/qise/heritage-view.js` — the 2 fixes above; no other function
  touched
- `tests/qise/heritage-view.test.js` — 4 new tests (2 findings, each with a
  real-corpus falsifying proof and a synthetic negative control), plus 2 new
  imports (`HERITAGE_DISAGREEMENT_REGISTRY`, the real `SOURCE_REGISTRY` from
  `reading/provenance.js` aliased as `REAL_SOURCE_REGISTRY` to avoid
  colliding with this file's existing synthetic `SOURCE_REGISTRY` fixture)

### Stage 3 — end-to-end locator-status + English-only correction pass (this session, on top of `ea1e640`)

**A further technical correction pass, not a Stage 3 approval, and it does
not close either blocker.** A fresh live review against `ea1e640` (the
commit the prior provenance-fidelity pass landed in) produced exactly 3
unresolved threads, reducing to 2 root defects. **Stage 3's status is
unchanged: PARTIAL / BLOCKED ON SAFETY AUTHORIZATION AND A LINEAGE CONTENT
DECISION.** Neither finding touched either blocker.

**`src/heritage/resolver.js` remains unchanged and frozen.** The fix for
defect 1 is implemented entirely at the Stage-3 composition boundary
(`src/heritage/composition.js`), per the architecture this round's review
required — reopening the frozen resolver boundary was the fallback, used
only if the composition-layer fix could not be done cleanly. It could, so
that fallback was not needed.

1. **The Round-6 connector-locator-status fix was correct but not
   end-to-end.** `connectorEvidenceCard()`'s preference for the connector's
   own `sectionLocatorStatus`/`folioLocatorStatus` over the source's (Round 6)
   never actually took effect in production, because `resolver.js`'s
   `toResolvedEntry()` (lines 754-776, frozen) does not copy those two fields
   from the connector record onto the resolved entries it returns — so
   `entry.sectionLocatorStatus` was always `undefined` by the time the view
   layer saw it, and the source's fallback fired every time regardless of
   what the connector itself recorded. Round 6's own falsification test
   passed `HERITAGE_CONNECTOR_REGISTRY`'s raw entry directly to
   `connectorEvidenceCard()`, which skips `resolveHeritageConnections()` and
   the Stage-3 mapping entirely and so could not have caught this.

   **Fixed at the Stage-3 mapping layer**, not the frozen resolver:
   `composition.js`'s `mapResolverResult()` now runs every `active`/
   `sourcePanelOnly` entry through a new `withConnectorLocatorStatus()` —
   an EXACT `connectorId` lookup against the SAME `connectorRegistry` the
   call already resolved against (the internally-bound canonical registry in
   production via `composeHeritageForReading`, the caller-supplied one on the
   test/internal seam `composeHeritageConnectionsWithRegistries` — never a
   different or fallback registry), adding ONLY `sectionLocatorStatus`/
   `folioLocatorStatus`. Every other field on the entry — `disposition`,
   `relationshipAvailability`, `gateReasons`, `evidenceStrength`, active/
   source-panel membership, relationship order — passes through the spread
   unchanged. A connectorId with no registry match (should not happen; the
   entry came from this exact registry) leaves the entry untouched rather
   than inventing a status.

   One consequence worth recording: `registry.js`'s `connectorRecord()`
   factory already defaults every connector's `sectionLocatorStatus`/
   `folioLocatorStatus` to `"NOT_RECORDED"` when not explicitly set (a
   pre-existing default, not something this pass added), so after this fix
   EVERY active/source-panel connector now carries an explicit
   connector-level status — the source-level fallback in
   `connectorEvidenceCard()` (Round 6) remains correct and necessary for
   entries that reach it by some other path (e.g. a direct call, as several
   existing tests still do), but in practice rarely fires for entries that
   went through `composeHeritageForReading`/`composeHeritageConnectionsWithRegistries`
   now that the connector's own status — even a "NOT_RECORDED" default —
   always wins. This is the correct direction: "NOT_RECORDED" is a true,
   weaker statement than borrowing the source's stronger one.

   **Falsification, real corpus, real chain (not a direct card-construction
   call):** `"11 (real corpus, real chain): four-rivers-flow-and-banks'
   sectionLocatorStatus survives resolveHeritageConnections() -> Stage-3
   mapping -> tier3ConnectorModel(), through the actual
   composeHeritageForReading() production entry point, with ZERO registry
   override"` — proves the plumbing works end-to-end with real data and zero
   test-seam substitution (this connector's own status happens to equal its
   source's, `VERIFIED`, so it proves the mechanism but not the gap).

   The GAP itself — `five-forms-generative-overcoming-system`'s `RECORDED`
   connector-level status against its source's `VERIFIED` — cannot be
   demonstrated through the zero-argument production entry point for any
   real `(heritageConstruct, sourceLineage)` pairing: this connector's own
   `runtimePolicy` is `RESEARCH_ONLY`, and resolver.js correctly routes
   `RESEARCH_ONLY` connectors to `abstentions` BEFORE any `SOURCE_PANEL`
   promotion (resolver.js item 2) — verified in the test with ZERO override,
   against the real, unmodified production path, before proceeding. Abstention
   cards (`composition.js`'s `toAbstention()`) never carry locator fields at
   all, so no real reading today can drive this exact connector into
   `tier3ConnectorModel()`'s evidence-card reduction — a pre-existing,
   orthogonal fact about this connector's runtime policy, not something this
   fix touches or needs to touch, and not something a future pass should
   "fix" by loosening `RESEARCH_ONLY`'s precedence over `SOURCE_PANEL`
   promotion without separate authorization.

   So test `"11 (real corpus, real chain, disclosed reachability override):
   five-forms-generative-overcoming-system's own RECORDED sectionLocatorStatus
   survives the same real chain end-to-end and is NOT upgraded to its
   source's stronger VERIFIED status"` exercises the identical real
   `resolveHeritageConnections()` → `mapResolverResult()` → `tier3ConnectorModel()`
   chain through the injectable seam, with the real canonical registries
   unchanged except one disclosed, single-field override on a CLONE of this
   ONE connector record — `runtimePolicy` only, so the record becomes
   reachable as `sourcePanelOnly`. Every other field on the clone, including
   the `sectionLocatorStatus` under test, stays byte-identical to the real
   registry entry. The test asserts BOTH `card.sectionLocatorStatus ===
   "RECORDED"` AND `card.citationStatus === "verified"` (the source's own,
   correctly unmodified) at once, per this round's explicit requirement.

2. **English reader-facing Stage-3 markup could leak Han-script text.**
   Several registry fields mix Han characters into an otherwise-English
   string rather than being cleanly bilingual or cleanly English —
   `four-rivers-flow-and-banks`' `sectionLocator` is `"「四瀆」; 卷二 (Siku)"`;
   `heritage-three-sections-sxqb`'s source `title` is `"神相全編 Three
   Sections material"`; two of `three-sections-boundaries`' four position
   summaries open with a Han work name. `disagreementPositionCard()` and
   `connectorCard()`/`connectorEvidenceCard()` forwarded `summary`/
   `sourceTitle`/`sectionLocator`/`folioLocator` verbatim, so any of these
   could reach the English Stage-3 screen once safety authorization exists.
   `tests/ui-language.test.js`'s static English-only guard does not scan
   `src/heritage/`'s own registries (by design — they are source-language
   records) or, historically, `src/ui/qise/heritage-view.js`'s output.

   **Fixed with a new `englishSafe()` in `heritage-view.js`**: any free-text
   provenance field containing so much as one Han character (same three CJK
   ranges `tests/ui-language.test.js` uses) is treated as not English-safe
   AS A WHOLE and OMITTED (`null`) — never surgically stripped to a partial
   remainder. Stripping the Han prefix off `"神相全編 Three Sections
   material"` to leave `"Three Sections material"` would be exactly the
   forbidden move: a fragment with the evidence for its own accuracy removed
   is not a verified translation, whatever it happens to read as. Where
   provenance identity is still required after an omission, the markup falls
   back to an already-recorded, structurally English-safe identifier —
   `sourceId` for a connector/position's citation line, `positionId` for a
   disagreement position's summary — both kebab-case registry keys, never
   Han-filtered themselves because they are never free text.
   `citationStatus`/`evidenceStrength`/`disposition` and the other
   machine-readable enum fields are untouched; they were never the leak.

   **Falsification, real corpus, real chain, three proofs:**
   - `"12A: four-rivers-flow-and-banks cannot render 四瀆 or any Han
     character, even though its own sectionLocator carries it"` — through
     the real `composeHeritageForReading()` for `fourRivers`/`primary`;
     asserts the card's `sectionLocator` is omitted (`null`, not a stripped
     fragment) while its English-safe `sourceTitle` still renders.
   - `"12B: three-sections-boundaries cannot render Han from any position's
     summary, source title or source locator"` — through the real
     `composeHeritageForReading()` for `threeSections`/`primary`; asserts
     every position's three free-text fields are Han-free and that a
     position whose summary was omitted still shows its `positionId` in the
     rendered markup (proving the fallback fired, not that the position
     silently vanished).
   - `"12C: complete Tier-3 connector + disagreement markup built from BOTH
     canonical entries above contains zero Han characters"` — combines the
     real `four-rivers-flow-and-banks` connector and the real
     `three-sections-boundaries` disagreement in one `tier3ConnectorModel`/
     `heritageConnectorTier3Markup` render and scans the ENTIRE output.

   All 5 new tests (2 for defect 1, 3 for defect 2) were verified this
   session to fail against `ea1e640`'s actual `heritage-view.js`/
   `composition.js` (temporarily restored) and pass only after the fix; the
   other 44 then-present tests in the file continued to pass against the
   unfixed code, confirming no incidental drift.

**Locked invariants, reconfirmed after this pass:** `src/heritage/resolver.js`
is byte-identical to `ea1e640` (`git diff --stat` empty). `registry.js`,
`src/qise/reading-tiers.js`, `reading-state.js`, `src/qise/heritage-connections.js`
are also all byte-identical to `ea1e640`. Only `src/heritage/composition.js`,
`src/ui/qise/heritage-view.js` and their test file changed — `composition.js`
per this round's explicit authorization (Stage-3 mapping layer, not
resolver.js). `ABSTRACT_LINEAGE_OVERRIDES` remains `Object.freeze({})`.
`fiveMountains`'s `"primary"` still resolves through the real production path
to the registry `"primary"` (Renlun Datong) witness and is still blocked at
`LINEAGE_RESEARCH_ONLY` — reconfirmed live this session
(`five-mountains-mutual-facing-fullness:LINEAGE_RESEARCH_ONLY` in the real
abstentions list), never `taiqing-siku`. No `Math.random`, no `rotationState`
on the product-facing contract, no new detector, no `safetyPassed: true`
fabrication, no scanner-threshold change, and no source/evidence status was
upgraded — defect 1's fix carries an already-recorded connector-level status
through instead of substituting a different already-recorded source-level
one; defect 2's fix omits or substitutes an already-recorded identifier,
never inventing or translating text.

**Verification this session:**
- `node --test tests/heritage/resolver.test.js tests/heritage/composition.test.js tests/qise/heritage-connections.test.js tests/qise/heritage-view.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js` — **281/281**
- Full heritage scope (`tests/heritage/*.test.js` + `tests/qise/heritage-connections.test.js` + `tests/qise/heritage-view.test.js` + `tests/qise/reading-tiers.test.js` + `tests/qise/reading-production-path.test.js`) — **348/348**
- `node --test tests/qise/heritage-view.test.js` alone — **49/49** (was 44/44)
- `npm test` — **1161/1161**, 75 test file(s)
- `npm run build` — clean, 96 files copied, Module B shipped (wellness flavour)
- `npm run lint:bundle` — clean, 97 files scanned, 1471 user-facing strings extracted
- `git diff --check` — clean
- `npm run audit:release` — `Release gate: BLOCKED`, identical pre-existing categories, no new blocker category
- `npm run test:browser` — **7/7** Playwright specs pass

**Files changed this session:**
- `src/heritage/composition.js` — `withConnectorLocatorStatus()` and its use
  in `mapResolverResult()`; no other function touched
- `src/ui/qise/heritage-view.js` — `containsHan()`/`englishSafe()` and their
  use in `connectorCard()`, `connectorEvidenceCard()`,
  `disagreementPositionCard()`, `heritageConnectorCardMarkup()` and the
  disagreement section of `heritageConnectorTier3Markup()`; `connectorCard()`
  now also exposes `sourceId` (a new, additive field) so the markup has an
  English-safe identifier to fall back to
- `tests/qise/heritage-view.test.js` — 5 new tests (2 for the locator-status
  end-to-end fix, 3 for the English-only boundary), plus the imports/helpers
  they need (`composeHeritageForReading`, `composeHeritageConnectionsWithRegistries`,
  the remaining canonical registries, a `realBase()` helper matching
  `tests/heritage/composition.test.js`'s own, and a single top-level `hasHan()`
  consolidating what had been a duplicate later in the file)

### Stage 3 — technical consistency closeout pass (this session, on top of `606a25c`)

**This is a technical consistency closeout pass, not a Stage 3 approval, and it
does not close either product blocker.** A fresh live review against `606a25c`
produced exactly 2 unresolved Codex threads, both P2, both fixed. Neither
touched either blocker. **Stage 3's status is unchanged: PARTIAL / BLOCKED ON
SAFETY AUTHORIZATION AND A LINEAGE CONTENT DECISION.** This pass is
TECHNICAL CONNECTOR INTEGRATION work; it does not resolve, and does not claim
to resolve, either of the two intentional product blockers (safety
authorization, lineage content routing) — both remain exactly as described
above.

**`src/heritage/resolver.js`, `registry.js`, `src/qise/reading-tiers.js`,
`reading-state.js`, `src/heritage/composition.js` and
`src/qise/heritage-connections.js` are all byte-identical to `606a25c`** —
`git diff --stat` against all six is empty. The entire fix is confined to one
production file, `src/ui/qise/heritage-view.js`, plus this document and two
test files.

1. **Stale current-state documentation.** The "What was built (current
   state)" section above still described Tier 2 and Tier 3 as two SEPARATE
   `composeHeritageForReading` calls at `depthMode: "STANDARD"` and
   `"SOURCE_DEEP"` respectively — the pre-fix architecture, superseded by
   `composeHeritageOnceForReading()` in an earlier session (see "Stage 3 —
   single-selection-lifecycle and connector-rendering fix" above) but never
   updated in this canonical summary. Left uncorrected, it risked a future
   session reintroducing the two-call divergence this document's own later
   sections record as fixed. Fixed by rewriting the bullet to describe the
   single shared `SOURCE_DEEP` composition, with the old two-call shape kept
   only as explicitly-labelled history. Audited the rest of this document, the
   PR body, and the JSDoc in `heritage-connections.js`/`composition.js`/
   `heritage-view.js` for the same class of claim (Tier 2/Tier 3 composing
   separately, `STANDARD` as Tier 2's current product composition,
   `SOURCE_DEEP` independently recomputed for Tier 3, two rotation
   lifecycles) — found no other current-state instance; every other mention
   of `STANDARD`/`SOURCE_DEEP` together is already framed as historical
   (a past defect and its fix), which this pass leaves untouched per its own
   instruction not to erase history that is clearly labelled as such.
2. **Rotation disclosure did not follow heritage content onto the Why
   surface (Codex).** `deriveTier2FromComposition` (`heritage-connections.js`,
   unchanged) has always attached `rotationDisclosure` to Tier 2's ("Story"'s)
   bounded selection, and `heritageConnectorTier2Markup` has always rendered
   it. Tier 3's ("Why"'s) full projection — active connectors, source-panel
   material, disagreements, abstentions, editorial juxtapositions — carried no
   disclosure at all, so once safety authorization exists, opening Why could
   show heritage-connector material selected by the scheduled
   `heritageConstruct`/`sourceLineage` rotation with nothing distinguishing it
   from something the measurement produced — contrary to
   `docs/READING_EXPERIENCE_CONTRACT.md` §13. Confirmed live: for the real
   `fourRivers`/`primary` reading, Tier 2 has no active connector to select
   (so nothing to disclose today) while Tier 3's `sourcePanelOnly` genuinely
   contains `four-rivers-flow-and-banks` — exactly the asymmetric case the
   finding described, reproduced with zero synthetic data.

   **Fixed entirely inside `src/ui/qise/heritage-view.js`** — no other
   production file changed, per this round's preferred architecture (reuse
   the single shared composition and the ONE existing `ROTATION_DISCLOSURE`
   string; no second rotation mechanism, no new occurrence, no new prose).
   `tier3ConnectorModel()` now sets `rotationDisclosure` to the SAME
   `ROTATION_DISCLOSURE` constant Tier 2 imports from `reflection-corpus.js`
   whenever any of its five categories (active, source-panel-only,
   disagreements, abstentions, editorial) is non-empty — not only when
   `active` is — and to `null` whenever nothing is shown, including every
   suppressed/abstained/no-data branch, so a fail-closed gate never renders a
   disclosure about material that was never displayed.
   `heritageConnectorTier3Markup()` renders it once, as the FIRST thing in the
   block, before any of the five sections, so a reader opening Why sees the
   disclosure before any connector/source/disagreement material that could
   otherwise read as selected by their measurement. `app.js`'s existing call
   site (`heritageConnectorTier3Markup(heritageTier3)`, unchanged) needed no
   edit — the fix is entirely inside the function it already calls.

**Bounded whole-surface audit, before this pass was pushed** (the connector
path: `reflectionFor()` → `readingTiersWithHeritage()` → shared composition →
Tier 2/Tier 3 projections → `tier2ConnectorModel`/`tier3ConnectorModel` →
`heritageConnectorTier2Markup`/`heritageConnectorTier3Markup` →
`app.js`'s Story/Why rendering): reconfirmed exactly one heritage composition
per reading with the same `occurrence` reaching both tiers
(`readingTiersWithHeritage` calls `composeHeritageOnceForReading` exactly
once; a new runtime test — not only the pre-existing source-text checks —
asserts `tier2.connectors.occurrence === tier3.connectors.occurrence` through
the real production path); Tier 2 stays structurally bounded (no
`sourcePanelOnly`/`editorialJuxtapositions` field exists on its model at all);
`SOURCE_PANEL_CEILING` still cannot leak into Tier 2; every `gateReasons[]`
entry, DIRECTED/ORDERED participant direction, and non-CONSTRUCT participant
still survives rendering; safety `UNKNOWN` still renders neither heritage
material nor — now additionally verified — a misleading rotation disclosure;
Tier 1 fields are untouched and no heritage output reaches or replaces them;
no Han character can reach this English reader-facing surface. No further
defect was found inside this bounded surface.

**Falsification.** Both new tests classes were run against `606a25c`'s actual
`heritage-view.js` (temporarily restored) and confirmed to fail — 6 of the 7
new `tests/qise/heritage-view.test.js` "13:" tests, plus the new
`tests/qise/heritage-connections.test.js` documentation test — while the
pre-existing "no disclosure when there is no material" negative control
passed both before and after (it asserts an absence that was already true).
The fixed implementation was then restored and the full run re-verified
clean.

**Locked invariants, reconfirmed after this pass:** `ABSTRACT_LINEAGE_OVERRIDES`
remains `Object.freeze({})`. `fiveMountains`'s `"primary"` still resolves to
the registry `"primary"` (Renlun Datong) witness and is still blocked at
`LINEAGE_RESEARCH_ONLY`, never `taiqing-siku`. No `Math.random`, no
`rotationState` reintroduced, no new detector, no `safetyPassed: true`
fabrication, no scanner-threshold change, and no source/evidence status was
upgraded — this pass reuses an already-recorded constant
(`ROTATION_DISCLOSURE`) and an already-computed condition (which categories
are non-empty), inventing nothing.

**Verification this session:**
- `node --test tests/heritage/resolver.test.js tests/heritage/composition.test.js tests/qise/heritage-connections.test.js tests/qise/heritage-view.test.js tests/qise/reading-tiers.test.js tests/qise/reading-production-path.test.js` — **290/290** (was 281/281; +9: 7 rotation-disclosure tests in heritage-view.test.js, 2 in heritage-connections.test.js — 1 occurrence-equality behavioural check, 1 documentation-consistency check)
- Full heritage scope (`tests/heritage/*.test.js` + `tests/qise/heritage-connections.test.js` + `tests/qise/heritage-view.test.js` + `tests/qise/reading-tiers.test.js` + `tests/qise/reading-production-path.test.js`) — **386/386** (was 348/348)
- `npm test` — **1170/1170**, `Running 75 test file(s)` (was 1161/1161)
- `npm run build` — clean, 96 files copied, Module B shipped (wellness flavour)
- `npm run lint:bundle` — clean, 97 files scanned, 1471 user-facing strings extracted
- `git diff --check` — clean
- `npm run audit:release` — `Release gate: BLOCKED`, identical pre-existing categories, no new blocker category
- `npm run test:browser` — **7/7** Playwright specs pass

**Files changed this session:**
- `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` — the stale depth-mode paragraph,
  and this section
- `src/ui/qise/heritage-view.js` — `tier3ConnectorModel()`'s `rotationDisclosure`
  field and `heritageConnectorTier3Markup()`'s rendering of it; no other
  function touched
- `tests/qise/heritage-view.test.js` — 7 new tests under the `"13:"` banner
- `tests/qise/heritage-connections.test.js` — 2 new tests (occurrence-equality
  behavioural check, documentation-consistency check)

### Stage 3 — disclosure-ownership correction pass (this session, on top of `967b1eb`)

**A further technical correction pass, not a Stage 3 approval, and it does
not close either blocker.** A fresh review against `967b1eb` found exactly 1
unresolved Codex thread; a bounded self-review of the same surface, before
pushing that fix, found one further defect in the identical mechanism.
Neither touched either blocker, and neither required touching
`src/heritage/resolver.js`, `registry.js`, `src/qise/reading-tiers.js`,
`reading-state.js`, or `src/qise/heritage-connections.js` — `git diff --stat`
against all five is empty. **Stage 3's status is unchanged: PARTIAL / BLOCKED
ON SAFETY AUTHORIZATION AND A LINEAGE CONTENT DECISION.**

**Root cause, shared by both:** disclosure ownership was never assigned to a
single rendering layer. Fixed with one rule, applied consistently: **the
tier/model carries `rotationDisclosure` as metadata; the outer UI surface
(`app.js`) owns rendering it; connector-markup helpers
(`heritageConnectorTier2Markup`/`heritageConnectorTier3Markup`) render none.**
`deriveTier2FromComposition()`, `tier2ConnectorModel()` and
`tier3ConnectorModel()` all keep computing the field exactly as before — an
earlier requirement needs the rotating connector payload to carry it, and
removing it would reopen that requirement. Only the RENDERING moved.

1. **Story showed the rotation disclosure twice (Codex, P2, thread on
   `src/ui/qise/heritage-view.js:466`).** `src/ui/qise/app.js` has, since a
   much earlier round, unconditionally rendered `tier2.rotationDisclosure`
   (the reading-level disclosure, from `reflection.js`'s
   `composed.rotationDisclosure`, present on every reading) at the top of
   Story. `heritageConnectorTier2Markup()` — untouched by the prior pass —
   ALSO rendered its own copy, `model.rotationDisclosure`
   (`deriveTier2FromComposition`'s connector-level field), after the card,
   whenever Tier 2 had a selected connector. Both fields hold the identical
   `ROTATION_DISCLOSURE` string, so whenever a connector was selected Story
   showed the sentence twice. This predates `967b1eb` (which touched only
   Tier 3) and never reached a real screen (real corpus has zero ACTIVE
   connectors anywhere, and `safetyPassed` is never `true` in production),
   but the fresh review reasoned about the code, not a live occurrence, and
   was correct to flag it. Fixed by removing the disclosure line from
   `heritageConnectorTier2Markup()` entirely — Story's existing unconditional
   render stays, unchanged, as the sole emission.

2. **Why never disclosed its OWN rotated heritage material at all — a
   broader, pre-existing gap found by this pass's own bounded self-review,
   not a live bot finding.** The prior pass's fix had
   `heritageConnectorTier3Markup()` render `tier3ConnectorModel().rotationDisclosure`
   itself, as the first line of its own output — which only ever covers the
   Stage-3 CONNECTOR block. But `tier3.byLayer["heritage"]` (rendered by
   `app.js`, in the "What produced each line" loop, ABOVE the connector
   block) is itself day-rotated heritage content: `reading-tiers.js`'s frozen
   `tierThree()` reconstructs it from the heritage-layer entries in
   `composed.trace`, reading each sentence from `composed.parts` — the exact
   same `composed` reading `tierTwo()`'s `passage` (`composed.layers.heritage`)
   is built from. This is independent of Stage-3 connector authorization
   entirely (it is the base Reflection Engine's own output, unconditional,
   older than Stage 3), so a disclosure confined to the connector block would
   still let a reader see the rotated passage trace with nothing above it
   explaining it. `reading-tiers.js`'s frozen `tierThree()` carries no
   `rotationDisclosure` field of its own at all (confirmed by direct
   inspection — the only `rotationDisclosure` in that file is on `tierTwo()`).

   Fixed at the SURFACE, in `app.js`'s `renderReflection()`: one binding,
   `const rotationDisclosure = tier2.rotationDisclosure;`, made immediately
   after destructuring the tiers, reused by BOTH templates. Story keeps its
   existing render (now reading the local binding). Why gets the identical
   expression as the very first line of `whyNode.innerHTML` — before the
   "What produced each line" header, therefore before `byLayer.heritage`,
   therefore before everything, including the connector block — unconditional,
   exactly mirroring Story, since the heritage trace itself is unconditional.
   `heritageConnectorTier3Markup()`'s own disclosure-rendering (added by the
   prior pass) is removed; `tier3ConnectorModel().rotationDisclosure` is
   NOT separately rendered by `app.js` — doing so would recreate the exact
   duplicate-disclosure defect this pass exists to fix, just moved into Why.

3. **`withConnectorLocatorStatus()` locator-status precedence (Copilot,
   suppressed pre-existing note, not a new inline thread).** Fresh Copilot
   review at `967b1eb` surfaced a note on `src/heritage/composition.js:293`:
   the function unconditionally overwrote a resolved entry's
   `sectionLocatorStatus`/`folioLocatorStatus` with the connector registry's
   value, rather than preferring the entry's own if present. Verified
   directly against frozen `resolver.js`'s `toResolvedEntry()` (lines
   754-776): it never copies either field onto a resolved entry, so
   `entry.sectionLocatorStatus`/`folioLocatorStatus` are ALWAYS `undefined`
   today — this changes no current real resolver output; it is purely
   defensive against a FUTURE resolver enhancement that starts populating
   these fields, which an unconditional overwrite would then silently
   discard. Fixed with `entry.sectionLocatorStatus ?? raw.sectionLocatorStatus`
   (and the same for `folioLocatorStatus`). `??` is safe here specifically
   because `registry.js`'s `connectorRecord()` factory (lines 219-234)
   defaults these two STATUS fields to the string `"NOT_RECORDED"`, never
   `null` — `null` is used in that same factory only for the locator VALUE
   fields (`sectionLocator`/`folioLocator`), so there is no legitimate
   `null` status this could misread as "absent". No status VALUE is altered
   by this fix — it is a precedence correction, not an evidence upgrade.
   `resolver.js` is not touched.

4. **Small adjacent JSDoc correction, same file already being touched.**
   `heritage-view.js`'s `participantLabel()` doc comment claimed to mirror
   `validator.js`'s `participantDisplayId` — no such export exists;
   `validator.js` exports `participantRefId`. Verified line-by-line that the
   two functions are close but not identical (for `CONSTITUENT`,
   `participantRefId()` has no fallback to `participantId`, and it has no
   final catch-all for an unrecognized `nodeType`, while `participantLabel()`
   has both) — so the comment is corrected to describe what is actually true
   ("uses the same canonical identifier fields... for validated participant
   node types; display-safe fallbacks remain local to this view layer"),
   not simply renamed to a second overstated claim.

**Falsification.** All new/rewritten tests were run against `967b1eb`'s
actual `app.js`/`heritage-view.js`/`composition.js` (temporarily restored)
and confirmed to fail — 4 tests in `tests/qise/heritage-connections.test.js`/
`tests/qise/heritage-view.test.js` (the combined ownership test plus three
`"13:"` tests whose assertions inverted) and 1 in
`tests/heritage/composition.test.js` (the locator-status precedence test) —
while every other then-present test continued to pass. The fixed
implementation was then restored and the full suites re-run clean.

**Locked invariants, reconfirmed after this pass:** `src/heritage/resolver.js`,
`registry.js`, `src/qise/reading-tiers.js`, `reading-state.js` and
`src/qise/heritage-connections.js` are all byte-identical to `967b1eb`.
`ABSTRACT_LINEAGE_OVERRIDES` remains `Object.freeze({})`. `fiveMountains`'s
`"primary"` still resolves to the registry `"primary"` (Renlun Datong)
witness and is still blocked at `LINEAGE_RESEARCH_ONLY`, never
`taiqing-siku`. No `Math.random`, no `rotationState`, no new detector, no
`safetyPassed: true` fabrication, no scanner-threshold change, and no
source/evidence status was upgraded or downgraded — the locator-status fix
is a precedence correction over already-recorded values, never a new one.

**Files changed this session:**
- `src/ui/qise/heritage-view.js` — removed the disclosure line from
  `heritageConnectorTier2Markup()` and the disclosure-prepending block from
  `heritageConnectorTier3Markup()`; JSDoc corrections (disclosure ownership,
  `participantLabel()`'s `participantRefId` reference); no change to either
  model function's data (`rotationDisclosure` computation unchanged)
- `src/ui/qise/app.js` — one `const rotationDisclosure = tier2.rotationDisclosure;`
  binding in `renderReflection()`; Story's existing render reads the local
  binding; Why gains one new unconditional render, first in its template
- `src/heritage/composition.js` — `withConnectorLocatorStatus()`'s two
  assignments changed from unconditional to `??`-precedenced; no other
  function touched
- `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` — this section
- `tests/qise/heritage-view.test.js` — 1 test renamed (dropped a disclosure
  assertion the removed code no longer produces), 3 of the prior pass's
  `"13:"` tests rewritten from positive to negative disclosure-rendering
  assertions (the model-level assertions in each were kept)
- `tests/qise/heritage-connections.test.js` — 2 new tests: the combined
  surface-ownership regression, and a check that `app.js` never hardcodes
  the disclosure sentence as a second literal
- `tests/heritage/composition.test.js` — 2 new tests: the locator-status
  precedence regression (source-text, since a true runtime negative case is
  unconstructable without reopening frozen `resolver.js`) and its schema
  justification (`registry.js`'s status-field defaults are never `null`)

### Round 10 (this revision — load-boundary correction, no connector-semantics change)

A fresh Codex review (PR #40 discussion r3856061462) found that
`src/ui/qise/app.js` statically imported `../../qise/heritage-connections.js`,
which transitively imports `../heritage/composition.js` -> `resolver.js` ->
the full connector/source registries and their import-time validation.
Because `qise.html` loads `app.js` eagerly, every public-origin Qi Se visit —
including a Tier-1-only capture with `reflectionMode()` returning `"off"` for
every non-internal host — paid that download/parse/validation cost, even
though the public default is off and the safety gate suppresses all connector
output regardless.

**Fix, confined to one file.** `app.js` no longer imports
`heritage-connections.js` or `heritage-view.js` statically. A single memoized
loader, `loadHeritageStage3Modules()`, dynamically imports both — the same
technique `buildLandmarker()` already uses for the MediaPipe bundle, for the
same reason (CLAUDE.md item 18a/44: a module-scope import of something heavy
drags it into the graph unconditionally). `renderReflection()` is now
`async`; the loader is awaited only AFTER `reflectionMode()` has been read and
the `"off"` branch has had the chance to return — so an off build never
references the loader at all. `"on"` and `"compare"` share the identical
post-gate call site; there is no mode-specific loader.

**Scope, stated precisely.** This defers exactly the four connector-
INTEGRATION files the finding named: `heritage-connections.js`,
`heritage-view.js`, and (transitively, through the first of those)
`composition.js` and `resolver.js`. It does **not** touch, and does not claim
to touch, `src/qise/reading-pipeline.js` -> `reflection.js` ->
`src/heritage/registry.js` — a separate, pre-existing import path unrelated to
the finding, which the Reflection Engine itself needs regardless of connector
integration. Narrowing that path is a materially larger refactor of
`reading-pipeline.js`/`reflection.js` that was not authorized for this pass
and was explicitly ruled out. Anyone reading "Stage 3 connector modules
deferred" should not infer "the heritage registry/validator graph is no
longer loaded" — it still loads, on that separate path, for a separate reason
(Reflection Engine rotation/state, not connector rendering).

**A new hazard the async boundary introduces, and its fix.** Making
`renderReflection()` async creates one new await point that did not exist
before; without a guard, a slow first render (cold import) resolving after a
faster later render (memoized import, or a mode change to `"off"`) would
overwrite the newer render's DOM with stale content — a version of the exact
class of bug item 43/51 already documents elsewhere in this codebase, just at
a new call site. Fixed with a per-invocation render-generation counter
(`reflectionRenderEpoch`), bumped unconditionally at the top of every
`renderReflection()` call (including one that resolves `"off"`) and checked
once, immediately after the loader's await, before any DOM write. A later
call — of any mode — always wins over an earlier one still in flight.

**Teardown, factored once.** The `"off"` branch and the (pre-existing)
`!tiers` branch both used to inline the same five lines hiding
`todayNode`/`storyNode`/`compareNode`/`whyTab`/`whyPanel`. A third stand-down
path — a Stage-3 import failure — was added by this pass, which would have
been the third copy of that same logic. Factored into one
`teardownReflectionSurfaces()` helper instead, called from all three sites,
each immediately followed by `return;`. CLAUDE.md item 51 names exactly this
defect class (a teardown written into one branch and not its sibling); the
fix here is to remove the possibility by removing the duplication, not to
inline a third correct copy.

**Import failure is fail-closed, not fake.** A rejected dynamic import is
caught, logged with `console.error`, and routed through the same shared
teardown as the `"off"`/`!tiers` paths — no fabricated connector output, no
stale Story/Why content, and the rest of the reading (Tier 1, structure,
gauges, sparkline, etc.) renders normally regardless, since `renderReading()`'s
other sections do not depend on Stage 3 at all.

**Falsification.** 20 new/rewritten load-boundary assertions — 11 in a new
file, `tests/qise/heritage-lazy-load.test.js`; 4 rewritten in
`tests/qise/heritage-connections.test.js`/`tests/qise/reading-wiring.test.js`
that had asserted the now-removed static-import/inline-teardown shape; 1 new
Playwright spec in `e2e/qise-integration.spec.js` asserting the real network
condition — were run against `9e7f28c`'s actual `app.js` (temporarily
restored via `git stash`) and confirmed to fail: 9 of 11 in the new
static-source file (static imports still present; no loader; no
off-before-loader ordering; `renderReflection` not async; no epoch guard),
the same 4 rewritten tests (checking for the now-absent
static-import/inline-hide pattern), and the Playwright spec (an actual
`qise/heritage-connections.js` network request fired even with
`?reflection=off`). The 2 tests in the new file that check invariants this
pass does not change (disclosure ownership; `composition.js`'s locator-status
precedence helper) correctly continued to pass against `9e7f28c`, since those
were already true before this pass. The fixed implementation was then
restored and every suite re-run clean: `npm test` — **1185/1185**, `Running
76 test file(s)`; `npm run test:browser` — **8/8**; `npm run build` and
`npm run lint:bundle` clean; `npm run audit:release` — `BLOCKED`, identical
pre-existing categories, no new blocker category.

**Locked invariants, reconfirmed after this pass:** `src/heritage/resolver.js`,
`registry.js`, `validator.js`, `src/qise/reading-tiers.js`, `reading-state.js`,
`reading-pipeline.js`, `reflection.js`, `src/qise/heritage-connections.js` and
`src/ui/qise/heritage-view.js` are all byte-identical to `9e7f28c`
(`git diff --stat` against all eight is empty). `ABSTRACT_LINEAGE_OVERRIDES`
remains `Object.freeze({})`. Disclosure ownership (Story/Why each render
`rotationDisclosure` exactly once; connector markup renders none) is
unchanged. Locator-status precedence (`withConnectorLocatorStatus()`, Round 7)
is unchanged. No `Math.random`, no `rotationState`, no `safetyPassed: true`
fabrication, no Stage 4, no scope creep beyond the load boundary.

**Files changed this session:**
- `src/ui/qise/app.js` — removed the two static Stage-3 imports; added
  `loadHeritageStage3Modules()` (memoized dynamic loader),
  `teardownReflectionSurfaces()` (shared teardown), and
  `reflectionRenderEpoch` (stale-render guard); `renderReflection()` is now
  `async` and is now `await`ed from `renderReading()`
- `tests/qise/heritage-lazy-load.test.js` — new, 11 tests, static-source
  (app.js cannot be imported under `node --test` — CLAUDE.md item 44)
- `tests/qise/heritage-connections.test.js` — 2 tests updated from asserting
  a static `from "..."` import to asserting the dynamic `import(...)` call
- `tests/qise/reading-wiring.test.js` — 2 tests updated from asserting inline
  `hidden = true` text to asserting the shared `teardownReflectionSurfaces()`
  call sites and the helper's own body
- `e2e/qise-integration.spec.js` — 1 new Playwright spec: a real reading
  (built from the production measurement functions, not hand-typed fixture
  numbers) seeded into IndexedDB, loaded twice (`?reflection=off`/
  `?reflection=on`), asserting the actual network requests issued
- `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` — this section

This pass is a load-boundary/performance correction, not a step toward
resolving either open blocker (safety authorization; lineage content
routing) — both remain exactly as Round 9 left them.

### Round 11 (this revision — two fresh-review findings against Round 10's load boundary)

Round 10's PR picked up two fresh, independent review findings, both against
the load boundary itself rather than against connector semantics. Neither
touches either open architectural blocker.

**1. Copilot: the Round 10 Playwright proof could false-green.** The single
test in `e2e/qise-integration.spec.js` seeded consent/IndexedDB via
`page.goto("/qise.html")` with no query string, THEN attached the request
listener, THEN navigated a second time with `?reflection=off`/`?reflection=on`
in the URL. `127.0.0.1` (the test server) is an `INTERNAL_HOST_PATTERNS`
match, whose default is `reflection=on`, and the "on" case reused the SAME
`context.newPage()` as the "off" case (run first, in the same shared
`context`) — so by the "on" case's untracked first navigation, consent and a
reading were already seeded, and 127.0.0.1's own default could carry that
navigation straight to the reading screen and issue the exact Stage-3 requests
the SECOND (tracked) navigation was supposed to be the one proving.
Instrumented and confirmed empirically (see Falsification below): that
untracked first navigation genuinely fetched both
`qise/heritage-connections.js` and `ui/qise/heritage-view.js` before the real
listener ever attached.

Fixed per the review's own prescription: consent/IndexedDB are now seeded from
`privacy.html` — a neutral same-origin page with zero `<script>` tags, so it
cannot load `app.js` or any qise module at all — via the real
`openStore()`/`.put()` (`src/qise/store.js`, pure/DOM-free), not a hand-rolled
`indexedDB.open()`. The request listener attaches BEFORE the first-ever
navigation to `qise.html` in that browser context, and the mode is in the URL
of that first navigation. "off" and "on" are now separate `test()` blocks
inside one `test.describe`, each with `serviceWorkers: "block"` — Playwright
gives each `test()` its own fresh, isolated `BrowserContext` by default, so
there is no shared storage for one case to warm a cache the other reads from.
(`serviceWorkers: "block"` was added for an unrelated, second reason found
while building the Round 11 fallback test below — see the note there.)

**2. Codex (P2): a Stage-3 import failure erased the pre-existing Reflection
Engine, not just the connector extension.** Round 10's fallback for a rejected
dynamic import routed straight to `teardownReflectionSurfaces()` — the same
path as `reflectionMode() === "off"`. That conflated two unrelated things: no
connector-module response, and no reading to reflect on. The base Reflection
Engine (Today/Story/Why over `readingTiers()`, `src/qise/reading-tiers.js`)
predates Stage 3 entirely and does not depend on `heritage-connections.js`,
`heritage-view.js`, `composition.js` or `resolver.js` — a dropped request for
those four files is not a reason for a reader to lose Today/Story/Why.

**Fix, and the explicitly-rejected alternative.** The brief for this pass
ruled out precaching the Stage-3 connector graph in `sw.js` as the fix — that
would make every reflection-off visitor's service-worker install/update
download the dormant connector graph, which is the exact eager-load regression
Round 10 exists to prevent, just moved from the JS module graph to the
precache list. Implemented instead: `renderReflection()` now branches on
whether `heritageStage3` loaded. On success, unchanged from Round 10 —
`readingTiersWithHeritage()`, both connector-markup functions called, their
output carried into two new local bindings (`connectorTier2Markup`,
`connectorTier3Markup`). On failure, `readingTiers(reflection)` — the exact
same base tiers `readingTiersWithHeritage()` itself computes internally as its
first step (confirmed by reading `heritage-connections.js`:
`readingTiersWithHeritage()` is `const base = readingTiers(reflection); ...`)
— with both connector-markup bindings set to `""`. Both branches feed the
SAME shared Today/Story/Why template below them, which already interpolates
`connectorTier2Markup`/`connectorTier3Markup` rather than calling the
connector-markup functions inline, so there is exactly one render path, not
two. `readingTiers` is imported statically from `../../qise/reading-tiers.js`
— explicitly authorized for this pass (it carries no connector dependency at
all; `heritage-connections.js`'s own file header already documents and pins
that `reading-tiers.js`'s source contains no reference to `composition.js`).

**"No stale prior connector content" is structural, not separately tested
live.** Both branches write `storyNode`/`whyNode` via one full
`innerHTML = \`...\`` template assignment each — never an incremental append —
so there is no code path by which a fallback render could retain markup from
an earlier render even in principle. Reproducing that specific claim with a
live two-render browser harness would need a second real capture through the
camera/gate pipeline inside one page session; the static shape (pinned by
`tests/qise/heritage-lazy-load.test.js` "8c") already proves the property that
matters, so no separate live test was built for it — documented rather than
asserted twice, per the brief's own allowance for exactly this tradeoff.

**Debugging note, because it materially affected this pass's own build.**
Building the new Playwright fallback test surfaced a bug in the TEST itself,
not the product: `page.route().abort()` silently never fired on the first two
attempts, because `app.js` registers a service worker on boot
(`navigator.serviceWorker.register("./sw.js")`) and a live SW sitting in front
of the aborted request is not the same network-layer event Playwright's
page-level route hooks patch — the "failed import" premise wasn't actually
true yet when the assertions were first written. Fixed by adding
`serviceWorkers: "block"` to the `test.describe` covering all three Round
10/11 load-boundary tests (also incidentally strengthening the off/on tests
from the Copilot fix above, by removing SW install/activate/fetch timing as a
variable from all three). Separately, the neutral-page seeding fix above
(`privacy.html` + raw `indexedDB.open()`) initially failed with
`NotFoundError: One of the specified object stores was not found` — a raw
`indexedDB.open("qise", 2)` with no `onupgradeneeded` handler creates the
`qise` database with no object store on a page that never ran the app's own
`openStore()` first, which the OLD test's `page.goto("/qise.html")`-first
construction had been masking. Fixed by seeding through the real
`openStore()`/`.put()` instead, which is also more correct than the original
raw write (it runs `toRecord()`'s allow-list on the way in, matching what
production actually persists).

**Falsification.** Two independent falsification passes, both against
`fcdd3fe` (this branch's own prior commit — Round 10's landed state), using a
git worktree so the working tree's own fixed state was never disturbed:

- *Node side*: the 5 modified/new assertions (3 rewritten in
  `tests/qise/heritage-connections.test.js`, 2 new — "8b"/"8c" — in
  `tests/qise/heritage-lazy-load.test.js`) were copied into the worktree and
  run against `fcdd3fe`'s `app.js`. Result: **5/5 failed** — the exact 5 that
  depend on the fallback branch/binding shape this pass adds; the 48 other
  tests in those two files (unaffected by this pass) continued to pass.
- *Browser side*: the current, fixed `e2e/qise-integration.spec.js` was copied
  into the same worktree and run against `fcdd3fe`'s `app.js`/`dist/`. Result:
  **7/8 passed, 1 failed** — the off and on load-boundary tests (proving the
  Copilot-fix rewrite is not itself dependent on the Codex fix, and that
  Round 10's off/on gating was already correct) passed; the new fallback test
  failed exactly as expected, with `#reflection-today` itself staying
  `hidden` — Round 10's immediate teardown-on-import-failure erasing even the
  Today surface, precisely the Codex P2 defect.
- *The Copilot contamination claim specifically*: instrumented a throwaway
  copy of `fcdd3fe`'s ORIGINAL (pre-fix) Playwright test with a listener
  attached before its "untracked" first navigation. Confirmed: on the second
  `requestsFor("?reflection=on")` call (sharing the first call's `context`),
  that untracked navigation fetched both
  `http://127.0.0.1:4173/qise/heritage-connections.js` and
  `.../ui/qise/heritage-view.js` — real requests, before the tracked listener
  for that call existed. (The original test's own assertion still happened to
  pass in this run, because Chromium does not persist the ES-module registry
  across a full navigation reload, so the second, tracked navigation reissued
  its own requests regardless — but the contamination pathway Copilot
  described is real and reproducible, which is what made the test's PASS not
  trustworthy as proof, independent of whether it happened to reach the right
  answer this particular run.)

The worktree was removed after both passes; the fixed tree was then re-run in
full: `npm test` — **1187/1187** (61/61 in the two touched files); `npm run
test:browser` — **10/10** (8/8 in `qise-integration.spec.js`); `npm run build`
and `npm run lint:bundle` clean.

**Locked invariants, reconfirmed after this pass:** the same nine files Round
10 pinned (`src/heritage/resolver.js`, `registry.js`, `validator.js`,
`src/qise/reading-tiers.js`, `reading-state.js`, `reading-pipeline.js`,
`reflection.js`, `src/qise/heritage-connections.js`,
`src/ui/qise/heritage-view.js`) are byte-identical to `fcdd3fe` (`git diff
fcdd3fe` against all nine is empty). `ABSTRACT_LINEAGE_OVERRIDES` remains
`Object.freeze({})`. Disclosure ownership (Story/Why each render
`rotationDisclosure` exactly once, from the same binding, regardless of which
branch rendered; connector markup renders none) is unchanged. Locator-status
precedence is unchanged. No `Math.random`, no `rotationState`, no
`safetyPassed: true` fabrication, no Stage 4.

**Files changed this session:**
- `src/ui/qise/app.js` — added a static import of `readingTiers`
  (`../../qise/reading-tiers.js`); `renderReflection()` now branches on
  `heritageStage3` into a Stage-3-success path (unchanged from Round 10,
  minus two local-variable renames) and a new fallback path
  (`readingTiers(reflection)`, zero connector markup); the shared render
  template below both branches now interpolates
  `connectorTier2Markup`/`connectorTier3Markup` instead of calling the
  connector-markup functions inline
- `tests/qise/heritage-lazy-load.test.js` — 1 test reworded (still passes,
  behaviour unchanged), 3 new ("8b", "8c" plus the reworded "8")
- `tests/qise/heritage-connections.test.js` — 3 tests updated for the new
  branch/binding shape (bare `readingTiers` now legitimately appears in the
  fallback branch; the shared template interpolates carried bindings, not
  direct function calls)
- `e2e/qise-integration.spec.js` — the single Round 10 test replaced with
  three, inside one `test.describe("Stage-3 connector-integration load
  boundary")` with `serviceWorkers: "block"`: the Copilot-fixed off/on tests,
  plus a new fallback test (aborts `qise/heritage-connections.js`, proves the
  ordinary reading and the base Reflection Engine still render with zero
  connector markup)
- `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` — this section

This pass is a correction to Round 10's own load-boundary work, not a step
toward resolving either open blocker (safety authorization; lineage content
routing) — both remain exactly as Round 9 left them. The pre-existing
`reading-pipeline.js -> reflection.js -> heritage/registry.js` import path
remains unchanged and out of scope, exactly as Round 10 stated — this pass
does not claim that path was narrowed, removed, or otherwise touched.

### Round 12 (this revision, on top of `9b8f9fa`) — four fresh findings, none touching either open blocker

**1. Codex, P1-equivalent (labelled P2 by the bot, treated as must-fix here) —
a failed-gate capture could still reach `finish()`.** `gates.js`'s
`evaluateGates()` sets `captureTier: "waiting"` in EXACT lockstep with
`pass: false` — one expression decides both (`pass: strictPass ||
assistedPass`, `captureTier: strictPass ? "clean" : (assistedPass ?
"assisted" : "waiting")`). Before this pass, `VALID_CAPTURE_TIERS` in
`src/ui/qise/app.js` included `"waiting"`, so `finish()` would compute,
persist and render a full base reading for a capture the gates had rejected;
only the connector layer's own `captureAuthorizationFromReading()` suppressed
the Stage-3 extension afterward, which is not the same as never having
completed the base reading. Both current callers of `finish()` already check
`gates.pass` before calling it, so this was not reachable through today's UI —
but that made it correct by caller discipline, not by the boundary's own
enforcement (CLAUDE.md item 17's shape: a gate that covers the adapter but
not the path underneath). **Fixed:** `VALID_CAPTURE_TIERS` is now
`["clean", "assisted"]` — `finish()` itself now throws on `"waiting"`,
exactly as it already threw on any other non-gate-derived value.

**2. Codex, P2 — `prohibitedForUserInference` was preserved but never shown
to the reader.** `connectorCard()` (`src/ui/qise/heritage-view.js`) already
reduced this field correctly from the resolver's record — every real
registry connector today carries it `true` — but
`heritageConnectorCardMarkup()`, the ONE function every connector card
renders through (Tier 2's selection, and Tier 3's active/source-panel/
editorial lists), never read it. Once a real safety signal exists and this
path is reachable, a connector flagged "must never be presented as an
inference about the reader" would have rendered beside a personalised
reading as an ordinary "related"/"attested" relationship, indistinguishable
from measured content — exactly the framing AGENTS.md's product-scope line
rules out. **Fixed:** one line in `heritageConnectorCardMarkup()`, gated on
`card.prohibitedForUserInference`, renders an explicit third-person notice
("Historical source material — not a reading of you."). One change point
covers all four render sites (Tier 2's card; Tier 3's active, source-panel,
and editorial cards) because they all already funnel through this one
function.

**3. Copilot — an unusable-reflection reading still paid the Stage-3 import
cost.** `renderReflection()` awaited `loadHeritageStage3Modules()` before
checking whether `reflectionFor(reading, history)` returned anything usable.
A calibrating/never-read reading (`readingStateFromRecord()` returns `null`)
was always going to tear down regardless of whether the connector modules
loaded, so the await bought nothing for that case — every calibrating
reading on an `on`/`compare` host paid the connector graph's download/parse
cost for a render that could never have used it. **Fixed:** `reflectionFor()`
now runs (and is null-checked, with the same fail-closed teardown) BEFORE the
Stage-3 loader is ever referenced — mirroring the existing `reflection=off`
gate's own shape one check later. Purely a performance correction; nothing
about what renders when there IS a reflection changed, and the reflection=off
gate's ordering relative to the loader (Round 10/11's own subject) is
unaffected.

**4. Codex, P2 — a documentation line misattributed git parentage.** The
"This revision's parent commit" line in this section's Round-4-era metadata
block named `2f14912` — but `2f14912` is not an ancestor of the commit that
block described at all; it is chronologically LATER on this branch. The
commit's actual sole parent is `f1fc55e` (already correctly recorded on the
"Base" line directly above it). **Fixed:** relabelled `2f14912` as a prior
review snapshot referenced by later text in that block, not as git
parentage — see the corrected lines themselves for the full `git log`/
`git merge-base` evidence.

**Falsification.** All four fixes' new/modified assertions (2 in
`tests/qise/heritage-connections.test.js`, 1 in
`tests/qise/heritage-lazy-load.test.js`, 3 in `tests/qise/heritage-view.test.js`
— finding 4 is documentation-only and has no test) were run, via an isolated
git worktree, against `9b8f9fa`'s actual source: **5/5 failed**, with the
other 111 tests in those three files continuing to pass (**116 total**,
matching the fixed tree's own count). Worktree removed; fixed tree re-run in
full: `npm test` — **1194/1194**; `npm run test:browser` — **10/10**; `npm run
build`/`npm run lint:bundle` clean.

**Locked invariants, reconfirmed.** `src/heritage/resolver.js`, `registry.js`,
`validator.js`, `src/qise/reading-tiers.js`, `reading-state.js`,
`reading-pipeline.js`, `reflection.js`, `src/qise/heritage-connections.js` are
byte-identical to `9b8f9fa`. `src/ui/qise/heritage-view.js` is intentionally
NOT on that list this round — finding 2 required editing it, and that edit is
scoped to one function, adding one conditional line, covered by 4 new/
modified tests. No Stage 4, no lineage-content decision, no safety-signal
fabrication, no `Math.random`, no `rotationState`. Disclosure ownership and
locator-status precedence are unchanged (neither finding touches them).

**Files changed this session:**
- `src/ui/qise/app.js` — `VALID_CAPTURE_TIERS` narrowed to
  `["clean", "assisted"]`; `reflectionFor()`'s computation and null-check
  moved ahead of the Stage-3 loader's await
- `src/ui/qise/heritage-view.js` — `heritageConnectorCardMarkup()` renders an
  explicit non-inference notice when `card.prohibitedForUserInference` is
  `true`
- `tests/qise/heritage-connections.test.js` — 1 test retitled (behaviour
  unchanged), 1 new (`VALID_CAPTURE_TIERS` excludes `"waiting"`)
- `tests/qise/heritage-lazy-load.test.js` — 1 new (`4b`: reflection computed
  and null-checked before the loader)
- `tests/qise/heritage-view.test.js` — 5 new (`2c`: positive, negative
  control, real-corpus sweep, Tier 2 end-to-end, Tier 3 all-three-sections)
- `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` — the git-parentage correction
  above, and this section

None of the four findings bear on either open blocker (safety authorization;
lineage content routing) — both remain exactly as Round 9 left them.

### Known limitations / remaining work

- **Stage 3 is BLOCKED, not approved, not merged.** See the framing at the
  top of this section.
- **Two architectural blockers remain, neither mechanical.** Safety
  authorization (Blocker 4) needs either a product-owner decision that Qi Se
  needs no safety gate, or a new safety subsystem — out of scope here. The
  lineage content-routing decision (Blocker 3) needs a product owner to
  decide whether, and to which named witness, an abstract construct rotation
  slot should route via `ABSTRACT_LINEAGE_OVERRIDES` — for fiveMountains
  specifically, whether `"primary"` should route to `"taiqing-siku"` (a
  content substitution: routing away from the currently-aliased
  人倫大統賦/directional-naming witness to the 太清神鑑/mountain-name
  witness the connector needs) or to something else, or not at all. Neither
  is mechanical work, and neither is something this session should attempt
  to invent.
- **No new heritage connector relationships, prose registry, or corpus
  content were added.** Stage 3 establishes the composition contract;
  populating it with additional source-backed connectors or a Tier-2 prose
  schema is separate work, and should wait until the safety prerequisite is
  resolved and a further independent review has actually approved this
  architecture.
- **The real corpus currently has no construct with two or more ACTIVE
  connectors**, so Tier 2's rotation/top-pick logic is tested against a
  hand-built composition-result fixture (`deriveTier2FromComposition`'s
  tests) rather than live multi-connector data. Not a defect; a fact about
  the current corpus's size, recorded rather than worked around.
- **Connector rendering now exists** (`src/ui/qise/heritage-view.js`, wired
  into `app.js`), but it is exercised in production ONLY by the fail-closed
  suppression path — `safetyPassed` is never supplied as `true` anywhere in
  `app.js`, so `tier2.connectors`/`tier3.connectors` are always suppressed
  today, and the render functions always return `""`. The rendering itself
  has been proven correct against hand-built and synthetic inputs
  (`tests/qise/heritage-view.test.js`), not against a live authorised
  reading in a browser — there is no live authorised reading to test against
  until Blocker 4 is resolved. Revisit visual/interaction polish
  (styling, placement, copy review by a human) once Blocker 4 is resolved
  and a real authorised reading exists to design against.
- Given Stage 3 remains blocked, **no Gemini Flash handoff is appropriate
  yet** for any remaining polish on this surface — the same reasoning as
  above applies to visual refinement work.
