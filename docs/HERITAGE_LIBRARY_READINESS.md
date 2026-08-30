# Heritage Library Readiness — GOLD/NOT READY, retention, and four separate gates

Generated from `npm run heritage:readiness` and `npm run retention:sim`, re-run during the
closed-beta runtime repair. Both harnesses are **deterministic** — re-run twice, JSON output
identical except `generatedAt` (see "Idempotency" below). They measure GOLD content depth through
the internal analytical seam; the product runtime uses the canonical Stage-3 entry point and a
separate named closed-beta policy.

Commit measured during this repair: `4b8f935aef500e7e4856887c99cb131e982ff07c`.

**Read this alongside, never instead of:**
`docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md` (what changed and why),
`scripts/heritage-readiness/required-scope.mjs` (the fixed six-construct denominator),
`docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` (the six-axis Stage 3 status),
`docs/DECISION_CARDS.md` (the fixed GOLD scope and historical decision records).

## Closed-beta runtime overlay — 31 August 2026

The Reflection Engine is **ON by default in closed beta**. The complete reading flow now
exposes attributed heritage material for all six daily constructs through the real production
path. Explicit runtime routing resolves the abstract `primary` slots for Three Sections, Twelve
Palaces and Five Mountains; it does not rewrite their evidence or clear their rights status.
The graph contains **30 connectors with zero exact source-text collisions**. The current
production-depth measurements are: Three Sections residue 3 / Tier 2 material 3, Five Elements
2 / 2, Twelve Palaces 2 / 2, Five Mountains 8 / 7, Four Rivers 8 / 7, and Five Officers 1 / 1.
Five Mountains and Four Rivers have eight structural relationships but seven distinct bounded
Tier 2 presentations because two relationships render the same reader-facing card; the harness
now measures that distinction honestly.

This overlay is not legal or commercial clearance. Rights, provenance, source disagreement,
non-inference framing, capture-quality gates, and store/release obligations remain separately
audited. `HERITAGE_LIBRARY_GOLD: NOT_READY` below is an analytical content-depth result, not a
runtime off-switch. No customer-impact workshop is a prerequisite to functional completion;
beta testing follows the full functional verification pass.

---

## Four gates, never merged into one verdict

| Gate | Result | Basis |
|---|---|---|
| `HERITAGE_LIBRARY_GOLD` | **NOT_READY** | `npm run heritage:readiness`, measured this session |
| `STAGE3_PRODUCTION_AUTHORIZATION` | **closed-beta runtime active; commercial release still separately gated** — explicit routing and named beta policy are active, while rights/provenance/store obligations remain open | Decision-register + code state, not inferred from the GOLD result |
| `DAILY_PORTRAIT_IMPLEMENTATION_READINESS` | **ARCHITECTURE_SPECIFIED / BLOCKED_ON_PRODUCT_DECISIONS** (per-section; see the PR C brief) | `docs/DAILY_PORTRAIT_ARCHITECTURE.md` + `docs/DECISION_CARDS.md` |
| `PRODUCT_RETENTION_READINESS` | **NOT_YET_RUNTIME_VALIDATED** | Daily Portrait has no implementation; PR C required |

None of these four is inferred from another. A `NOT_READY` heritage library does not mean the
future product cannot retain users (Daily Portrait's own compounding value is separate, see D
below); a rich future timeline would not excuse a shallow heritage library either.

---

## 1. `HERITAGE_LIBRARY_GOLD` — measured result: NOT_READY

```
Gates: A_evidenceIntegrity=true  B_requiredConstructCoverage=false
       C_heritageRelationshipDepth=false  D_materialPresentationDiversity=false
       E_deterministicCorrectness=true
RESULT: NOT_READY
```

This is a **measured GOLD content-depth result**, not a runtime switch or a claim that the app is
non-functional. `NOT_READY` is a valid, honest, exit-0 outcome —
the pre-reconciliation baseline (11 connectors, no construct with two-or-more ACTIVE connectors)
made it a plausible hypothesis going in; B1's reconciliation ran regardless, and the harness
decided the result, not the hypothesis.

### Required-scope coverage (the fixed six-construct denominator)

