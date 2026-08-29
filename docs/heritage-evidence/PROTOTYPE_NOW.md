# PROTOTYPE NOW

The pinning pass closed the evidence gap for five constructs. What actually
blocks a prototype — split by how far the prototype goes.

## Smallest historically solid showcase corpus

Recommended: **Facial Three Sections as the hero, Four Rivers + Five Officers +
Five Mountains as "the tradition says / your camera can't measure this" heritage
cards, Five Forms as a like-with-like note.** Rationale per construct:

| construct | pinned? | measurable by this scanner? | prototype role |
|---|---|---|---|
| **Facial Three Sections** (太清神鑑 卷五 論靣部, `tq-j5-mianbu-santing`) | ✅ `VERIFIED_PRIMARY`, byte-pinned folio | ✅ **`SUPPORTED_2D`** — `geometry.js` already measures facial thirds | **HERO.** Measured thirds + the attributed 太清 line + the 相稱/平等 disagreement note. This is the one place the scanner geometry and a pinned classical line coincide. |
| **Four Rivers** (太清 卷二, `tq-j2-sidu`; 3 witnesses agree) | ✅ `VERIFIED_PRIMARY` | ✗ `CAMERA_GEOMETRY_INSUFFICIENT` (rim depth, ear geometry) | heritage card: "the tradition maps 耳=江 口=河 目=淮 鼻=濟 and asks that the four 'flow' and have 'formed banks' — a frontal photo cannot recover that." 3-witness agreement is a strong honesty story. |
| **Five Officers** (太清 卷二, `tq-j2-wuguan`) | ✅ `VERIFIED_PRIMARY` | ~ `CONDITIONALLY_SUPPORTED` | heritage card + the **4-of-5-title disagreement** with 人倫大統賦 (`five-officers-titles`) — a good demonstration of "sources differ, we show both". |
| **Five Mountains** (太清 卷二 + 月波 + 人倫) | ✅ membership `VERIFIED_PRIMARY` | ✗ `CAMERA_GEOMETRY_INSUFFICIENT` | heritage card showing the shared 衡/恒/泰/華/嵩 mapping **and** the 頥/頷/頦 three-term disagreement. **Do not route** to a single witness (Decision 1) — present it unrouted. |
| **Five Forms** (玉管 似X得X, `yg-j1-wuxingxing`) | ✅ `VERIFIED_PRIMARY` (the like-with-like passage) | ✗ `MODERN_MAPPING_UNSUPPORTED` | a note only: "玉管照神局 reads 似金得金…似土得土 — like-with-like. This is not the modern oval/heart/diamond taxonomy, and not the 25-type structure (that is 靈樞, a medical text)." Pending Decision 2, keep the 25-type disclosure out or attribute it to 靈樞. |
| **Twelve Palaces** | construct pinned (太清 卷一); **shipped mapping unpinned** | ~ | **leave out of the prototype** unless the received-Mayi mapping question (Decision 3) is resolved. The construct is attested but the geometry the product ships (財帛宮 = nose) disagrees with the one pinned witness. |

This corpus does **not** need: the Stage-3 connector rendering layer, `safetyPassed`,
`ABSTRACT_LINEAGE_OVERRIDES`, a multi-witness render architecture, a pinned
神相全編/麻衣 witness, or commercial-rights closure.

---

## INTERNAL PROTOTYPE BLOCKERS

