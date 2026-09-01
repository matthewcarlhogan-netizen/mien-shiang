# RESEARCH RECOMMENDATION PACK — NOT A DECISION RECORD

**Status: research recommendations only. Nothing in this file is approved.** This file was
previously named `PRODUCT_OWNER_DECISIONS.md`, which could be misread as recording approved
policy — it never did. Renamed 30 August 2026 specifically so a future agent cannot mistake a
research recommendation for a product-owner decision by filename alone. An actual decision, if and
when the product owner makes one, is recorded as a dated entry in `docs/DECISION_REGISTER.md` or
as one of the cards in `docs/DECISION_CARDS.md` — never here.

Three decision cards. **Research states the evidence and a recommendation; the
product owner decides.** None of these is decided in this pass. `ABSTRACT_LINEAGE_OVERRIDES`
is not touched. **Correction, 30 August 2026: PR #40 has since merged to `main`** (see
`docs/HERITAGE_CONNECTOR_STAGE_STATUS.md`'s six-axis status) — its merge is a `CODE_PRESENT` fact,
not a resolution of any card below. Every card in this file remains exactly as undecided as it was
before the merge; see `docs/DECISION_CARDS.md` CARD 7 for the Five Mountains card carried forward.

Each card: historical fidelity · distortion risk · Stage-2 architecture effect ·
Stage-3 effect · prototype effect · research recommendation.

---

## DECISION 1 — Five Mountains routing (`fiveMountains/primary`)

**Question:** what should current Stage 3 do with the abstract `fiveMountains/primary`
rotation slot?

### Evidence (now byte-pinned)

| witness | forehead | lower face | L cheek | R cheek | nose | directional? | 相朝 | 豐隆 | layer |
|---|---|---|---|---|---|---|---|---|---|
| 月波 卷上 (`yb-j1-heyue`) | 衡 | **頥** 恒 | 泰 | 華 | 嵩 | no | ✅ | — | base text |
| 月波 卷下 (`yb-j2-wuyue-similes`) | 衡=南 | 恒=北 | 泰=東 | 華=西 | 嵩=中 | **yes** | — | — | base text |
| 太清 卷二 (`tq-j2-wuyue`) | 衡 | **頷** 恒 | 泰 | 華 | 嵩 | no | ✅ | ✅ | base text |
| 人倫 薛注 (`rl-j1-wuyue`) | 南嶽衡 | **頦** 北嶽恒 | 東嶽泰 | 西嶽華 | 中嶽嵩 | **yes** | — | ✅ | **Yuan commentary** |

- **Membership** (衡/恒/泰/華/嵩) and **anatomical assignment**: identical across all four. No disagreement.
- **Lower-face term**: three distinct terms — 頥 / 頷 / 頦 — `CONTESTED_RELATION`.
- **Directional labels** (南/北/東/西/中): a feature of the *simile/star-correspondence passage type*, carried by 月波 卷下 and 人倫's commentary; **absent** from 月波 卷上 and 太清 卷二.
- **相朝** (mutual facing): 2 independently-worded base-text witnesses (太清 卷二, 月波 卷上). **Absent from 人倫** (which has 豐隆 only). `MULTIPLE_WITNESSES_SAME_RELATION`.
- **豐隆** (fullness): 太清 卷二 + 人倫 薛注.
- 月波 卷上 and 太清 卷二 are **two witnesses sharing doctrine, not one textual lineage** — wording differs (`五嶽欲其相朝` vs `五嶽須要豐隆而相朝`), and each defines the mountains/rivers contrast differently. The simile set (滿月/雞卵/方銀/髙發/倒提) is shared between 月波 卷下 and **人倫's commentary** (attributed there to 萬金秘語), not between 月波 and 太清.

### Options

