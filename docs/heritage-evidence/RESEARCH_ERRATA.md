# RESEARCH ERRATA — corrections to `MIEN_SHIANG_PINNING_PASS.md`

Errors and imprecisions in the dossier, exposed by matching its claims against
the project-owned bytes. **None is an acquisition hard stop** (commits, hashes
and passage locations all check out — acquisition report §5). Each is corrected
in [`CORRECTED_RELATIONSHIP_ATLAS_V2.csv`](CORRECTED_RELATIONSHIP_ATLAS_V2.csv)
and, where it changes a product question, carried into
[`RESEARCH_RECOMMENDATION_PACK.md`](RESEARCH_RECOMMENDATION_PACK.md).

---

## E-1 — "十二宮 = 0" is a Unicode-normalisation false negative *(changes Decision 3)*

**Dossier §7.1 / §9:** "The string `十二宮` does not occur in any of the 17 files … a byte-level negative result … reproducible with `grep -c 十二宮`."

**Bytes:** Kanripo's 2016-02-05 normalisation writes 宮 (U+5BAE) → 宫 (U+5BAB) throughout these texts. `grep 十二宫` (U+5BAB) → **2 hits in `KR3g0045_001.txt`**. One, at `<pb:KR3g0045_WYG_001-17b>`, heads a complete twelve-slot enumeration: `或曰面有十二宫，印堂為命宫，天倉地庫為財帛宫，龍虎額角頭為兄弟宫，日月角為父母宫，三隂三陽為男女宫，懸壁為奴僕宫，魚尾為妻妾宫，神光年夀為疾厄宫，山林邊地為遷移宫，正面為官禄宫，精神地角福堂為福德宫，相貌則總而言也。取形之理，分三主、九曜、十二宫之法，無以易此。`

**Correction:** the *system* 十二宫 **is present, named and fully enumerated** in 太清神鑑 卷一 (成和子統論), byte-pinned as passageId `tq-j1-shierdgong`. This is the same content as the repo's existing `heritage-twelve-palaces-taiqing` record and the `twelve-palaces-constituents` disagreement — which the dossier could not see because it searched one codepoint and one form.

**What does *not* change:** the dossier's methodological point stands — 財帛 / 妻妾 / 奴僕 / 疾厄 as scattered words are not the system, and the *received-Mayi / 神相全編* lineage (with 田宅宮 and 財帛宮 = nose) remains unpinned and `SOURCE_REQUIRED`. Only 11 palaces are individually named in the Taiqing witness (+ 相貌 as a concluding summary); there is **no 田宅宮**.

**Consequence:** Decision 3 must be reframed around *"a pinned Taiqing Twelve Palaces witness exists"*, not *"the system is absent"*. Negative tests in the repo must search **both** 宮 and 宫.

---

## E-2 — the explicit `荀子曰` citation is a separate object from the allusion, and it is a *variant*

**Dossier §4 rows `xunzi-allusion-taiqing` / `xunzi-antiphysiognomy`:** treat 太清 卷三 `此古人有論心擇術之戒也` (`<pb:…003-1b>`) as the Taiqing Xunzi evidence, and carry the received 荀子·非相 text `相形不如論心，論心不如擇術` as `RECORDED_NOT_VERIFIED` / not retrieved.

**Bytes:** 太清 卷三 also carries an **explicit attribution** at `<pb:KR3g0045_WYG_003-2b>` (~20 lines later): `荀子曰：相形不如相心，論心不如論徳`. And 玉管 卷中 `<pb:KR3g0044_WYG_002-11b>`: `荀子曰：相形不若相心，論心不若論擇術`. And 人倫 卷上: `五官（荀子注…）`.

