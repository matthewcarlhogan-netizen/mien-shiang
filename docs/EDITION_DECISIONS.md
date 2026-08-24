# Edition designation and the Su Wen reference

**Two decisions prepared for the product owner, 17 August 2026.**
Both rest on evidence already in the repository. Neither clears a family.

---

# Decision 1 — designated edition families

## Recommendation

Designate **two** edition families, not one per source. Every tradition claim
cites one of them.

| Family | Edition | Date | Covers |
|---|---|---|---|
| **A** | 《四庫全書》 recension | 1781 | 黃帝內經 素問 and 靈樞; 太清神鑑; 人倫大統賦 |
| **B** | 《欽定古今圖書集成》 博物彙編·藝術典·相術部 | 1726 | 神相全編 material, including the 神異賦 and 袁柳莊雜論 commentaries |

## Why two rather than per-source picking

**They avoid the copyright trap that would otherwise catch us.** Modern
punctuated editions (點校本) attract copyright in China — 中華書局 v.
北京國學時代文化傳播公司, Beijing First Intermediate People's Court, 2013, which held
that collators express their own understanding through segmentation and
punctuation. The obvious editions to reach for in a bookshop are exactly the
ones we cannot use. Both A and B are imperial compilations, centuries out of
copyright, and carry no editorial layer we would be licensing.

**We are already using them.** Five Mountains and Four Rivers were established
from precisely these two — 太清神鑑 and 人倫大統賦 from the *Siku* recensions,
神相全編 via 藝術典 vol. 632. Designating them formalises what the evidence
already did rather than inventing a standard we then have to go and satisfy.

**They are datable and attributable.** The *Siku* editors are named (紀昀, 陸錫熊,
孫士毅) and their 提要 is itself evidence — it is how we know the 太清神鑑
attribution to 王朴 is spurious, because they said so and struck his name.
A commercial reprint gives us none of that.

**One edition family per source would be worse.** A citation record where every
claim points at a different edition is not more rigorous; it is harder to audit
and easier to drift.

## Working copies, and an honest caveat

Both families are transcribed on Chinese Wikisource, `{{PD-old}}`-tagged, and
that is what we retrieved. **Two caveats to record rather than gloss:**

1. **A transcription is not an edition.** The audit asks for "a named edition
   and page/chapter locator". The named edition is the *Siku Quanshu* or the
   *Gujin Tushu Jicheng*; Wikisource is the working copy. Locators must be given
   as juan and chapter, not as URLs.
2. **The Wikisource 藝術典 pages carry a `{{Machine punctuation}}` template.**
   The characters are public domain; the punctuation layer is machine-generated
   and separately sourced. Where punctuation changes a reading, the unpunctuated
   characters govern.

*Verification note: the existence of a 《四庫全書本》 Wikisource page for 素問 is
confirmed at search-result level only — the domain is cache-only from this
environment and could not be fetched directly. Confirm before hashing.*

## What this does not do

It does not clear any family. Requirement 1 asks for a locator **per tradition
claim**, and Twelve Palaces still has no retrieved chapter body while Three
Sections has no retrieved recension at all. This decides *which edition we cite
when we have one*.

---

# Decision 2 — the Su Wen reference

## The recorded citation, verbatim from the repo

`src/reading/provenance.js`, before this change:

```js
"suwen-ch17-unverified": Object.freeze({
  title: "Su Wen, chapter 17 (edition and translation not yet recorded)",
  citationStatus: "needs-edition-audit",
  rightsStatus: "unverified",
}),
```

The defect was written into the shipped title string. `docs/commercial-rights-audit.md`
line 41 records it as: *"The Su Wen chapter reference has no recorded edition or
translation."*

## What depends on it

More than the audit line suggests. This citation is load-bearing for the entire
Qi Se colour vocabulary:

