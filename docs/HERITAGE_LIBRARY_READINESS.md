# Heritage Library Readiness — GOLD/NOT READY, retention, and four separate gates

Generated from `npm run heritage:readiness` and `npm run retention:sim`, both re-run this
session after the B1 evidence reconciliation. Both harnesses are **deterministic** — re-run
twice, JSON output identical except `generatedAt` (verified this session; see "Idempotency"
below). Neither harness renders anything in production; both use the internal analytical seam
(`composeHeritageConnectionsWithRegistries()`), never `composeHeritageForReading()`.

**Commit provenance — three measurement rounds, not one.**

| figures | measured against | why |
|---|---|---|
| Everything except the base-reading columns and threeSections' heritage/combined figures | `b62945e8619f1ca6ad470cd3f421c9cd0fa0b99b` | the original Phase B run |
| The **base-reading** columns in §1 and §2C (24 / 216) | `1cd96de49904118cece3b47c836074b966cadb8d` (D-1) | D-1 changed `readingTiers().tier2`, which is what `baseMaterialSignature()` reads |
| **threeSections'** heritage(Tier2)/heritage(Tier3)/combined figures (2 / 2 / 48) and connector residue (2) | D2-3, `claude/heritage-connector-relationships-d2` | D2-1/D2-2/D2-3 (`DR-2026-08-31-D2-CONNECTOR-PREDICATE`) activated two threeSections connectors; every other construct's heritage-connector figures are unaffected and still match the Phase B commit — see `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` §8.7 for the full trace and re-measurement |

Re-running the harness at `b62945e` reproduces the *pre-D-1* base figures (1 and 9) and the
*pre-D-2* threeSections heritage figures (1 / 1 / 24), not the ones tabulated below — so each
round is versioned separately rather than presented as if one commit produced the whole report.
Every OTHER heritage-connector figure (fiveElements, twelvePalaces, fiveMountains, fourRivers,
fiveOfficers) is identical across all three commits; neither D-1 nor D2-1/D2-2/D2-3 touched that
layer for any construct but threeSections. Raised in review by Codex on PR #45; the threeSections
D-2 figures were not re-measured here until this note.

**Read this alongside, never instead of:**
`docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md` (what changed and why),
`scripts/heritage-readiness/required-scope.mjs` (the fixed six-construct denominator),
`docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` (the six-axis Stage 3 status),
`docs/DECISION_CARDS.md` (CARD 7, 10 — the two decisions currently blocking coverage).

---

## Four gates, never merged into one verdict

| Gate | Result | Basis |
|---|---|---|
| `HERITAGE_LIBRARY_GOLD` | **NOT_READY** | `npm run heritage:readiness`, measured this session |
| `STAGE3_PRODUCTION_AUTHORIZATION` | **six-axis, per `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md`** — code present, architecture reviewed, product architecture NOT_RECORDED, content authorization per-construct (see coverage table below), safety NOT_GRANTED (signal ABSENT/UNSET, fail-closed), production NOT active | Decision-register + code state, not inferred from the GOLD result |
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

This is a **measured** result, not a target. `NOT_READY` is a valid, honest, exit-0 outcome —
the pre-reconciliation baseline (11 connectors, no construct with two-or-more ACTIVE connectors)
made it a plausible hypothesis going in; B1's reconciliation ran regardless, and the harness
decided the result, not the hypothesis.

### Required-scope coverage (the fixed six-construct denominator)

