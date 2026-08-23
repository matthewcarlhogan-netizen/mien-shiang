# Heritage research encoding handoff — 23 August 2026

## Task and acceptance criteria

Encode the source-side review of the canonical heritage library without
inventing content, resolving scholarly disagreements, changing Qi Se
measurement logic or changing locked product decisions. After Claude identified
runtime leaks, the scope was expanded to remove disputed prose and Chinese
display fields from reader-facing surfaces.

Acceptance criteria:

- source editions and locators are machine-readable;
- primary, secondary and unresolved evidence cannot collapse into one status;
- constituent-level variants remain parallel lineages;
- related systems cannot be accepted as aliases;
- source-attested combinations cannot become runtime rules without measurable,
  non-prohibited evidence;
- field-level negative findings do not masquerade as construct lineages;
- work rights, surrogate terms and commercial clearance remain separate;
- repository tests, build and bundle gates remain green.

## Inputs and source versions

- Base branch: `feature/heritage-infrastructure`.
- Base SHA: `c0e8b97354e76c6f743e5682cb2c43d6af0ee032`.
- Research input: Claude source review supplied by the product owner on
  23 August 2026.
- Classical witnesses recorded by that review: 太清神鑑, 欽定四庫全書文淵閣本;
  神相全編, 致和堂藏板明刊本; 黃帝內經·靈樞, 第六十四; received 麻衣 material;
  人倫大統賦, 薛延年注.
- Modern negative evidence recorded by that review: Farkas et al. (1985),
  Farkas, Forrest & Litsas (2000), and Jayaratne et al. (2012).

The attached review explicitly said it had not read this repository. Every
promotion and hold was therefore checked against the actual registry and its
runtime join before encoding.

## Contracts changed

- Added `WORK_RECORDED` between an unidentified source and an edition-level
  citation. Naming a work without an edition/locator no longer pretends the
  source is either wholly absent or edition-verified.
- Added primary/secondary verification states, constituent records, related
  systems, source arrays, runtime-use status and explicit surrogate-rights
  status.
- Added combination scope, render policy, measurement availability and a
  mandatory no-user-inference flag.
- Added field-level negative findings and cross-family attestation fixtures.
- The Reflection Engine now refuses `HERITAGE_ONLY` and `RESEARCH_ONLY`
  lineages even if an invalid state attempts to select them directly.

## Research decisions encoded

- Promoted to `VERIFIED_PRIMARY`: Five Elements chapter-level typology, the
  Taiqing Shenjian Five Mountains lineage, the Four Rivers primary lineage and
  the Five Officers set. Runtime eligibility remains a separate decision.
- Held at `RECORDED_NOT_VERIFIED`: Three Sections and Twelve Palaces.
- Held the 神相全編 Four Rivers reversal at `VERIFIED_SECONDARY`; it is not
  promoted until the separate 卷二 section is checked.
- Removed 五行 from Five Elements aliases and recorded it as a related but
  distinct system.
- Recorded 鑒察官 / 監察官 as orthographic aliases, not a disagreement.
- Preserved separate lineages for Three Sections boundaries, the Taiqing
  Twelve Palaces assignment, mountain-name versus directional Five Mountains,
  Four Rivers eye/mouth reversal and the unattested philtrum claim. The latter
  is `SOURCE_REQUIRED` / `NONE_ATTESTED`, not a scholarly disagreement.
- Recorded the 太清神鑑 structure-and-Qi-Se interaction as source-attested,
  heritage-only and non-operational.
- Reclassified neoclassical canons as modern negative evidence rather than a
  heritage authority.

## Files and surfaces changed

- `src/heritage/evidence.js`: source-led knowledge records and fixtures.
- `src/heritage/schema.js`: expanded machine-readable contract.
- `src/heritage/validator.js`: provenance, uniqueness, disagreement,
  combination and safety invariants.
- `src/heritage/registry.js`: joins runtime prose to the separate evidence
  layer without allowing evidence-only lineages to ship.
- `src/heritage/fixtures.js`: canonical record, cross-family and field-finding
  fixtures.
- `src/reading/provenance.js`: corrected source records and citation taxonomy.
- `src/qise/reflection.js`: runtime-use gate plus explicit source-review
  abstention, so held material produces an explained gap rather than a blank
  layer or disputed interpretation.
- Reader-facing reading, Qi Se, summary, share and UI surfaces: English-only
  labels; disputed Three Sections and Twelve Palaces heritage prose withheld.
- `scripts/lint-bundle.js`: exact JSON Schema metadata-URI exception.
- Heritage, provenance and bundle-lint tests.
- `docs/commercial-rights-audit.md`: current rights defects and negative-evidence
  posture.

The Qi Se measurement pipeline and its thresholds were not changed. The copy
corpus and visual interface were changed only where needed to enforce the
source hold and English-only reader boundary.

## Verification evidence

Environment used here: Windows NT 10.0.26200.0, PowerShell 7.6.4, Node
24.19.0, npm 11.17.0, clean local clone. This is not the Linux Codespace, so
the same commands must be rerun there or in required Linux CI before merge.

- Validator falsification sweep: 29 destructive mutations, all caught by the
  named rule tests in `tests/heritage/falsification.test.js`.
- English-only boundary: all reader-facing literals, every reachable Reflection
  Engine state, runtime lineage and legacy display-field leak test pass.
- Full suite after correction: `tests 870`, `pass 870`, `fail 0`.
- Build: `83 files copied`; `6 pinned MediaPipe assets copied`.
- Bundle lint: `84 files scanned`; `1350 user-facing strings extracted`;
  copy, attractiveness, egress and biometric-egress gates all `ok`.
- Browser suite: `7 passed`, covering consent renewal, colour check,
  accepted-frame processing, cleanup paths, Twelve Palaces navigation,
  desktop layout and same-origin inference dependencies.
- Release audit: command completed and correctly reported `Release gate:
  BLOCKED` for pending content rights, legal/store and real-device evidence.
- New swallowed errors: none found in the patch.

The open Codespace checkpoint was preserved as commit `eb05c94` on
`feature/heritage-infrastructure` before this review branch was updated. No
credentials or secrets were moved between environments.

## Unresolved research and release risks

1. Locate a critical/edition-anchored 麻衣 witness for the Three Sections
   predicate and boundaries.
2. Read the 神相全編 Twelve Palaces chapter body; do not infer it from the table
   of contents.
3. Compare 神相全編 首卷 and 卷二 Four Rivers text before promoting the variant.
4. Resolve whether 人倫風鑑 and 人倫大統賦 are distinct witnesses in this chain.
5. Add folio/page locators where only juan and section are known.
6. Do not record a Five Officers philtrum disagreement unless a witness is
   located; the current state is explicitly none attested/source required.
7. Resolve the directional Five Mountains runtime wording to an edition-level
   麻衣-lineage source.
8. Record stable source URLs or evidence files and hashes; web surrogates have
   separate terms from the public-domain works.
9. Obtain project-translation, contributor, legal and commercial approvals.

## Next owners

- Corpus Research Editor / Claude: items 1–8, returning source IDs, edition,
  locator, wording status and exact unresolved question for each result.
- Compliance and legal: item 9; public-domain-by-age is not clearance.
- Independent Release Gatekeeper: rerun `npm test`, `npm run build`,
  `npm run lint:bundle` and `npm run audit:release` in the Linux Codespace or
  required Linux CI; do not alter product thresholds or evidence statuses to
  obtain green output.