| Depends on it | How |
|---|---|
| `src/ui/qise/palette.js` | **All five hex values** are derived from ch. 17's descriptions. Its own comment: "the reason the greens are jade rather than indigo and the yellows are realgar rather than loess". |
| `src/qise/passages.js` `CORE` | Every colour simile in the shipped passage engine — five colours × five variants. |
| `src/qise/reflection-corpus.js` | The Qi Se vocabulary inherits the same distinctions. |
| `tests/qise/ui.test.js` | Asserts every colour carries its Su Wen simile and that the CSS keeps it as a comment. |
| `docs/PROJECT_CHARTER.md` | "Chapter 17 palette similes do not authorise diagnosis." |

If the citation were wrong, the palette would be five arbitrary hex values.

## The passage — retrieved verbatim

**素問·脈要精微論第十七:**

> 夫精明五色者，氣之華也。**赤欲如帛裹朱，不欲如赭；白欲如鵝羽，不欲如鹽；青欲如蒼璧之澤，不欲如藍；黃欲如羅裹雄黃，不欲如黃土；黑欲如重漆色，不欲如地蒼。**

*Our translation:* The five colours of the bright essence are the flowering of
qi. Red should be like vermilion wrapped in white silk, not like ochre; white
like a goose feather, not like salt; qing like the lustre of a green jade disc,
not like indigo; yellow like realgar wrapped in fine gauze, not like yellow
earth; black like the colour of heavy lacquer, not like 地蒼.

## The mapping to shipped copy

| Source | Favourable | Unfavourable | Repo renders as |
|---|---|---|---|
| 赤 | 帛裹朱 | 赭 | "vermilion wrapped in white silk" / "the flat red of ochre" ✓ |
| 白 | 鵝羽 | 鹽 | "a goose feather" / "salt" ✓ |
| 青 | 蒼璧之澤 | 藍 | "jade that has been **dampened**" / "a dull blue-green" ⚠ |
| 黃 | 羅裹雄黃 | 黃土 | "realgar seen through gauze" / "the dry yellow of loess" ✓ |
| 黑 | 重漆色 | 地蒼 | "black varnish" / "the grey of **charcoal**" ⚠ |

Three of five are close renderings. **Two are interpretive and should not pass
without a reviewer:**

- **澤 rendered as "dampened".** 澤 is lustre or sheen — the quality of returning
  light. "Dampened" implies the jade has been wetted, which is a different
  image and arguably a different observation.
- **地蒼 rendered as "charcoal".** 地蒼 is closer to the dark or grey of the
  ground. Charcoal is an interpolation that may or may not carry the sense.

## Recommended disposition

1. **Record the edition.** 素問·脈要精微論第十七, *Siku Quanshu* recension (family
   A), received text per the 王冰 762 CE arrangement. Public domain by age.
2. **Retire the `-unverified` id.** Done — `suwen-ch17` now carries
   `citationStatus: "edition-recorded"`, `rightsStatus: "public-domain-by-age"`,
   `translationStatus: "original-to-this-project"`.
3. **Retain the record.** Recording an edition does not
confer a reading.

4. **Retain the two flagged renderings** as interpretive choices, not obvious translations.

**Do not assert a date for the text.** Dating is genuinely disputed: Unschuld
gives 400 BCE–260 CE, Sivin 1st c. BCE, Needham & Lu 2nd c. BCE. The received
arrangement is Wang Bing's, 762 CE, and the Song revision date is given
variously as 1053 and 1067 across sources. Cite the recension, not a year.

## What this closes

The audit's line-41 defect: **closed for the Qi Se colour vocabulary.** The
edition is recorded and the passage retrieved.

**It does not clear `qi-se-reading-v1`.** That family still needs all release evidence: named edition/locator (requirement 1), translation rights (2), contributor agreement (3), legal approval (4), and hashed evidence (5). And the audit's *other* three defects — the unspecified Mian Xiang source, the unspecified neoclassical proportion source, the missing contributor agreement — are untouched by this decision. R2 addresses the second; the first and third remain open.
