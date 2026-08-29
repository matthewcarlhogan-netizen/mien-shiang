# GEMINI IMPLEMENTATION MANIFEST

Mechanical encoding tasks for Gemini 2.5 Flash. **Every value needed is here or
in a named data file.** Gemini must NOT: interpret Chinese, choose between
witnesses, decide what a relation means, decide safety policy, decide lineage
routing, or infer whether a claim is active. If a task below seems to need any of
that, STOP — it is mis-specified, report back.

## Ground rules

- Branch off `main` (this branch, `research/project-owned-kanripo-evidence`, or a
  fresh one). **Do NOT merge PR #40. Do NOT modify** `src/heritage/resolver.js`,
  `schema.js`, `validator.js`, `connectors.js` field defs, `constants.js`,
  `composition.js`, `heritage-connections.js`, or any Stage-2 mechanism file.
- Every schema field used below **already exists** — no schema changes.
- Canonical data:
  - [`docs/heritage-evidence/PROJECT_OWNED_PINNED_PASSAGES.csv`](PROJECT_OWNED_PINNED_PASSAGES.csv) — passageId → (repo, commit, fileSha256, filePath, juan, section, pbMarker, textualLayer)
  - [`docs/heritage-evidence/CORRECTED_RELATIONSHIP_ATLAS_V2.csv`](CORRECTED_RELATIONSHIP_ATLAS_V2.csv) — relationshipId → passageIds
  - [`docs/heritage-evidence/acquisition-verify.json`](acquisition-verify.json) — hashes, commits, marker counts
- **Do NOT run the acquisition yourself** — re-run `scripts/heritage-evidence/acquire-and-verify.mjs` to confirm `exit 0` and that's it.
- The pinning constants:

| repo | commit | files → SHA-256 |
|---|---|---|
| `KR3g0043` `https://github.com/kanripo/KR3g0043` | `f69732902fc82fb6b1f759cb7bf5a910c0b903a3` | `KR3g0043_001.txt` `0949bfb991e41969459bb33d18486afb1af75c1c317c013f12792a9fc8647d87` · `KR3g0043_002.txt` `2a8081bd08e903fbe4663fa6ff07e4cd79e4469653f4d32644d84062e30c3251` |
| `KR3g0044` `https://github.com/kanripo/KR3g0044` | `0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74` | `KR3g0044_001.txt` `17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3` · `KR3g0044_002.txt` `3552be8d0e553471250d5a4fd6f21e3f454ebffd8249c027d744cda0e4f8c5cc` · `KR3g0044_003.txt` `3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2` |
| `KR3g0045` `https://github.com/kanripo/KR3g0045` | `b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5` | `KR3g0045_001.txt` `c8f0b607e00a9e2d02bf788dc2c6c820714351228f8ec820cbf389861ea0ed3c` · `KR3g0045_002.txt` `bdacf64e6dbd7dc9f9a4058137b057355862a65b3227e79b8cd8afef443492a9` · `KR3g0045_003.txt` `fd37503591c2a4cf1c8f0d3926122c9c2f0cff84119ca064b4c09bd52e98357b` · `KR3g0045_004.txt` `84231b131823701455abf6ce63bad56c6638c5c15b5d6b0730dfd710a01f8d47` · `KR3g0045_005.txt` `b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7` · `KR3g0045_006.txt` `d9ba7fbfe9c6422a5cec36ae134d693d95cc7cfd036674bddf3996aab6a7ca35` |
| `KR3g0046` `https://github.com/kanripo/KR3g0046` | `b408ea0b969672a1f52e5ec371f9fe3250976e58` | `KR3g0046_001.txt` `61234896eb42479e01e9629042564137a64fdf465c459a4e8d7da2437adada2f` |

- Common values for every record below: `editionFingerprint = "WYG-Siku"`,
  `retrievedAt = "2026-08-29T04:49:24Z"`, `sourceAccess = "STABLE_REMOTE"`,
  `folioLocatorKind = "WYG_PB"`, `folioLocatorStatus = "VERIFIED"`.
- **NOT in this manifest** (product-owner decisions — see `PRODUCT_OWNER_DECISIONS.md`):
  matrix rows SR-18 (rights), EV-15 (25-type), EV-03/EV-13 runtime routing.
  Also NOT here: `ABSTRACT_LINEAGE_OVERRIDES` (stays `{}`), any `safetyPassed`
  change, any connector `runtimePolicy` promotion to `ACTIVE`.

---

## GROUP 1 — pin existing `SOURCE_REGISTRY` records — `src/reading/provenance.js`

For each key: set `repository`, `repositoryCommit`, `repositoryFile`, `sha256`,
`retrievedAt`, `editionFingerprint`, `sourceAccess`, and add
`folioLocator` + `folioLocatorStatus` (+ `folioLocatorKind`). Do **not** change
`citationStatus` except where noted. Do **not** change `surrogateRights` (SR-18,
deferred).