**Corrections:**
1. New passageId `tq-j3-xunzi-explicit` for the 太清 卷三 `荀子曰` sentence. **Do not** merge it with `tq-j3-lunxin-zeshu`, and **do not** upgrade the `tq-j3-lunxin-zeshu` allusion's certainty because an explicit citation exists elsewhere in the same juan — passage evidence and intertextual-identification certainty are separate dimensions (the allusion sentence names no one).
2. Neither Kanripo witness quotes 荀子·非相 **verbatim**: 太清 has `相心` + `論徳`; 玉管 has `相心` + `論擇術`; the received text has `論心` + `擇術`. The two witnesses also disagree with *each other* on the second clause. The relationship class is `INTERTEXTUAL_ADAPTATION` / `ATTRIBUTED_VARIANT`, not `EXPLICITLY_ATTESTED` verbatim quotation.
3. `xunzi-antiphysiognomy` (the received 非相 text) stays `RECORDED_NOT_VERIFIED` — not retrieved from an inspectable 荀子 witness this pass. Its evidential status is unchanged; what changes is that we now know the physiognomy manuals *adapt* it rather than *quote* it.

---

## E-3 — 人倫風鑑 is a named comparandum, not a located witness

**Dossier §TL;DR / §9:** "人倫風鑑 is a real cited work … Updated estimate: ~85% that 人倫風鑑 was a real, independent, now-lost text."

**Bytes:** all 17 occurrences (16 in 太清 卷一 + 1 in 玉管 卷上) are **interlinear double-column collation notes** on the 相說歌 verse: variant readings `(人倫風鑑云…/…)` and concurrence notes `(人倫風鑑…同)`. Not one is a titled citation with its own locator.

**Correction:** the dossier's *probabilistic historical judgement* about the lost work's independence is not disputed here — but the **repo encoding** must not read as "independent surviving work verified". Use existing schema terms:
- `citationStatus`: stays `SOURCE_REQUIRED` (no independent witness located).
- Characterisation: `NAMED_COMPARANDUM_ATTESTED` — 人倫風鑑 is demonstrably a work the 太清 and 玉管 compilers cited by name as a textual comparandum, listed alongside 洞𤣥經 and 千字文. This is an **upgrade to the characterisation** (it is not "possibly a mislabel or genre descriptor" — the current `heritage-four-rivers-renlun-fengjian` note) but **not** to the evidence status.
- It supplies **no promotable Four Rivers assignment** — its notes are all on the 相說歌 verse, not the 四瀆 passage.

---

## E-4 — a FACIAL Three Sections witness exists in the pinnable corpus

**Dossier §3-D / §9 ("REJECTED: facial thirds has no witness in the Siku corpus"):** the dossier itself already rejects the prior claim. This erratum records it against the **repo**, which still has no facial Taiqing lineage.

**Bytes:** 太清 卷五 論靣部, `<pb:KR3g0045_WYG_005-7b>` → `005-8a`: full facial boundaries, 三才 correspondence, per-section 主貴/主壽/主富, `三停皆稱乃上相之人矣`. passageId `tq-j5-mianbu-santing` (VERIFIED, contiguous).

**Correction:** `evidence.js` `threeSections.lineages` currently has `taiqing-section-heading` = 卷六 **body** only. A **new lineage** `taiqing-mianbu-facial` is needed (`sourceId: heritage-three-sections-taiqing`, `repositoryFile: KR3g0045_005.txt`, folio `WYG_005-7b`). It must be kept structurally distinct from the 卷六 body lineage — same text, different juan, different domain, different predicate family (facial: 稱; body: ranked + 相稱).

---

## E-5 — 平等 is not a Ming/Mayi-exclusive predicate

**Dossier §3-D / §9 ("REJECTED"):** again already rejected by the dossier; recorded here against the repo.

**Bytes:** 玉管 卷下 `<pb:KR3g0044_WYG_003-13a>`: `三停平等能和美`. passageId `yg-j3-santing-pingdeng` (VERIFIED). 玉管照神局 is a Southern-Tang/early-Song Siku witness. So 三停平等 is attested inside the pinnable Siku corpus, in a verse (domain unspecified).

