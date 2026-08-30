# Evidence transition ledger

**Status: applied 30 August 2026, with the 31 August closed-beta lineage amendment, against `docs/heritage-evidence/
REPO_RECONCILIATION_MATRIX.md` and `docs/heritage-evidence/GEMINI_IMPLEMENTATION_MANIFEST.md`.**
Every row states: construct · record · field(s) · old → new · source · reason · runtime
consequence, plus two independent classifications required by this program (see below). No code
is written by this document; it records what the four registry files (`src/reading/provenance.js`,
`src/heritage/evidence.js`, `src/heritage/registry.js`) actually received.

## Classification method

**Authority** — what kind of change this is, decided before it may be applied:

- `EVIDENCE_FACT_ONLY` — a new source/passage recorded as evidence; nothing runtime changes.
- `PROVENANCE_ONLY` — attribution, edition, translator, textual layer.
- `LOCATOR_ONLY` — folio/commit/SHA pinning metadata.
- `PRODUCT_POLICY_AFFECTING` — changes what the product may claim or ship. **Not applied — routed
  to a decision card.**
- `RUNTIME_AFFECTING` — changes which construct/lineage/connector is eligible at runtime. **Not
  applied — routed to a decision card.**
- `ARCHITECTURE_AFFECTING` — would require a schema/resolver change. **Stops entirely.**

Only `EVIDENCE_FACT_ONLY`, `PROVENANCE_ONLY` and `LOCATOR_ONLY` rows were applied in the
original evidence pass. The later closed-beta amendment is recorded separately below because
it intentionally changes runtime eligibility/selection under the product-owner decision record.

**Impact** — traced from actual current consumers, never inferred from a field's name:

- `ANALYTICAL_ONLY` — consumed only by evidence tooling, never a reader-facing reducer.
- `READER_METADATA_VISIBLE` — reaches Tier 3 as attribution/status text (`evidenceStrength`,
  `textualLayer`, `citationStatus`, `authorshipStatus` via `src/ui/qise/heritage-view.js`'s
  `connectorEvidenceCard()`).
- `READER_CONTENT_VISIBLE` — changes the substance of what a reader reads.
- `RUNTIME_ELIGIBILITY_AFFECTING` — changes what is eligible to render at all.
- `SELECTION_AFFECTING` — changes which eligible candidate is chosen.
- `NO_RUNTIME_OR_READER_EFFECT` — genuinely inert today.

An authority-safe row that is also `READER_METADATA_VISIBLE` does **not** require product-owner
approval on that account alone — it is a factual correction the reader is entitled to see
accurately. It is still recorded as an **expected** change for regression purposes, distinguished
from a genuine regression. See "Regression fixtures" below.

---

## A. `SOURCE_REGISTRY` — `src/reading/provenance.js`