**`sha256` and `repositoryCommit` come from the "pinning constants" table above,
keyed by `repositoryFile` — copy them verbatim from there, do not retype from
memory.** Every row also gets `editionFingerprint: "WYG-Siku"`,
`retrievedAt: "2026-08-29T04:49:24Z"`, `sourceAccess: "STABLE_REMOTE"`,
`folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"`.

| matrix | key | repository / repositoryFile | folioLocator | also |
|---|---|---|---|---|
| SR-01 | `heritage-five-mountains` | `kanripo/KR3g0045` / `KR3g0045_002.txt` | `KR3g0045_WYG_002-17b` | — |
| SR-02 | `heritage-four-rivers-primary` | `kanripo/KR3g0045` / `KR3g0045_002.txt` | `KR3g0045_WYG_002-18a` | — |
| SR-03 | `heritage-five-officers` | `kanripo/KR3g0045` / `KR3g0045_002.txt` | `KR3g0045_WYG_002-18b` | — |
| SR-04 | `heritage-three-sections-taiqing` | `kanripo/KR3g0045` / `KR3g0045_006.txt` | `KR3g0045_WYG_006-6a` | keep `sectionLocator: "Juan 6, 身三停 section"` |
| SR-06 | `heritage-twelve-palaces-taiqing` | `kanripo/KR3g0045` / `KR3g0045_001.txt` | `KR3g0045_WYG_001-17b` | `citationStatus: "edition-recorded" → "verified"` |
| SR-07 | `heritage-taiqing-juan1-mountains-rivers` | `kanripo/KR3g0045` / `KR3g0045_001.txt` | `KR3g0045_WYG_001-6b` | `sectionLocatorStatus: "RECORDED" → "VERIFIED"` |
| SR-08 | `heritage-taiqing-form-qise-interaction` | `kanripo/KR3g0045` / `KR3g0045_004.txt` | *(leave `folioLocator: null`, `folioLocatorStatus: "NOT_RECORDED"`)* | — |
| SR-09 | `heritage-taiqing-juan4-form-shen-reciprocity` | `kanripo/KR3g0045` / `KR3g0045_004.txt` | *(leave null / NOT_RECORDED)* | — |
| SR-10 | `heritage-five-mountains-renlun-datong` | `kanripo/KR3g0046` / `KR3g0046_001.txt` | `KR3g0046_WYG_001-11a` | `sectionLocator: null → "卷上 五嶽"`; `citationStatus: "work-recorded" → "edition-recorded"`; append to `authorshipNote` **exactly**: `" The commentary layer is Yuan (元 薛延年注); the 賦 is Jin (金 張行簡) — a real chronological gap. In this WYG transcription every 五嶽/四瀆/五官 passage sits inside the parenthesised commentary and is therefore Yuan commentary, not the Jin 賦."` |
| SR-11 | `heritage-four-rivers-renlun-datong` | `kanripo/KR3g0046` / `KR3g0046_001.txt` | `KR3g0046_WYG_001-10b` | `sectionLocator: null → "卷上 四瀆"`; `citationStatus: "work-recorded" → "edition-recorded"`; same `authorshipNote` append as SR-10 |
| SR-13 | `heritage-yuebo-dongzhongji-configuration` | `kanripo/KR3g0043` / `KR3g0043_001.txt` | `KR3g0043_WYG_001-5a` | `edition: null → "文淵閣四庫全書 (WYG-Siku)"`; `sectionLocator: null → "卷上 河嶽"`; `citationStatus: "work-recorded" → "edition-recorded"`; `authorshipStatus: "NOT_RECORDED" → "ANONYMOUS"`; `authorshipNote` (new): `"闕名 (anonymous). Per Ulrich Theobald the preface is a later forgery; the core may be pre-Song. Attribution uncertain."` |
| SR-16 | `xunzi-feixiang` | *(no repositoryFile — stays a received-text record, not retrieved)* | — | add `authorshipNote` **exactly**: `"As cited within the physiognomy manuals (received 非相 text not retrieved this pass): 太清神鑑 卷三 <pb:KR3g0045_WYG_003-2b> 荀子曰相形不如相心論心不如論徳; 玉管照神局 卷中 <pb:KR3g0044_WYG_002-11b> 荀子曰相形不若相心論心不若論擇術; 人倫大統賦 卷上 五官（荀子注司主也又識也）. None quotes 非相 verbatim; the two manuals disagree on the second clause (論徳 vs 論擇術)."` — leave `citationStatus: "work-recorded"` |

**Test:** extend `tests/heritage/*.test.js` (or add
`tests/heritage/project-owned-pinning.test.js`) asserting each key above now has
`repositoryCommit === "<the commit>"`, `sha256 === "<the hash>"`, and (where set)
`folioLocatorStatus === "VERIFIED"`.

---

