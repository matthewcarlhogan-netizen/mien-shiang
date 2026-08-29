# EVIDENCE REPRODUCTION LOG

Every count / negative claim the dossier makes, re-run from the project-owned
bytes (`acquire-and-verify.mjs`, run `2026-08-29T04:49:24Z`). Counts are
`String.prototype.indexOf` sweeps over the raw file bytes unless noted.

---

## C.1 — `<pb:...>` folio-marker availability

`grep -o '<pb:[^>]*>' | wc -l` across all 17 files → **600** (per-file table in the acquisition report §3).

- Dossier claim ("~600"): **CONFIRMED** (exact 600).
- Prior project premise ("Kanripo carries no leaf markers; no folio derivable"): **REFUTED for all four texts.** Every juan carries dense `<pb:{ID}_WYG_{JJJ}-{FF}{a|b}>` markers.

## C.2 — 十二宮 / 十二宫 (Twelve Palaces)

| term | codepoint | total | per file |
|---|---|--:|---|
| `十二宮` | 宮 = U+5BAE | **0** | — |
| `十二宫` | 宫 = U+5BAB | **2** | `KR3g0045_001.txt`: 2 |
| `面有十二宫` | — | **1** | `KR3g0045_001.txt`: 1 |

- Dossier §7.1 ("十二宮 … does not occur in any of the 17 files … `grep -c 十二宮`"): **technically true only for U+5BAE.** Kanripo's 2016-02-05 normalisation writes 宮 → 宫 (U+5BAB) throughout these texts. Under the normalised form the system **is present**: `KR3g0045_001.txt`, 太清神鑑 卷一 成和子統論, `<pb:KR3g0045_WYG_001-17b>` reads `或曰面有十二宫…` and enumerates all twelve slots. See errata **E-1** and passageId `tq-j1-shierdgong`.
- The dossier's methodological warning still holds and is respected: the palace *words* 財帛 / 妻妾 / 奴僕 / 疾厄 occur as ordinary vocabulary and are **not** counted as the system. What is counted is the literal phrase `面有十二宫` heading a slot-by-slot enumeration.
- The repo's currently cited Twelve Palaces locators: `heritage-twelve-palaces-taiqing` = "卷一·成和子統論（末段）" — **matches** the byte location; `heritage-twelve-palaces` (神相全編) = "卷一「十二宮訣」「十二宮絡」" — **not in the Kanripo corpus**, unchanged.

## C.3 — 人倫風鑑

| file | count | nature |
|---|--:|---|
| `KR3g0045_001.txt` (太清 卷一) | 16 | interlinear double-column collation notes on the 相說歌 verse: `(人倫風鑑云…/…)` variant readings (~13) and `(人倫風鑑…同)` concurrence notes (~3, e.g. `人倫風鑑洞𤣥經同`, `人倫風鑑千字文同`) |
| `KR3g0044_001.txt` (玉管 卷上) | 1 | one further interlinear variant note: `(人倫風鑑云虎頭燕頷…)` |
| **total** | **17** | — |

- Dossier §TL;DR ("16 times by name in 太清 卷一 … twice more as 〈人倫風鑑同〉"): the **16** in 太清 卷一 is **CONFIRMED**; there is **one further** occurrence in 玉管 卷上 the dossier's KR3g0045-scoped count did not include → project total **17**.
- Classification: **every one of the 17 is an interlinear collation/variant note.** None is an independent titled citation with its own locator. 人倫風鑑 is a **named textual comparandum** used by the 太清 compiler and (once) the 玉管 compiler; it is listed alongside 洞𤣥經 and 千字文 as a distinct titled work. This is **not** the location of an independent surviving witness. See errata **E-3**; encode as `NAMED_COMPARANDUM_ATTESTED` / `INDEPENDENT_WITNESS_NOT_LOCATED`.

## C.4 — Five Forms / 25-type

