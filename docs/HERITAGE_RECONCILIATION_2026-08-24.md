# Heritage source reconciliation — 24 August 2026

## What this is

A follow-up review of `feature/claude-heritage-review` (draft PR #35) found that
most of its structure was already correct, and identified a small set of
concrete corrections plus one architectural gap. This document records what
was checked, what changed, and what remains open. It does not merge PR #35 and
does not promote any new source to `verified`/`cleared`.

## Confirmed already correct — no change needed

- **Four Rivers is already 卷二, not 卷一.** `heritage-four-rivers-primary` in
  `src/reading/provenance.js` has always pointed at "Four Rivers section, juan
  2" on this branch. Every `卷一` reference in the corpus is for Three Sections
  (神相全編) or Twelve Palaces (太清神鑑 成和子統論), never Four Rivers. No stale
  documentation was found.
- **`sectionLocator`/`folioLocator` are already independent fields** in
  `src/heritage/schema.js`, with independent status fields
  (`sectionLocatorStatus`/`folioLocatorStatus`). A missing folio (Kanripo does
  not mark them) has never downgraded a recorded section locator. This was
  already the architecture PR #35 shipped; nothing needed correcting.

## Changes made

### 1. Surrogate rights: age of the work is not the surrogate's declared status

Added `SURROGATE_RIGHTS_NOT_DECLARED` to the `surrogateRights` enum
(`src/heritage/schema.js`). It sits between `UNREVIEWED` (not yet checked) and
`PUBLIC_DOMAIN_TAGGED` (the surrogate itself carries an explicit PD notice,
e.g. Wikisource's `{{PD-old}}`): it means the surrogate has been looked at and
does **not** carry its own declared licence, even though the underlying
centuries-old work is public domain by age.

Audited every `PUBLIC_DOMAIN_TAGGED` source record and downgraded four that
were tagged on the underlying work's age alone, with no confirmed licence
statement from the specific digital transcription (Kanripo/Siku Quanshu
surrogates, KR3g0043–0046):

- `heritage-three-sections-taiqing`
- `heritage-four-rivers-primary`
- `heritage-five-mountains`
- `heritage-five-officers`

Each now carries `surrogateRights: "SURROGATE_RIGHTS_NOT_DECLARED"` and an
`authorshipNote` stating the distinction explicitly. The underlying-work
`rightsStatus` (`public-domain-by-age`) is unchanged — only the surrogate's own
status moved, and it moved to a more conservative state.

### 2. 人倫風鑑 downgraded from a provisional witness to source-required

`heritage-four-rivers-renlun-fengjian` was `WORK_RECORDED` — implying an
identified but not-yet-located work. Nothing in this repository (including
`docs/SOURCE_EDITIONS.md`, which documents 人倫大統賦's authorship in detail:
張行簡, 1179 jinshi, biography in the *Jin shi*; commentary by 薛延年, preface
1313) establishes that 人倫風鑑 exists as a bibliographic object independent of
人倫大統賦. It may be a genre descriptor or a mislabel that entered the corpus
in error.

Downgraded to `citationStatus: SOURCE_REQUIRED`, `rightsStatus: UNVERIFIED`,
`kind: "unresolved-tradition-source"` (matching the pattern used for other
unresolved-tradition entries such as `mianxiang-unspecified`). The
`renlun-fengjian-provisional` lineage in `src/heritage/evidence.js` now states
this explicitly rather than presenting it as a real, if weak, witness. It must
not be treated as a provisional witness until its origin in this project is
traced and an independent record is located.

`heritage-four-rivers-renlun-datong` (人倫大統賦 itself) is not downgraded —
its authorship is the best-attested in the corpus per `SOURCE_EDITIONS.md` —
and that authorship detail (previously `NOT_RECORDED`) is now recorded on the
source record as `ATTRIBUTED`.

### 3. Five Mountains: a real lineage split for directional naming

The `primary` Five Mountains lineage previously attributed directional naming
(南/北/東/西/中) to a generic, unlocated "麻衣-lineage form"
(`heritage-five-mountains-mayi`, `SOURCE_REQUIRED`). That attribution was
wrong: the directional scheme is witnessed by 人倫大統賦 (薛延年注) specifically,
not by an unspecified 麻衣 source.

- Added a new source record, `heritage-five-mountains-renlun-datong`, with
  edition identified (Siku Quanshu recension, per `SOURCE_EDITIONS.md`) and
  authorship attributed (張行簡/薛延年), section-level locator still required
  (`WORK_RECORDED`).
- Re-pointed the `primary` lineage's `sourceId` at this record instead of the
  generic MaYi placeholder.
- Added a fourth position to the existing `five-mountains-northern-region`
  disagreement: 人倫大統賦 witnesses the disputed northern mountain as 頦
  (chin), distinguished from 太清's 頷 (jaw / broader lower-face) term. This is
  now a four-way disagreement (太清 頷, Shenxiang Quanbian chin point, Shenyi Fu
  broader zone, 人倫大統賦 頦) rather than three.

Directional runtime wording remains held — the locator inside 人倫大統賦 has not
been independently read by this project — but the *source* attribution is now
correct instead of a placeholder pointing nowhere.

### 4. WY-02: the mutual-facing/fullness combination preserves 豐隆

The `five-mountains-mutual-facing-fullness` combination was already correctly
sourced to Taiqing 卷二 with a section locator (it was not, on this branch,
hanging off MaYi without one). What it lacked was the source's actual
predicate wording: the note paraphrased it as "mutual orientation and fullness
or projection" without preserving the term 豐隆 (fullness/plumpness) at all.
The note now quotes the fuller predicate directly:
「五嶽須要豐隆而相朝」, and glosses both 豐隆 (fullness) and 相朝 (mutual facing).

### 5. Three Sections: 卷六 is 身三停 (the body), not 面三停 (the face)

The `taiqing-section-heading` lineage previously said only that a Three
Sections heading exists in Taiqing 卷六 and that the body had not been read
closely enough to encode a definition. It now records what was found: the
construct there is explicitly **身三停** — three sections of the body, not the
face — with a differential/ranked primary predicate (not an equal-thirds
rule) and a 相稱 (proportional match) secondary predicate, not 平等 (equal).

Consequences encoded:

- `measurementAvailability` changed from `NOT_RECORDED` to `UNSUPPORTED` — a
  face-only scanner cannot measure a body-proportion construct.
- The lineage's `note` states explicitly that this must not be cited as
  support for the `three-sections-equality-mayi-received` combination.
- That combination's own note was extended with a cross-reference, so the two
  records cannot be read in isolation and mistaken for corroborating each
  other.

This is not merely "an unsupported maxim was removed" — it is a positive
finding about what Taiqing 卷六 actually says, encoded as such.

### 6. Five Officers: stronger provenance recorded

鑒察官, 眉為保壽官 (the brow) and the constituent-level Taiqing 卷二 sourcing were
already correctly encoded on this branch. Two things were not:

- The maxim 一官好則貴十年 was recorded only as a bare `note` string with no
  locator. It is now a proper `attestedCombinations` entry
  (`five-officers-one-good-office-ten-years`), sourced to Taiqing 卷二,
  `renderPolicy: HERITAGE_ONLY`, explicitly never operationalised as a
  user-facing inference.
- The 卷四「論看形神體像」 cross-family combination locator used the normalised
  character 看. The source transmits the variant 㸔. Corrected to
  「論㸔形神體像」 in both `src/heritage/evidence.js` and
  `src/reading/provenance.js`, with a note that 㸔 is retained as source
  orthography rather than normalised — the same treatment already given to
  the 鑒察官/監察官 orthographic pair.

## What is still open (unchanged by this pass)

- Folio locators for the Siku/Kanripo witnesses. Kanripo does not carry folio
  markers; this remains `NOT_RECORDED` and is not fabricated.
- Independent verification of any of the above against the actual retrieved
  bytes. Everything in this document is encoded the same way prior review
  rounds were encoded on this branch: as a research disposition
  (`RECORDED_NOT_VERIFIED` / `VERIFIED_SECONDARY`, `WORK_RECORDED` /
  `SOURCE_REQUIRED`), never as `verified`/`cleared` beyond what this project
  has itself independently checked.
- 神相全編's acquisition path remains unresolved and is intentionally not
  addressed here — it should stay quarantined from promotion rather than
  block the rest of the library.

## Next step — not done in this pass

Run a project-owned Kanripo acquisition for the volumes underlying these
witnesses (KR3g0043–0046): pin the actual commit/revision, compute hashes from
the retrieved bytes, record retrieval timestamps, and re-read the cited
passages from those exact bytes. Only after that should the validator be
allowed to promote any of the records touched here beyond their current,
deliberately-held status. Commit IDs, hashes and timestamps must come from
that acquisition run, not be copied from any AI-provided answer.

## Verification

- `npm test`: `tests 870`, `pass 870`, `fail 0`.
- `npm run build`: `83 files copied`; `6 pinned MediaPipe assets copied`.
- `npm run lint:bundle`: `84 files scanned`; `1358 user-facing strings
  extracted`; copy, attractiveness, egress and biometric-egress gates all
  `ok`.
- `npm run test:browser`: `7 passed`.
- `npm run audit:release`: completes and correctly remains `BLOCKED` (rights,
  store and real-device evidence still pending — unchanged by this pass).

Two pre-existing defects in this branch's own patch were caught by this
verification and fixed as part of this pass, not left for review to find:

- A `treat` in a new `authorshipNote` string tripped the Module A health-
  vocabulary blocklist (item 19's ordinary-English-sense trap). Reworded to
  `regard`.
- `tests/heritage/falsification.test.js` HVR-011 ("recorded combinations with
  no entries") relied on `fiveOfficers.primary` having an empty
  `attestedCombinations` array as an incidental fixture property. Adding the
  一官好則貴十年 combination made that property false, so the mutation stopped
  producing an invalid state and the test passed for the wrong reason. Fixed
  by making the mutation explicitly clear the array before setting
  `attestedCombinationsStatus: "RECORDED"`, so the test exercises the actual
  invariant regardless of the fixture's current content.