## GROUP 2 — new `SOURCE_REGISTRY` records — `src/reading/provenance.js`

Add these keys to `RAW_SOURCE_REGISTRY`. Use `translationStatus: "original-to-this-project"`.

### `heritage-three-sections-taiqing-mianbu` (matrix SR-05, errata E-4)
```
title: "Taiqing Shenjian 卷五 論靣部 facial Three Sections"
kind: "historical-primary-text"
edition: "欽定四庫全書文淵閣本"
repository: "kanripo/KR3g0045"
repositoryCommit: "b3e5b69beb95f575bb47e9eaed1e6aadd23bffe5"
repositoryFile: "KR3g0045_005.txt"
sha256: "b02b8bee6fd5cbabe98f0e064f3487d3585019e10b0b5fe1efcb559f46d33dc7"
retrievedAt: "2026-08-29T04:49:24Z"
editionFingerprint: "WYG-Siku"
sourceAccess: "STABLE_REMOTE"
sectionLocator: "卷五 論靣部"
sectionLocatorStatus: "VERIFIED"
folioLocator: "KR3g0045_WYG_005-7b"
folioLocatorStatus: "VERIFIED"
folioLocatorKind: "WYG_PB"
citationStatus: CITATION_STATUS.VERIFIED
rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE
surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED"    // SR-18 will revisit
authorshipStatus: "ATTRIBUTED_AND_CONTESTED"
authorshipNote: "A Song-era text attributed in later witnesses to Wang Pu; the Siku editors rejected that attribution. This is the FACIAL Three Sections definition (卷五 論靣部), distinct from the BODY 身三停 of 卷六 (heritage-three-sections-taiqing)."
```

### `heritage-five-forms-yuguan` (matrix SR-14, errata E-7)
```
title: "玉管照神局 卷上 (呂洞賓賦) Five Forms like-with-like passage"
kind: "historical-primary-text"
edition: "欽定四庫全書文淵閣本"
repository: "kanripo/KR3g0044"
repositoryCommit: "0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74"
repositoryFile: "KR3g0044_001.txt"
sha256: "17b56dac2b3946af53707a20cecb42e956eff7a88b8e9b806a35ea19f95ad9f3"
retrievedAt: "2026-08-29T04:49:24Z"
editionFingerprint: "WYG-Siku"
sourceAccess: "STABLE_REMOTE"
sectionLocator: "卷上 呂洞賓賦"
sectionLocatorStatus: "VERIFIED"
folioLocator: "KR3g0044_WYG_001-4b"
folioLocatorStatus: "VERIFIED"
folioLocatorKind: "WYG_PB"
citationStatus: CITATION_STATUS.VERIFIED
rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE
surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED"
authorshipStatus: "ATTRIBUTED_AND_CONTESTED"
authorshipNote: "Attributed 南唐 宋齊邱; likely early Song. Attribution uncertain. This passage is 似X得X (like-with-like: an element-resembling form obtaining that same element, one outcome each — five pairs). It is NOT generation (相生), overcoming (相尅), a 5×5 grid, or a 25-type structure."
```

### `heritage-three-sections-yuguan` (matrix SR-15, errata E-5)
```
title: "玉管照神局 卷下 三停平等 verse"
kind: "historical-primary-text-verse"
edition: "欽定四庫全書文淵閣本"
repository: "kanripo/KR3g0044"
repositoryCommit: "0fa9edb26dc77e9068a7dbf8af9ce6844ea96d74"
repositoryFile: "KR3g0044_003.txt"
sha256: "3631ca4efadab24550d72543b2d282627f67ebe0b48dc855977e65479994abd2"
retrievedAt: "2026-08-29T04:49:24Z"
editionFingerprint: "WYG-Siku"
sourceAccess: "STABLE_REMOTE"
sectionLocator: "卷下 詩曰 (adjacent to 鴿形)"
sectionLocatorStatus: "VERIFIED"
folioLocator: "KR3g0044_WYG_003-13a"
folioLocatorStatus: "VERIFIED"
folioLocatorKind: "WYG_PB"
citationStatus: CITATION_STATUS.VERIFIED
rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE
surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED"
authorshipStatus: "ATTRIBUTED_AND_CONTESTED"
authorshipNote: "Attributed 南唐 宋齊邱; likely early Song. Verse text 三停平等能和美; domain unspecified. 平等 here is NOT a Ming/麻衣-exclusive predicate — 玉管照神局 is a Southern Tang / early Song Siku witness."
```

*(SR-15 MAY be folded into SR-14 as one `heritage-yuguan-*` record spanning both
juan — a small editorial call; if folded, use `repositoryFile` covering both and
keep both folio references in a note. Default: keep them separate as above.)*

**Test:** `tests/heritage/project-owned-pinning.test.js` — assert the three new
keys exist, resolve through `SOURCE_REGISTRY`, and carry `citationStatus:
"verified"` + `folioLocatorStatus: "VERIFIED"`.