| term | total | per file | context |
|---|--:|---|---|
| `二十五` | **2** | `KR3g0043_002`: 1; `KR3g0046_001`: 1 | both age/year numbers: `二十以上二十五以下` (a longevity age-band, 月波 卷下) and `主二十五年吉運` (a year-count in the 人倫 age-run commentary). Neither is 陰陽二十五人 or a typological structure. |
| `五形` | 7 | `KR3g0044_003`:1, `KR3g0045_003`:1, `KR3g0045_004`:5 | 太清 卷四「五形」 section + scattered use |
| `五行形` | 1 | `KR3g0045_004`: 1 | — |
| `似金得` / `似木得` / `似水得` / `似火得` / `似土得` | 1 each (**5 total**) | all `KR3g0044_001.txt` | 玉管 卷上, 呂洞賓賦: `…似金得金剛毅深，似木得木資財阜，似水得水文章貴，似火得火兵機大，似土得上[=土]多櫃庫…` — a **five-member like-with-like** set. There is no `似金得木` / `似金得水` / etc. |

- **No 5×5 / 25-type physiognomic structure exists in any of the four Kanripo witnesses.** Dossier §6 verdict **C** ("borrowed from 靈樞·陰陽二十五人, a medical text outside the pinnable corpus"): **CONFIRMED as a historical matter.** The 靈樞 25-type structure (5 forms × 5 五音 gradations) is real but is not in these repos. `似X得X` in 玉管 is like-with-like, **not** generation / overcoming / a grid. See Decision 2 and errata **E-7**.

## C.5 — Xunzi

| term | total | per file |
|---|--:|---|
| `荀子` | **3** | `KR3g0044_002` (玉管 卷中): 1; `KR3g0045_003` (太清 卷三): 1; `KR3g0046_001` (人倫 卷上): 1 |
| `荀子曰` | **2** | `KR3g0044_002`: 1; `KR3g0045_003`: 1 |
| `論心擇術` | **1** | `KR3g0045_003` (太清 卷三): 1 |

- `荀子` is **explicitly named in three of the four witnesses.** Texts:
  - 太清 卷三 `<pb:KR3g0045_WYG_003-2b>`: `荀子曰：相形不如相心，論心不如論徳` — **variant** (received 荀子·非相: 相形不如論心，論心不如擇術). passageId `tq-j3-xunzi-explicit`.
  - 玉管 卷中 `<pb:KR3g0044_WYG_002-11b>`: `荀子曰：相形不若相心，論心不若論擇術` — agrees with 太清 on 相心, disagrees on the second clause (論擇術 vs 論徳).
  - 人倫 卷上 `<pb:KR3g0046_WYG_001-11a>`: `五官（荀子注：司主也，又識也）` — a gloss keyed to the Xunzi commentary tradition, inside the Five Officers passage.
- The dossier-pinned allusion `此古人有論心擇術之戒也` (太清 卷三 `<pb:KR3g0045_WYG_003-1b>`, passageId `tq-j3-lunxin-zeshu`) is a **separate, earlier, unattributed** echo — and, notably, it preserves the received `論心` + `擇術` vocabulary that the explicit `荀子曰` quotation ~20 lines later does not. See errata **E-2**.

## C.6 — Three Sections predicates (§3-D)

| term | total | per-file highlights |
|---|--:|---|
| `三停` | 24 | 太清 卷五: 3 (論靣部, `005-7b/8a`), 太清 卷六: 3 (`006-6a/6b`), 玉管 卷上/中/下: 4/2/3 |
| `相稱` | 22 | 太清 卷五 (`三停皆稱`), 卷六 (`身三停相稱`), 卷一 (`三停大體求相稱`) — three internal witnesses |
| `平等` | 3 | 玉管 卷下 `<pb:KR3g0044_WYG_003-13a>`: `三停平等能和美` (the 三停平等 predicate); 太清 卷三 ×2 — a **different sense** (`骨正色靜者平等`, a moral quality in the 七取 list) |
| `三停平等` | **1** | `KR3g0044_003.txt` (玉管 卷下) |