| option | historical fidelity | distortion risk | Stage-2 effect | Stage-3 effect | prototype effect |
|---|---|---|---|---|---|
| **A. ROUTE_TO_TAIQING** (`primary → taiqing-siku`) | renders the fullest 相朝+豐隆 clause with a full pinned folio | **High** — silently drops 月波 (independent 相朝, plausibly earlier) and 人倫 (豐隆-only, directional); asserts a Taiqing lineage priority the evidence rejects; presents 頷 as *the* lower-face term when 3 are attested | none (single-lineage route already supported) | `five-mountains-*` connectors could become visible | one clean card, historically over-confident |
| **B. ROUTE_TO_YUEBO** (`primary → yuebo`) | 月波 is arguably the earliest witness; carries 相朝 | High — drops 太清's 豐隆 and 人倫; 月波 itself has no edition/juan locator recorded in the repo (SR-13 fixes that) | none | same as A | same |
| **C. ROUTE_TO_RENLUN** (`primary → the 人倫 薛注 witness`) | best-attested authorship in the corpus (張行簡/薛延年) | High — it is **Yuan commentary, not the Jin 賦**; has 豐隆 but **not** 相朝 — routing here silently drops the 相朝 relation entirely | none | `five-mountains` material stays blocked (Yuan-commentary layer, `folioLocatorStatus` now VERIFIED but the runtime-status decision is separate) | routes to the *weakest* predicate set |
| **D. KEEP_ABSTRACT_PRIMARY_UNROUTED** | zero distortion — the honest state: multiply witnessed, no witness privileged | none historically; risk is product-side under-rendering | none — `ABSTRACT_LINEAGE_OVERRIDES` stays `{}`; Five Mountains material stays `LINEAGE_RESEARCH_ONLY` | connectors stay abstention-only via the real path | prototype shows Five Mountains as "measured geometry + a note that the classical rule needs multiple witnesses" |
| **E. DEFER_PENDING_MULTI_WITNESS_ARCHITECTURE** | same as D today; names the actual blocker — the evidence supports a *parallel-witness* presentation the engine cannot yet express | none historically; risk is schedule | **likely yes** — a multi-witness render path (parallel witness cards + a disagreement field) may require Stage-2 semantics that assume one lineage per construct to change. **Must be checked against the frozen resolver before committing.** | needs the new render path before anything ships | the option that eventually *shows* the 頥/頷/頦 + 相朝/豐隆 disagreement |

### RESEARCH RECOMMENDATION (not a product decision)

**D now, with E as the future architecture direction.** D and E are compatible: D
describes what the runtime does today (`ABSTRACT_LINEAGE_OVERRIDES` empty, Five
Mountains at `LINEAGE_RESEARCH_ONLY`); E describes what should unblock it. The
pinning gap that once justified caution is **closed** — 36/40 atlas rows carry
commit + SHA-256 + folio — so this is now an *architecture* limitation, not an
open research question, and labelling it as such (E) is more accurate than
leaving it as "needs more research".

**Do NOT choose A/B/C.** Routing to any single witness is the "silently chose one
lineage because it was convenient" failure this whole exercise exists to prevent,
and it would erase a disagreement that is now fully documented.

**Caveat the product owner must resolve, not research:** whether E requires
changing frozen Stage-2 semantics depends on repo facts — specifically whether
`resolver.js`'s `RESOLVER_DEPENDS_ON` surface and the single-`sourceLineage`
contract can express a parallel-witness set. That check has not been run against
the frozen resolver in this pass.

---

## DECISION 2 — Five Forms / the 25-person structure

**Question (reframed per the corrections):** the live repo already attributes its
25-person structure to **黃帝內經·靈樞·陰陽二十五人** (`heritage-five-elements`,
`sectionLocator: "靈樞 第六十四·陰陽二十五人"`), **not** to any physiognomy text.
So the question is *not* "did the project falsely claim a physiognomic 25-type
source". It is: **should 靈樞's medical 25-person framework remain part of the
product's Five Forms *heritage definition*, or should the physiognomic Five Forms
construct be separated from that 靈樞 system?**

### Evidence (byte-level, all 4 Kanripo witnesses)

- `二十五` occurs **exactly twice** in the corpus — both age/year numbers, neither typological.
- 玉管照神局 卷上: **five** `似X得X` like-with-like pairs (`似金得金…似土得土`), one outcome each. **No** `似金得木` etc. — no 5×5 grid.
- 太清神鑑 卷四「五形」: a 五形 section + an animal-form catalogue (鶴/鳯/龜/犀/虎/獅子/龍形) + 五短/五長之形. None is a 25-fold subdivision.
- **`十二宮` and any 5×5 elemental subdivision: zero across all four texts.**
- The only well-attested 25-type structure in the Chinese body-reading world is 靈樞·陰陽二十五人 (5 形 × 5 五音 = 25). That is **medical**, and it is **not** in the pinnable heritage corpus.

