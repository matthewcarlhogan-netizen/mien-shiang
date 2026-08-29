# REPO RECONCILIATION MATRIX

Exact old → new for every heritage registry key touched by the project-owned
evidence. **No code is written here.** Each row carries one tag:

`KEEP` · `UPDATE_METADATA` · `UPDATE_LOCATOR` · `UPDATE_EVIDENCE_STATUS` ·
`UPDATE_TEXTUAL_LAYER` · `UPDATE_SOURCE_ATTRIBUTION` · `SPLIT` · `NEW_RECORD` ·
`RECLASSIFY` · `REMOVE` · `PRODUCT_OWNER_DECISION_REQUIRED`

The mechanical rows (`UPDATE_LOCATOR`, `UPDATE_METADATA`, most `NEW_RECORD`) are
carried into [`GEMINI_IMPLEMENTATION_MANIFEST.md`](GEMINI_IMPLEMENTATION_MANIFEST.md).
Rows tagged `PRODUCT_OWNER_DECISION_REQUIRED` go to
[`PRODUCT_OWNER_DECISIONS.md`](PRODUCT_OWNER_DECISIONS.md) and are **not** in the
manifest.

Frozen and **not touched**: `src/heritage/resolver.js`, `schema.js`,
`validator.js`, `connectors.js` field definitions, `constants.js`
(`HERITAGE_CONSTRUCT_IDS` stays exactly six), and every Stage-2 mechanism file.
Every field named below already exists in the schema.

---

## A. `SOURCE_REGISTRY` — `src/reading/provenance.js`

