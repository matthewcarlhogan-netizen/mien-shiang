# Commercial rights — closure checklist

**Status: all six families `Blocked`. Nothing below is approved or complete.**
Prepared 17 August 2026 against `docs/commercial-rights-audit.md` and
`docs/commercial-rights-manifest.json`.

The audit sets six evidence requirements per family. B-020 supplied material
toward **items 1 and 2 only**, and only partially. Items 3–6 require named
humans and cannot be produced here. This document turns "Blocked" into a list of
who owes what.

## The six requirements, restated

1. a named edition and page/chapter locator for every tradition claim;
2. a written translation/publication licence, or a documented public-domain determination, for every source text and translation;
3. a signed contributor agreement for modern commentary;
4. review by a named, qualified Mian Xiang cultural reviewer, with a log of contested interpretations and the resulting wording decisions;
5. written legal approval covering the intended paid territories and stores;
6. evidence files recorded in `commercial-rights-manifest.json` with SHA-256 hashes.

## Status by family

Legend — **Have**: evidence exists in the repo. **Partial**: material exists, not to the audit's standard. **Missing**: nothing.

| Family | 1 locator | 2 rights | 3 contributor | 4 cultural | 5 legal | 6 hashed |
|---|---|---|---|---|---|---|
| Five Elements | **Have** | **Have** | Missing | Missing | Missing | Missing |
| Three Sections | **Partial** | **Have** | Missing | Missing | Missing | Missing |
| Twelve Palaces | **Partial** | **Have** | Missing | Missing | Missing | Missing |
| Qi Se reading | **Partial** | **Have** | Missing | Missing | Missing | Missing |
| Proportion harmony | **Missing** | n/a | Missing | Missing | Missing | Missing |
| Composed Qi Se passages | n/a | **Have** | Missing | Missing | Missing | Missing |

## Per family

### Five Elements 五形人

- **Exists:** 靈樞·陰陽二十五人 quoted verbatim from a retrieved public-domain text; anonymous Han composite; five face descriptors and the 25-type structure recorded. Public domain by age.
- **Missing:** a page/juan locator in a *named edition* rather than a web transcription. Cultural review of the 5-vs-25 reduction. Legal sign-off that the reduction is described honestly.
- **Who:** product owner selects the citable edition; cultural reviewer for the reduction; counsel for the claim wording.
- **Artifact:** an edition citation line per claim; a signed reviewer log; a legal memo.
- **Hashed:** the edition citation table, the reviewer log PDF, the legal memo.
- **Affects:** free **and** paid. The reduction claim appears in free content.

### Three Sections 三停

- **Exists:** the 「三停平等，富貴榮顯」 maxim, attributed to 麻衣神相 by two independently retrieved secondary sources.
- **Missing:** primary-edition verification. The dossier could not retrieve any Ming or Qing edition body text — three primary hosts blocked automated retrieval. **The single maxim is the entire evidential basis for the balanced-thirds idea**, and its text is disputed-authorship.
- **Who:** a researcher with physical or licensed digital access to a 麻衣相法 recension. Cultural reviewer on whether the maxim can carry a construct.
- **Artifact:** a photograph or licensed scan of the page, with edition and folio.
- **Hashed:** the scan and its citation record.
- **Affects:** free and paid. **This is the weakest evidential position of any family.**

### Twelve Palaces 十二宮

- **Exists:** chapter 十二宮相論 verified at position 9 in the 神相全編 table of contents (Ming 致和堂藏板). Kohn (1986) confirms compilation by 袁忠徹, early Ming. Chapter **body not retrieved**.
- **Missing:** the chapter text. Per-palace locators. Cultural disposition on R8 (妻妾宮, 奴僕宮). Disambiguation from the Zi Wei Dou Shu system that shares all twelve names.
- **Who:** researcher for the text; cultural reviewer for R8 and for the homonym risk.
- **Artifact:** chapter transcription with folio references; reviewer log covering R8.
- **Hashed:** transcription, reviewer log.
- **Affects:** free and paid.

### Qi Se reading

- **Exists:** the measurement is ours. The interpretive vocabulary draws on 望診 and the 五色 material; 靈樞·五色 retrieved verbatim.
- **Missing:** the audit records "the Su Wen chapter reference has no recorded edition or translation". Cultural review of the colour vocabulary. Confirmation that no 五色 mortality gloss can surface (dossier §7).
- **Who:** product owner for the edition; cultural reviewer for vocabulary; counsel for the gate interaction.
- **Artifact:** edition citation; reviewer log; a test proving the gate's precedence once the gate exists (R12/R13).
- **Hashed:** citation record, reviewer log.
- **Affects:** free and paid. Qi Se is the free core.

### Proportion harmony

- **Exists:** nothing. The audit records "the neoclassical proportion source is unspecified".
- **Missing:** everything, **or** a decision that it has no source because it is our own measure (R2).
- **Who:** product owner. If R2 is accepted, this family stops needing items 1–2 and needs only an honest label.
- **Artifact:** a recorded decision in `DECISION_REGISTER.md` reclassifying it as a computed score.
- **Hashed:** the decision record.
- **Affects:** free and paid. **Cheapest row to close — R2 closes most of it.**

### Composed Qi Se passages / Reflection corpus

- **Exists:** all prose is original to this project. No copyrighted translation is reproduced. The dossier's rights section names what must never be copied: Unschuld, Bridges, Yap, McCarthy, Kohn, Mei, Xing Wang, and all 點校 editions (per 中華書局 v. 國學時代, Beijing First Intermediate People's Court, 2013).
- **Missing:** the audit's requirement 3 — a **signed contributor agreement for modern commentary**. The corpus was authored inside this session. Its provenance and licensing must be recorded, and the author is not a person who can sign.
- **Who:** product owner, recording authorship and assigning rights.
- **Artifact:** a contributor/authorship record covering `src/qise/reflection-corpus.js`.
- **Hashed:** the authorship record and a hash of the corpus file at the reviewed version.
- **Affects:** paid primarily; recommended for free.

## Two hazards outside the family table

**WHO terminology is CC BY-NC-SA 3.0 IGO — NonCommercial.** The project has a
paywall architecture. WHO's TCM terminology cannot be embedded in a paid build
without separate permission. The current corpus does not use it; this is a
constraint on future corpus work.

**ctext.org prohibits automated bulk download.** Reasonable excerpts may be
quoted. Do not scrape it for a corpus.

## Order of closure

1. **R2** — reclassify Proportion harmony. Product owner alone. Closes a family.
2. **Authorship record** for the reflection corpus. Product owner alone.
3. **Edition selection** for Five Elements and Qi Se. Product owner, then hash.
4. **Cultural reviewer engaged** — carries R3, R6, R8, R9 and requirements 4 across all families. This is the long pole and nothing downstream moves without it.
5. **Three Sections primary verification.** Needs library or licensed access.
6. **Twelve Palaces chapter transcription.**
7. **Legal review** once 1–6 exist.

Steps 1–3 are yours today. Step 4 is a hire or an engagement. **No step here can
be marked complete by me, and none is.**