- **FACIAL 三停** (太清 卷五 論靣部, `<pb:KR3g0045_WYG_005-7b>` → `005-8a`): explicit boundaries `自髪際下至眉間為上停，自眉間至鼻凖為中停，自凖人中至頰為下停`; 三才 correspondence; per-section 主貴/主壽/主富 predicates; `三停皆稱乃上相之人矣`. **Currently absent from `evidence.js`** (which has only the 卷六 body lineage). Dossier claim "facial thirds has no Siku witness" → **REJECTED.** See errata **E-4**.
- **BODY 三停** (身三停, 太清 卷六, `<pb:KR3g0045_WYG_006-6a>` → `006-6b`): ranked/differential primary predicate `上停長者大吉昌…`; `又云身三停相稱…` secondary. Matches the existing `taiqing-section-heading` lineage in `evidence.js`.
- **三停平等** (玉管 卷下, `<pb:KR3g0044_WYG_003-13a>`): `三停平等能和美`, in a verse about 鴿形 women, domain unspecified. Dossier claim "平等 belongs exclusively to the 神相全編/麻衣 lineage" → **REJECTED.** The 相稱 / 平等 wording distinction is real but is **not** a clean Siku-vs-Ming lineage marker. See errata **E-5**.

## C.7 — Five Mountains / Four Rivers cross-system

| term | total | note |
|---|--:|---|
| `五嶽` (U+5DBD, kept — not normalised to 五岳) | 45 | all four witnesses |
| `四瀆` | 19 | all four witnesses |
| `豐隆` | 23 | 太清, 玉管, 人倫, ... |
| `相朝` | 8 | 太清 卷一/卷二, 月波 卷上, 人倫 |
| `五嶽四瀆要相應` (contiguous) | **0** | — but the passage IS present: 太清 卷一 `<pb:KR3g0045_WYG_001-6b>`, split by a `¶` column break (`…五嶽四瀆要相¶應…`). passageId `tq-j1-miaojue-xiangying` VERIFIED (markup-stripped). This is why a raw contiguous `indexOf` returns 0. |

- The 相朝 / 豐隆 predicate split (§3-A5): **太清 卷二** carries both (`五嶽須要豐隆而相朝`); **月波 卷上** carries 相朝 only (`五嶽欲其相朝四瀆欲其不混`); **人倫 薛注** carries 豐隆 only (`五嶽俱要豐隆有峻極之勢`). 太清 卷二 also applies 相朝 to the **rivers** (`地之四瀆者所以相朝以接其流通`). See Decision 1 and errata **E-8**.

---

## Summary — dossier count claims

| dossier claim | project-owned result | verdict |
|---|---|---|
| ~600 `<pb:>` markers | 600 exactly | CONFIRMED |
| 十二宮 = 0 in all 4 witnesses | 0 for U+5BAE; **2 for U+5BAB**, one heading a full enumeration | **FALSE NEGATIVE** (normalisation) — errata E-1 |
| 人倫風鑑 = 16 in 太清 卷一 | 16 in 太清 卷一 (+1 in 玉管 卷上; total 17) | CONFIRMED + extended |
| 二十五 = 2, both age numbers | 2, both age numbers | CONFIRMED |
| no 5×5/25-type in the corpus | confirmed — only 5 like-with-like pairs | CONFIRMED |
| Xunzi allusion `此古人…` does not name 荀子 | correct — but `荀子曰` IS named 20 lines later (变体), and in 玉管 + 人倫 | CONFIRMED + extended — errata E-2 |
| §5 prose: 34 rows / 31 VP / 14 prohibited / 18 ELIGIBLE | **38 / 35 / 13 / 23** from the CSV bytes | dossier prose WRONG — errata E-6 |
