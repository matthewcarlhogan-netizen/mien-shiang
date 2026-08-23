# Heritage research encoding handoff — 23 August 2026

## Task and acceptance criteria

Encode the source-side review of the canonical heritage library without
inventing content, resolving scholarly disagreements, changing Qi Se
measurement logic, changing locked product decisions or rewriting the runtime
heritage prose.

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
  太清神鑑 Five Mountains lineage, the Four Rivers primary lineage and the Five
  Officers set.
- Held at `RECORDED_NOT_VERIFIED`: Three Sections and Twelve Palaces.
- Held the 神相全編 Four Rivers reversal at `VERIFIED_SECONDARY`; it is not
  promoted until the separate 卷二 section is checked.
- Removed 五行 from Five Elements aliases and recorded it as a related but
  distinct system.
- Recorded 鑒察官 / 監察官 as orthographic aliases, not a disagreement.
- Preserved separate lineages for Three Sections boundaries, the 太清神鑑
  Twelve Palaces assignment, mountain-name versus directional Five Mountains,
  Four Rivers eye/mouth reversal and eyebrow versus philtrum Five Officers.
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
- `src/qise/reflection.js`: runtime-use gate only; no prose or measurement
  change.
- `scripts/lint-bundle.js`: exact JSON Schema metadata-URI exception.
- Heritage, provenance and bundle-lint tests.
- `docs/commercial-rights-audit.md`: current rights defects and negative-evidence
  posture.

No file in `src/qise/reflection-corpus.js`, the Qi Se measurement pipeline or
the visual interface was changed.

## Verification evidence

Environment used here: Windows NT 10.0.26200.0, PowerShell 7.6.4, Node
24.19.0, npm 11.17.0, clean local clone. This is not the Linux Codespace, so
the same commands must be rerun there or in required Linux CI before merge.

- Baseline: `tests 812`, `pass 812`, `fail 0`.
- Targeted heritage/provenance and Reflection Engine checks: `tests 80`,
  `pass 79`, `fail 1` exposed a test-message mismatch; after correction the
  focused heritage suite reported `tests 27`, `pass 27`, `fail 0`.
- Full suite after correction: `tests 822`, `pass 822`, `fail 0`.
- Build: `83 files copied`; `6 pinned MediaPipe assets copied`.
- Bundle lint: `84 files scanned`; `1302 user-facing strings extracted`;
  copy, attractiveness, egress and biometric-egress gates all `ok`.
- Release audit: command completed and correctly reported `Release gate:
  BLOCKED` for pending content rights, legal/store and real-device evidence.
- New swallowed errors: none found in the patch.

The Windows GitHub credential lacked the `codespace` scope. Its device-flow
refresh was cancelled before any one-time code was transmitted, and no secret
was copied from the Codespace. Gemini Flash Lite therefore did not author this
patch; an independent Gemini/Codespace rerun remains possible after the product
owner approves that narrow scope.

## Unresolved research and release risks

1. Locate a critical/edition-anchored 麻衣 witness for the Three Sections
   predicate and boundaries.
2. Read the 神相全編 Twelve Palaces chapter body; do not infer it from the table
   of contents.
3. Compare 神相全編 首卷 and 卷二 Four Rivers text before promoting the variant.
4. Resolve whether 人倫風鑑 and 人倫大統賦 are distinct witnesses in this chain.
5. Add folio/page locators where only juan and section are known.
6. Locate the source for the Five Officers philtrum variant.
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