| # | key | field | old | new | tag |
|---|---|---|---|---|---|
| SR-01 | `heritage-five-mountains` | `repository` / `repositoryCommit` / `repositoryFile` / `sha256` / `retrievedAt` / `editionFingerprint` / `sourceAccess` | all `null` / `"NOT_RECORDED"` | `kanripo/KR3g0045` · `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` · `KR3g0045_002.txt` · `bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9` · `2026-08-29T04:49:24Z` · `WYG-Siku` · `STABLE_REMOTE` | `UPDATE_METADATA` |
| SR-01b | `heritage-five-mountains` | `folioLocator` / `folioLocatorStatus` / `folioLocatorKind` | `null` / `NOT_RECORDED` / — | `KR3g0045_WYG_002-17b` / `VERIFIED` / `WYG_PB` | `UPDATE_LOCATOR` |
| SR-02 | `heritage-four-rivers-primary` | same pinning fields | `null` | `kanripo/KR3g0045` · `b3e5b69b…` · `KR3g0045_002.txt` · `bdacf64e…` · `2026-08-29T…` · `WYG-Siku` · `STABLE_REMOTE`; folio `KR3g0045_WYG_002-18a` / `VERIFIED` / `WYG_PB` | `UPDATE_METADATA` + `UPDATE_LOCATOR` |
| SR-03 | `heritage-five-officers` | same pinning fields | `null` | `kanripo/KR3g0045` · `b3e5b69b…` · `KR3g0045_002.txt` · `bdacf64e…`; folio `KR3g0045_WYG_002-18b` / `VERIFIED` / `WYG_PB` | `UPDATE_METADATA` + `UPDATE_LOCATOR` |
| SR-04 | `heritage-three-sections-taiqing` | pinning fields + `sectionLocator` | `sectionLocator: "Juan 6, 身三停 section"`, no pinning | pin `kanripo/KR3g0045` · `b3e5b69b…` · `KR3g0045_006.txt` · `d9ba7fbf…`; folio `KR3g0045_WYG_006-6a` / `VERIFIED` / `WYG_PB`. **Keep the 卷六 sectionLocator** — see SR-05 for the facial split. | `UPDATE_METADATA` + `UPDATE_LOCATOR` |
| SR-05 | *(new)* `heritage-three-sections-taiqing-mianbu` | — | *(does not exist)* | **NEW**: title "Taiqing Shenjian 卷五 論靣部 facial Three Sections"; `kanripo/KR3g0045` · `b3e5b69b…` · `KR3g0045_005.txt` · `b02b8bee…`; `sectionLocator: "卷五 論靣部"`; folio `KR3g0045_WYG_005-7b` / `VERIFIED` / `WYG_PB`; `citationStatus: verified`; `authorshipStatus: ATTRIBUTED_AND_CONTESTED` (王朴, rejected by Siku). Errata E-4. | `NEW_RECORD` |
| SR-06 | `heritage-twelve-palaces-taiqing` | pinning fields | `locator: "卷一·成和子統論（末段）"`, no pinning | pin `kanripo/KR3g0045` · `b3e5b69b…` · `KR3g0045_001.txt` · `c8f0b607…`; folio `KR3g0045_WYG_001-17b` / `VERIFIED` / `WYG_PB`; `citationStatus: edition-recorded → verified` (byte-pinned). Errata E-1. | `UPDATE_METADATA` + `UPDATE_LOCATOR` + `UPDATE_EVIDENCE_STATUS` |
| SR-07 | `heritage-taiqing-juan1-mountains-rivers` | pinning fields + folio | edition-recorded, no folio | pin `KR3g0045_001.txt` · `c8f0b607…`; folio `KR3g0045_WYG_001-6b` / `VERIFIED` / `WYG_PB` (the 五嶽四瀆要相應 clause); `sectionLocatorStatus: RECORDED → VERIFIED` | `UPDATE_METADATA` + `UPDATE_LOCATOR` |
| SR-08 | `heritage-taiqing-form-qise-interaction` | pinning fields | verified, `locator: "卷四「論㸔形神體像」"`, no pinning | pin `KR3g0045_004.txt` · `84231b13…`. **Folio NOT pinned this pass** — the specific 卷四 predicate was not read; `folioLocatorStatus` stays `NOT_RECORDED`. | `UPDATE_METADATA` |
| SR-09 | `heritage-taiqing-juan4-form-shen-reciprocity` | pinning fields | edition-recorded, `sectionLocator: "卷四"` | pin `KR3g0045_004.txt` · `84231b13…`; folio not pinned (`神須形/形須神` clause not read this pass) | `UPDATE_METADATA` |
| SR-10 | `heritage-five-mountains-renlun-datong` | pinning + `authorshipNote` + `textualLayer` | `citationStatus: work-recorded`; `sectionLocator: null`; note says section locator "not yet read" | pin `kanripo/KR3g0046` · `b408ea0b969672a1f52e5ec371f9fe3250976e58` · `KR3g0046_001.txt` · `61234896…`; `sectionLocator: "卷上 五嶽"`; folio `KR3g0046_WYG_001-11a` / `VERIFIED` / `WYG_PB`; `citationStatus: work-recorded → edition-recorded`. **Append to `authorshipNote`:** "commentary layer is **Yuan** (元 薛延年注), the 賦 is Jin (金 張行簡) — a real chronological gap; every 五嶽/四瀆/五官 passage in this file sits inside the parenthesised commentary." Errata E-9. | `UPDATE_METADATA` + `UPDATE_LOCATOR` + `UPDATE_EVIDENCE_STATUS` + `UPDATE_SOURCE_ATTRIBUTION` |
| SR-11 | `heritage-four-rivers-renlun-datong` | pinning + attribution note | `citationStatus: work-recorded`, `locator: null` | pin same repo/commit/file; `sectionLocator: "卷上 四瀆"`; folio `KR3g0046_WYG_001-10b` / `VERIFIED` / `WYG_PB`; same Yuan/Jin note as SR-10. **The mapping (耳=江 口=河 眼=淮 鼻=濟) now agrees byte-for-byte with the two base-text witnesses** → the four-rivers `variant`/`renlun-datong-provisional` lineage in `evidence.js` can move off "provisional / supplies no promotable assignment". | `UPDATE_METADATA` + `UPDATE_LOCATOR` + `UPDATE_EVIDENCE_STATUS` |
| SR-12 | `heritage-four-rivers-renlun-fengjian` | `kind` / `authorshipNote` | `kind: "unresolved-tradition-source"`; note "may be a genre descriptor or a label that entered this project's corpus in error" | `citationStatus` **stays** `source-required`; rewrite note → "A **named textual comparandum**: 人倫風鑑 is cited by name 16× in 太清神鑑 卷一 and 1× in 玉管照神局 卷上 as an interlinear variant-reading witness on the 相說歌 verse, listed alongside 洞𤣥經 and 千字文. Its existence as an independent, now-lost work is plausible (dossier ~85%); **no surviving independent witness has been located**, and it supplies no Four Rivers assignment (its notes are all on the 相說歌 verse). `NAMED_COMPARANDUM_ATTESTED` / `INDEPENDENT_WITNESS_NOT_LOCATED`." Errata E-3. | `UPDATE_METADATA` |
| SR-13 | `heritage-yuebo-dongzhongji-configuration` | pinning + `citationStatus` + `edition` + `sectionLocator` + `authorshipStatus` | `citationStatus: work-recorded`; `edition: null`; `sectionLocator: null`; `authorshipStatus: NOT_RECORDED` | pin `kanripo/KR3g0043` · `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` · `KR3g0043_001.txt` · `0949bfb9…`; `edition: "文淵閣四庫全書 (WYG-Siku)"`; `sectionLocator: "卷上 河嶽"`; folio `KR3g0043_WYG_001-5a` / `VERIFIED` / `WYG_PB`; `citationStatus → edition-recorded`; `authorshipStatus → ANONYMOUS` (闕名; preface a later forgery per Theobald → keep an `authorshipNote`). | `UPDATE_METADATA` + `UPDATE_LOCATOR` + `UPDATE_EVIDENCE_STATUS` + `UPDATE_SOURCE_ATTRIBUTION` |
| SR-14 | *(new)* `heritage-five-forms-yuguan` | — | *(does not exist — 玉管照神局 is absent from `SOURCE_REGISTRY`)* | **NEW**: title "玉管照神局 卷上 (呂洞賓賦) Five Forms like-with-like passage"; `kanripo/KR3g0044` · `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` · `KR3g0044_001.txt` · `17b56dac…`; `sectionLocator: "卷上 呂洞賓賦"`; folio `KR3g0044_WYG_001-4b` / `VERIFIED` / `WYG_PB`; `citationStatus: verified`; `authorshipStatus: ATTRIBUTED_AND_CONTESTED` (南唐 宋齊邱; likely early Song). Errata E-7. | `NEW_RECORD` |
| SR-15 | *(new)* `heritage-three-sections-yuguan` | — | *(does not exist)* | **NEW**: title "玉管照神局 卷下 三停平等 verse"; same repo/commit; `KR3g0044_003.txt` · `3631ca4e…`; `sectionLocator: "卷下 詩曰 (adjacent to 鴿形)"`; folio `KR3g0044_WYG_003-13a` / `VERIFIED` / `WYG_PB`; `citationStatus: verified`. Errata E-5. *(May instead be folded into SR-14 as one `heritage-yuguan-*` record covering both juan — a small editorial call.)* | `NEW_RECORD` |
| SR-16 | `xunzi-feixiang` | `citationStatus` / add a Kanripo-cited-witness note | `citationStatus: work-recorded`; `locator: "非相篇"` | **KEEP** `citationStatus: work-recorded` for the received 非相 text (not retrieved this pass). **Add** an `authorshipNote`: "As *cited within the physiognomy manuals*: 太清神鑑 卷三 `<pb:KR3g0045_WYG_003-2b>` `荀子曰相形不如相心論心不如論徳`; 玉管照神局 卷中 `<pb:KR3g0044_WYG_002-11b>` `荀子曰相形不若相心論心不若論擇術`; 人倫大統賦 卷上 `五官（荀子注…）`. None quotes 非相 verbatim; the manuals adapt it, and disagree on the second clause." Errata E-2. | `UPDATE_METADATA` |
| SR-17 | `heritage-five-elements` (靈樞·陰陽二十五人) | — | `citationStatus: verified` | **KEEP.** Not a Kanripo witness; unaffected by the acquisition. **But** its *role in the Five Forms product definition* is Decision 2 → see DEC-2. | `KEEP` |
| SR-18 | ALL of SR-01..SR-15 (Kanripo surrogates) | `surrogateRights` + rights note | `SURROGATE_RIGHTS_NOT_DECLARED` (or `UNREVIEWED` for new records) | **Product-owner / counsel.** Phase D found an explicit **org-level CC BY-SA 4.0** declaration (not in-surrogate; ShareAlike). Do **not** move to `CLEARED`. Add a rights note per record: "Kanripo org-level CC BY-SA 4.0 declared; not carried in-surrogate; ShareAlike commercial implications unresolved — counsel." | `PRODUCT_OWNER_DECISION_REQUIRED` |