| Matrix | Key | Fields | Old → New | Source | Authority | Impact |
|---|---|---|---|---|---|---|
| SR-01/01b | `heritage-five-mountains` | `repository`, `repositoryCommit`, `repositoryFile`, `sha256`, `sourceUrl`, `retrievedAt`, `editionFingerprint`, `sourceAccess`, `folioLocator`, `folioLocatorStatus`, `folioLocatorKind` | all null/`NOT_RECORDED`/`REFERENCE_ONLY` → pinned (`kanripo/KR3g0045`@`b3e5b69b…`, `KR3g0045_002.txt`, sha `bdacf64e…`, `<pb:KR3g0045_WYG_002_17b>`/`VERIFIED`/`WYG_PB`, `STABLE_REMOTE`) | `docs/heritage-evidence/acquisition-verify.json` | LOCATOR_ONLY | READER_METADATA_VISIBLE (Tier 3, via any connector citing this source) |
| SR-02 | `heritage-four-rivers-primary` | same fields | same repo/commit/file/hash; folio `<pb:KR3g0045_WYG_002_18a>` | same | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| SR-03 | `heritage-five-officers` | same fields | same repo/commit/file/hash; folio `<pb:KR3g0045_WYG_002_18b>` | same | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| SR-04 | `heritage-three-sections-taiqing` | pinning fields + `citationStatus` | `edition-recorded` → **`verified`** (see "Consistency corrections" below); `sourceAccess: REFERENCE_ONLY → STABLE_REMOTE`; folio `<pb:KR3g0045_WYG_006_6a>`/`VERIFIED` | same | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| SR-06 | `heritage-twelve-palaces-taiqing` | pinning fields + `citationStatus` | `edition-recorded → verified` (matrix explicit); folio `<pb:KR3g0045_WYG_001_17b>`/`VERIFIED` | same | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| SR-07 | `heritage-taiqing-juan1-mountains-rivers` | pinning fields + `citationStatus` + `sectionLocatorStatus` | `edition-recorded` → **`verified`** (consistency correction); `sectionLocatorStatus: RECORDED → VERIFIED`; folio `<pb:KR3g0045_WYG_001_6b>`/`VERIFIED` | same | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| SR-08 | `heritage-taiqing-form-qise-interaction` | pinning fields only | repo/commit/file/hash pinned; folio deliberately left `null`/`NOT_RECORDED` — 卷四 predicate not read this pass | same | LOCATOR_ONLY | NO_RUNTIME_OR_READER_EFFECT (`citationStatus` was already `verified`, unaffected) |
| SR-09 | `heritage-taiqing-juan4-form-shen-reciprocity` | pinning fields only | same pattern, folio not pinned | same | LOCATOR_ONLY | NO_RUNTIME_OR_READER_EFFECT |
| SR-10 | `heritage-five-mountains-renlun-datong` | pinning + `sectionLocator` + `sectionLocatorStatus` + `citationStatus` + `authorshipNote` | `sectionLocator: null → "卷上 五嶽"` (`RECORDED`); `work-recorded → edition-recorded`; folio `<pb:KR3g0046_WYG_001_11a>`/`VERIFIED`; Yuan/Jin chronology note appended | same | LOCATOR_ONLY + PROVENANCE_ONLY | READER_METADATA_VISIBLE |
| SR-11 | `heritage-four-rivers-renlun-datong` | same shape | `sectionLocator: null → "卷上 四瀆"`; `work-recorded → edition-recorded`; folio `<pb:KR3g0046_WYG_001_10b>`/`VERIFIED`; same Yuan/Jin note | same | LOCATOR_ONLY + PROVENANCE_ONLY | READER_METADATA_VISIBLE |
| SR-12 | `heritage-four-rivers-renlun-fengjian` | `authorshipNote` | rewritten from "may be a genre descriptor / label entered in error" to "named textual comparandum, cited 16x + 1x, no independent witness located" | project-owned pinned passages | PROVENANCE_ONLY | READER_METADATA_VISIBLE (this source is not cited by any applied connector, so effectively `NO_RUNTIME_OR_READER_EFFECT` today) |
| SR-13 | `heritage-yuebo-dongzhongji-configuration` | pinning + `kind` + `edition` + `sectionLocator` + `citationStatus` + `authorshipStatus` + `authorshipNote` | `unresolved-tradition-source → historical-primary-text-secondary-witness`; `edition: null → "文淵閣四庫全書 (WYG-Siku)"`; `work-recorded → edition-recorded → **verified**` (consistency correction, see below); `authorshipStatus: NOT_RECORDED → ANONYMOUS`; folio `<pb:KR3g0043_WYG_001_5a>`/`VERIFIED`. `rightsStatus` deliberately left `unverified` — not instructed by the manifest | same + Theobald attribution note | LOCATOR_ONLY + PROVENANCE_ONLY | READER_METADATA_VISIBLE |
| SR-14 | `heritage-five-forms-yuguan` *(new)* | full record | does not exist → new, `citationStatus: verified`, folio `<pb:KR3g0044_WYG_001_4b>`/`VERIFIED` | `KR3g0044_001.txt` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE |
| SR-15 | `heritage-three-sections-yuguan` *(new)* | full record | does not exist → new, `citationStatus: verified`, folio `<pb:KR3g0044_WYG_003_13a>`/`VERIFIED` | `KR3g0044_003.txt` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE |
| SR-05 | `heritage-three-sections-taiqing-mianbu` *(new)* | full record | does not exist → new, `citationStatus: verified`, folio `<pb:KR3g0045_WYG_005_7b>`/`VERIFIED` | `KR3g0045_005.txt` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE |
| SR-16 | `xunzi-feixiang` | `authorshipNote` | added: how the physiognomy manuals cite 荀子·非相 (3 witnesses, disagreeing on the second clause); `citationStatus` unchanged at `work-recorded` | same | PROVENANCE_ONLY | NO_RUNTIME_OR_READER_EFFECT (field-level finding only, not consumed by a rendered lineage) |
| SR-17 | `heritage-five-elements` | — | **KEEP**, not a Kanripo witness | — | — | — |
| SR-18 | all Kanripo-pinned records | `surrogateRights` | **NOT APPLIED** — stays `SURROGATE_RIGHTS_NOT_DECLARED` | — | PRODUCT_POLICY_AFFECTING | Routed to `docs/DECISION_CARDS.md` CARD 11 |
| SR-19 | `heritage-five-officers-renlun-datong` *(new, 31 Aug amendment)* | full record, including dedicated Five Officers section locator | absent → byte-pinned Renlun Datong Fu / Xue Yannian commentary witness; `citationStatus: VERIFIED`, `rightsStatus: PUBLIC_DOMAIN_BY_AGE`, `sourceAccess: STABLE_REMOTE`, folio `<pb:KR3g0046_WYG_001_11a>`/`VERIFIED` | fresh pinned Kanripo acquisition (`KR3g0046_001.txt`) | EVIDENCE_FACT_ONLY + LOCATOR_ONLY + PROVENANCE_ONLY | READER_METADATA_VISIBLE; runtime use is separately authorised by `DR-2026-08-31-REFLECTION-BETA-RUNTIME` |

