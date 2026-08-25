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
- **Base:** `main` at `f1fc55e8e9bae082ac2fa7e89e256f6b95609138`
- **This revision's parent commit (previously reviewed, PR #40):** `2f1491283c36708f8c8c0e608c5dd63e6c4644f3`

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
- Both hardcode their `depthMode` (`STANDARD` / `SOURCE_DEEP`) after
  spreading `compose`, so a caller cannot leak `SOURCE_PANEL_CEILING`
  material into Tier 2. Tier 2 exposes at most **one** bounded connector —
  the resolver's own deterministic top pick, `renderPlan.relationshipOrder[0]`,
  via the separately exported pure function `deriveTier2FromComposition`.
- `readingTiersWithHeritage(reflection, compose)` wraps the frozen
  `readingTiers()` unchanged (`tier1` is copied through verbatim) and adds
  `.connectors` onto `tier2`/`tier3`. This is the one function product code
  should call instead of calling `readingTiers()` and the connector boundary
  separately.
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
