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

## Stage 3 — IMPLEMENTED / PENDING REVIEW

Heritage connector graph integrated with the Reflection Engine's reading
path, on top of the frozen Stage 1/2 baseline (`df8cf22b9257c2a7fb75affd30b5e7dc6d15caa0`).

**This section records that code exists and passes its own tests. It is not
a freeze record and does not itself approve Stage 3** — that requires the
same independent review Stages 1 and 2 went through before being marked
APPROVED / FROZEN.

- **Branch:** `feature/heritage-stage3-reflection-integration`
- **Base:** `main` at `f1fc55e8e9bae082ac2fa7e89e256f6b95609138`

### What was built

`src/heritage/composition.js` is the one new module and the sole
product-facing entry point into `resolveHeritageConnections` — no other file
outside `src/heritage/` and `tests/heritage/` calls the Stage 2 resolver
directly. It:

- checks capture-quality and safety gate precedence (`captureQualityPassed`,
  `safetyPassed`) **before** the resolver is ever invoked, matching
  `docs/PRODUCT_DESIGN_V2.md`'s documented
  `captureQualityGate -> safetyGate -> measurementLayer -> heritageLayer`
  ordering, without adding a gate parameter to the frozen Stage 2 function
  itself;
- reconstructs `readingState` from exactly the resolver's own declared
  dependency surface (`heritageConstruct`, `sourceLineage` —
  `RESOLVER_DEPENDS_ON` in resolver.js), never forwarding a caller's compass,
  history, self-report or full interpreted state;
- maps the resolver's output into five distinct, never-flattened categories:
  `active` (A), `sourcePanelOnly` (B, populated only at `SOURCE_DEEP`),
  `disagreements` (C), `editorialJuxtapositions` (D — always carrying
  `historicalRelationshipAsserted: false` and
  `disclosure: "SOURCES_SHOWN_BESIDE_ONE_ANOTHER"`, copied verbatim from the
  Stage 1 policy record, never computed here), and `abstentions` (E);
- exports a pure `composeHeritageForReading` (registries injected, mirrors
  `resolveHeritageConnections`'s own signature) and an async
  `composeHeritageForReadingWithDefaults` production wrapper (mirrors
  `resolveHeritageConnectionsWithDefaults`), both gate-checked identically.

`src/qise/reading-tiers.js` gained two additive exports —
`tierTwoHeritageConnections` and `tierThreeHeritageConnections`. Nothing
about the existing `tierOne`/`tierTwo`/`tierThree`/`readingTiers` changed;
they remain exactly as Stage 2 left them and stay pinned by
`tests/qise/reading-tiers.test.js`. The two new functions hardcode their
`depthMode` (`STANDARD` / `SOURCE_DEEP`) so a caller cannot leak
`SOURCE_PANEL_CEILING` material into Tier 2 by passing `depthMode` through;
Tier 2 exposes at most **one** bounded connector — the resolver's own
deterministic top pick, `renderPlan.relationshipOrder[0]` — never a second,
independent selection mechanism. Tier 1 is untouched and does not import
`composition.js` at all.

No change was made to any Stage 1/2 file
(`src/heritage/resolver.js`, `registry.js`, `validator.js`, `connectors.js`,
`concepts.js`, `negative-relationships-registry.js`,
`composition-policies-registry.js`), to scanner geometry, thresholds,
historical source data, or commercial-rights state.

### Exact changed modules

- `src/heritage/composition.js` — new (257 lines)
- `src/qise/reading-tiers.js` — additive edit (+75 lines; existing exports
  byte-for-byte the same apart from one new `import`)
- `tests/heritage/composition.test.js` — new (21 tests)

### Test counts (this branch, this session)

- `node --test tests/heritage/resolver.test.js`: **123/123** (unchanged —
  proves Stage 2 was not reopened)
- `node --test tests/heritage/validator.test.js tests/heritage/falsification.test.js tests/heritage/integration.test.js tests/heritage/resolver.test.js`: **219/219** (unchanged)
- `node --test tests/heritage/composition.test.js`: **21/21** (new)
- All four together (adding `composition.test.js`): **240/240**
- `npm test`: **1052/1052** across 73 discovered test files (was 71 at the
  Stage 2 freeze; +2 files reflects both this branch's new test file and
  files that landed on `main` between the freeze and this branch point)
- `npm run build`: clean — 94 files copied, Module B shipped (wellness
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

### Negative tests added (`tests/heritage/composition.test.js`)

Gate suppression (capture-quality and safety, independently, and through
both `tierTwoHeritageConnections`/`tierThreeHeritageConnections`); a
heritageQiSe historical STATE cannot be satisfied by modern "read"
availability; historical heritageQiSe/Five Elements co-presence may reach
ACTIVE but an attempted runtime classification is blocked
(`no-qise-to-form-classification`); Shen cannot acquire a measurement
binding, structurally or via an attempted runtime binding
(`shen-unmeasurable`); an invalid `runtimeBindingContext` aborts the whole
composition, fail-closed; `SOURCE_PANEL_CEILING` material never reaches
Tier 2 and only appears in Tier 3's `sourcePanelOnly`; `prohibitedForUserInference`
stays `true` on every active/source-panel entry across all six constructs;
editorial juxtapositions are marked non-historical; a CONSTRUCT-level
disagreement survives with every position intact; an unavailable third
participant blocks an otherwise-satisfied PRESENT condition; ABSENT and
UNKNOWN participant signals stay distinguishable; a concept-only connector's
eligibility is unaffected by an unrelated anchor construct's lineage
strength; the composition result is deterministic for identical inputs; and
Tier 1 never imports the connector architecture.

### Known limitations / remaining work

- **No new heritage connector relationships, prose registry, or corpus
  content were added.** This was a deliberate scope decision (see
  `CLAUDE.md`'s AI context budget policy) — Stage 3 establishes the
  composition contract; populating it with additional source-backed
  connectors or a Tier-2 prose schema is separate work.
- **`captureQualityPassed`/`safetyPassed` default to `true`.** Neither gate
  is yet wired to a real upstream signal for the Qi Se tracker (there is no
  existing Qi Se safety-referral gate analogous to the legacy Module B malar
  gate). Real wiring — deciding what upstream state actually sets these two
  booleans in `app.js` — is UI/pipeline wiring, not architecture, and is the
  first candidate for a Gemini Flash handoff (see below).
- **`five-mountains-mutual-facing-fullness` remains `RECORDED_NOT_VERIFIED`
  / `SOURCE_PANEL_CEILING`**, unchanged by this stage, as required.
- Repetitive follow-on work — wiring real gate booleans from `app.js`,
  formatting the structured Tier 2/3 output into UI strings, and any bulk
  connector/prose authoring — was **not started in this Claude session** and
  should go to Gemini Flash against this document plus
  `src/heritage/composition.js`'s own header comments as the bounded
  specification.