### Consistency corrections beyond the manifest's literal text

Three sources needed `citationStatus: verified` (not the manifest's literal `edition-recorded`)
because the frozen validator (`src/heritage/validator.js`) enforces that a connector or lineage
carrying `evidenceStrength: VERIFIED_PRIMARY` cannot cite a source below `verified` — and the
matrix's own SR-06 row already established the rule this session applied consistently: **a
byte-pinned, `folioLocatorStatus: VERIFIED` folio is exactly what "independently checked against
the actual source" means**, so `citationStatus` follows it to `verified`. Applied to
`heritage-three-sections-taiqing` (SR-04), `heritage-taiqing-juan1-mountains-rivers` (SR-07), and
`heritage-yuebo-dongzhongji-configuration` (SR-13) — each cited by a connector or lineage this pass
promotes to `VERIFIED_PRIMARY` (EV-06/CR-10, CR-04, CR-07 respectively). Classified `LOCATOR_ONLY`:
the correction follows mechanically from a locator status already recorded, not a new editorial
judgement.

### A formatting defect found and corrected, not smuggled

`GEMINI_IMPLEMENTATION_MANIFEST.md`'s example code writes folio locators without the `<pb:...>`
wrapper (e.g. `folioLocator: "KR3g0045_WYG_005-7b"`), and the matrix's own human-readable table
uses a hyphen before the folio suffix. Verified this session against the frozen validator:
`folioLocatorKind: "WYG_PB"` requires `folioLocator` to match `/^<pb:[A-Za-z0-9_]+>$/` —
**no hyphen accepted**, confirmed by the existing falsification test `HVS-008`. Every folio locator
applied by this ledger uses the underscore-delimited, `<pb:...>`-wrapped form (e.g.
`<pb:KR3g0045_WYG_005_7b>`) — the same folio, the same evidence, corrected only in delimiter to
satisfy the frozen regex. This is an encoding fix, not a schema change, and `validator.js` was not
touched.

---

## B. `HERITAGE_EVIDENCE` — `src/heritage/evidence.js`

| Matrix | Path | Old → New | Authority | Impact |
|---|---|---|---|---|
| EV-01 | `fiveMountains.taiqing-siku.constituents[*]` | add `folioLocator: <pb:KR3g0045_WYG_002_17b>` to all 5 | LOCATOR_ONLY | ANALYTICAL_ONLY (constituents have no `folioLocatorStatus` field in this schema; not reader-rendered as such) |
| EV-02 | `fiveMountains.primary.note` | appended: 3-witness (頥/頷/頦) disagreement on the northern-mountain term | PROVENANCE_ONLY | ANALYTICAL_ONLY (`fiveMountains.primary` is `RESEARCH_ONLY`, not `RUNTIME_PROSE` — verified this session; Chinese content here does not cross the English reader boundary) |
| EV-03 | `fiveMountains.primary` | `evidenceStrength: RECORDED_NOT_VERIFIED → VERIFIED_SECONDARY`; `runtimeStatus` **unchanged** (`RESEARCH_ONLY`) | LOCATOR_ONLY | READER_METADATA_VISIBLE if ever authorised; `runtimeStatus` routing itself is `RUNTIME_AFFECTING` and untouched — see `docs/DECISION_CARDS.md` CARD 7 |
| EV-04 | `fiveMountains.primary.disagreements["five-mountains-northern-region"]` | add `yuebo-yi` position (4 → 5 positions) | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY (same RESEARCH_ONLY lineage) |
| EV-05 | `threeSections.lineages["taiqing-mianbu-facial"]` *(new)* | new lineage, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE if ever authorised |
| EV-06 | `threeSections.lineages["taiqing-section-heading"]` | `evidenceStrength: RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY`; folio pinned | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| EV-07 | `threeSections.lineages["yuguan-pingdeng"]` *(new)* | new lineage, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE if ever authorised |
| EV-08 | `fiveOfficers.primary.constituents["inspection"]` + `fiveOfficers.lineages["renlun-xue"]` *(new)* + `unverifiedClaims` | **RECLASSIFY**: removed `監察官` as an alias of `inspection` (was mischaracterised — it is a genuine 4-of-5-title lineage disagreement, not an orthographic variant); added `renlun-xue` lineage; `philtrum-longevity-office` moved from `unverifiedClaims` (now `[]`) to a witnessed position in `renlun-xue` | EVIDENCE_FACT_ONLY | READER_CONTENT_VISIBLE for the alias removal (a Tier-3 alias note disappears), READER_METADATA_VISIBLE for the new lineage if ever authorised |
| EV-09 | `fiveOfficers.primary.constituents[*]` | add `folioLocator: <pb:KR3g0045_WYG_002_18b>` to all 5; `evidenceStrength` unchanged (already `VERIFIED_PRIMARY`) | LOCATOR_ONLY | ANALYTICAL_ONLY |
| EV-10 | `fourRivers.primary.constituents[*]` | add `folioLocator: <pb:KR3g0045_WYG_002_18a>` to all 4 | LOCATOR_ONLY | ANALYTICAL_ONLY |
| EV-11 | `fourRivers.lineages["renlun-datong-provisional"]` | `evidenceStrength: RECORDED_NOT_VERIFIED → VERIFIED_SECONDARY`; `definition` rewritten from "supplies no promotable assignment yet" to the confirmed byte-verified mapping; folio pinned | LOCATOR_ONLY | READER_METADATA_VISIBLE if ever authorised (`RESEARCH_ONLY`, unchanged) |
| EV-12 | `fourRivers.primary.note` | **NOT applied to the reader-facing `note` field** — this lineage is `RUNTIME_PROSE` (verified this session: `src/qise/reflection.js:39` reads `lineage.note` directly into the live English reading text, enforced by `tests/ui-language.test.js`). The byte-pinned finding (相朝/應於神, both already separately encoded as connectors) is recorded as a **code comment** instead. | LOCATOR_ONLY (the finding itself) | Would have been READER_CONTENT_VISIBLE in Chinese if placed in `note` — caught and corrected before commit; see "English reader boundary" below |
| EV-13 | `twelvePalaces.lineages["taiqing-yuguan"]` + all 12 constituents | `evidenceStrength: VERIFIED_SECONDARY → VERIFIED_PRIMARY`; folio pinned on lineage and every constituent; `runtimeStatus` **unchanged** (`HERITAGE_ONLY`) | LOCATOR_ONLY | READER_METADATA_VISIBLE; construct-level `runtimeStatus` routing is `RUNTIME_AFFECTING` and untouched — `docs/DECISION_CARDS.md` CARD 10 |
| EV-14 | `twelvePalaces.primary.note` | appended: the 十二宫 system is byte-pinned; negative tests must search both 宮/宫; what remains unpinned is specifically the received-Mayi mapping | PROVENANCE_ONLY | ANALYTICAL_ONLY (`twelvePalaces.primary` is `RESEARCH_ONLY`, not `RUNTIME_PROSE`) |
| EV-15 | `fiveElements.primary` | **NOT APPLIED** — `permittedHeritageSemantics`/`runtimeStatus` unchanged | — | PRODUCT_POLICY_AFFECTING | Routed to `docs/DECISION_CARDS.md` CARD 8 (SUPERSEDE R7?) |
| EV-16 | `fiveElements.lineages["yuguan-like-with-like"]` *(new)* | new lineage, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | READER_METADATA_VISIBLE if ever authorised |
| DR-02 | `fourRivers.primary.disagreements["four-rivers-eye-mouth"].positions["primary-eye-huai-mouth-he"]` | note added: now 3 byte-pinned witnesses agree | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |
| DR-05 | `twelvePalaces.primary.disagreements["twelve-palaces-constituents"].positions["taiqing-yuguan"]` | note added: byte-pinned, `VERIFIED_PRIMARY` | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |

### 31 August closed-beta lineage amendment

The product-owner decision record permits the complete Reflection Engine to run in closed beta,
but does not permit the evidence layer to be rewritten or a research-only relationship to be
silently promoted. Accordingly, the pinned Five Officers disagreement now has an explicit
`renlun-xue` alternate witness backed by SR-19. `src/heritage/runtime-routing.js` selects that
witness on the deterministic alternate cycle, while `src/heritage/runtime-connectors.js` exposes
only its bounded, attributed structural relationships. The fortune/rank relationship remains
`SOURCE_PANEL_ONLY`; it is not part of the daily Tier 2 card. This amendment is therefore both a
provenance correction and a runtime-selection change, with the latter authorised by the decision
record rather than smuggled into the evidence ledger.

### English reader boundary — one defect found and fixed before commit

Verified this session via `npm test`: appending EV-12's Chinese-bearing finding directly to
`fourRivers.primary.note` failed `tests/ui-language.test.js`'s "every reachable Reflection Engine
output and attribution is English-only" and "runtime heritage prose has translation provenance and
English display copy" guards, because that lineage is `RUNTIME_PROSE` and its `note` field feeds
the live English reading text. Corrected by moving the finding into a source comment and leaving
`note` exactly as it read before this session. No other `RUNTIME_PROSE` lineage (`fiveElements.primary`,
`fiveOfficers.primary`) was touched in a way that added Chinese to `definition`/`note`/`source`.

---

## C. `HERITAGE_CONNECTOR_REGISTRY` — `src/heritage/registry.js`

| Matrix | ConnectorId | Old → New | Authority | Impact |
|---|---|---|---|---|
| CR-01 | `five-mountains-mutual-facing-fullness` **SPLIT** → `five-mountains-mutual-facing` + `five-mountains-fullness` | one fused `RECORDED_NOT_VERIFIED` connector → two, each `VERIFIED_PRIMARY`, folio-pinned, correctly separating the 相朝 (太清+月波) and 豐隆 (太清+人倫) predicates that were previously conflated (errata E-8) | LOCATOR_ONLY + EVIDENCE_FACT_ONLY | RUNTIME_ELIGIBILITY_AFFECTING under **direct lineage injection only** (see "Downstream reachability" below); production-unreachable regardless (Decision 1 + safety gate both unresolved) |
| CR-02 | `four-rivers-flow-and-banks` | `RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY`; `sourceText` verified verbatim; folio pinned | LOCATOR_ONLY | **RUNTIME_ELIGIBILITY_AFFECTING under the REAL production `fourRivers/primary` lineage** — see "Downstream reachability" below, the most significant finding in this ledger |
| CR-03 | `four-rivers-mutual-facing` *(new)* | new, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | RUNTIME_ELIGIBILITY_AFFECTING (new candidate; `RESEARCH_ONLY` gates it before evidence strength matters) |
| CR-04 | `five-mountains-four-rivers-corresponds` | `RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY`; folio pinned; required promoting `heritage-taiqing-juan1-mountains-rivers`'s `citationStatus` too (consistency correction) | LOCATOR_ONLY | READER_METADATA_VISIBLE if ever authorised (`RESEARCH_ONLY`, unchanged) |
| CR-05 | `four-rivers-shen-corresponds` | folio added only; `evidenceStrength` was already `VERIFIED_PRIMARY` | LOCATOR_ONLY | READER_METADATA_VISIBLE |
| CR-06 | `five-officers-one-good-office-ten-years` | `RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY`; fuller `sourceText` recorded; folio pinned; `runtimePolicy` **unchanged** (`SOURCE_PANEL_ONLY`) | LOCATOR_ONLY | READER_METADATA_VISIBLE; stays `SOURCE_PANEL` by fixed policy, not evidence strength |
| CR-07 | `yuebo-mountains-rivers-form-shen-configuration` | `RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY`; folio pinned; required promoting `heritage-yuebo-dongzhongji-configuration`'s `citationStatus` too (consistency correction) | LOCATOR_ONLY | READER_METADATA_VISIBLE if ever authorised (`RESEARCH_ONLY`, unchanged) |
| CR-08 | `five-forms-generative-overcoming-system` | **NO CHANGE**, confirmed | KEEP | unaffected — remains the corpus's stable example of a genuine, unresolved `SOURCE_PANEL` ceiling |
| CR-09 | `five-forms-like-with-like` *(new)* | new, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | RUNTIME_ELIGIBILITY_AFFECTING (new candidate under `fiveElements`) |
| CR-10 | `three-sections-facial-proportion-taiqing` *(new)* | new, `VERIFIED_PRIMARY`, `RESEARCH_ONLY` | EVIDENCE_FACT_ONLY | RUNTIME_ELIGIBILITY_AFFECTING (new candidate under `threeSections`) |
| CR-11 | `three-sections-equality-mayi-received` | note appended: cross-reference to the new 玉管 `平等` verse; `evidenceStrength` unchanged | PROVENANCE_ONLY | ANALYTICAL_ONLY |
| CR-12 | `renlunfengjian-collation-aggregate` | **NOT ADDED** — matrix marks this optional; not required for any applied row | — | — |

### Downstream reachability — the most significant finding in this ledger

**`four-rivers-flow-and-banks` (CR-02) is now genuinely `ACTIVE`-eligible under the real production
`fourRivers/primary` lineage**, verified directly against `composeHeritageForReading()` with zero
registry overrides this session. This is materially different from every Five Mountains connector
in this pass: `fiveMountains`'s abstract `"primary"` label is unrouted
(`ABSTRACT_LINEAGE_OVERRIDES` is `{}`, Decision 1 unresolved), so nothing under that construct can
reach a real user regardless of evidence strength. `fourRivers`'s `"primary"` is **not** behind that
same gate — `SOURCE_ID_BY_LINEAGE.fourRivers.primary` already resolves it directly. The only thing
currently preventing `four-rivers-flow-and-banks` from rendering to a real user is the **separate,
still-unresolved safety-authorisation gate** (`safetyPassed` is never `true` in production —
`docs/heritage-evidence/SAFETY_AUTHORIZATION_INTERFACE.md`). If and when that gate is ever resolved
(Card 6), this specific connector will render as `ACTIVE` heritage content where it previously
would have been ceilinged at `SOURCE_PANEL`, purely because its evidence is now genuinely stronger.
This is the intended, honest consequence of doing the source review — not a defect, and not
something this pass has papered over: it is named here precisely so a future reviewer resolving
Card 6 knows this construct's Stage-3 experience changed underneath it during this reconciliation.

---

## D. `HERITAGE_DISAGREEMENT_REGISTRY` — `src/heritage/registry.js`

| Matrix | DisagreementId | Old → New | Authority | Impact |
|---|---|---|---|---|
| DR-01 | `five-mountains-northern-region` | 4 positions → 5 (added `yuebo-yi`, byte-pinned); two existing positions annotated "byte-pinned" | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY (Tier-3 disagreement panel, not RUNTIME_PROSE) |
| DR-02 | `four-rivers-eye-mouth` | note appended on the primary position: 3 witnesses now agree | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |
| DR-03 | `five-officers-titles` *(new)* | new disagreement: Taiqing set vs. `renlun-xue` set, 4 of 5 titles differ | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |
| DR-04 | `three-sections-predicate` *(new)* | new disagreement: 相稱 (3 internal witnesses) vs. 平等 (玉管) | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |
| DR-05 | `twelve-palaces-constituents` | note added on the `taiqing-yuguan` position: byte-pinned, `VERIFIED_PRIMARY` | EVIDENCE_FACT_ONLY | ANALYTICAL_ONLY |

## E. `HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY`, `HERITAGE_COMPOSITION_POLICIES`, `HERITAGE_CONCEPT_REGISTRY`

**KEEP, unchanged.** The matrix's optional `NR-01` metadata addition (cross-referencing the new
`heritage-five-forms-yuguan` source) was not applied — it is explicitly marked optional and adds no
evidence the applied rows do not already carry via the new lineages/connectors themselves.