---

## B. `HERITAGE_EVIDENCE` — `src/heritage/evidence.js`

| # | path | old | new | tag |
|---|---|---|---|---|
| EV-01 | `fiveMountains.lineages.taiqing-siku.constituents[*].folioLocator` | `null` (only `sectionLocator`) | `KR3g0045_WYG_002-17b`/`-18a`, `folioLocatorStatus: VERIFIED` | `UPDATE_LOCATOR` |
| EV-02 | `fiveMountains.lineages.taiqing-siku` — lower-face term | `恆嶽` = "Jaw contour" (`heng-yue-second`) | keep 頷; add a note that the northern/lower-face term is **contested across 3 pinned witnesses**: 頥 (月波 卷上), 頷 (太清 卷二), 頦 (人倫 薛注) — this is a `three-term` disagreement, not a two-term one | `UPDATE_METADATA` |
| EV-03 | `fiveMountains.lineages.primary` (`heritage-five-mountains-renlun-datong`) | `evidenceStrength: RECORDED_NOT_VERIFIED`, `runtimeStatus: RESEARCH_ONLY`, "directional runtime wording remains held" | `evidenceStrength → VERIFIED_SECONDARY` (Yuan commentary layer, byte-pinned); directional naming `南/北/東/西/中` now byte-witnessed at `KR3g0046_WYG_001-11a`. **Runtime routing of this lineage is Decision 1** → DEC-1. `runtimeStatus` unchanged pending that. | `UPDATE_EVIDENCE_STATUS` + `UPDATE_TEXTUAL_LAYER` |
| EV-04 | `fiveMountains.lineages.primary.disagreements[five-mountains-northern-region]` | 4 positions (太清 頷, sxqb chin, shenyi zone, 人倫 頦) | add `yuebo-yi` position: 月波 卷上 `頥`, `sourceId: heritage-yuebo-dongzhongji-configuration`, `<pb:KR3g0043_WYG_001-5a>` — now a 5-position disagreement, of which **3 are byte-pinned** (太清 頷, 人倫 頦, 月波 頥) | `UPDATE_METADATA` |
| EV-05 | `threeSections.lineages` | has `sxqb-mingdu`, `common-transmitted`, `mayi-ten-observations`, `taiqing-section-heading` (卷六 body) | **NEW lineage** `taiqing-mianbu-facial` — `sourceId: heritage-three-sections-taiqing-mianbu` (SR-05); `evidenceKind: POSITIVE_CLAIM`; `evidenceStrength: VERIFIED_PRIMARY`; `measurementAvailability: SUPPORTED_2D` (facial boundaries ARE measurable, unlike the 卷六 body construct); constituents `upper` (髪際→眉間), `middle` (眉間→鼻凖), `lower` (凖人中→頰); `folioLocator: KR3g0045_WYG_005-7b`. Kept structurally distinct from the 卷六 `taiqing-section-heading` body lineage. Errata E-4. | `NEW_RECORD` (+`SPLIT` in effect: 太清 三停 is now two lineages) |
| EV-06 | `threeSections.lineages.taiqing-section-heading` | `measurementAvailability: UNSUPPORTED`, "must not be cited as support for the equality combination" | **KEEP** — the 卷六 body construct is genuinely unmeasurable by a face scanner. Add `folioLocator: KR3g0045_WYG_006-6a` / `VERIFIED`; `evidenceStrength: RECORDED_NOT_VERIFIED → VERIFIED_PRIMARY` (byte-pinned). Predicate confirmed: ranked (`上停長者大吉昌…`) + `又云身三停相稱` secondary. | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| EV-07 | `threeSections` — 玉管 平等 | not present | **NEW lineage / position** `yuguan-pingdeng` — `sourceId: heritage-three-sections-yuguan` (SR-15); `三停平等能和美`; `evidenceStrength: VERIFIED_PRIMARY`; folio `KR3g0044_WYG_003-13a`; domain unspecified (verse). Add to a `three-sections-predicate` disagreement (相稱 vs 平等). Errata E-5. | `NEW_RECORD` |
| EV-08 | `fiveOfficers.primary.constituents` | 目=鑒察官 with `監察官` as an **orthographic alias**; `philtrum-longevity-office` parked in `unverifiedClaims` | **RECLASSIFY** as a genuine lineage disagreement: 人倫大統賦 (薛注) is byte-witnessed with **four of five titles differing** — 監察官 (not an alias — the whole set differs), 審聽官, 嗅臭官, 出納官, 人中為保夀官, in an **ordered** enumeration (一口二鼻三耳四目五人中). Add a `fiveOfficers` lineage `renlun-xue` and a `five-officers-titles` disagreement. `philtrum-longevity-office` moves from `unverifiedClaims` to a witnessed position (人中為保夀官, `<pb:KR3g0046_WYG_001-11a>`). Errata / atlas `five-officers-titles`. | `RECLASSIFY` + `NEW_RECORD` |
| EV-09 | `fiveOfficers.primary` folio | `sectionLocator: "「五官」; 卷二 (Siku)"`, no folio | `folioLocator: KR3g0045_WYG_002-18b` / `VERIFIED`; `evidenceStrength → VERIFIED_PRIMARY` byte-pinned | `UPDATE_LOCATOR` + `UPDATE_EVIDENCE_STATUS` |
| EV-10 | `fourRivers.lineages.primary.constituents` | 卷二 (Siku), no folio | `folioLocator: KR3g0045_WYG_002-18a` / `VERIFIED`; mapping 耳=江 口=河 目=淮 鼻=濟 byte-confirmed | `UPDATE_LOCATOR` |
| EV-11 | `fourRivers.lineages.renlun-datong-provisional` | "provisional … supplies no promotable assignment yet" | 人倫 薛注 mapping 耳=江 口=河 眼=淮 鼻=濟 **byte-confirmed, agrees with the base-text witnesses**; folio `KR3g0046_WYG_001-10b`; `evidenceStrength → VERIFIED_SECONDARY` (Yuan commentary). No longer "provisional". | `UPDATE_EVIDENCE_STATUS` |
| EV-12 | `fourRivers.lineages.primary` — add Shen + 相朝 relations | not present in the lineage record | note the two genuine Taiqing 卷二 relations now pinned: `四瀆→相朝` (`地之四瀆者所以相朝以接其流通`) and `四瀆→應於神` (`則應於神`). These are already connectors (`four-rivers-shen-corresponds`); cross-reference. **Do not operationalise Shen** (`shen-unmeasurable` negative rule stands). | `UPDATE_METADATA` |
| EV-13 | `twelvePalaces.lineages.taiqing-yuguan` | `evidenceStrength: VERIFIED_SECONDARY`, `runtimeStatus: HERITAGE_ONLY`, `measurementAvailability: NOT_RECORDED` | `evidenceStrength → VERIFIED_PRIMARY` (byte-pinned base text of 太清 卷一, passageId `tq-j1-shierdgong`); `folioLocator: KR3g0045_WYG_001-17b` / `VERIFIED` on every constituent. **Runtime status of the *construct* is Decision 3** → DEC-3. The received-Mayi mapping stays `sxqb-discovery-surrogate` / RESEARCH_ONLY. Errata E-1. | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| EV-14 | `twelvePalaces.lineages.primary.note` | "the previously claimed Twelve Palaces Discussion locator is absent" | append: "The 十二宫 *system* IS byte-pinned in 太清神鑑 卷一 (`tq-j1-shierdgong`; 宮 normalised to 宫 in Kanripo). What remains `SOURCE_REQUIRED` is specifically the received-Mayi/神相全編 constituent mapping (財帛宮 = nose; presence of 田宅宮). Negative tests must search **both** 宮 and 宫." | `UPDATE_METADATA` |
| EV-15 | `fiveElements.primary` — 25-type semantics | `permittedHeritageSemantics: "Describe the five named forms and the source's twenty-five-type structure as attributed historical material only."`; `sectionLocator: "靈樞 第六十四·陰陽二十五人"` | **Product-owner (Decision 2).** The 25-type structure is 靈樞's (medical), not physiognomic — confirmed absent from all 4 Kanripo witnesses. Options: (a) keep, attributing 25-type explicitly to 靈樞 as a *separate medical parallel*; (b) separate the physiognomic Five Forms construct from the 靈樞 system. Do **not** delete the 靈樞 evidence. | `PRODUCT_OWNER_DECISION_REQUIRED` |
| EV-16 | `fiveElements` — 玉管 似X得X | not present | **NEW**: a `fiveElements` lineage / related record `yuguan-like-with-like` — `sourceId: heritage-five-forms-yuguan` (SR-14); `似金得金…似土得土` five like-with-like pairs; `evidenceStrength: VERIFIED_PRIMARY`; folio `KR3g0044_WYG_001-4b`; `measurementAvailability: MODERN_MAPPING_UNSUPPORTED`. Explicitly **not** generation/overcoming/25-type. Errata E-7. | `NEW_RECORD` |