---

## GROUP 3 — `HERITAGE_EVIDENCE` — `src/heritage/evidence.js`

### 3a. Locator/status updates on existing lineages (mechanical)

| matrix | path | change |
|---|---|---|
| EV-01 | `fiveMountains.lineages["taiqing-siku"].constituents[*]` | on each constituent add `folioLocator: "KR3g0045_WYG_002-17b"`, `folioLocatorStatus: "VERIFIED"` (schema `constituent()` supports `folioLocator`) |
| EV-06 | `threeSections.lineages["taiqing-section-heading"]` | add `folioLocator: "KR3g0045_WYG_006-6a"`; `evidenceStrength: "RECORDED_NOT_VERIFIED" → "VERIFIED_PRIMARY"` |
| EV-09 | `fiveOfficers.lineages.primary.constituents[*]` | add `folioLocator: "KR3g0045_WYG_002-18b"`, `folioLocatorStatus: "VERIFIED"`; lineage `evidenceStrength` already `VERIFIED_PRIMARY` — no change |
| EV-10 | `fourRivers.lineages.primary.constituents[*]` | add `folioLocator: "KR3g0045_WYG_002-18a"`, `folioLocatorStatus: "VERIFIED"` |
| EV-11 | `fourRivers.lineages["renlun-datong-provisional"]` | `evidenceStrength: "RECORDED_NOT_VERIFIED" → "VERIFIED_SECONDARY"`; add `folioLocator: "KR3g0046_WYG_001-10b"`; replace `definition` (currently "supplies no promotable assignment yet") with: `"人倫大統賦 薛延年注 (Yuan commentary layer) Four Rivers mapping: 耳=江 口=河 眼=淮 鼻=濟 — byte-verified and in agreement with both base-text witnesses."` |
| EV-13 | `twelvePalaces.lineages["taiqing-yuguan"]` | `evidenceStrength: "VERIFIED_SECONDARY" → "VERIFIED_PRIMARY"`; on the lineage and each constituent add `folioLocator: "KR3g0045_WYG_001-17b"`, `folioLocatorStatus: "VERIFIED"` |

### 3b. Note/text updates (verbatim strings)

| matrix | path | append/replace |
|---|---|---|
| EV-02 | `fiveMountains.lineages["taiqing-siku"].note` | append: `" The lower-face / northern-mountain term is contested across three byte-pinned witnesses: 頥 (月波洞中記 卷上, <pb:KR3g0043_WYG_001-5a>), 頷 (太清神鑑 卷二, this record), 頦 (人倫大統賦 薛注, <pb:KR3g0046_WYG_001-11a>)."` |
| EV-14 | `twelvePalaces.lineages.primary.note` | append: `" The 十二宫 system IS byte-pinned in 太清神鑑 卷一 (成和子統論, <pb:KR3g0045_WYG_001-17b>): 宮 is normalised to 宫 (U+5BAB) in Kanripo, so negative tests must search BOTH forms. What remains SOURCE_REQUIRED is specifically the received-Mayi / 神相全編 constituent mapping (財帛宮 = nose; presence of 田宅宮), which the 太清 witness does NOT support (太清 assigns 財帛宮 to 天倉地庫)."` |
| EV-12 | `fourRivers.lineages.primary.note` | append: `" 太清神鑑 卷二 also states two further Four Rivers relations, both byte-pinned at <pb:KR3g0045_WYG_002-18a>: 四瀆→相朝 (地之四瀆者所以相朝以接其流通) and 四瀆→應於神 (則應於神). Shen is not operationalised (see the shen-unmeasurable negative rule)."` |

### 3c. New lineages / reclassification

- **EV-05 — new facial Three Sections lineage** `threeSections.lineages["taiqing-mianbu-facial"]`:
  ```
  definition: "太清神鑑 卷五 論靣部 defines the FACIAL three sections with explicit boundaries: upper = 髪際 to 眉間; middle = 眉間 to 鼻凖; lower = 凖/人中 to 頰. A 三才 correspondence (上像天 中像人 下像地) and per-section predicates (上主貴 中主壽 下主富). 三停皆稱乃上相之人矣. This is FACIAL, distinct from the BODY 身三停 of 卷六."
  source: "Taiqing Shenjian, 卷五 論靣部"
  sourceId: "heritage-three-sections-taiqing-mianbu"
  evidenceKind: "POSITIVE_CLAIM"
  evidenceStrength: "VERIFIED_PRIMARY"
  runtimeStatus: "RESEARCH_ONLY"           // NOT a routing decision — matches every other new lineage's default
  measurementAvailability: "SUPPORTED_2D"
  folioLocator: "KR3g0045_WYG_005-7b"
  constituents: upper (髪際→眉間), middle (眉間→鼻凖), lower (凖人中→頰) — each sourceId heritage-three-sections-taiqing-mianbu, sectionLocator "卷五 論靣部", folioLocator "KR3g0045_WYG_005-7b", evidenceStrength VERIFIED_PRIMARY, measurementAvailability SUPPORTED_2D
  disagreements: []
  note: "Keep structurally distinct from taiqing-section-heading (卷六 body). Same text, different juan, different domain, different predicate family (facial: 稱; body: ranked + 相稱)."
  ```
