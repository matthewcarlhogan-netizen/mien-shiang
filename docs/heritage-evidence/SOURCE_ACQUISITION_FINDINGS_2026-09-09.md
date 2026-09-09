# Source acquisition — findings, 9 September 2026

**Who did this work.** `docs/SOURCE_ACQUISITION_COMMISSION.md` was written for a human
researcher with classical-Chinese reading ability and institutional library access, on the
premise that automated retrieval had already been tried and had failed. The product owner has
since stated there is no separate researcher — "it is just us" — and asked Claude to do this
work directly, to the best of its ability, with an explicit instruction not to fabricate. This
note records what was actually retrieved this session via `WebSearch`/`WebFetch` against public
sources, what remains unretrieved, and — once — a caught and corrected error in the retrieval
process itself, left in rather than quietly fixed, because the commission's whole premise is that
a documented near-miss is worth more than a silently-discarded one.

**What this is not.** This is not the physical-library, licensed-database research the commission
originally specified. Claude has no institutional access, cannot photograph a physical book, and
did not download or hash image files — the citations below point at stable Wikimedia
Commons/Wikisource URLs rather than a locally hashed scan. Both tasks below produced a **better**
evidentiary position than existed before this session, but neither fully closes the commission's
original deliverable list. Treat this as an intermediate result, not a substitute for a domain
specialist with archive access if one ever becomes available.

---

## Task 1 — Three Sections maxim: found, with an important caveat on attribution