---

## Regression fixtures — intentional changes, recorded

Every test file touched to keep the suite green after applying the rows above, and why each change
is an **intentional, evidence-driven** update rather than a regression:

| File | What changed | Why |
|---|---|---|
| `tests/heritage/integration.test.js` | Repointed a "verified section, unrecorded folio" example from `heritage-five-mountains` to `heritage-taiqing-form-qise-interaction`; added a dedicated test asserting the new verified folio on `heritage-five-mountains` | SR-01 legitimately promoted the former example past the state the test needed |
| `tests/heritage/validator.test.js` | Same repointing for an equivalent assertion | Same reason |
| `tests/reading-provenance.test.js` | Repointed a `WORK_RECORDED` example from `heritage-four-rivers-renlun-datong` to `heritage-five-mountains-shenyi`; added an assertion recording the intentional promotion | SR-11 promoted the former example to `EDITION_RECORDED` |
| `tests/heritage/falsification.test.js` | `HVR-017`/`HVR-020` now construct their own malformed fixture (a synthetic alias / a synthetic unverified claim) instead of mutating a real corpus record; `collectiveBase()` repointed to `five-mountains-mutual-facing` | EV-08 resolved the corpus's only real alias and only real unverified claim — the anti-patterns these tests probe no longer exist in real data, which is the intended outcome, not a gap |
| `tests/heritage/composition.test.js` | Three tests repointed from `fiveMountains/taiqing-siku` (or its old connector id) to `fiveOfficers/primary`/`five-officers-one-good-office-ten-years`; one test's disposition assertion corrected from `SOURCE_PANEL_CEILING` to the real value `SOURCE_PANEL`; one test updated to assert `ACTIVE` instead of `SOURCE_PANEL_CEILING` for the legitimately-promoted mountains connector | CR-01's split + evidence promotion moved the former flagship example out of the ceiling; a same-session typo (conflating two distinct disposition strings) caught by the test itself |
| `tests/heritage/resolver.test.js` | Renamed the item-5 "source-review-flagged" test to record its resolution; added a companion test on `five-forms-generative-overcoming-system` (genuinely unaffected) to keep the ceiling mechanism itself demonstrated on real data; updated the `fiveElements` candidate list (now includes `five-forms-like-with-like`) and the `five-mountains-northern-region` position count (now 5) | All additive/positive consequences of applied rows |
| `tests/qise/heritage-view.test.js` | Renamed the old connector id in one abstention test (mechanism unaffected); repointed three end-to-end tests from `fourRivers/primary`/`four-rivers-flow-and-banks` to `fiveOfficers/primary`/`five-officers-one-good-office-ten-years` | CR-02's promotion made `fourRivers/primary` no longer demonstrate an asymmetric/ceilinged case — see "Downstream reachability" above |
| `tests/qise/reading-production-path.test.js` | Renamed the old connector id in the fiveMountains abstention test; updated the historical comment to record the split | Mechanism (whole-construct `LINEAGE_RESEARCH_ONLY` abstention) is unaffected by the split or by evidence strength |

