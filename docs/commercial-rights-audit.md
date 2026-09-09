# Commercial rights audit

Status: **BLOCKED — not commercially cleared**

Last reviewed: 23 August 2026

This document is the release record, not an assertion that unfinished work is
complete. No paid build or store submission may describe the six reading
families as commercially cleared while the manifest and provenance registry
remain pending.

| Content family | Translation/edition rights | Legal approval | Release |
|---|---|---|---|
| Five Elements | Evidence required | Evidence required | Blocked |
| Three Sections | Evidence required | Evidence required | Blocked |
| Twelve Palaces | Evidence required | Evidence required | Blocked |
| Qi Se reading | Evidence required | Evidence required | Blocked |
| Proportion harmony | Evidence required | Evidence required | Blocked |
| Composed Qi Se passages | Evidence required | Evidence required | Blocked |

## Evidence standard

Each family needs all of the following before its status can become `cleared`:

1. a named edition and page/chapter locator for every tradition claim;
2. a written translation/publication licence or a documented public-domain
   determination for every source text and translation;
3. a signed contributor agreement for modern commentary;
4. written legal approval covering the intended paid territories and stores;
5. evidence files recorded in `commercial-rights-manifest.json` with SHA-256
   hashes so the approval checked for release is the approval actually signed.

The release check validates the evidence paths and hashes. Changing a status
word without supplying the signed evidence does not open the gate.

## Current source defects

- The Mian Xiang source is unspecified.
- The Su Wen edition is recorded, but the citation has not been independently
  verified and its public-domain basis is not commercial/legal clearance.
- The neoclassical proportion record now points to modern anthropometric studies
  that challenge the canons as population norms. Those studies are negative
  evidence, not a heritage source or a publication-rights clearance.
- Four classical construct records now have source-level public-domain-by-age
  evidence, but scan/surrogate terms, project translation rights, contributor
  agreements and written legal approval remain separate gates.
- Repository editorial copy has no recorded contributor agreement.


Until those defects are resolved, the product may be tested as an unreleased
experience but must not enter a paid or store-production release lane.

## Who owes what (merged from `docs/RIGHTS_CLOSURE.md`, prepared 19 August 2026, merged 9 September 2026)

The evidence standard above breaks down per family as: **Have** — evidence exists in the repo; **Partial** — material exists, not to the audit's standard; **Missing** — nothing.

| Family | 1 locator | 2 rights | 3 contributor | 4 legal | 5 hashed |
|---|---|---|---|---|---|
| Five Elements | **Have** | **Have** | Missing | Missing | Missing |
| Three Sections | **Partial** | **Have** | Missing | Missing | Missing |
| Twelve Palaces | **Partial** | **Have** | Missing | Missing | Missing |
| Qi Se reading | **Partial** | **Have** | Missing | Missing | Missing |
| Proportion harmony | **Missing** | n/a | Missing | Missing | Missing |
| Composed Qi Se passages | n/a | **Have** | Missing | Missing | Missing |

**Five Elements 五形人.** Exists: 靈樞·陰陽二十五人 quoted verbatim from a retrieved public-domain text; anonymous Han composite; five face descriptors and the twenty-five-type structure recorded, public domain by age. Missing: a page/juan locator in a named edition rather than a web transcription; legal sign-off that the reduction is described honestly. Who: product owner selects the citable edition, counsel for the claim wording. Artifact: an edition citation line per claim, a legal memo. Affects free and paid — the reduction claim appears in free content.

**Three Sections 三停.** Exists: the 「三停平等，富貴榮顯」maxim, attributed to 麻衣神相 by two independently retrieved secondary sources. Missing: primary-edition verification — three primary hosts blocked automated retrieval, and the single maxim is the entire evidential basis for the balanced-thirds idea, disputed-authorship text. Who: a researcher with physical or licensed digital access to a 麻衣相法 recension. Artifact: a photograph or licensed scan of the page, with edition and folio. **This is the weakest evidential position of any family.** (Note: a separate, independently-acquired witness for a *different* Three Sections predicate — 平等, not the 富貴榮顯 fortune maxim — was later hash-verified via Kanripo; see `docs/heritage-evidence/PROJECT_OWNED_SOURCE_REGISTER.md`. It does not close this specific acquisition task — the two are parallel, not duplicate, efforts.)

**Twelve Palaces 十二宮.** Exists: chapter 十二宮相論 verified at position 9 in the 神相全編 table of contents (Ming 致和堂藏板); Kohn (1986) confirms compilation by 袁忠徹, early Ming. Chapter body not retrieved. Missing: the chapter text, per-palace locators, disambiguation from the Zi Wei Dou Shu system that shares all twelve names. Who: researcher for the text. Artifact: chapter transcription with folio references.

**Qi Se reading.** Exists: the measurement is ours; the interpretive vocabulary draws on 望診 and the 五色 material, with 靈樞·五色 retrieved verbatim. Missing: the Su Wen chapter reference has no recorded edition or translation; confirmation that no 五色 mortality gloss can surface. Who: product owner for the edition, counsel for the gate interaction. Artifact: edition citation, a test proving the gate's precedence (R12/R13). Affects free and paid — Qi Se is the free core.

**Proportion harmony.** Exists: nothing — the audit records the neoclassical proportion source as unspecified. Missing: everything, or a decision that it has no source because it is our own measure (R2, `DR-2026-08-17-B020-CLASS-A`). Who: product owner — if R2 is accepted, this family stops needing locator/rights evidence and needs only an honest label. **Cheapest row to close.**

**Composed Qi Se passages / Reflection corpus.** Exists: all prose is original to this project; no copyrighted translation is reproduced. The source material names what must never be copied: Unschuld, Bridges, Yap, McCarthy, Kohn, Mei, Xing Wang, and all 點校 editions (per 中華書局 v. 國學時代, Beijing First Intermediate People's Court, 2013). Missing: a signed contributor agreement for modern commentary — the corpus was authored inside an agent session, and its provenance/licensing must be recorded by a person who can actually sign. Who: product owner, recording authorship and assigning rights. Artifact: a contributor/authorship record covering `src/qise/reflection-corpus.js`, and a hash of the corpus file at the reviewed version. Affects paid primarily, recommended for free.

**Two hazards outside the family table.** WHO terminology is CC BY-NC-SA 3.0 IGO — NonCommercial — and this product has a paywall architecture, so WHO's TCM terminology cannot be embedded in a paid build without separate permission (the current corpus does not use it; this constrains future corpus work only). ctext.org prohibits automated bulk download; reasonable excerpts may be quoted, but it must not be scraped for a corpus.

**Order of closure.** (1) Reclassify Proportion harmony under R2 — product owner alone, closes a family. (2) Record an authorship record for the reflection corpus — product owner alone. (3) Select editions for Five Elements and Qi Se, then hash — product owner. (4) Verify Three Sections against a primary recension — needs library or licensed access. (5) Transcribe the Twelve Palaces chapter. (6) Legal review, once 1–5 exist. Steps 1–3 require only the product owner.