| Construct | Class | Why |
|---|---|---|
| 三停 `threeSections` | COVERAGE_GAP | The fixed GOLD taxonomy still records a missing dedicated `RUNTIME_PROSE` lineage, while the beta runtime uses an explicit bounded English presentation for the routed witness. |
| 五形 `fiveElements` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`. |
| 十二宮 `twelvePalaces` | DECISION_BLOCKED (CARD 10) | The fixed GOLD taxonomy retains the historical decision class; the beta runtime explicitly routes `primary` to `taiqing-yuguan` without promoting evidence. |
| 五岳 `fiveMountains` | DECISION_BLOCKED (CARD 7) | The fixed GOLD taxonomy retains the historical decision class; the beta runtime explicitly routes `primary` to `taiqing-siku` without promoting evidence. |
| 四瀆 `fourRivers` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`; see "Downstream reachability" in the ledger. |
| 五官 `fiveOfficers` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`. |

Gate B still fails because the fixed GOLD denominator classifies 3 of 6 constructs outside
`RUNTIME_SUPPORTED`. That is an analytical scope result, not a beta runtime defect: the three
slots are covered by explicit beta routing/presentation, while the underlying GOLD taxonomy is
left intact rather than rewritten to manufacture a pass.

### Failure taxonomy per construct

| Construct | Taxonomy |
|---|---|
| threeSections | `COVERAGE_GAP` |
| fiveElements | `RELATIONSHIP_DEPTH_LIMITED` |
| twelvePalaces | `LINEAGE_DECISION_BLOCKED` (CARD 10) |
| fiveMountains | `LINEAGE_DECISION_BLOCKED` (CARD 7) |
| fourRivers | `RELATIONSHIP_DEPTH_LIMITED` |
| fiveOfficers | `RELATIONSHIP_DEPTH_LIMITED` |

### Why the fixed GOLD scope still fails gates C and D

The expanded beta graph now has real rotation in five constructs. The fixed GOLD gates still
apply their original 250 combined-material target and coverage taxonomy; they are not used to
disable the beta runtime. Concretely, per construct (exhaustive walk over the full derived
period, corrected methodology — see "A defect found and fixed" below):

| Construct | Base (Tier 2) raw=material | Heritage Tier 2 raw=material | Heritage Tier 3 raw=material | Combined (base+Tier2) |
|---|---|---|---|---|
| threeSections | 216 | 3 | 3 | 648 |
| fiveElements | 216 | 2 | 2 | 432 |
| twelvePalaces | 216 | 2 | 2 | 432 |
| fiveMountains | 216 | 7 | 8 | 594 |
| fourRivers | 216 | 7 | 8 | 594 |
| fiveOfficers | 216 | 1 | 1 | 216 |

The heritage layer now contributes genuine rotation: residues are 3, 2, 2, 8, 8 and 1. Five
Mountains and Four Rivers have 8 active structural relationships but only 7 distinct bounded
Tier 2 cards; this is a presentation-level equivalence, not hidden-state inflation. Five
Officers remains intentionally single-active because its additional fortune/rank and
edition-recorded material is source-panel-only. Gate D's fixed target of 250 is therefore still
not met, but the runtime now has meaningful lineage diversity where the evidence and policy allow
it.

### A defect found and fixed this session, in the harness itself

`scripts/heritage-readiness.mjs`'s `baseMaterialSignature()` originally built its structural
signature from `composed.trace` — which spans **every** layer (Tier 1's observation/magnitude,
Tier 3's history/confidence, Tier 2's own heritage/bridge/reflection, all interleaved,
`src/qise/reflection.js:281-352`) — rather than from the Tier 2 object a reader actually sees
(`readingTiers().tier2`). Measured before the fix: `fiveElements/primary` reported
`baseReadingRawDistinct=9` against `baseReadingMaterialDistinct=648` — material **72x finer**
than raw, silently relabelling the full internal 648-state selector odometer as "material
distinctness of the reading". A material signature must never be finer than raw, because raw is
the ground truth of what a reader can perceive.

**Fixed:** `baseMaterialSignature()` now derives from the same `readingTiers().tier2` object raw
already serialises, canonicalised only by stable key-order sorting (`stableStringify()`) — never
by touching `composed.trace`. The heritage material signature was also split into two
tier-scoped functions (`heritageTier2MaterialSignature()`, `heritageTier3MaterialSignature()`)
rather than one merged blob, since Tier 2 (Reading) and Tier 3 (Why/Study) are separate consumer
surfaces. After the fix, base raw and base material are equal everywhere — material is exactly as
fine as raw, never finer, as required. This did **not** change the overall
`NOT_READY` result (gate D now fails only because Five Officers remains below the fixed 250-state
target; the signature fix corrected the *reported* numbers rather than manufacturing diversity).
Pinned by
`tests/heritage/readiness-material-signature.test.js`, including a regression test that mines
the real fiveElements corpus for occurrences sharing an identical Tier 2 output and asserts they
also share one material signature.

### D-1 current-state update — Tier 2 personal context is now visible

The preceding figures are the checkpoint recorded before the D-1 repair. The production Tier 2
surface now carries a separately named `personalContext` projection of the already-computed
availability, observation, magnitude, history and confidence components, and the Story and
compare surfaces render it under **Your record**. The attributed heritage passage remains a
separate field and is not changed by this repair.

On the current branch, the exhaustive reachable-state sweep reports the following base Tier 2
raw/material counts:

| Construct | Base (Tier 2) raw=material |
|---|---:|
| threeSections | 216 |
| fiveElements | 216 |
| twelvePalaces | 216 |
| fiveMountains | 216 |
| fourRivers | 216 |
| fiveOfficers | 216 |

The visible Tier 2 object now distinguishes all **15,288/15,288** reachable states at occurrence
zero, including the previously indistinguishable capture/anatomy abstention pairs. These are
presentation-discrimination results, not customer-value evidence. The closed-beta heritage path
is now live; its connector rotation and bounded presentation counts are recorded in the runtime
overlay above, while the GOLD result remains `NOT_READY` against its fixed scope and 250-state
target.

---

## 2. Retention findings — `npm run retention:sim`, four analyses, never merged

### A. `PUBLIC_SHIPPED_RETENTION` (reflectionMode=off — the shipped passage engine)

What a public-origin visitor experiences **today**. 365-day default scenario: verbatim repeat
rate 26.8%, 267 distinct texts across 113 distinct states, 0% near-duplicate rate. A
`mostlySteady` user (someone whose reading barely moves day to day) sees a much higher 66.8%
verbatim repeat rate over the same year — an expected, honest consequence of a passage engine
whose variation is driven by how much the underlying state actually changes.

### B. `INTERNAL_REFLECTION_RETENTION` (reflectionMode=on — closed-beta default)

Same scenarios, the Reflection Engine. 365-day default scenario: verbatim repeat rate **0.0%**,
365 distinct texts (one per day), 0.2% near-duplicate rate — consistent with this repo's own
recorded history (`scripts/parity.mjs`'s `KNOWN_BLOCKERS` note: the occurrence-indexed variation
layer took this exact figure from 69.0% to 0.0% against the passage engine's 26.8%). Even the
`mostlySteady` scenario, where the base reading barely moves, still reaches 365 distinct texts —
the Reflection Engine's occurrence-indexed variation reads as a genuine retention improvement
over the legacy passage engine. Heritage connector depth is measured separately below; the named
closed-beta policy now allows its attributed output to render.

### Construct-rotation cross-reference

The fixed GOLD taxonomy still labels 183 of 365 calendar days as landing on a construct outside
`RUNTIME_SUPPORTED` (`threeSections`, `twelvePalaces`, `fiveMountains` — 61+61+61 days). In the
closed-beta runtime those slots are explicitly routed and do render bounded attributed material;
the figure remains useful as an analytical scope warning, not a claim that beta users see an
empty heritage surface.

### C. `LATENT_HERITAGE_EXHAUSTION` (GOLD analytical depth, not release clearance)

The exhaustive per-construct depth matches the GOLD harness's own numbers exactly (see the
current table above), confirming the two harnesses agree, as they must, since both call the same
`analyseConstructLineage()`.

The calendar cross-check walks the real per-day occurrence value through the same analytical seam.
It now observes genuine exhaustion/rotation for Three Sections, Five Elements, Twelve Palaces,
Five Mountains and Four Rivers. Five Officers correctly reports no rotation because only one
active Tier 2 relationship is currently permitted; the remaining material is retained for study
and source-panel disclosure rather than promoted into the bounded daily card.

### D. `DAILY_PORTRAIT_COMPOUNDING_MODEL` (modelled projection — no runtime code exists)

Daily Portrait is not implemented in this repository (PR C). This is a worked calculation
against `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s one-day-one-primary-frame schema, applying the
same day-inclusion patterns already measured above (a missed day is a gap, never interpolated —
`intermittentMissedDays` captured 244/365 real frames over a year in the same run):

