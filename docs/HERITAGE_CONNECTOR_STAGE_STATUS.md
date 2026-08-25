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

## Stage 3 — PARTIAL / BLOCKED ON UPSTREAM SAFETY AUTHORIZATION

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

**Why the status line reads BLOCKED rather than IMPLEMENTED.** Three of the
four architectural blockers from the second review pass are resolved (capture
authorization, selection lifecycle, lineage adapter — all below). The fourth,
safety authorization, is NOT resolved and cannot be resolved inside this
stage: no authoritative Qi Se safety-referral signal exists anywhere in the
current product, and inventing one is explicitly out of scope for Stage 3 (it
would be a new clinical/safety subsystem, not an integration). Stage 3's OWN
side of that interface is fully defined and fails closed — see "Safety
authorization" below — but a fully-defined, fail-closed interface with
nothing real behind it is a blocked stage, not a settled one. Marking this
IMPLEMENTED would misstate that the production connector path can actually
authorise output; it cannot, honestly, until that prerequisite exists.

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
`"waiting"`, and `undefined` (fails closed, identically to `false`) for
anything else — a missing field, a malformed value, or no reading at all.
**No new field was added to persistence.** `src/ui/qise/app.js` now calls
`captureAuthorizationFromReading(reading)` instead of `Boolean(reading)`.

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

**3. Lineage adapter — RESOLVED.**
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
abstentions. The adapter's override table (`ABSTRACT_LINEAGE_OVERRIDES`) is
deliberately empty: routing an abstract label to a NAMED witness other than
the identically-named registry key (e.g. deciding fiveMountains' rotation
should sometimes show `"taiqing-siku"` specifically) is a content/editorial
decision outside this module's authority, and the table exists as a
documented extension point for that decision, not a place to guess. Verified
end to end: `composeHeritageForReading` reaches
`five-mountains-mutual-facing-fullness` at `SOURCE_PANEL_CEILING` with zero
registries injected, by requesting the explicit canonical id
`"taiqing-siku"` directly — the real production entry point, not a test-only
seam.

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
  end-to-end reachability of `taiqing-siku`)
- `tests/qise/heritage-connections.test.js` — 8 new tests (capture
  authorization, including "object existence is not enough" and "measurement
  values cannot fabricate authorization")

### Test counts (this branch, this session)

- `node --test tests/heritage/resolver.test.js`: **123/123** (unchanged —
  Stage 2 not reopened)
- `node --test tests/heritage/validator.test.js tests/heritage/falsification.test.js tests/heritage/integration.test.js tests/heritage/resolver.test.js tests/heritage/composition.test.js`: **260/260**
- `node --test tests/heritage/composition.test.js`: **41/41**
- `node --test tests/qise/heritage-connections.test.js`: **26/26**
- `node --test tests/qise/reading-tiers.test.js`: **14/14** (unchanged)
- `npm test`: **1098/1098** across 74 discovered test files
- `npm run build`: clean — 95 files copied, Module B shipped (wellness
  flavour)
- `npm run lint:bundle`: clean — copy blocklist / attractiveness / egress
  allowlist / biometric egress all `ok`
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
`five-mountains-mutual-facing-fullness` reached via `"taiqing-siku"` through
the real product-facing entry point with evidence unchanged; the same
connector is never ACTIVE under any of fiveMountains' four declared
lineages; concept-only connector eligibility is unaffected by the adapter.

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

### Known limitations / remaining work

- **Stage 3 is BLOCKED, not approved, not merged.** See the framing at the
  top of this section.
- **Safety authorization is the sole remaining architectural blocker.** See
  Blocker 4. This is a product/design decision (or a new subsystem), not
  mechanical work, and is explicitly not something this session should
  attempt to invent.
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
- Given Stage 3 remains blocked, **no Gemini Flash handoff is appropriate
  yet.** Mechanical UI/copy/fixture work (rendering `tier2.connectors`/
  `tier3.connectors` into the DOM, formatting connector cards) would produce
  UI for a path that cannot legitimately authorise output in production
  today, which is not a good use of that work. Revisit once Blocker 4 is
  resolved one way or the other.