| Construct | Class | Why |
|---|---|---|
| 三停 `threeSections` | COVERAGE_GAP | Evidence is strong (VERIFIED_PRIMARY, this session's reconciliation) but no `RUNTIME_PROSE` reader narrative has been written — unbuilt work, not a withheld decision. |
| 五形 `fiveElements` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`. |
| 十二宮 `twelvePalaces` | DECISION_BLOCKED (CARD 10) | `taiqing-yuguan` is `VERIFIED_PRIMARY` but held `HERITAGE_ONLY` pending a construct-level runtime decision. |
| 五岳 `fiveMountains` | DECISION_BLOCKED (CARD 7) | Connectors now `VERIFIED_PRIMARY` but the abstract "primary" rotation label has no approved routing (`ABSTRACT_LINEAGE_OVERRIDES` stays empty). |
| 四瀆 `fourRivers` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`; see "Downstream reachability" in the ledger. |
| 五官 `fiveOfficers` | RUNTIME_SUPPORTED | `RUNTIME_PROSE`, `VERIFIED_PRIMARY`. |

Gate B fails because 3 of 6 required constructs are not `RUNTIME_SUPPORTED` — a coverage fact,
not a defect. Two of those three are one product-owner decision away (CARD 7, CARD 10); the
third (`threeSections`) needs reader-narrative writing, which is unbuilt work.

### Failure taxonomy per construct

| Construct | Taxonomy |
|---|---|
| threeSections | `COVERAGE_GAP` |
| fiveElements | `RELATIONSHIP_DEPTH_LIMITED` |
| twelvePalaces | `LINEAGE_DECISION_BLOCKED` (CARD 10) |
| fiveMountains | `LINEAGE_DECISION_BLOCKED` (CARD 7) |
| fourRivers | `RELATIONSHIP_DEPTH_LIMITED` |
| fiveOfficers | `RELATIONSHIP_DEPTH_LIMITED` |

### Why the three `RUNTIME_SUPPORTED` constructs still fail gates C and D

**Updated by D2-1/D2-2/D2-3** (`DR-2026-08-31-D2-CONNECTOR-PREDICATE`; see
`docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` §8): `threeSections` now has **connector
residue 2**, not 1 — the first (and, as of this measurement, only) construct in the corpus with
genuine connector-layer rotation. Every OTHER required construct's connector residue is still 1
— `deriveTier2FromComposition()`'s Tier 2 top pick has 0 or 1 active candidate for its
`"primary"` lineage, so there is still nothing to rotate BETWEEN at the connector layer for those
five. Concretely, per construct (exhaustive walk over the full derived period, corrected
methodology — see "A defect found and fixed" below):

| Construct | Base (Tier 2) raw=material | Heritage Tier 2 raw=material | Heritage Tier 3 raw=material | Combined (base+Tier2) |
|---|---|---|---|---|
| threeSections | 24 | **2** | **2** | **48** |
| fiveElements | 216 | 1 | 1 | 216 |
| twelvePalaces | 24 | 1 | 1 | 24 |
| fiveMountains | 24 | 1 | 1 | 24 |
| fourRivers | 216 | 1 | 1 | 216 |
| fiveOfficers | 216 | 1 | 1 | 216 |

threeSections' own combined figure does not change WHY gates C and D fail overall: 48 is still
three orders of magnitude below the `DIVERSITY_TARGET` of 250, and gate B (coverage) is unaffected
by connector residue at all — `threeSections` stays `COVERAGE_GAP` because its own base-reading
narrative is a separate axis from the connector graph (see the coverage table above). `NOT_READY`
is unchanged.

**The base column was re-measured after the D-1 Tier 2 repair** (see the section below); it
previously read 1 / 9 / 1 / 1 / 9 / 9. Heritage Tier 2, heritage Tier 3 and therefore the
binding constraint are all unchanged.

At the time of this Phase B measurement, every unit of combined diversity available came from the
**base reading's own prose variation** (Reflection Engine component/variant selection), none from
the heritage connector layer — the heritage factor contributed exactly 1 distinct state
everywhere. **D2-1/D2-2/D2-3 changed this for `threeSections` specifically**: its combined figure
(48) now exceeds its base-reading figure (24) for the first time in the corpus, because its
heritage factor moved from 1 to 2 distinct states. The other five required constructs are
unaffected — their heritage factor is still exactly 1, so `combinedMaterialDistinct` still equals
`baseReadingMaterialDistinct` for them. Gate D's `DIVERSITY_TARGET` of 250 remains unreachable at
the connector layer as it stands today (48 is not 250), independent of the coverage gate. The
finding stands, only sharpened: **the heritage library's current binding constraint is
relationship count, not prose variety** — every required construct except `threeSections` still
needs a second genuinely distinct connector (a different relationship, witness, disagreement
position, or juxtaposition) for its "primary" lineage before Tier 2 has anything to rotate; even
`threeSections`, now the best-performing construct on this axis, is still three orders of
magnitude short. See the ranked backlog below.

**D-1 raised the base column 24-fold and changed none of that.** The best-performing construct
moved from 9 to 216 distinct base-material states and still does not reach the 250 target, and
the heritage residue is still exactly 1 everywhere, so gate D fails for the same reason it
failed before and the ranked backlog is unaltered. If anything the finding is now sharper: the
base reading alone supplies 216 distinct Tier 2 states while the connector layer supplies one.

### D-1 — the Tier 2 projection, and what its numbers do and do not show

`src/qise/reading-tiers.js`'s `tierTwo()` read only the heritage layer plus the bridge and the
question. Those components declare four of the ten reading-affecting axes; the other six
(`region`, `direction`, `magnitudeBand`, `confidenceBand`, `historyStage`, `trajectory`) were
computed, carried on the frozen state, rendered in Tier 1 and Tier 3, and dropped before the
Reading screen — `reading-state.js`'s founding defect, one layer above the module written to
prevent it.

Measured over all 15,288 reachable states with `enumerateReachableStates()` + `composeReading()`
+ `readingTiers()`:

| | distinct visible Tier 2 | collision |
|---|---|---|
| before | 178 / 15,288 | 98.8% |
| after | 15,288 / 15,288 | 0.0% |

And the fixed-output half of the defect: one read state sampled across 40 consecutive
occurrences produced **1** distinct Tier 2 before and **24** after. The repair adds a
`tier2.personalContext` projection selected by component id out of `composed.parts` — the same
sentences the composition already produced, chosen through the same `textsFor()` helper
`tierOne()` uses. No new engine, no new corpus, no clock, no randomness.

**This is not customer-value evidence, and must not be cited as any.** It measures the removal
of a defect: a screen that had 178 faces now has as many as it has states. Nothing here shows
that a reader wants the Reading screen, opens it twice, finds the record true, or returns
because of it. Presentation discrimination is a precondition for the screen being worth
validating, not a substitute for validating it. `PRODUCT_RETENTION_READINESS` is unchanged at
`NOT_YET_RUNTIME_VALIDATED`.

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
surfaces. After the fix, base raw and base material are equal everywhere (1=1, 9=9) — material
is exactly as fine as raw, never finer, as required. This did **not** change the overall
`NOT_READY` result (gate D was already failing on the constructs blocked by coverage; the fix
only corrected the *reported* numbers for the three `RUNTIME_SUPPORTED` constructs, from a
falsely inflated 648/72/72 combined-material figure down to the true 9/9/9). Pinned by
`tests/heritage/readiness-material-signature.test.js`, including a regression test that mines
the real fiveElements corpus for occurrences sharing an identical Tier 2 output and asserts they
also share one material signature.

---

## 2. Retention findings — `npm run retention:sim`, four analyses, never merged

### A. `PUBLIC_SHIPPED_RETENTION` (reflectionMode=off — the shipped passage engine)

What a public-origin visitor experiences **today**. 365-day default scenario: verbatim repeat
rate 26.8%, 267 distinct texts across 113 distinct states, 0% near-duplicate rate. A
`mostlySteady` user (someone whose reading barely moves day to day) sees a much higher 66.8%
verbatim repeat rate over the same year — an expected, honest consequence of a passage engine
whose variation is driven by how much the underlying state actually changes.

### B. `INTERNAL_REFLECTION_RETENTION` (reflectionMode=on — development path, NOT the public default)

Same scenarios, the Reflection Engine. 365-day default scenario: verbatim repeat rate **0.0%**,
365 distinct texts (one per day), 0.2% near-duplicate rate — consistent with this repo's own
recorded history (`scripts/parity.mjs`'s `KNOWN_BLOCKERS` note: the occurrence-indexed variation
layer took this exact figure from 69.0% to 0.0% against the passage engine's 26.8%). Even the
`mostlySteady` scenario, where the base reading barely moves, still reaches 365 distinct texts —
the Reflection Engine's occurrence-indexed variation reads as a genuine retention improvement
over the shipped engine, independent of the heritage layer's current depth limits above. Stage 3
heritage connector output remains fail-closed under the real production safety state in this
analysis too; only the Reflection Engine's own prose behaviour is measured here.

### Construct-rotation cross-reference

183 of 365 calendar days over a year land on a construct that is not currently
`RUNTIME_SUPPORTED` (`threeSections`, `twelvePalaces`, `fiveMountains` — 61+61+61 days) —
meaning heritage content is absent on roughly half the year's days **regardless of which engine
(A or B) is running**, purely as a consequence of the coverage gate above.

### C. `LATENT_HERITAGE_EXHAUSTION` (internal seam, hypothetical authorisation — NOT production)

The exhaustive per-construct depth matches the GOLD harness's own numbers exactly — **as
re-measured post-D2-3**: threeSections combined-material is now **48** over period 72 (was 24),
twelvePalaces/fiveMountains stay 24/24, fiveElements/fourRivers/fiveOfficers stay 216/216/216 —
see the table above, confirming the two harnesses still agree, as they must, since both call the
same `analyseConstructLineage()`.

**Both harnesses were re-run after D-1 and both moved together**, which is the point of quoting
them side by side: the base column rose 24-fold in each. The pre-D-1 figures were 1/1/1 and
9/9/9. At that point nothing about the heritage connector layer had changed — its residue was 1 in
both measurements, for every construct. **D2-1/D2-2/D2-3 then moved threeSections' residue from
1 to 2**, the first and only change to this layer either harness has recorded; the other five
constructs are still residue 1 in both.

The calendar cross-check — real 365-day `mostlySteady` and `frequentMovementLike` simulated
users, walking the REAL per-day occurrence value through the same latent seam — used to report
`NO_ROTATION_OBSERVED_IN_THIS_SCENARIO` for **every** construct, under **both** scenarios, before
D2-3. **Post-D2-3, threeSections now reports `EXHAUSTED_BY_CALENDAR_DAY_18` under both scenarios**
(61 days on rotation, 2 distinct presentations seen) — the first non-trivial exhaustion result
this simulator has ever produced. The other five constructs are unchanged: since their connector
residue is still 1, there is still nothing to rotate between regardless of how variable or steady
the simulated user is. Read together, this sharpens rather than overturns the original finding:
relationship depth, not user behaviour, is what limits heritage retention value — and the one
construct where depth was added exhausts inside three weeks of a realistic usage pattern, which is
itself evidence that residue=2 is nowhere near enough, not evidence the constraint is solved.

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

1. **Add a second genuinely distinct connector to each `RUNTIME_SUPPORTED` construct's `"primary"`
   lineage** (fiveElements, fourRivers, fiveOfficers — still residue 1 as of D2-3; `threeSections`
   is `COVERAGE_GAP`, not `RUNTIME_SUPPORTED`, so it was never this item's target, even though
   D2-1/D2-2/D2-3 independently moved ITS connector residue off 1 by activating a second
   `threeSections` connector — see the note above and contract §8.7). This item is still the
   single highest-value change available for the three `RUNTIME_SUPPORTED` constructs: it is what
   would move their `connectorResidue` off 1 for the first time, which is the precondition for
   gate C and for any real retention benefit from the heritage layer at all for THOSE constructs —
   right now a returning user still gets zero additional heritage-layer variety on fiveElements,
   fourRivers or fiveOfficers regardless of how long they use the app. A different relationship,
   witness, disagreement position, or legitimate editorial juxtaposition all count; fragmenting one
   proposition into near-duplicate connector records does not (see the connector-identity collision
   check, now 0/16 collisions post-D2-3 — keep it that way when adding).
2. **Resolve CARD 7 (Five Mountains routing) and CARD 10 (Twelve Palaces runtime status).** Both
   already have `VERIFIED_PRIMARY` evidence sitting behind a construct-level decision, not an
   evidence gap — the fastest coverage-gate improvement available, and neither requires new
   research.
3. **Write the `threeSections` reader narrative.** Evidence is already `VERIFIED_PRIMARY`; this
   is unbuilt content work, not a blocked decision — lower priority than #2 only because it needs
   drafting rather than a single decision.
4. **Multi-witness presentation architecture** (the Five Mountains 頥/頷/頦 disagreement,
   recorded as a backlog research option in CARD 7). Genuinely deeper, genuinely more work — a
   later increment once #1 has established that single-relationship depth is achievable at all.
5. **More prose around already-rich relationships** is explicitly NOT prioritised: the retention
   simulator's own finding is that the binding constraint is relationship *count* (residue=1 for
   five of six required constructs; `threeSections` alone reached residue=2 under D2-3, and even
   that exhausts by calendar day 18 in a realistic scenario — see contract §8.7.3), not prose
   thinness — spending effort on prose variety around a single connector would not move gate C or
   D, since both are capped by "nothing to rotate between" (or "almost nothing") before they are
   capped by wording variety.

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

**Verification quoted:** `node --test`: `tests 1208 / pass 1208 / fail 0` (up from the
pre-session baseline of 1194: +6 material-signature falsification tests, +6 fast retention-sim
regression tests, +1 lint-bundle allowlist control — see below). `npm run heritage:readiness`
exits 0, result `NOT_READY`. `npm run retention:sim` exits 0, all four analyses present.
`npm run build` then `npm run lint:bundle` against the rebuilt `dist/`: exits 0 (`copy blocklist
ok`, `attractiveness ok`, `egress allowlist ok`, `biometric egress ok`) — this required one fix,
below. `npm run audit:release`: exits 0 both before and after this session's changes, with
**byte-identical** output (finding-identity confirmed; the printed "BLOCKED" content is a
pre-existing, unrelated rights/store-approval checklist, not a regression). Independent
re-verification, `node scripts/heritage-evidence/acquire-and-verify.mjs` (fresh clone of all four
Kanripo repos from GitHub, hashes recomputed from bytes, not read from the dossier): all 4
commits MATCH, **17/17 file hashes MATCH**, all 18 dossier passages VERIFIED or
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

**NOT VERIFIED, with the exact command:** `npm run test:browser` (`playwright test
--grep-invert @benchmark`) — this sandbox's pre-installed Chromium revision (`chromium_headless_shell-1194`)
does not match what the pinned `@playwright/test@1.62.1` expects (revision 1234, a
`chrome-headless-shell` binary name this environment does not have). Confirmed pre-existing and
unrelated to this session: `package.json`'s Playwright dependency is untouched by this session's
diff (only the two new `npm run` script entries were added), and per this environment's own
operating notes, running `playwright install` is disallowed. Anything Windows-specific remains
NOT VERIFIED for the same reason stated throughout this program (this container is Linux only),
including the `import.meta.url`/`process.argv[1]` entrypoint-guard comparison added to
`scripts/heritage-readiness.mjs` and `scripts/retention-sim.mjs` in B4.