| Horizon | What becomes possible |
|---|---|
| 7 days | A short, real list of frames — not yet a history. |
| 30 days | Week-over-week alignment comparison becomes meaningful for the first time. |
| 90 days | One season of frames — the horizon the architecture treats as a long-established run, by analogy with the Qi Se baseline's own `historyStage` bands. |
| 365 days | First calendar-anniversary comparison; every season represented at least once — the timeline's compounding value is fully realised only from here. |

**Full Daily Portrait retention is NOT YET RUNTIME-VALIDATED.** PR C is required before any of
this table is more than a projection.

---

## 3. Ranked heritage expansion backlog, by marginal retention value

Ordered by the largest gap this session's measurements actually found, not by construct name:

1. **Deepen Five Officers with a second genuinely distinct bounded-safe relationship.** Its
   current single active Tier 2 connector is the only construct still without heritage rotation;
   fortune/rank material and edition-recorded witnesses remain source-panel-only until their
   policies/evidence support a bounded daily presentation. Do not fragment one proposition into
   duplicate connector records.
2. **Increase materially distinct bounded presentations where the graph already rotates.** Five
   Mountains and Four Rivers have eight active structural relationships but seven distinct Tier 2
   cards. Any expansion must change reader-facing content, not merely hidden ids; the corrected
   material-signature tests enforce that.