No test's **mechanism** was weakened to make it pass — in every case, the substitute fixture
demonstrates the identical mechanism the original test was written to prove, on a real corpus
record genuinely unaffected by this session's changes, or the assertion was corrected to match
newly-verified reality.

### A guard this pass's own additions tripped, found by running `npm run lint:bundle`

Every hashed `SOURCE_REGISTRY` record this pass touched (LOCATOR_ONLY rows, per the
classification method above) gained a `sourceUrl` field — required by `validator.js`'s own rule
("Hashed source requires sourceUrl, retrievedAt and editionFingerprint") once `citationStatus`
reached `verified`. `scripts/lint-bundle.js`'s egress guard scans the **built artefact** for every
string that looks like a network destination and fails on anything not on an explicit allowlist —
it does not know or care whether the app ever actually reads the field, only that the literal URL
is present in `dist/`. It correctly flagged all 14 new `https://github.com/kanripo/...` values as
an unrecognised destination.

Checked before deciding how to fix it: `sourceUrl` is not read anywhere under `src/ui/` or
`src/qise/` (`grep -rn "sourceUrl" src/ui/ src/qise/` — zero matches). It is validated by
`schema.js`/`validator.js` as an HTTPS-shaped citation identifier and exists so a human reviewer
can independently re-verify a citation — the same role `IDENTIFIER_URI_ALLOWLIST`'s existing
JSON-Schema-URI entry already documents ("Metadata identifiers that are URIs by specification but
are never fetched or offered as links"). That bucket, not `DOC_LINK_ALLOWLIST` (which is for an
actual tappable `<a href>` the user can open, e.g. the Apache-2.0 attribution), is the correct
one: nothing currently renders `sourceUrl` as a link at all.