**Correction:** any repo note asserting or implying that the 平等 wording is a marker separating the 神相全編/麻衣 lineage from the Siku bloc must be removed. The 相稱 (太清, three internal witnesses) / 平等 (玉管, one) wording difference is real and belongs in the `three-sections-predicate` disagreement, but it is **not** an inter-lineage boundary.

---

## E-6 — the dossier's §5 coverage arithmetic is wrong; use the §4 CSV bytes

Recomputed directly from the 38-row §4 CSV (`acquire-and-verify.mjs`):

| metric | §5 prose | §4 CSV bytes |
|---|--:|--:|
| rows in the corrected atlas | 34 | **38** |
| `evidenceStrength == VERIFIED_PRIMARY` | 31 | **35** (= 38 − 3 `RECORDED_NOT_VERIFIED`) |
| `prohibitedForUserInference == true` | 14 | **13** (the prose list counts `four-rivers-membership-mayi`, which is `false` in the CSV) |
| `runtimePotential == ELIGIBLE` | 18 | **23** |
| `runtimePotential == PRODUCT_DECISION_REQUIRED` | — | 12 |
| `runtimePotential == HISTORICAL_EVIDENCE_ONLY` | — | 3 |

The V2 atlas is built from the CSV rows, not the prose totals.

---

## E-7 — `five-forms-generative-overcoming-system` vs the 玉管 `似X得X` passage

**Dossier §4 (`five-forms-like-with-like-yuguan`) / §9:** renames the prior `five-forms-generation-yuguan` row to `five-forms-like-with-like-yuguan` and notes it is **not** a 相生 relation.

**Repo:** the connector `five-forms-generative-overcoming-system` (`registry.js`) is sourced to `heritage-five-elements-taiqing` (太清 卷四「五形」) with a note that "太清神鑑 discusses the five forms in terms of mutual generation (相生) and mutual overcoming (相尅)". That is a **different claim from a different text** than the 玉管 `似X得X` like-with-like passage (`yg-j1-wuxingxing`, `KR3g0044_001.txt` 卷上 呂洞賓賦).

**Corrections:**
1. The 玉管 `似X得X` passage needs its **own** connector (`five-forms-like-with-like`) and its **own** sourceId (a new `heritage-five-forms-yuguan` / `heritage-yuguan-*` record — 玉管照神局 is not currently in `SOURCE_REGISTRY` at all). It is `似X得X` (like-with-like: element-resembles-element → one outcome), five pairs, **not** generation, overcoming, a 5×5 grid, or 25 types.
2. `five-forms-generative-overcoming-system` (the 太清 相生/相尅 claim): its `sourceTextStatus` is `NOT_RECORDED` and no `似X得X` or 相生/相尅 predicate was pinned this pass — the 太清 卷四「五形」 predicate itself remains **unread**. It should stay `RECORDED_NOT_VERIFIED` / `RESEARCH_ONLY` and **not** be conflated with the 玉管 like-with-like row.

---

## E-8 — `five-mountains-mutual-facing-fullness` fuses two separable predicates *(changes Decision 1)*

**Repo:** the single connector `five-mountains-mutual-facing-fullness` (`registry.js`), `sourceText: "五嶽須要豐隆而相朝"`, `sourceId: heritage-five-mountains` (太清 卷二).

**Bytes (§3-A5):**
- **豐隆 (fullness)** — attested in **three** witnesses: 太清 卷二 (`五嶽須要豐隆而相朝`), 人倫 薛注 (`五嶽俱要豐隆有峻極之勢`), and — for the rivers/adjacent — widely.
- **相朝 (mutual facing)** — attested in **two** witnesses: 太清 卷二 and 月波 卷上 (`五嶽欲其相朝`), independently worded. **Absent from 人倫**, which has 豐隆 only.
- 太清 卷二 also applies **相朝 to the four rivers** (`地之四瀆者所以相朝以接其流通`) — it is not a mountains-only predicate.

