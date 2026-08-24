# Response to Claude heritage review — 23 August 2026

> **Update, 24 August 2026:** see `docs/HERITAGE_RECONCILIATION_2026-08-24.md`.
> Questions 4 and 7 below are superseded by that reconciliation pass. Question
> 6 (stable source identity from an actual acquisition run) remains fully
> open and is the recommended next unit of work.

## Review status

This is an implementation response, not a request for scholarly sign-off. The
branch is `feature/claude-heritage-review` and the draft pull request is #35.
Claude should review the actual diff before approving any source promotion.

The implementation does not invent URLs, hashes, folios, edition facts or Mien
Shiang content. Unknown evidence remains null, held or explicitly source-required.

## Process evidence requested by Claude

- `tests/heritage/falsification.test.js` contains 29 destructive mutation
  tests. The rule, mutation and named subtest for each are listed in
  `docs/HERITAGE_VALIDATOR_FALSIFICATION.md`.
- The JSON Schema metadata exception has positive and negative tests. Only the
  exact 2020-12 URI is accepted; query-string, fragment and 2019-09 variants
  are rejected in `tests/copy-lint.test.js`.
- Full local verification: 870 tests passed, 0 failed.
- Build verification: 83 files copied and all six pinned MediaPipe assets were
  copied for same-origin delivery.
- Bundle lint: 84 files scanned, 1,350 user-facing strings extracted, all copy
  and egress gates clean.
- Browser verification: 7 Playwright journeys passed.

## Disposition of the source findings

### 1. Three Sections attribution and predicate

Implemented.

- Added `ATTRIBUTION_CONTRADICTED` to the citation model.
- The received Ma Yi attribution is research-only, with the predicate
  contradiction, late blockprint/stoneprint constraint, absent critical
  edition and absent folio recorded.
- Added a separate Taiqing Shenjian volume-six section-heading record. It is
  potentially promotable but remains research-only because the body has not
  been checked.
- Removed the equality maxim from the legacy runtime view. The UI now reports
  measured section proportions only.

### 2. Twelve Palaces source hold

Implemented.

- The Baidu-hosted body is recorded as a discovery-only surrogate and held at
  recorded-not-verified.
- The Zhihetang table-of-contents entries for the Formula and Network sections
  remain distinct; the absent "Discussion" locator was removed.
- The legacy Twelve Palaces view no longer emits palace fortune, wealth or
  relationship interpretations while the chapter body is held. It shows which
  scanner regions were available and explains that heritage interpretation is
  withheld pending source review.

### 3. Four Rivers source granularity

Implemented.

- The variant now uses the section-level source ID
  `heritage-four-rivers-sxqb-shoujuan-xiangshuo`.
- The unresolved question is encoded as `UNRESOLVED` disagreement nature: it
  may be intra-text variation or an inter-text lineage split.
- The variant remains heritage-only; it cannot enter runtime prose.

### 4. Renlun witnesses

Implemented provisionally.

- Renlun Fengjian and Renlun Datong Fu are separate source records and separate
  provisional lineages.
- Neither record borrows corroboration from the other and neither is promoted.

### 5. Section and folio locators

Implemented.

- Replaced the single locator assumption with independent `sectionLocator` and
  `folioLocator` values and independent status fields.
- Verified evidence requires a verified section locator. A missing folio no
  longer downgrades a valid section locator.
- Folios remain null where no physical-edition leaf count has been performed.

### 6. Five Officers variants and category boundary

Implemented.

- The philtrum claim is not a lineage disagreement. It is an unverified claim
  with `SOURCE_REQUIRED` and `NONE_ATTESTED`.
- The tongue-including five-feature system is represented as a distinct
  related system, not a Five Officers variant.
- No source-free scholarly balance is manufactured.

### 7. Five Mountains provenance

Implemented.

- The Taiqing lineage records mountain names without importing directional
  labels from another witness.
- Jaw contour, chin point and broader lower-face zone are separate positions in
  a three-way disagreement.
- Directional cosmology is recorded separately from direction-labelled
  constituent names.
- Directional runtime wording remains held.

### 8. Stable source identity and integrity

Schema and validation implemented; values deliberately not invented.

- Source records support `sourceUrl`, `sha256`, `retrievedAt`,
  `editionFingerprint` and `surrogateRights`.
- Stable remote and local-artifact records require a valid lower-case SHA-256.
- URLs must use HTTPS; hashes require retrieval and edition metadata.
- Shidian remains discovery-only and cannot be promoted to verified citation.
- Actual Kanripo commit IDs, permanent revision URLs, extracted-text hashes and
  local PDF hashes remain research/acquisition tasks.

### 9. Translation, authorship and display boundary

Implemented.

- Translation provenance is a closed enum:
  `PROJECT_ORIGINAL`, `PUBLIC_DOMAIN_TRANSLATION`, or
  `NOT_TRANSLATED_HERITAGE_ONLY`.
- Runtime prose cannot use the non-translated state and project-original prose
  requires a registered translation agent.
- Agent-produced project copy records `repository-editorial` as its provenance
  identity.
- Taiqing Shenjian is described as a Song-era text attributed to Wang Pu, with
  the attribution contested; no runtime or source title says "by Wang Pu".
- Runtime heritage strings pass the same copy restrictions as Module A.

## Three requested amendments

- Alias witnesses now identify their provenance: the inspection-officer
  spelling from Taiqing and its alternate spelling from Shenxiang Quanbian are
  source-witnessed aliases, not an unattributed normalization.
- The Taiqing cross-family locator is volume four, "Discussion on observing
  form, spirit, body and image"; it does not inherit a volume-two locator.
- Three Sections is contradicted rather than merely unverified, and the Taiqing
  volume-six alternative is represented without premature promotion.

## Reader-language boundary

Canonical source text remains in the internal research ledger because removing
it would destroy witness identity. It is not exposed to the reader.

All reader-facing labels, readings, summaries, share cards and source-review
messages are English-only. The guard in `tests/ui-language.test.js` checks:

- every reader-facing source literal outside the internal heritage/provenance
  ledger;
- every reachable Reflection Engine output and attribution;
- every runtime heritage lineage;
- legacy stored records containing old Chinese display fields, proving those
  fields cannot leak through current screen or share models.

## Questions still requiring Claude/source review

1. Read the Taiqing Shenjian volume-six Three Sections body and return the exact
   edition, section text, section status and folio if available.
2. Read both adjacent Zhihetang Twelve Palaces sections from the blockprint;
   keep their contents separate.
3. Compare the Shenxiang Quanbian head-volume Four Rivers passage with the
   volume-two Four Rivers body and decide only whether the evidence supports an
   intra-text disagreement.
4. Establish the independent bibliographic identity, date and authorship of
   Renlun Fengjian without merging it with Renlun Datong Fu.
5. Count physical-edition leaves for the selected citation copies.
6. Return stable source URLs, exact revision/commit identifiers, retrieval
   dates and hashes from acquired artefacts. Do not return provider guidance as
   if it were a retrieved evidence record.
7. Determine surrogate rights separately from public-domain-by-age status of
   the underlying work.

Until those questions are answered, the corresponding records remain held and
the UI renders an explicit source-review abstention rather than unsupported
heritage prose.