**Fix:** one new entry added to `IDENTIFIER_URI_ALLOWLIST` in `scripts/lint-bundle.js` — a
pattern (not 14 exact strings, to avoid silent drift as more sources are pinned) anchored tightly
enough that it can only match the four pinned Kanripo repos, a 40-hex-character commit SHA, and
the `KR3g00NN_NNN.txt` filename convention those repos use — no query string or fragment can
match. Paired positive/negative-control test added:
`tests/copy-lint.test.js` → `the Kanripo sourceUrl identifier exception matches only the pinned
acquisition shape` (four real positive shapes, five ways the pattern could have been wrongly
widened, each asserted to still fail). `npm run lint:bundle` now reports `egress allowlist  ok`.

This is recorded here rather than filed as a silent fix because it is a direct, mechanical
consequence of this pass's own `LOCATOR_ONLY` rows — the kind of downstream effect the
Authority/Impact classification is meant to surface, not something a decision card was needed
for (the allowlist addition changes nothing about what the app does; it only lets the build
compliance guard correctly recognise data that was already there and already validated as
HTTPS).

---

## Verification

```
npm test
```
`tests 1208 / pass 1208 / fail 0` (1195 at this ledger's own completion; +6 from the B3
material-signature falsification suite, +6 from the B4 retention-sim regression suite, +1 from
the lint-bundle allowlist control above), run repeatedly through this pass as each registry file
was completed. `node --check` run on every edited source file. No change to
`src/heritage/resolver.js`, `schema.js`, `validator.js`, `connectors.js` field definitions, or
`constants.js` — confirmed by `git diff --name-only` against this session's commits.
`npm run lint:bundle` exits 0 (`copy blocklist ok`, `attractiveness ok`, `egress allowlist ok`,
`biometric egress ok`) against the rebuilt `dist/`.
