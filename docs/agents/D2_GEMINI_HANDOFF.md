# D-2 execution handoff — Gemini 2.5 Flash Lite

Bounded, mechanical execution package. The architecture and source analysis are complete and
frozen in `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md`. Do not re-derive them.

**Branch:** `claude/heritage-connector-relationships-d2` (from `1cd96de`).

---

## STOP CONDITION — read first

**Every task below is BLOCKED on a product-owner decision that has not been taken.** Contract
section 5 lists them as D2-1 to D2-4. Do not begin any task until the product owner has recorded
the decision that authorises it in `docs/DECISION_REGISTER.md`.

If you were handed this package without a recorded decision, the correct action is to reply
saying so and stop. Executing a task here without its decision changes what the product claims
about historical sources, which is not a mechanical change however mechanical the diff looks.

---

## TASK 1 — conditional on decision D2-1 + D2-2

*Promote the verified, measurable Three Sections connector to active presentation.*

### Permitted files
- `src/heritage/registry.js` — the `HERITAGE_CONNECTOR_REGISTRY` entry
  `three-sections-facial-proportion-taiqing` ONLY, and the `HERITAGE_REGISTRY` lineage
  `threeSections.lineages.primary` ONLY.
- `docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md` — one new row.
- `tests/heritage/connector-residue-root-cause.test.js` — update recorded counts only.

### Exact field transitions
| record | field | from | to |
|---|---|---|---|
| `three-sections-facial-proportion-taiqing` | `runtimePolicy` | `RESEARCH_ONLY` | `HERITAGE_PRESENTATION_ALLOWED` |
| `threeSections.lineages.primary` | `runtimeStatus` | `RESEARCH_ONLY` | `RUNTIME_PROSE` |

Change **nothing else**. In particular do NOT change `measurementAvailability`,
`evidenceStrength`, `evidenceClass`, `sourceTextStatus`, `prohibitedForUserInference`, any
locator, or any `sourceText`.

### Required ledger row
Authority column: `PRODUCT_POLICY_AFFECTING`. Impact column: `RUNTIME_ELIGIBILITY_AFFECTING`.
Reason column must cite the decision-register entry ID that authorised it.

### Verification
```
node --test tests/heritage/connector-residue-root-cause.test.js
npm test
npm run heritage:readiness
```
Expected after this task: `threeSections/primary` active count becomes 1, residue stays 1
(one connector is still nothing to rotate between). `NOT_READY` is expected to persist.

---

## TASK 2 — conditional on decision D2-3

*Split the Three Sections predicate disagreement into two connector records.*

This is the only change in the package that can raise connector residue above 1.

### Permitted files
- `src/heritage/registry.js` — add exactly TWO new `HERITAGE_CONNECTOR_REGISTRY` entries.
- `docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md` — two new rows.
- `tests/heritage/connector-residue-root-cause.test.js` — update recorded counts.

### The two records to add

Copy every field from the existing `three-sections-facial-proportion-taiqing` record and change
only what the table names. Both records MUST carry
`disagreementIds: ["three-sections-predicate"]` and MUST list each other in
`alternateConnectorIds`.

| field | record A | record B |
|---|---|---|
| `connectorId` | `three-sections-xiangcheng-taiqing` | `three-sections-pingdeng-yuguan` |
| `relationshipPredicate` | `相稱` | `平等` |
| `sourceId` | `heritage-three-sections-taiqing-mianbu` | `heritage-three-sections-yuguan` |
| `sectionLocator` | `卷五 論靣部` | `卷下` |
| `folioLocator` | `<pb:KR3g0045_WYG_005_7b>` | `<pb:KR3g0044_WYG_003_13a>` |
| `sectionLocatorStatus` / `folioLocatorStatus` | `VERIFIED` / `VERIFIED` | `VERIFIED` / `VERIFIED` |
| `sourceText` | `三停皆稱乃上相之人矣` | *(take verbatim from `heritage-three-sections-yuguan` in `src/heritage/evidence.js` — do not retype from this document)* |
| `evidenceStrength` | `VERIFIED_PRIMARY` | `VERIFIED_PRIMARY` |
| `disagreementIds` | `["three-sections-predicate"]` | `["three-sections-predicate"]` |
| `alternateConnectorIds` | `["three-sections-pingdeng-yuguan"]` | `["three-sections-xiangcheng-taiqing"]` |

All other fields identical to the source record, including
`measurementAvailability: "SUPPORTED_2D"`, `prohibitedForUserInference: true`,
`relationshipType: "COLLECTIVE_RULE"`.

`runtimePolicy` for both: `HERITAGE_PRESENTATION_ALLOWED` **only if D2-1 was also approved**;
otherwise `RESEARCH_ONLY`.

### Verification
```
node --test tests/heritage/connector-residue-root-cause.test.js
node --test tests/heritage/validator.test.js tests/heritage/resolver.test.js
npm test
npm run heritage:readiness
```
Expected: `threeSections/primary` residue becomes **2**. Combined material rises from 24 to
roughly 48. **Gate D still fails and `NOT_READY` still stands** — that is the correct outcome,
not a reason to keep going.

---

## TASK 3 — conditional on decision D2-2 only

*Record the fortune-clause abstention explicitly (contract C9).*

Both measurable connectors carry a rank clause the product may not state
(`上相` in the Taiqing record, `貴` in the Five Officers record). If D2-2 approves carrying the
geometric predicate while abstaining from the fortune clause, that abstention must be an explicit
field, not an editorial habit.

### Permitted files
- `src/heritage/connectors.js` — add ONE optional field to `HERITAGE_CONNECTOR_FIELDS`.
- `src/heritage/registry.js` — populate it on the affected records.
- `tests/heritage/validator.test.js` — cover the new field.

### Exact addition
Field name: `excludedPredicateClauses`. Type: array of strings, optional, default `[]`.
Populate as `["上相"]` and `["貴"]` respectively.

`src/heritage/schema.js`, `validator.js` core logic, `resolver.js` and `constants.js` are
**frozen** (Stage 1/2 freeze). If this field cannot be added without touching them, STOP and
report — that makes it `ARCHITECTURE_AFFECTING` and it needs a schema-exception decision card.

---

## FORBIDDEN IN ALL TASKS

- Touching `src/heritage/resolver.js`, `schema.js`, `validator.js` core logic, or `constants.js`.
- Touching `src/qise/reading-tiers.js` or anything D-1 changed (sealed at `1cd96de`).
- Adding any connector record not named above.
- Changing `measurementAvailability` or `evidenceStrength` on any record, for any reason.
- Changing `prohibitedForUserInference` — `resolver.js:941` requires it `true`.
- Editing `ABSTRACT_LINEAGE_OVERRIDES` (CARD 7) or any `twelvePalaces` record (CARD 10).
- Relaxing, deleting or `skip`-ing any assertion in
  `tests/heritage/connector-residue-root-cause.test.js`. Updating a recorded COUNT is expected;
  removing a check is not.
- Adding synonyms, templates, or prose variants to raise Gate D.
- Marking any PR ready, merging, or touching PR #42 / #44 / #45.

## Definition of done

- [ ] The authorising decision-register entry is cited in every ledger row.
- [ ] `npm test` passes with a count quoted verbatim, no test deleted or skipped.
- [ ] `npm run heritage:readiness` exits 0; new residue and material figures quoted.
- [ ] `docs/HERITAGE_LIBRARY_READINESS.md` updated with the re-measured numbers only.
- [ ] A statement of whether Gate D still fails. It is expected to. Do not pursue 250.