**Correction:** the historically faithful representation is **two connectors**, not one:
- `five-mountains-mutual-facing` (相朝) — `MULTIPLE_WITNESSES_SAME_RELATION`, witnesses 太清 卷二 + 月波 卷上, independently worded → passageIds `tq-j2-wuyue`, `yb-j1-heyue`.
- `five-mountains-fullness` (豐隆) — witnesses 太清 卷二 + 人倫 薛注 → passageIds `tq-j2-wuyue`, `rl-j1-wuyue`.

Fusing them into one `豐隆而相朝` connector sourced only to 太清 silently (a) drops 月波 as an independent 相朝 witness, (b) drops 人倫's 豐隆-only position, and (c) asserts a Taiqing lineage priority the evidence does not support. Minimal schema/data consequence: split one `HERITAGE_CONNECTOR_REGISTRY` record into two; add `four-rivers-mutual-facing` for the 相朝-on-rivers clause. No schema change; the `disagreementIds` / `supportingSourceIds` / `folioLocatorKind` fields already exist.

---

## E-9 — locator / label imprecisions carried into V2

| dossier row | problem | V2 correction |
|---|---|---|
| `renlunfengjian-variant-witness-taiqing` (§4) | one `VERIFIED_PRIMARY` row with folio `KR3g0045_WYG_001-1a through 001-6a` (a 6-folio range) and `passageChinese` an ellipsis-composite `(…) … (…) … (…)` of 16 separate notes | **downgraded** to a **source-criticism aggregate**: `relationshipClass: SOURCE_CRITICISM_AGGREGATE`, `evidenceStrength: VERIFIED_SECONDARY` (each individual note is verified; the *composite* is an editorial construction), backed by an explicit `passageIds` list rather than one range locator. It is a statement about the 太清 apparatus, not a single located relation. |
| `mountains-provinces-colour-yuebo` (§4) | `section: 五嶽及有小氣所管屬者`, folio `KR3g0043_WYG_002-10b` — but §2 `yb-j2-jiuzhou-colour` places the 九州 colour material in its own `(九州)` sub-section at the same folio | **section relabelled** `九州` (sub-section, `<pb:KR3g0043_WYG_002-10b>`); the `五嶽…所管屬者` heading governs the *preceding* similes passage (`yb-j2-wuyue-similes`, `002-10a/b`), not the province-colour list. |
| `rl-j1-sidu` / `rl-j1-wuyue` / `rl-j1-wuguan` (§2) | `passageChinese` is a reading-through: it flattens the Mandoku `/` double-column notes and splices the 賦 line across deleted phonological glosses (`(音獨溝也…)`, `(音芎高也)`) | passageIds retained; `projectOwnedVerification = VERIFIED_WITH_TRANSCRIPTION_NOTE`; run breakdown recorded (`rl-j1-sidu` = `[[2,5],[49]]`, etc.). The *substantive* claim is byte-verified under the marker; the quote is not a contiguous transcription. |
| §2 collation-note flattening in `tq-j2-wuyue` / `tq-j2-sidu` | dossier writes `(人倫風鑑同)`; bytes read `(人倫風/鑑同)` (double-column split) | cosmetic; passageIds `VERIFIED`; noted so a future exact transcription keeps the `/`. |
| KR3g0046 commentator date | `RLDTF-XUE` / `heritage-*-renlun-datong` records — file header reads `元　薛延年　注` (Yuan), not 金 | `authorshipNote` already says "preface 1313"; add "commentary layer is **Yuan** (元), the 賦 is Jin (金) — a real chronological gap". |

---

## T — transcription-fidelity notes (not errors, but load-bearing for a future exact edition)

Kanripo/Mandoku markup the dossier's `passageChinese` silently removes: `¶` (column/line break), `/` (splits a double-column interlinear note into its two columns), `　` (ideographic indent space), `<pb:...>` (folio marker). A future "exact transcription" field must preserve `/` at least, because `(人倫風/鑑同)` vs `(人倫風鑑同)` is the difference between a faithful and an edited quotation. The 3 `VERIFIED_WITH_TRANSCRIPTION_NOTE` rows additionally read *across* base-text glosses; their run-length breakdowns are in `acquisition-verify.json`.