### Where the repo currently conflates vs distinguishes

| location | conflates or distinguishes? |
|---|---|
| `evidence.js` `fiveElements.primary.sourceId: "heritage-five-elements"` + `sectionLocator: "靈樞 第六十四·陰陽二十五人"` | **conflates** — the *physiognomic* Five Forms lineage's primary source is set to a *medical* text |
| `evidence.js` `fiveElements.primary.permittedHeritageSemantics: "…the source's twenty-five-type structure as attributed historical material only."` | **conflates** — "the source" here = 靈樞, presented as the heritage source of the Five Forms construct |
| `evidence.js` `fiveElements.primary.relatedSystems[five-phases]` note "太清神鑑 places 五行所生 and 五形 in separate sections" | **distinguishes** — correctly keeps 五形 ≠ 五行 |
| `evidence.js` `fiveFormMembers` — `sourceId: "heritage-five-elements"`, `sectionLocator: "靈樞 第六十四·陰陽二十五人"`, `evidenceStrength: "VERIFIED_PRIMARY"` | **conflates** — the named members 木形/火形/… are sourced to 靈樞 |
| `provenance.js` `heritage-five-elements` (靈樞) vs `heritage-five-elements-taiqing` (太清 卷四「五形」) as two separate records | **distinguishes** — the two texts have separate source records |
| `negative-relationships-registry.js` `no-five-forms-five-phases-conflation` (`VERIFIED_PRIMARY`) | **distinguishes** — explicitly forbids conflating 五形 with 五行 |
| `PROJECT_CHARTER.md` "Five Elements ships as five types with the source's twenty-five-type structure stated"; `DECISION_REGISTER.md` R7 | **conflates** at the product-contract level — "the source" = 靈樞 |
| `reflection-corpus.js:248` note "The source actually divides these five again into twenty-five" | **conflates** — presents 靈樞's subdivision as *the Five Forms source's* structure |

### Options

| option | evidence basis | consequence |
|---|---|---|
| **A. RETAIN** — physiognomic 25-type evidence exists | **none.** No physiognomic witness in the corpus has it. | keeps a claim with no physiognomic primary source behind it |
| **B. RETAIN, attributing the 25-type structure explicitly to 靈樞 as a separate *medical parallel*** | 靈樞·陰陽二十五人 genuinely has it (5 形 × 5 音); the repo already cites 靈樞 | honest: the disclosure names 靈樞 as a medical text the heritage layer *notes as a parallel*, not draws on for the physiognomic construct. Requires the physiognomic Five Forms lineage's `sourceId` to move OFF `heritage-five-elements` (靈樞) and onto 太清 卷四「五形」 / 玉管 (SR-14) as the physiognomic witnesses, with 靈樞 kept as a `relatedSystems` medical parallel. |
| **C. REMOVE the 25-type disclosure from the physiognomic Five-Forms contract** | the 25-type structure is not a Five-Forms-physiognomy fact | cleanest; the physiognomic construct becomes "five named forms" (太清 卷四, 玉管), and 靈樞's 25 is dropped from the *physiognomic* contract entirely (可 still recorded as a medical negative/parallel finding — **do not delete the 靈樞 evidence**) |
| **D. DEFER** | — | 神相全編 is unpinnable and could in principle carry a 25-fold expansion no accessible witness shows (dossier estimates ~15%) |

### RESEARCH RECOMMENDATION

**C**, unless new *primary physiognomic* evidence is found — with the explicit
requirement that the 靈樞 evidence is **preserved** (as a medical parallel / a
`HERITAGE_FIELD_FINDINGS` entry), not deleted. **B is an acceptable alternative**
if the product owner wants to keep the "did you know there are 25" disclosure, as
long as it is unambiguously attributed to 靈樞-as-medical-parallel and the
physiognomic Five Forms lineage's `sourceId` is corrected off 靈樞 (SR-17 / EV-15
/ EV-16 / SR-14).