3. **Multi-witness presentation architecture** (the Five Mountains 頥/頷/頦 disagreement,
   recorded as a backlog research option in CARD 7). This is a genuine later increment, not a
   runtime prerequisite: beta routing already selects an explicit witness while preserving the
   disagreement and source records.
4. **GOLD scope review after beta evidence accumulates.** The fixed denominator and 250-state
   target remain useful release-analysis measures, but they must not be silently repurposed as a
   runtime kill switch or treated as a substitute for external rights/provenance decisions.
5. **Daily Portrait remains a separate product stream.** Its implementation and the independent
   daily push notification are not heritage-library gates; complete app functionality should be
   finished before beta testing, as directed by the product owner.

---

## 4. Idempotency and regression discipline

**Idempotency (verified this session):** `node scripts/heritage-readiness.mjs` and
`node scripts/retention-sim.mjs`, each run twice back-to-back, produce byte-identical JSON
output except the `generatedAt` timestamp. Neither harness has any source of non-determinism
(no `Math.random()`, no wall-clock-seeded values feeding a measurement) — every simulated
"weather" generator uses a fixed-seed LCG, matching `simulateDays()`'s own discipline.

**Regression fixtures:** the B1 evidence reconciliation's effect on existing tests is recorded
row-by-row in `docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md`'s "Regression fixtures —
intentional changes, recorded" table — every repointed or updated assertion carries an inline
comment naming the evidentiary cause, per the standing rule that an intentional, evidence-caused
change must never be silently absorbed into "the test was updated." The most consequential one —
`four-rivers-flow-and-banks` becoming genuinely reachable under the real production `fourRivers`
lineage — is documented in the ledger's "Downstream reachability" section and reflected in gate
B's `fourRivers: RUNTIME_SUPPORTED` classification above.

**Finding identity:** `scripts/heritage-readiness.mjs` and `scripts/retention-sim.mjs` are new
this session, so there is no prior run to diff against for finding-identity purposes; both
report `harnessVersion`/`simVersion` explicitly for exactly this reason on their next run.
`scripts/check-release.js`'s own finding-identity behaviour (rule/file/category/normalised key,
not raw counts) is unaffected by anything in this phase — verified by full suite pass, not
independently re-audited here since no release-audit rule was touched.

**Verification quoted:** `node --test`: `tests 1223 / pass 1223 / fail 0`. `npm run heritage:readiness`
exits 0, result `NOT_READY`. `npm run retention:sim` exits 0, all four analyses present.
`npm run build` then `npm run lint:bundle` against the rebuilt `dist/`: exits 0 (`copy blocklist
ok`, `attractiveness ok`, `egress allowlist ok`, `biometric egress ok`). `npm run audit:release`
exits 0 while reporting the pre-existing external rights/store/device checklist as BLOCKED, with
**byte-identical** output (finding-identity confirmed; the printed "BLOCKED" content is a
pre-existing, unrelated rights/store-approval checklist, not a regression). Independent
re-verification, `node scripts/heritage-evidence/acquire-and-verify.mjs` (fresh clone of all four
Kanripo repos from GitHub, hashes recomputed from bytes, not read from the dossier): all 4
commits MATCH, **17/17 file hashes MATCH**, all 17 dossier passages VERIFIED or
VERIFIED_WITH_TRANSCRIPTION_NOTE (zero FAILED) — confirming the evidence base this session's
`SOURCE_REGISTRY` promotions rely on is independently sound today, not merely trusted from an
earlier pass.

**A lint-bundle finding caused by this session's own changes, fixed:** the 14 new `sourceUrl`
citation fields added to `src/reading/provenance.js` (required by `validator.js` once
`citationStatus` reached `verified`) tripped `scripts/lint-bundle.js`'s egress allowlist, which
scans the built artefact for every literal URL regardless of whether the app reads it.
Confirmed `sourceUrl` is not read anywhere under `src/ui/` or `src/qise/` — it exists for
independent citation re-verification, the same role `IDENTIFIER_URI_ALLOWLIST`'s existing
JSON-Schema-URI entry documents. Fixed by adding one tightly-anchored pattern to that allowlist
(matches only the four pinned Kanripo repos, a 40-hex commit SHA, and the `KR3g00NN_NNN.txt`
naming convention — no query string or fragment can match), with a paired positive/negative
control test (`tests/copy-lint.test.js`). Full detail in
`docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md`'s "A guard this pass's own additions
tripped" section.

**Browser verification:** `npm run test:browser` (`playwright test --grep-invert @benchmark`) —
**10/10 passed** in this environment, including the cold Stage-3 loader and failed-import
fallback paths. Physical-device and store submission approval remain external release
obligations and were not self-certified by this run.
