# CORRECTED RELATIONSHIP ATLAS V2

Machine-readable: [`CORRECTED_RELATIONSHIP_ATLAS_V2.csv`](CORRECTED_RELATIONSHIP_ATLAS_V2.csv)
(built by [`scripts/heritage-evidence/build-atlas-v2.mjs`](../../scripts/heritage-evidence/build-atlas-v2.mjs)
from the dossier's §4 CSV + the `RESEARCH_ERRATA.md` corrections).

## What changed from the dossier's §4 atlas

1. **`passageIds` column added.** Every `VERIFIED_PRIMARY` relationship now
   mechanically joins to one or more rows of
   [`PROJECT_OWNED_PINNED_PASSAGES.csv`](PROJECT_OWNED_PINNED_PASSAGES.csv) by
   `relationshipId` (the join table is in `build-atlas-v2.mjs`, keyed on
   `relationshipId` — no Chinese-prose matching). **0 `VERIFIED_PRIMARY` rows
   lack a passageId.**
2. **`runtimePotential` → `historicalRuntimeCeiling`.** Same values
   (`ELIGIBLE` / `PRODUCT_DECISION_REQUIRED` / `HISTORICAL_EVIDENCE_ONLY`), new
   name, because it **must not be copied into the repo's runtime contract**
   (`runtimeStatus` / `runtimePolicy` in `evidence.js` / `registry.js`). It is a
   research-side statement about *how far the historical evidence alone could
   support a runtime claim* — it is derived from evidence strength + pinning +
   `prohibitedForUserInference`, and the repo's runtime status is a separate,
   product-owned decision (see `REPO_RECONCILIATION_MATRIX.md`).
3. **`renlunfengjian-variant-witness-taiqing`** — downgraded from one
   `VERIFIED_PRIMARY` row with an ellipsis-composite quote over a 6-folio range
   to a `SOURCE_CRITICISM_AGGREGATE` at `VERIFIED_SECONDARY`, backed by an
   explicit `passageIds` list (errata E-9).
4. **`mountains-provinces-colour-yuebo`** — `section` relabelled `九州`; the
   `五嶽…所管屬者` heading governs the *preceding* similes passage (errata E-9).
5. **`+ twelve-palaces-membership-taiqing`** — NEW row from `tq-j1-shierdgong`.
   The dossier §4 has **no** Twelve Palaces row (its §5 states "十二宮 = 0
   (absent)"). The system is byte-pinned in 太清 卷一 (errata E-1).
6. **`+ xunzi-explicit-citation-taiqing`** — NEW row from `tq-j3-xunzi-explicit`,
   kept separate from `xunzi-allusion-taiqing` (errata E-2).
7. **`five-mountains-membership-yuebo`** — carries `disagreementId =
   five-mountains-lower-face-term` (the 頥 / 頷 / 頦 three-term split, §3-A3).

The dossier's §4 rows that split `豐隆` and `相朝` into separate connectors
(`five-mountains-mutual-facing-taiqing` / `-yuebo` vs
`five-mountains-fullness-renlun-xue`) are **kept as-is** — the dossier atlas is
already correct here. The *repo* connector `five-mountains-mutual-facing-fullness`
is the one that fuses them; that is a reconciliation item (errata E-8, matrix
row CR-08), not an atlas defect.

## Coverage arithmetic (recomputed from the V2 CSV bytes)

| metric | dossier §5 prose | dossier §4 CSV | **V2 CSV** |
|---|--:|--:|--:|
| rows | 34 | 38 | **40** |
| `VERIFIED_PRIMARY` | 31 | 35 | **36** |
| `VERIFIED_SECONDARY` | — | 0 | **1** (`renlunfengjian-variant-witness-taiqing`, downgraded) |
| `RECORDED_NOT_VERIFIED` | 3 | 3 | **3** (`four-rivers-membership-mayi`, `five-forms-verse-shenxiang`, `xunzi-antiphysiognomy` — all unpinned, no witness) |
| `prohibitedForUserInference == true` | 14 | 13 | **14** (+1: the new Twelve Palaces row is fortune-typed) |
| `historicalRuntimeCeiling == ELIGIBLE` | 18 | 23 | **24** (+1: xunzi-explicit) |
| `historicalRuntimeCeiling == PRODUCT_DECISION_REQUIRED` | — | 12 | **13** (+1: Twelve Palaces) |
| `historicalRuntimeCeiling == HISTORICAL_EVIDENCE_ONLY` | — | 3 | **3** |
| rows with a `passageIds` join | — | — | **37 / 40** (the 3 without are the 3 `RECORDED_NOT_VERIFIED` unpinned rows) |
| `VERIFIED_PRIMARY` rows **without** a passageId | — | — | **0** |

## Disagreement clusters (V2)

| disagreementId | members | repo counterpart |
|---|---|---|
| `five-mountains-lower-face-term` | 頥 (月波 卷上) / 頷 (太清 卷二) / 頦 (人倫 薛注) — **3 terms** | `five-mountains-northern-region` (repo has 4 positions incl. sxqb-chin, shenyi-zone) |
| `four-rivers-eye-mouth` | 淮=eye/河=mouth (太清, 月波, 人倫 — 3 pinned, agree) vs 河=eye/淮=mouth (麻衣, **unpinned**) | `four-rivers-eye-mouth` (repo: primary vs sxqb-shoujuan-xiangshuo) |
| `five-officers-titles` | 太清 (鑒察/審辨/出納/採聽/保夀官, 眉) vs 人倫 薛注 (監察/審聽/嗅臭/出納/保夀官, 人中) — **4 of 5 titles differ** | none — repo `evidence.js` treats 鑒察/監察 as an orthographic alias and `philtrum-longevity-office` as an `unverifiedClaims` entry. **Reclassify** (matrix CR-11). |
| `three-sections-predicate` | 相稱 (太清 卷一/五/六) / 平等 (玉管 卷下); facial (卷五) / body (卷六) | partial — repo has `three-sections-boundaries` (a different, boundary-scheme disagreement) |
| `twelve-palaces-constituents` | 太清-yuguan (11 named + 相貌, no 田宅宮) vs received-Mayi/神相全編 (with 田宅宮, 財帛宮=nose — **unpinned**) | `twelve-palaces-constituents` + `twelve-palaces-twelfth-slot` (repo, both OPEN) |

## Part-4 audit — carried forward from dossier §5, with V2 deltas

All dossier §5 Part-4 verdicts stand. Deltas:
- `renlunfengjian-variant-witness-taiqing`: **KEPT, DOWNGRADED further** to
  `SOURCE_CRITICISM_AGGREGATE` / `VERIFIED_SECONDARY` (dossier had it at
  `VERIFIED_PRIMARY`).
- `qise-shen-cojuan-taiqing`: **REMOVED** (dossier §5) — confirmed. Co-presence
  of 論神 and 氣色 headings in 卷三 is not a relation. The genuine Shen relation
  is `four-rivers-answer-to-shen-taiqing` (太清 卷二 「則應於神」, `tq-j2-sidu`).
- `five-forms-generation-yuguan` → `five-forms-like-with-like-yuguan` (dossier
  §5) — confirmed; **and** it needs its own sourceId (玉管照神局 is not in
  `SOURCE_REGISTRY`) and must not be conflated with the repo's
  `five-forms-generative-overcoming-system` (太清 相生/相尅 claim, still unread —
  errata E-7).