---

## C. `HERITAGE_CONNECTOR_REGISTRY` — `src/heritage/registry.js`

| # | connectorId | old | new | tag |
|---|---|---|---|---|
| CR-01 | `five-mountains-mutual-facing-fullness` | one `COLLECTIVE_RULE`, `sourceText: "五嶽須要豐隆而相朝"`, `sourceId: heritage-five-mountains`, `evidenceStrength: RECORDED_NOT_VERIFIED` | **SPLIT into two** (errata E-8): `five-mountains-mutual-facing` (相朝; `MULTIPLE_WITNESSES_SAME_RELATION`; `supportingSourceIds` = 太清 卷二 + 月波 卷上; passageIds `tq-j2-wuyue`, `yb-j1-heyue`; `evidenceStrength: VERIFIED_PRIMARY`) and `five-mountains-fullness` (豐隆; 太清 卷二 + 人倫 薛注; passageIds `tq-j2-wuyue`, `rl-j1-wuyue`; `VERIFIED_PRIMARY`). Both `folioLocatorKind: WYG_PB`, `folioLocatorStatus: VERIFIED`. `runtimePolicy` unchanged (`HERITAGE_PRESENTATION_ALLOWED`) — but see DEC-1 for whether either becomes visible through Stage 3. | `SPLIT` + `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| CR-02 | `four-rivers-flow-and-banks` | `sourceId: heritage-four-rivers-primary`, `sourceText: null`, `RECORDED_NOT_VERIFIED` | `sourceText: "四瀆欲得端直清大眀浄流暢涯岸成就"`; `evidenceStrength → VERIFIED_PRIMARY`; folio `KR3g0045_WYG_002-18a` / `VERIFIED` / `WYG_PB`; passageId `tq-j2-sidu` | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| CR-03 | *(new)* `four-rivers-mutual-facing` | — | **NEW** (errata E-8): 相朝 applied to the rivers — 太清 卷二 `地之四瀆者所以相朝以接其流通`; `VERIFIED_PRIMARY`; folio `KR3g0045_WYG_002-18a`; passageId `tq-j2-sidu`. Prior dossier + repo treated 相朝 as mountains-only. | `NEW_RECORD` |
| CR-04 | `five-mountains-four-rivers-corresponds` | `sourceId: heritage-taiqing-juan1-mountains-rivers`, `sectionLocatorStatus: RECORDED`, `RECORDED_NOT_VERIFIED`, `runtimePolicy: RESEARCH_ONLY` | `sectionLocatorStatus → VERIFIED`; `folioLocator: KR3g0045_WYG_001-6b` / `VERIFIED` / `WYG_PB`; `evidenceStrength → VERIFIED_PRIMARY`; `sourceText: "五嶽四瀆要相應"` confirmed (note the `¶` split between 相 and 應); passageId `tq-j1-miaojue-xiangying`. Keep the note against merging Three Sections into this connector. | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| CR-05 | `four-rivers-shen-corresponds` | already `VERIFIED_PRIMARY`, `sectionLocatorStatus: VERIFIED` | add `folioLocator: KR3g0045_WYG_002-18a` / `VERIFIED` / `WYG_PB`; passageId `tq-j2-sidu`. Otherwise KEEP (`則應於神` byte-confirmed; Shen stays unmeasurable/RESEARCH_ONLY). | `UPDATE_LOCATOR` |
| CR-06 | `five-officers-one-good-office-ten-years` | `sourceText: "一官好則貴十年"`, `RECORDED_NOT_VERIFIED`, `SOURCE_PANEL_ONLY` | `evidenceStrength → VERIFIED_PRIMARY`; `sourceText` byte-confirms as `或一官好則貴十年或有缺陷者及醜惡者㐫`; folio `KR3g0045_WYG_002-18b` / `VERIFIED` / `WYG_PB`; passageId `tq-j2-wuguan`. `SOURCE_PANEL_ONLY` unchanged (fortune-typed). | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| CR-07 | `yuebo-mountains-rivers-form-shen-configuration` | `sourceId: heritage-yuebo-dongzhongji-configuration`, `RECORDED_NOT_VERIFIED`, no locator | `sourceText: "凡相人靣五嶽欲其相朝四瀆欲其不混形神備足"` byte-confirmed; `evidenceStrength → VERIFIED_PRIMARY`; folio `KR3g0043_WYG_001-5a` / `VERIFIED` / `WYG_PB`; `sectionLocator: "卷上 河嶽"` / `VERIFIED`; passageId `yb-j1-heyue`. | `UPDATE_EVIDENCE_STATUS` + `UPDATE_LOCATOR` |
| CR-08 | `five-forms-generative-overcoming-system` | `sourceId: heritage-five-elements-taiqing` (太清 卷四「五形」), `sourceTextStatus: NOT_RECORDED`, note claims 相生/相尅 | **KEEP as-is** — the 太清 卷四 相生/相尅 predicate was **not read** this pass; it stays `RECORDED_NOT_VERIFIED` / `RESEARCH_ONLY` / `sourceTextStatus: NOT_RECORDED`. **Do NOT** attach the 玉管 `似X得X` passage here. Errata E-7. | `KEEP` |
| CR-09 | *(new)* `five-forms-like-with-like` | — | **NEW** (errata E-7): 玉管照神局 卷上 呂洞賓賦 `似金得金…似土得土` (five like-with-like pairs, one outcome each); `sourceId: heritage-five-forms-yuguan` (SR-14); `evidenceStrength: VERIFIED_PRIMARY`; folio `KR3g0044_WYG_001-4b` / `VERIFIED` / `WYG_PB`; passageId `yg-j1-wuxingxing`; `measurementAvailability: MODERN_MAPPING_UNSUPPORTED`; `prohibitedForUserInference: true` (rank/character predicates). Note: NOT 相生/相尅, NOT a 5×5 grid, NOT 25 types. | `NEW_RECORD` |
| CR-10 | *(new)* `three-sections-facial-proportion-taiqing` | — | **NEW** (errata E-4): 太清 卷五 論靣部 `三停皆稱乃上相之人矣` + per-section 主貴/主壽/主富; `sourceId: heritage-three-sections-taiqing-mianbu` (SR-05); `VERIFIED_PRIMARY`; folio `KR3g0045_WYG_005-7b`/`-8a`; passageId `tq-j5-mianbu-santing`; `measurementAvailability: SUPPORTED_2D`; `prohibitedForUserInference: true`. Distinct from the body 卷六 material. | `NEW_RECORD` |
| CR-11 | `three-sections-equality-mayi-received` | `sourceId: heritage-three-sections`, `RECORDED_NOT_VERIFIED`, `RESEARCH_ONLY` | **KEEP** — the received Ma Yi equality maxim is still unpinned (神相全編/麻衣 not in the corpus). **But add a cross-reference**: 玉管照神局 卷下 now supplies a byte-pinned `三停平等` verse (`yg-j3-santing-pingdeng`) — this does NOT promote the Ma Yi maxim, but it does mean 平等 is not a Ma Yi-exclusive predicate (errata E-5). | `KEEP` + `UPDATE_METADATA` |
| CR-12 | *(new)* `renlunfengjian-collation-aggregate` | — | **NEW / from atlas** (errata E-9): a `SOURCE_CRITICISM_AGGREGATE` recording that 太清神鑑 卷一 cites 人倫風鑑 16× as an interlinear variant witness. `evidenceStrength: VERIFIED_SECONDARY`; `sourceId: heritage-four-rivers-renlun-fengjian` (or a renamed `heritage-renlun-fengjian`); `runtimePolicy: RESEARCH_ONLY`; backed by `passageIds` not one range locator. Optional — could stay atlas-only. | `NEW_RECORD` (optional) |

---

## D. `HERITAGE_DISAGREEMENT_REGISTRY` — `src/heritage/registry.js`

| # | disagreementId | old | new | tag |
|---|---|---|---|---|
| DR-01 | `five-mountains-northern-region` | 4 positions | add `yuebo-yi` (月波 卷上 頥, byte-pinned `<pb:KR3g0043_WYG_001-5a>`); mark which 3 are byte-pinned (太清 頷, 人倫 頦, 月波 頥). | `UPDATE_METADATA` |
| DR-02 | `four-rivers-eye-mouth` | primary (太清) vs `sxqb-shoujuan-xiangshuo` variant | add that the primary position is now witnessed by **3 pinned witnesses that agree** (太清 卷二, 月波 卷上, 人倫 薛注); the 麻衣 eye/mouth swap remains **unpinned** and `RECORDED_NOT_VERIFIED` — do not resolve on evidential-availability grounds. | `UPDATE_METADATA` |
| DR-03 | *(new)* `five-officers-titles` | — | **NEW**: 太清 卷二 (鑒察/審辨/出納/採聽/保夀官, member 眉) vs 人倫 薛注 (監察/審聽/嗅臭/出納/保夀官, member 人中, ordered 一口二鼻三耳四目五人中). 4 of 5 titles differ. Both byte-pinned (`tq-j2-wuguan`, `rl-j1-wuguan`). Supersedes the "orthographic alias" framing in `evidence.js`. Errata / EV-08. | `NEW_RECORD` |
| DR-04 | *(new)* `three-sections-predicate` | — | **NEW**: 相稱 (太清 卷一/五/六 — 3 internal witnesses) vs 平等 (玉管 卷下 — 1); and facial (卷五) vs body (卷六) domain. `nature: PREDICATE`. Errata E-4/E-5. | `NEW_RECORD` |
| DR-05 | `twelve-palaces-constituents` / `twelve-palaces-twelfth-slot` | OPEN, position `taiqing-yuguan` / `appearance-palace` | KEEP OPEN. `taiqing-yuguan` position `evidenceStrength → VERIFIED_PRIMARY` (byte-pinned, `tq-j1-shierdgong`); the *competing* received-Mayi position stays unpinned. | `UPDATE_EVIDENCE_STATUS` |

---

## E. `HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY` — `src/heritage/negative-relationships-registry.js`

| # | negativeRuleId | old | new | tag |
|---|---|---|---|---|
| NR-01 | `no-five-forms-five-phases-conflation` | `evidenceStrength: VERIFIED_PRIMARY`, `sourceIds: [heritage-five-elements-taiqing]`, note "太清神鑑 places 五行所生 and 五形 in separate sections" | **KEEP.** The separation is corroborated by the byte-level finding that no Kanripo physiognomic witness contains a 25-type / 五行×五音 structure (that is 靈樞's). Optionally add `heritage-five-forms-yuguan` to `sourceIds` and note the 玉管 `似X得X` like-with-like is also **not** the Five Phases cycle. | `KEEP` (+ optional `UPDATE_METADATA`) |
| NR-02 | `no-modern-geometry-mapping` | `CORROBORATED_NOT_VERIFIED` | KEEP. Unchanged — no new modern-taxonomy evidence. | `KEEP` |
| NR-03 | `no-qise-to-form-classification`, `shen-unmeasurable`, `no-zwds-import`, `no-three-sections-five-forms-promotion` | product-governance invariants, `ABSTAINED` | KEEP all. The `no-three-sections-five-forms-promotion` rule is *reinforced*: the 太清 卷四「五形」 and 卷五 論靣部 三停 sections are adjacent in the same juan-neighbourhood, and adjacency still must not be promoted. | `KEEP` |

---

## F. `HERITAGE_COMPOSITION_POLICIES` — `src/heritage/composition-policies-registry.js`

| # | policyId | old | new | tag |
|---|---|---|---|---|
| CP-01 | `sources-shown-beside-one-another` | one `EDITORIAL_JUXTAPOSITION` policy, `maxItems: 3` | **KEEP.** No change from the evidence. The V2 atlas's new parallel witnesses (5-position northern-region, 4-of-5 five-officers) are *disagreements*, which have their own render path — not editorial juxtapositions. | `KEEP` |

---

## G. `HERITAGE_CONCEPT_REGISTRY` — `src/heritage/concepts.js`

| # | conceptId | old | new | tag |
|---|---|---|---|---|
| CN-01 | `form`, `shen`, `heritageQiSe` | 3 concepts, all `modernMeasurementBinding: null` | **KEEP all three, unchanged.** `HERITAGE_CONSTRUCT_IDS` stays exactly six. The `四瀆→應於神` and `神須形/形須神` relations are byte-pinned but Shen stays `UNMEASURABLE` and unbound (`shen-unmeasurable` rule). | `KEEP` |

---

## Summary of tags

| tag | count | notes |
|---|--:|---|
| `KEEP` | 8 | negative rules, concepts, policy, CR-08, SR-17 |
| `UPDATE_METADATA` | ~14 | pin repo/commit/sha/retrievedAt/editionFingerprint on existing source records |
| `UPDATE_LOCATOR` | ~13 | `folioLocator` + `folioLocatorKind: WYG_PB` + `folioLocatorStatus: VERIFIED` |
| `UPDATE_EVIDENCE_STATUS` | ~10 | `RECORDED_NOT_VERIFIED`/`VERIFIED_SECONDARY` → `VERIFIED_PRIMARY` on byte-pinned rows |
| `UPDATE_SOURCE_ATTRIBUTION` | 3 | Yuan/Jin split on KR3g0046; 月波 anonymity; Xunzi-as-cited note |
| `UPDATE_TEXTUAL_LAYER` | 2 | 人倫 rows = Yuan commentary layer |
| `NEW_RECORD` | ~10 | SR-05, SR-14, SR-15; EV-05, EV-07, EV-08(part), EV-16; CR-03, CR-09, CR-10, (CR-12 optional); DR-03, DR-04 |
| `SPLIT` | 2 | CR-01 (mutual-facing / fullness); 太清 三停 (facial / body) |
| `RECLASSIFY` | 1 | EV-08 five-officers alias → disagreement |
| `REMOVE` | 1 | `qise-shen-cojuan-taiqing` (already done in dossier §5; confirmed) |
| `PRODUCT_OWNER_DECISION_REQUIRED` | 4 | SR-18 (rights), EV-15 (25-type / Decision 2), EV-03/EV-13 runtime routing (Decisions 1 & 3) |