*(only what's needed for us to exercise the product end-to-end ourselves)*

1. **Encode the facial Three Sections lineage** — `GEMINI_IMPLEMENTATION_MANIFEST.md`
   Group 3c EV-05 (new `threeSections.lineages["taiqing-mianbu-facial"]`,
   `measurementAvailability: "SUPPORTED_2D"`). Without it there is no pinned
   facial line to display. ~1 evidence.js edit + source record SR-05.
2. **A Tier-1 reading surface that renders: measured thirds → the attributed
   太清 line → the `three-sections-predicate` disagreement note.** The
   `sourcesNote()` pattern in `readingview.js` and the Qi Se Tier-1 path already
   do the render shape; this is wiring the new lineage in, not new UI.
3. Nothing else. The connector layer stays fail-closed/suppressed (Stage 3 is
   not on this path). No safety signal needed. Placeholder icons are fine.

**Not a blocker:** the CC BY-SA 4.0 rights question (internal use only), the
Decision 1/2/3 memos (the prototype presents unrouted / Three-Sections-only),
PR #40.

---

## USER-TEST PROTOTYPE BLOCKERS

*(before showing external testers — additive to the above)*

1. **Extend the showcase to the Four Rivers / Five Officers / Five Mountains
   heritage cards** (Groups 3–5 of the manifest: the locator pins, the
   `five-officers-titles` and expanded `five-mountains-northern-region`
   disagreements). All heritage-only, all `RESEARCH_ONLY` / `HERITAGE_PRESENTATION_ALLOWED`
   — no runtime inference, so no safety authorization needed.
2. **Confirm the English-only reader boundary covers the new surfaces** —
   `tests/ui-language.test.js` currently does not scan `heritage-view.js`; the
   new Tier-1 heritage cards must be scanned, and Chinese must stay in evidence
   fields only (CLAUDE.md item 9 / PR #40 Round 5 finding #9).
3. **Copy guards on the new attributed lines** — every new user-facing string
   must be tradition-attributed, name its source inline, carry no health
   vocabulary, deliver no verdict (CLAUDE.md item 19). Register any new reading
   surface in `MODULE_A_COPY`.
4. **Decision 2 (25-type) resolved or the disclosure removed** — a user-test
   build should not tell testers "the source has 25 types" while that is
   unattributed to any physiognomic source. Pick option B or C from
   `PRODUCT_OWNER_DECISIONS.md`.
5. **Decide the Twelve Palaces question (Decision 3)** — either include it with
   the shipped mapping marked `SOURCE_REQUIRED`, or leave it out. Do not show it
   as verified.

**Not a blocker:** the Stage-3 connector cards (leave the connector layer off),
`safetyPassed`, commercial-rights closure, a pinned 神相全編 witness.

---

## PUBLIC RELEASE BLOCKERS

*(do not block an internal or user-test prototype)*

1. **CC BY-SA 4.0 / ShareAlike — counsel.** Phase D found an explicit org-level
   CC BY-SA 4.0 declaration for the Kanripo transcriptions; its ShareAlike
   obligation is unresolved for a commercial paywalled product embedding
   substantial passages. `SOURCE_REGISTRY.surrogateRights` must not move to
   `CLEARED` without that determination (matrix SR-18). Parallel to the
   `docs/CORPUS_PROVENANCE.md` requirement-3 (contributor agreement) and 點校
   concerns.
2. **Safety authorization** — required *for the Stage-3 connector feature
   specifically* (not the rest of the product). One of
   `SAFETY_AUTHORIZATION_INTERFACE.md` §3(a)/(b). Until then the connector layer
   ships fail-closed (renders nothing).
3. **Decision 1 (Five Mountains routing)** — public copy that presents Five
   Mountains needs the product owner's D/E answer; a public build must not
   silently route to one witness.
4. **The received-Mayi Twelve Palaces mapping is still `SOURCE_REQUIRED`** — the
   geometry the product ships (財帛宮 = nose, 田宅宮 present) has no pinned
   witness and disagrees with the one pinned witness (太清 卷一). Public framing
   must say so, or the construct waits for a pinned 神相全編/麻衣 witness.
5. **神相全編 / 麻衣 remain unpinnable** — no new access route this pass. The
   Four Rivers eye/mouth dispute and the received Three Sections equality maxim
   stay one-sided in evidential quality.
6. **Translation-originality confirmation** — `docs/CORPUS_PROVENANCE.md`
   requirement 2: the project's English renderings (including the new ones in
   `PROJECT_OWNED_PINNED_PASSAGES.csv`) need a comparison against the named
   copyrighted translations before commercial release.
7. **Placeholder icons** — `icon-192/512/512-maskable.png` are placeholder art
   (CLAUDE.md). Replace before any store listing.
8. **Age/life-stage overlay on 三停 is `SOURCE_REQUIRED`** — the pinned corpus
   has no witness for it; a public reading must not attach life-stage claims to
   the three sections.
