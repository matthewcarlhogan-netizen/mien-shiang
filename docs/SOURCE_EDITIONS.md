# Source edition register

**Prepared 17 August 2026.** Requirement 1 of `docs/commercial-rights-audit.md`
is "a named edition and page/chapter locator for every tradition claim". This
register records what is actually established, family by family, and marks
precisely where a locator is still missing.

**No family's status changes as a result of this file.** All six remain
`Blocked`. A register of what we have is not the same as having enough.

## Status key

- **Established** — text retrieved and read, edition identified, locator usable.
- **Partial** — text retrieved, but the locator points at a web transcription
  rather than a named edition with folio or juan.
- **Missing** — no primary text retrieved.

---

## Five Elements 五形人 — Established (with one caveat)

| Field | Value |
|---|---|
| Work | 黃帝內經·靈樞 (*Huangdi Neijing, Lingshu*) |
| Chapter | 卷六·陰陽二十五人第六十四 (ch. 64) |
| Authorship | Anonymous, composite. Attribution to the Yellow Emperor is pseudepigraphic by universal scholarly consensus. |
| Date | Han-period composite. **Specific dating is disputed and unverified**: Unschuld gives 400 BCE–260 CE; Sivin gives 1st c. BCE; Needham & Lu give 2nd c. BCE. Do not assert a single date. |
| Transmission | Received text reorganised into 81 chapters by 王冰 Wang Bing, 762 CE. |
| Rights | Public domain by age, worldwide. |
| Retrieved text | 「先立五形金木水火土，別其五色，異其五形之人，而二十五人具矣。」 plus the five 形之人 descriptions. |
| Claims it supports | Five forms; the face descriptors 長面 / 脫面 / 圓面 / 方面 / 面不平; the twenty-five-type structure; that complexion is a defining criterion. |

**Caveat:** retrieved from a web transcription, not a named print edition.
Requirement 1 asks for an edition and locator. **Recommended edition to cite:**
the *Siku Quanshu* recension via Chinese Wikisource, which carries an explicit
`{{PD-old}}` tag. Product owner to confirm; then hash the citation record.

**Do not cite Unschuld's translation.** It is in copyright (UC Press). Our
English rendering is original.

---

## Qi Se reading — Partial

| Field | Value |
|---|---|
| Work | 黃帝內經·靈樞 |
| Chapter | 卷八·五色第四十九 (ch. 49) |
| Retrieved text | The 明堂 / 闕 / 庭 / 蕃 / 蔽 facial topography, and 「赤色出兩顴，大如拇指者，病雖小愈，必卒死」. |
| Rights | Public domain by age. |

**The audit records a specific defect: "the Su Wen chapter reference has no
recorded edition or translation."** That defect is *not* closed by this file. The
Lingshu ch. 49 material above is established; the Su Wen reference the audit
refers to is a separate citation elsewhere in the repo and still needs
identifying.

**Hard constraint carried forward:** 靈樞·五色 attaches an explicit mortality
prediction to malar erythema. Under `DR-2026-08-17-B020-CLASS-A` (R12, R13) no
part of that gloss may surface, and the malar gate's copy stays non-specific.

---

## Twelve Palaces 十二宮 — Partial

| Field | Value |
|---|---|
| Work | 神相全編 (*Shenxiang quanbian*) |
| Chapter | 十二宮相論, position 9 in the table of contents |
| Edition | Ming 致和堂藏板, 十二卷首一卷, recorded by Shuge as 旧题宋陈抟撰，明袁忠彻订正 |
| Authorship | Compiled by 袁忠徹 Yuan Zhongche (1367–1458), early Ming — Kohn (1986). The 陳摶 Chen Tuan attribution is a lineage claim, not authorship. Mei Chun (2016) argues even the Yuan Zhongche editorship is tenuous; earliest extant preface is 倪岳 Ni Yue (1444–1501). |
| Rights | Public domain by age. Shuge's scan carries no explicit licence — reference only, do not redistribute the image files. |

**Chapter body NOT retrieved.** Three primary-text hosts blocked automated
retrieval (ctext.org 403; shidianguji.com and baike.baidu.com robots.txt). We can
prove the chapter exists; we cannot yet quote it. **Per-palace locators are
missing**, which is what R8 needs in order to be dispositioned properly.

---

## Five Mountains 五岳 and Four Rivers 四瀆 — Established

| Field | Value |
|---|---|
| Works | 太清神鑑 (*Siku Quanshu* recension); 神相全編 via 欽定古今圖書集成 藝術典 vol. 632; 人倫大統賦 with 薛延年 commentary (*Siku* recension) |
| Authorship — 太清神鑑 | **Anonymous Song compilation.** The 四庫 editors (紀昀, 陸錫熊, 孫士毅, September 1781) rejected the 後周·王朴 attribution — 「其為依托無疑」 — and struck Wang Pu's name from the title. Do not cite Wang Pu as author. |
| Authorship — 人倫大統賦 | **Best-attested source in the dossier.** 張行簡, 大定十九年 (1179) *jinshi*, 禮部尚書 under the Jin, biography in the *Jin shi*. Commentary by 薛延年, preface dated 皇慶二年 (1313). |
| Rights | Public domain. Wikisource transcriptions carry `{{PD-old}}`. |

**Note the machine-punctuation caveat:** the Wikisource *Gujin Tushu Jicheng*
pages carry a `{{Machine punctuation}}` template. The characters are PD; the
punctuation layer is separately sourced.

These two families were not in the original audit table and will need adding
when B-025 lands.

---

## Three Sections 三停 — Missing

See `docs/ACQUISITION_THREE_SECTIONS.md`. **The weakest evidential position of
any family.** Status is not upgraded here and must not be upgraded until a
recension is actually retrieved and checked.

---

## Proportion harmony — resolved by decision, not by evidence

`DR-2026-08-17-B020-CLASS-A` (R2) records that Harmony is **not** a traditional
construct. It is a computed proportion score, labelled as ours. The audit's
defect — "the neoclassical proportion source is unspecified" — is therefore not
a source gap to close but a labelling requirement to meet.

**This does not clear `harmony-v1`.** It changes what clearing it requires:
an honest label and a recorded decision, rather than a classical citation.
