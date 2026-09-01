# D-2 execution handoff — Gemini 2.5 Flash Lite

Bounded, mechanical execution package. Architecture and source analysis are complete and frozen in
`docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md`. Decisions are recorded in
`docs/DECISION_REGISTER.md` under `DR-2026-08-31-D2-CONNECTOR-PREDICATE`. Do not re-derive either.

**Branch:** `claude/heritage-connector-relationships-d2`.

---

## STOP CONDITION — read first, and expect to stop

D2-1 to D2-4 are approved, but implementation is **blocked on two things that are not**. Do not
start any task until BOTH are recorded in `docs/DECISION_REGISTER.md`:

### Blocker 1 — a Stage 1/2 freeze exception on `resolver.js`

D2-2 requires `excludedPredicateClauses` be *consumed or enforced by the reader-facing path*, and
that a project-owned translation of the predicate be exposed. Neither can reach a reader today.
Two explicit field allow-lists stand in the way and **the first is in a frozen file**:

- `src/heritage/resolver.js:754` `toResolvedEntry()` copies 20 named fields; no predicate, no
  translation, no exclusion field.
- `src/ui/qise/heritage-view.js:147` `connectorCard()` reduces to 9 fields; same absence.

Adding the field to the registry alone produces exactly the unused metadata D2-2 rejects.
See contract §6.5 for the minimal three-step change. Step 2 is the freeze exception.

### Blocker 2 — D2-1 routes a contested lineage that carries a fortune claim

D2-1 says route `threeSections/primary` to `RUNTIME_PROSE`. Two problems, both verified:

1. `heritageMaterialFor()` renders a lineage's `definition` as Tier 2's passage, and
   `threeSections/primary`'s definition ends *"…holds that when the three stand equal, the reading
   is **auspicious**."* That is a fortune claim, which D2-2 bans on every reader-facing surface.
2. `threeSections/primary` is the **received Ma Yi** lineage (`sourceId: heritage-three-sections`),
   whose own note records the attribution as contradicted with no stable critical edition. The
   VERIFIED Taiqing facial material that D2-1's connector cites lives under a different lineage
   key, `taiqing-mianbu-facial`.

So D2-1 as written promotes a **verified connector** while routing a **contested lineage**. The
product owner must resolve which lineage is intended and what happens to the fortune clause in its
definition. Pinned by `threeSections/primary cannot be routed to RUNTIME_PROSE as it stands` in
`tests/heritage/three-sections-predicate-acceptance.test.js`.

**If you were handed this package without both blockers resolved, reply saying so and stop.**

---

## TASK 1 — conditional on Blocker 1 + Blocker 2 resolved, and D2-1 + D2-2

*Promote the verified connector and route the agreed lineage.*

### Permitted files
- `src/heritage/registry.js` — the `three-sections-facial-proportion-taiqing` connector entry, and
  the ONE `threeSections` lineage the product owner names.
- `docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md` — one row per change.
- `tests/heritage/*.test.js` — recorded counts only.

### Exact transitions
| record | field | from | to |
|---|---|---|---|
| `three-sections-facial-proportion-taiqing` | `runtimePolicy` | `RESEARCH_ONLY` | `HERITAGE_PRESENTATION_ALLOWED` |
| the lineage the owner names | `runtimeStatus` | `RESEARCH_ONLY` | `RUNTIME_PROSE` |

Change nothing else. Do NOT touch `measurementAvailability`, `evidenceStrength`, `evidenceClass`,
`sourceTextStatus`, `prohibitedForUserInference`, any locator, or any `sourceText`.

Ledger rows: Authority `PRODUCT_POLICY_AFFECTING`, Impact `RUNTIME_ELIGIBILITY_AFFECTING`, reason
citing the decision-register entry ID.

---

## TASK 2 — conditional on D2-3

*Add exactly ONE new connector record.* **D2-3 is explicit: two records in total, never three.**

### Permitted files
`src/heritage/registry.js`, `docs/heritage-evidence/EVIDENCE_TRANSITION_LEDGER.md`,
`tests/heritage/*.test.js` (recorded counts only).

### 2a. UPDATE the existing record — do not duplicate it

`three-sections-facial-proportion-taiqing` gains:
- `relationshipPredicate: "相稱"`
- `disagreementIds: ["three-sections-predicate"]`
- `alternateConnectorIds: ["three-sections-pingdeng-yuguan"]`
- `excludedPredicateClauses: ["上相"]`

**Do NOT create `three-sections-xiangcheng-taiqing`.** That id would duplicate this record; a test
fails if it appears.