**Either way:** the 玉管 `似X得X` like-with-like passage (`yg-j1-wuxingxing`,
`CR-09`) is now byte-pinned and should be added as a *distinct* physiognomic Five
Forms relation — it is **not** generation, overcoming, a 5×5 grid, or 25 types.

**Locked product decision R7 is the product owner's to change, not research's.**
This memo only reports that R7's "the heritage source has a 25-type structure"
describes 靈樞 (medical), and no physiognomic primary source in the corpus
supports it.

---

## DECISION 3 — Twelve Palaces status *(premise corrected — see errata E-1)*

**The question can no longer be "given zero 十二宮 occurrences".** The system
**is** byte-pinned:

- 太清神鑑 卷一 (成和子統論), `<pb:KR3g0045_WYG_001-17b>`, passageId `tq-j1-shierdgong`:
  `或曰面有十二宫，印堂為命宫，天倉地庫為財帛宫，…，福德宫，相貌則總而言也。`
- 宮 → 宫 (U+5BAB) throughout — Kanripo's 2016 normalisation. The dossier's
  `grep 十二宮` (U+5BAE) returned zero: a codepoint false negative.
- This is the **same content** as the repo's existing `heritage-twelve-palaces-taiqing`
  record and the `twelve-palaces-constituents` / `twelve-palaces-twelfth-slot`
  disagreements. It is now `VERIFIED_PRIMARY`, byte-pinned.

**What is known:** a 12-palace facial system is attested in a datable Siku
witness (太清 卷一) — 11 named palaces (命/財帛/兄弟/父母/男女/奴僕/妻妾/疾厄/遷移/官禄/福德)
+ 相貌 as a concluding summary. **No 田宅宮.** The mapping (e.g. 財帛宮 = 天倉地庫,
not the nose) is 太清's.

**What is unknown / still `SOURCE_REQUIRED`:**
- the **received-Mayi / 神相全編 mapping** the product's current geometry appears
  built on — 財帛宮 = nose, presence of 田宅宮 — has **no pinned witness** (the
  `heritage-twelve-palaces-discovery-surrogate` is a Baidu-hosted surrogate,
  held at `WORK_RECORDED` / `UNREVIEWED`);
- membership/placement at `VERIFIED_PRIMARY` for *that* mapping;
- the earliest witness of *that* mapping;
- the 紫微斗數 borrowing direction (cannot be adjudicated from a corpus that, for
  the 太清 witness, agrees on 11 slots + 相貌).

### Options

| option | supported by the evidence? |
|---|---|
| **A. KEEP current product behaviour, mark provenance `SOURCE_REQUIRED` for the shipped mapping** | **yes** — the *construct* has a pinned classical witness (太清 卷一); only the *specific constituent mapping currently shipped* (nose = 財帛宮, 田宅宮 present) is unpinned. Marking that mapping's provenance `SOURCE_REQUIRED` while the construct is disclosed as historically attested is exactly right. |
| **B. SUPPRESS runtime** | **not authorised by research.** The premise for suppression ("the system is absent from the pinnable corpus") is false. |
| **C. REMOVE construct** | **not authorised by research.** Same. |
| **D. DEFER** | acceptable if the product owner wants to wait for a pinned 神相全編/麻衣 witness of the *specific mapping* before any provenance change — but the construct itself no longer needs deferral. |

### RESEARCH RECOMMENDATION

**A.** Disclose the Twelve Palaces construct as historically attested (太清神鑑 卷一,
pinned), and mark the **shipped constituent mapping** (財帛宮 = nose; 田宅宮)
`SOURCE_REQUIRED` / `RECORDED_NOT_VERIFIED` until a 神相全編/麻衣 witness is
pinned. Do **not** claim the existing Twelve Palaces *geometry* is verified by
`tq-j1-shierdgong` — the 太清 witness assigns 財帛宮 to 天倉地庫, not the nose, so
the pinned witness and the shipped mapping **disagree**, which is the
`twelve-palaces-constituents` disagreement, already OPEN in the repo. Research
does **not** authorise B or C.

**Repo action:** `EV-13`, `EV-14`, `DR-05`, and negative-test coverage for **both**
宮 and 宫 (E-1).