- **EV-07 — 玉管 平等 position.** Add lineage `threeSections.lineages["yuguan-pingdeng"]` (`sourceId: heritage-three-sections-yuguan`, `evidenceStrength: VERIFIED_PRIMARY`, `runtimeStatus: RESEARCH_ONLY`, `folioLocator: KR3g0044_WYG_003-13a`, definition `"玉管照神局 卷下 verse: 三停平等能和美. Domain unspecified (verse). 平等 wording, not 相稱."`).
- **EV-08 — five-officers reclassification.** Add `fiveOfficers.lineages["renlun-xue"]`:
  ```
  source: "人倫大統賦 薛延年注 (Yuan commentary)"
  sourceId: "heritage-five-mountains-renlun-datong"   // reuse the KR3g0046 record — or add heritage-five-officers-renlun-datong (editorial call; default: add it, symmetric with the mountains/rivers records)
  evidenceStrength: "VERIFIED_SECONDARY"
  runtimeStatus: "RESEARCH_ONLY"
  folioLocator: "KR3g0046_WYG_001-11a"
  constituents (ORDERED, per the source 一口二鼻三耳四目五人中):
    mouth 口 = 出納官 ; nose 鼻 = 嗅臭官 ; ear 耳 = 審聽官 ; eye 眼 = 監察官 ; philtrum 人中 = 保夀官
  note: "Four of five office titles differ from the Taiqing set (監察≠鑒察, 審聽≠採聽, 嗅臭≠審辨, member 人中≠眉). This is a lineage disagreement, NOT an orthographic alias. The source glosses 五官 with 荀子注司主也又識也."
  ```
  Then in `fiveOfficers.lineages.primary`: **remove** `監察官` from the `inspection` constituent's `aliases`/`aliasWitnesses` (it is not an alias — the whole set differs); **remove** the `unverifiedClaims["philtrum-longevity-office"]` entry (now witnessed as `renlun-xue`'s `人中 = 保夀官`).
- **EV-16 — 玉管 似X得X.** Add to `fiveElements.primary` a `relatedSystems` OR a new lineage `yuguan-like-with-like` (editorial call; default: new lineage):
  ```
  definition: "玉管照神局 卷上 呂洞賓賦: 似金得金剛毅深，似木得木資財阜，似水得水文章貴，似火得火兵機大，似土得土多櫃庫 — five like-with-like pairs, one outcome each. NOT generation, overcoming, a 5×5 grid, or 25 types."
  sourceId: "heritage-five-forms-yuguan"
  evidenceStrength: "VERIFIED_PRIMARY"
  runtimeStatus: "RESEARCH_ONLY"
  measurementAvailability: "MODERN_MAPPING_UNSUPPORTED"
  folioLocator: "KR3g0044_WYG_001-4b"
  ```

**Tests:** `tests/heritage/evidence.test.js` (or new) — assert the new lineages
exist, `taiqing-mianbu-facial` and `taiqing-section-heading` are BOTH present and
distinct, `fiveOfficers` now has a `renlun-xue` lineage, `philtrum-longevity-office`
is no longer in `unverifiedClaims`, and every touched lineage's
`folioLocatorStatus === "VERIFIED"`. The existing "Five Elements mapping names its
source and its disagreement" guard must still pass.

---

## GROUP 4 — `HERITAGE_CONNECTOR_REGISTRY` — `src/heritage/registry.js`

### 4a. Split `five-mountains-mutual-facing-fullness` (matrix CR-01, errata E-8)

**Remove** `five-mountains-mutual-facing-fullness`. **Add two:**