### 2b. ADD exactly one record: `three-sections-pingdeng-yuguan`

Copy every field from the updated record above, then change only:

| field | value |
|---|---|
| `connectorId` | `three-sections-pingdeng-yuguan` |
| `relationshipPredicate` | `平等` |
| `sourceId` | `heritage-three-sections-yuguan` |
| `sectionLocator` | `卷下` |
| `folioLocator` | `<pb:KR3g0044_WYG_003_13a>` |
| `sourceText` | take **verbatim** from `heritage-three-sections-yuguan` in `src/heritage/evidence.js` — do not retype it from this document |
| `alternateConnectorIds` | `["three-sections-facial-proportion-taiqing"]` |
| `excludedPredicateClauses` | `[]` unless the source text carries a rank clause; if it does, list it |

Everything else identical, including `measurementAvailability: "SUPPORTED_2D"`,
`prohibitedForUserInference: true`, `relationshipType: "COLLECTIVE_RULE"`,
`disagreementIds: ["three-sections-predicate"]`.

### Expected result
`threeSections/primary` active count **2**, connector residue **2**. Combined material rises
from 24 to roughly 48. **Gate D still fails and `NOT_READY` still stands** — that is correct
(D2-4), not a reason to continue.

---

## TASK 3 — conditional on Blocker 1

*Make the exclusion enforceable, per contract §6.5.*

1. `src/heritage/connectors.js` — add optional `predicateTranslation` (string),
   `predicateTranslationProvenance` (reuse the existing `HERITAGE_TRANSLATION_PROVENANCE` enum —
   **no new enum**), `excludedPredicateClauses` (string array).
2. `src/heritage/resolver.js:754` `toResolvedEntry()` — **the freeze exception.** Add exactly two
   pass-through entries: `predicateTranslation`, `excludedPredicateClauses`. No logic, no branch,
   no effect on disposition, ordering or selection.
3. `src/ui/qise/heritage-view.js` `connectorCard()` — add `predicateTranslation` to the allow-list,
   passed through `englishSafe()` **and** a new `fortuneFree()` guard that omits the value when it
   carries rank/status/fortune vocabulary. Reuse the `FORBIDDEN_ENGLISH` pattern from
   `tests/heritage/three-sections-predicate-acceptance.test.js` as the starting vocabulary —
   it is claim-shaped on purpose, and its negative controls matter (see the comment above it).
   **Do NOT add `excludedPredicateClauses` to the card**: rendering the list of withheld clauses
   would reintroduce the clause it excludes.

**The translation text itself is not yours to write.** Connector records have no translation field
today and no verified English rendering of 相稱 or 平等 exists in the repo (contract §6.3). If the
product owner has not supplied one with `predicateTranslationProvenance: PROJECT_ORIGINAL`, leave
the field absent and stop.

---

## FORBIDDEN IN ALL TASKS

- Touching `schema.js`, `validator.js` core logic, or `constants.js`.
- Touching `resolver.js` beyond the two pass-through fields Task 3 names, and only under Blocker 1.
- Touching `src/qise/reading-tiers.js` or anything D-1 changed.
- Adding any connector record other than `three-sections-pingdeng-yuguan`.
- Creating `three-sections-xiangcheng-taiqing`.
- Changing `measurementAvailability`, `evidenceStrength` or `prohibitedForUserInference` on any
  record, for any reason.
- Editing `ABSTRACT_LINEAGE_OVERRIDES` (CARD 7) or any `twelvePalaces` record (CARD 10).
- Lowering `DIVERSITY_TARGET` from 250, or otherwise pursuing a Gate D pass (D2-4).
- Writing, inventing or paraphrasing an English translation of any source text.
- Relaxing, deleting or skipping any assertion in the two `tests/heritage/` D-2 files. Updating a
  recorded COUNT or flipping `AUTHORISED_ACTIVE_PREDICATE_IDS` is expected; removing a check is not.
- Marking any PR ready, merging, or touching PR #42 / #45 / #46.

## Definition of done

- [ ] Both blockers cited by decision-register entry ID in every ledger row.
- [ ] `AUTHORISED_ACTIVE_PREDICATE_IDS` flipped to the two approved ids, and the structural
      assertions it gates now run.
- [ ] `npm test` passes, count quoted verbatim, no test deleted or skipped.
- [ ] `npm run heritage:readiness` exits 0; new residue and material figures quoted.
- [ ] `docs/HERITAGE_LIBRARY_READINESS.md` updated with re-measured numbers only, and its header
      commit provenance updated to the commit actually measured.
- [ ] An explicit statement that Gate D still fails. It is expected to. Do not pursue 250.