**Deliverable produced.** The maxim "三停平等，富貴榮顯" ("when the three sections stand equal,
wealth, rank and honour are manifest") is verbatim present in a real, dateable, public-domain
primary source:

- **Edition:** 《欽定古今圖書集成》(Qinding Gujin Tushu Jicheng — the Kangxi-commissioned
  encyclopedia, compiled 1700–1725, first printed 1728 in copper movable type under the
  Yongzheng emperor), 博物彙編 → 藝術典 → 相術部 (Physiognomy Section), 卷632 (juan 632).
- **Locator:** Wikisource transcription page
  `Page:Gujin_Tushu_Jicheng,_Volume_473_(1700-1725).djvu/23`
  (https://zh.wikisource.org/wiki/Page:Gujin_Tushu_Jicheng,_Volume_473_(1700-1725).djvu/23),
  backed by a Wikimedia Commons scan of djvu Volume 473, page 23.
- **Section heading:** 三才三停論 ("Discourse on the Three Powers and the Three Sections"),
  sub-heading 身相三停.
- **Exact surrounding text, quoted verbatim** (from the proofread Wikisource transcription):
  > 自髮際至眉為上停，眉至準頭為中停，準頭至地閣為下停。《訣》曰：「上停長，老吉昌，中停長，
  > 近君王，下停長，少吉祥，三停平等，富貴榮顯，三停不均，孤夭貧賤。」

**The attribution finding — read this before citing it as "Ma Yi Xiang Fa says."** The passage is
introduced by `《訣》曰：` — "the formula says" — not by a named book title, and not inside any of
the juan (636–641) that this same compilation organises under an explicit 麻衣 heading. In other
words: **this primary source corroborates that the maxim genuinely circulated as classical
physiognomic doctrine, but it does not itself attribute the maxim to 麻衣相法/麻衣神相.** The
attribution to Ma Yi Xiang Fa specifically comes only from the modern secondary sources
(Sohu/Zhihu-style summaries) already known before this session — none of which cite a locatable
edition. This is exactly the heading-vs-verse-vs-gloss distinction
`docs/SOURCE_ACQUISITION_COMMISSION.md` asked a researcher to resolve, and the honest answer is:
**verse, unattributed by name, in a different (but real, dated, primary) text than the one the
maxim is popularly credited to.**

**A retrieval error caught and corrected in the same session, left visible on purpose.** The first
`WebFetch` pass against djvu page 22 of the same volume claimed to find the maxim there, complete
with a fabricated-sounding attribution analysis. A second, independently-prompted fetch of the
same page returned completely different content (a "Nine Planets" facial-correspondence passage,
ending mid-sentence at the start of the 三才 discussion) with no trace of the maxim. The true
location was page 23, one page later, confirmed by a third, narrowly-scoped fetch quoting the
exact 200 characters preceding the maxim. **Do not trust the page-22 claim; it was wrong and is
superseded by the page-23 finding above**, which was independently re-verified twice.

**What is still not retrieved.** A Ming or Qing edition of 麻衣相法/麻衣神相 itself, carrying this
maxim under its own name. `docs/SOURCE_ACQUISITION_COMMISSION.md`'s Task 1 deliverable #1
("a photograph or licensed scan of the page… — or a documented negative result") is therefore
**partially satisfied**: a real primary citation exists, but not the specific named recension the
commission was written to find. Chinese Text Project (ctext.org) was not queried by automated
fetch in this session, per the commission's own instruction that scraping it is against its terms
— only manual, human consultation of ctext.org is licensed by that instruction, which this session
cannot perform.

---

## Task 2 — Twelve Palaces chapter body: found, from a second primary source, with a proofreading caveat

**Deliverable produced.** The same Gujin Tushu Jicheng physiognomy section carries a Twelve
Palaces treatment, explicitly filed under the heading **神相全編一** ("Shen Xiang Quan Bian, part
one") — i.e., this juan is the encyclopedia's own excerpting of 神相全編, which is the exact text
`docs/SOURCE_ACQUISITION_COMMISSION.md` Task 2 was written to retrieve, reached by a different
route than ctext.org.

- **Locator:** 卷631 (juan 631), sections **十二宮訣** and **十二宮總訣**, Wikisource pages
  `Page:Gujin_Tushu_Jicheng,_Volume_473_(1700-1725).djvu/12` and `…/13`.
- **Important caveat, and the reason this is graded lower-confidence than Task 1's finding: both
  pages are marked on Wikisource as `此页尚未校对` — "this page has not yet been proofread."**
  That is a real, native Wikisource editorial status meaning the transcription is unvalidated OCR,
  not yet checked by a human editor against the scan image. Treat the exact wording below as
  provisional, not `VERIFIED_PRIMARY`-grade, until someone (ideally with the source image open
  side-by-side) confirms it character-for-character.

**Palace names as the source gives them (independently re-verified against the raw
transcription, not just the first summarizing pass):**

| Palace | As given in this source | Facial location (as stated) |
|---|---|---|
| 命宮 | 命宮 | between the eyebrows, above 山根 (mountain root) |
| 財帛 | 財帛 (no 宮 suffix in the verse form) | the nose |
| 兄弟 | 兄弟 (verse form; listed 兄弟宮 in the total-verse heading) | both eyebrows |
| 田宅 | 田宅 | the eyes |
| 男女 | 男女 (a.k.a. "淚堂", tear hall) | beneath the eyes |
| 奴僕 | **奴僕**, at 地閣, "水星" | the chin/jaw |
| 妻妾 | **妻妾宮**, at "魚尾" (fish tail) | the outer eye corners |
| 父母宮 | 父母宮 | 日月角 (sun/moon corners of the forehead) |
| 疾厄, 遷移, 官祿, 福德, 相貌 | named in the 十二宮總訣 heading list; wording not individually re-verified this session | not extracted in detail — lower priority once the two contested names were confirmed |

**The specific question the commission asked — settled, provisionally.** The commission's Task 2
deliverable #2 asked which names the source actually uses: **妻妾宮 and 奴僕宮, not 夫妻宮 or any
other modern substitution.** This matches, and independently corroborates from a second primary
compilation, what `src/heritage/evidence.js:400-401` already records at `VERIFIED_PRIMARY`
strength from a different source (太清神鑑, folio `<pb:KR3g0045_WYG_001_17b>`) — including the
same "魚尾" (fish tail) location for 妻妾宮 given in both sources, which is a real point of
cross-source agreement worth noting. This finding does **not** upgrade the existing
`VERIFIED_PRIMARY` record (that was already at the top evidence tier); it adds a second,
independent primary source agreeing with it, from an unproofread transcription that should itself
be treated as provisional until validated.

**What this does not resolve.** Per-palace facial-region mapping for the remaining eight palaces
was not individually re-verified; the Wikisource proofreading gap means a careful re-check against
the scan image is still worth doing before treating any of this juan's wording as citation-grade.
Chinese Text Project's own 十二宮相論 chapter (the commission's originally-named target, at TOC
position 9 in the 致和堂藏板 edition) was not retrieved — this session found the same content by a
different, public-domain route instead.

---

## What these findings do and do not authorise

Per `docs/SOURCE_ACQUISITION_COMMISSION.md`'s own closing section: **neither task clears a content
family.** They satisfy part of one of five requirements — a named edition and locator per
tradition claim. Contributor determination, legal/rights approval and hashing remain open
regardless of this session's findings. In particular, this note does not change
`SURROGATE_RIGHTS_NOT_DECLARED` status anywhere, and does not by itself justify promoting any
`runtimeStatus`/`verificationStatus` field — that is Decision Card 10's question, addressed
separately in `docs/DECISION_REGISTER.md`.