```
"five-mountains-mutual-facing": connectorRecord({
  connectorId: "five-mountains-mutual-facing",
  relationshipType: "COLLECTIVE_RULE", relationshipDirection: { kind: "UNDIRECTED" },
  collectiveMode: "ALL_MEMBERS", graphScope: "CORE_HERITAGE",
  participants: [{ participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" }],
  evidenceClass: "EXPLICITLY_ATTESTED", evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "heritage-five-mountains",
  supportingSourceIds: ["heritage-yuebo-dongzhongji-configuration"],
  textualLayer: "BASE_TEXT", sourceText: "五嶽須要豐隆而相朝", sourceTextStatus: "RECORDED",
  sectionLocator: "「五嶽」; 卷二 (Siku)", sectionLocatorStatus: "VERIFIED",
  folioLocator: "KR3g0045_WYG_002-17b", folioLocatorStatus: "VERIFIED", folioLocatorKind: "WYG_PB",
  measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
  runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED", prohibitedForUserInference: true,
  note: "相朝 (mutual facing). MULTIPLE_WITNESSES_SAME_RELATION: 太清神鑑 卷二 (五嶽須要豐隆而相朝) and 月波洞中記 卷上 (五嶽欲其相朝), independently worded. Not a modern capture claim. passageIds: tq-j2-wuyue, yb-j1-heyue.",
}),
"five-mountains-fullness": connectorRecord({
  connectorId: "five-mountains-fullness",
  relationshipType: "COLLECTIVE_RULE", relationshipDirection: { kind: "UNDIRECTED" },
  collectiveMode: "ALL_MEMBERS", graphScope: "CORE_HERITAGE",
  participants: [{ participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" }],
  evidenceClass: "EXPLICITLY_ATTESTED", evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "heritage-five-mountains",
  supportingSourceIds: ["heritage-five-mountains-renlun-datong"],
  textualLayer: "BASE_TEXT", sourceText: "五嶽須要豐隆", sourceTextStatus: "RECORDED",
  sectionLocator: "「五嶽」; 卷二 (Siku)", sectionLocatorStatus: "VERIFIED",
  folioLocator: "KR3g0045_WYG_002-17b", folioLocatorStatus: "VERIFIED", folioLocatorKind: "WYG_PB",
  measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
  runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED", prohibitedForUserInference: true,
  note: "豐隆 (fullness). 太清神鑑 卷二 and 人倫大統賦 薛注 (五嶽俱要豐隆有峻極之勢 — Yuan commentary, no 相朝). passageIds: tq-j2-wuyue, rl-j1-wuyue.",
}),
```

Any code / test referencing `five-mountains-mutual-facing-fullness` by id must be
updated to the two new ids (grep: `tests/heritage/`, `evidence.js` note at
`fiveMountains.lineages["taiqing-siku"].note`).

### 4b. Update existing connectors (mechanical)

| matrix | connectorId | changes |
|---|---|---|
| CR-02 | `four-rivers-flow-and-banks` | `sourceText: null → "四瀆欲得端直清大眀浄流暢涯岸成就"`; `sourceTextStatus: "RECORDED" → "VERIFIED"`; `evidenceStrength: "RECORDED_NOT_VERIFIED" → "VERIFIED_PRIMARY"`; add `folioLocator: "KR3g0045_WYG_002-18a"`, `folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"` |
| CR-04 | `five-mountains-four-rivers-corresponds` | `sectionLocatorStatus: "RECORDED" → "VERIFIED"`; add `folioLocator: "KR3g0045_WYG_001-6b"`, `folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"`; `sourceTextStatus: "RECORDED" → "VERIFIED"`; `evidenceStrength: "RECORDED_NOT_VERIFIED" → "VERIFIED_PRIMARY"`; keep the "do not merge Three Sections" note |
| CR-05 | `four-rivers-shen-corresponds` | add `folioLocator: "KR3g0045_WYG_002-18a"`, `folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"`; `sectionLocatorStatus` already VERIFIED — no change; leave `runtimePolicy: "RESEARCH_ONLY"` |
| CR-06 | `five-officers-one-good-office-ten-years` | `sourceText: "一官好則貴十年" → "或一官好則貴十年或有缺陷者及醜惡者㐫"`; `sourceTextStatus: "RECORDED" → "VERIFIED"`; `evidenceStrength → "VERIFIED_PRIMARY"`; add `folioLocator: "KR3g0045_WYG_002-18b"`, `folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"`; leave `runtimePolicy: "SOURCE_PANEL_ONLY"` |
| CR-07 | `yuebo-mountains-rivers-form-shen-configuration` | `sourceTextStatus: "RECORDED" → "VERIFIED"` (`凡相人靣五嶽欲其相朝四瀆欲其不混形神備足` byte-confirmed); `evidenceStrength: "RECORDED_NOT_VERIFIED" → "VERIFIED_PRIMARY"`; add `sectionLocator: "卷上 河嶽"`, `sectionLocatorStatus: "VERIFIED"`, `folioLocator: "KR3g0043_WYG_001-5a"`, `folioLocatorStatus: "VERIFIED"`, `folioLocatorKind: "WYG_PB"` |
| CR-08 | `five-forms-generative-overcoming-system` | **NO CHANGE** — the 太清 卷四 相生/相尅 predicate was not read; stays `RECORDED_NOT_VERIFIED` / `sourceTextStatus: "NOT_RECORDED"` / `RESEARCH_ONLY`. Do NOT attach the 玉管 似X得X passage here. |
| CR-11 | `three-sections-equality-mayi-received` | append to `note`: `" 玉管照神局 卷下 supplies a byte-pinned 三停平等 verse (heritage-three-sections-yuguan, <pb:KR3g0044_WYG_003-13a>). This does NOT promote the received Ma Yi maxim, but it does mean 平等 is not a Ma Yi-exclusive predicate."` |

### 4c. New connectors

```
"four-rivers-mutual-facing": connectorRecord({           // matrix CR-03, errata E-8
  connectorId: "four-rivers-mutual-facing",
  relationshipType: "COLLECTIVE_RULE", relationshipDirection: { kind: "UNDIRECTED" },
  collectiveMode: "ALL_MEMBERS", graphScope: "CORE_HERITAGE",
  participants: [{ participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" }],
  evidenceClass: "EXPLICITLY_ATTESTED", evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "heritage-four-rivers-primary", textualLayer: "BASE_TEXT",
  sourceText: "地之四瀆者所以相朝以接其流通", sourceTextStatus: "VERIFIED",
  sectionLocator: "「四瀆」; 卷二 (Siku)", sectionLocatorStatus: "VERIFIED",
  folioLocator: "KR3g0045_WYG_002-18a", folioLocatorStatus: "VERIFIED", folioLocatorKind: "WYG_PB",
  measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
  runtimePolicy: "RESEARCH_ONLY", prohibitedForUserInference: true,
  note: "相朝 applied to the four rivers (太清神鑑 卷二). 相朝 is not a mountains-only predicate. passageId: tq-j2-sidu.",
}),
"five-forms-like-with-like": connectorRecord({           // matrix CR-09, errata E-7
  connectorId: "five-forms-like-with-like",
  relationshipType: "COLLECTIVE_RULE", relationshipDirection: { kind: "UNDIRECTED" },
  collectiveMode: "SYSTEM_AS_WHOLE", graphScope: "CORE_HERITAGE",
  participants: [{ participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" }],
  evidenceClass: "EXPLICITLY_ATTESTED", evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "heritage-five-forms-yuguan", textualLayer: "BASE_TEXT",
  sourceText: "似金得金剛毅深似木得木資財阜似水得水文章貴似火得火兵機大似土得土多櫃庫", sourceTextStatus: "VERIFIED",
  sectionLocator: "卷上 呂洞賓賦", sectionLocatorStatus: "VERIFIED",
  folioLocator: "KR3g0044_WYG_001-4b", folioLocatorStatus: "VERIFIED", folioLocatorKind: "WYG_PB",
  measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
  runtimePolicy: "RESEARCH_ONLY", prohibitedForUserInference: true,
  note: "玉管照神局: 似X得X like-with-like — an element-resembling form obtaining that same element, one outcome each (5 pairs). NOT generation (相生), overcoming (相尅), a 5×5 grid, or 25 types. See the no-five-forms-five-phases-conflation negative rule. passageId: yg-j1-wuxingxing.",
}),
"three-sections-facial-proportion-taiqing": connectorRecord({   // matrix CR-10, errata E-4
  connectorId: "three-sections-facial-proportion-taiqing",
  relationshipType: "COLLECTIVE_RULE", relationshipDirection: { kind: "UNDIRECTED" },
  collectiveMode: "SYSTEM_AS_WHOLE", graphScope: "CORE_HERITAGE",
  participants: [{ participantId: "threeSections", nodeType: "CONSTRUCT", constructId: "threeSections", memberScope: "ALL_MEMBERS" }],
  evidenceClass: "EXPLICITLY_ATTESTED", evidenceStrength: "VERIFIED_PRIMARY",
  sourceId: "heritage-three-sections-taiqing-mianbu", textualLayer: "BASE_TEXT",
  sourceText: "三停皆稱乃上相之人矣", sourceTextStatus: "VERIFIED",
  sectionLocator: "卷五 論靣部", sectionLocatorStatus: "VERIFIED",
  folioLocator: "KR3g0045_WYG_005-7b", folioLocatorStatus: "VERIFIED", folioLocatorKind: "WYG_PB",
  measurementAvailability: "SUPPORTED_2D",
  runtimePolicy: "RESEARCH_ONLY", prohibitedForUserInference: true,
  note: "太清神鑑 卷五 論靣部 FACIAL three sections: per-section 主貴/主壽/主富 predicates and 三停皆稱乃上相之人. Distinct from the 卷六 BODY 身三停 material. Fortune-typed. passageId: tq-j5-mianbu-santing.",
}),
```

*(CR-12 `renlunfengjian-collation-aggregate` is OPTIONAL and may stay
atlas-only. If added: `SOURCE_CRITICISM_AGGREGATE`, `VERIFIED_SECONDARY`,
`RESEARCH_ONLY`, `sourceId: heritage-four-rivers-renlun-fengjian`, backed by
`disagreementIds: []` and a note listing the passageId set, no single folio.)*

**Tests:** `tests/heritage/registry.test.js` / `falsification.test.js` — assert
the two split connectors exist and the fused one does not; the three new
connectors validate; `five-forms-generative-overcoming-system` is unchanged
(`sourceTextStatus === "NOT_RECORDED"`). The existing "where classical sources
disagree, Module A says so" and connector-validation guards must still pass.

---

## GROUP 5 — `HERITAGE_DISAGREEMENT_REGISTRY` — `src/heritage/registry.js`

| matrix | disagreementId | change |
|---|---|---|
| DR-01 | `five-mountains-northern-region` | add a position: `{ positionId: "yuebo-yi", sourceId: "heritage-yuebo-dongzhongji-configuration", summary: "月波洞中記 卷上 assigns the northern/lower-face mountain to 頥.", note: "byte-pinned <pb:KR3g0043_WYG_001-5a>" }`. Add `note` on the existing `taiqing-han` and `renlun-datong-chin` positions: `"byte-pinned"`. |
| DR-02 | `four-rivers-eye-mouth` | append to the `primary-eye-huai-mouth-he` position note: `" Now witnessed by three byte-pinned witnesses that agree: 太清神鑑 卷二, 月波洞中記 卷上, 人倫大統賦 薛注. The 麻衣 eye/mouth swap remains unpinned (RECORDED_NOT_VERIFIED) — do not resolve on evidential-availability grounds."` |
| DR-03 | *(new)* `five-officers-titles` | `{ disagreementId: "five-officers-titles", nature: "TERMINOLOGY", target: { targetType: "CONSTRUCT", targetRef: "fiveOfficers" }, status: "OPEN", positions: [ { positionId: "taiqing", sourceId: "heritage-five-officers", summary: "目=鑒察官 鼻=審辨官 口=出納官 耳=採聽官 眉=保夀官", note: "byte-pinned <pb:KR3g0045_WYG_002-18b>" }, { positionId: "renlun-xue", sourceId: "heritage-five-officers", summary: "眼=監察官 耳=審聽官 鼻=嗅臭官 口=出納官 人中=保夀官 (ordered 一口二鼻三耳四目五人中)", note: "Yuan commentary layer; byte-pinned <pb:KR3g0046_WYG_001-11a>. Four of five titles differ." } ] }` — (adjust `sourceId` of the `renlun-xue` position to `heritage-five-officers-renlun-datong` if that record is added per EV-08) |
| DR-04 | *(new)* `three-sections-predicate` | `{ disagreementId: "three-sections-predicate", nature: "PREDICATE", target: { targetType: "CONSTRUCT", targetRef: "threeSections" }, status: "OPEN", positions: [ { positionId: "taiqing-xiangcheng", sourceId: "heritage-three-sections-taiqing-mianbu", summary: "相稱: 太清神鑑 卷一 (三停大體求相稱), 卷五 (三停皆稱), 卷六 (身三停相稱)", note: "three internal byte-pinned witnesses" }, { positionId: "yuguan-pingdeng", sourceId: "heritage-three-sections-yuguan", summary: "平等: 玉管照神局 卷下 (三停平等能和美)", note: "byte-pinned <pb:KR3g0044_WYG_003-13a>; domain unspecified (verse)" } ] }` |
| DR-05 | `twelve-palaces-constituents` | on the `taiqing-yuguan` position add `note: "byte-pinned <pb:KR3g0045_WYG_001-17b>; evidenceStrength VERIFIED_PRIMARY"`. Keep `status: "OPEN"`. |

**Tests:** `tests/heritage/registry.test.js` — assert the two new disagreements
exist and validate; `five-mountains-northern-region` now has 5 positions;
disagreement schema still passes.

---

## GROUP 6 — negative-test coverage (errata E-1)

`tests/qise/` and/or `tests/heritage/` — wherever the corpus is scanned for
palace-system strings. Add: any negative/positive test that searches for `十二宮`
(U+5BAE) must **also** search `十二宫` (U+5BAB). Add one positive test asserting
`heritage-twelve-palaces-taiqing` resolves to a `folioLocator` of
`"KR3g0045_WYG_001-17b"` and `citationStatus: "verified"`.

---

## Verification checklist for Gemini

```
[ ] node scripts/heritage-evidence/acquire-and-verify.mjs "$HOME/acq" → exit 0, "17/17 MATCH", "total 600"
[ ] npm test → count > 0, all pass (quote "Running N test file(s)")
[ ] npm run build → clean
[ ] npm run lint:bundle → clean (run against dist/)
[ ] node --check on every edited src file (source-integrity guard)
[ ] git grep 'five-mountains-mutual-facing-fullness' → only in docs/, not in src/ or live tests
[ ] every new SOURCE_REGISTRY key resolves through SOURCE_REGISTRY without throwing
[ ] HERITAGE_CONSTRUCT_IDS still === 6 entries
[ ] git diff src/heritage/resolver.js src/heritage/composition.js → EMPTY
[ ] NOT VERIFIED: <list anything skipped>
```
