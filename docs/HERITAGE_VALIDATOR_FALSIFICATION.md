# Heritage validator falsification sweep

This table records destructive mutations, not only happy-path coverage. Every row names the validator boundary, the mutation applied to a known-valid fixture, and the subtest that must fail the mutated record. The executable sweep is `tests/heritage/falsification.test.js`.

Stage 1 (the connector-graph migration, 2026-08-24) retired the legacy
`attestedCombinations`/`validateHeritageCombination` model in favour of the
typed connector graph (`HERITAGE_CONNECTOR_REGISTRY`, `validateHeritageConnector`
and friends in `src/heritage/validator.js`). HVR-010 and HVR-011, which tested
the retired `attestedCombinationsStatus` field, were removed rather than kept
alongside a schema that no longer has that field. The old HVC-001..004 rows
(cross-family combination arity/render-safety) are superseded by the much
larger HVC roster below, which targets the connector graph directly.

| Rule | Mutation | Named failing subtest |
|---|---|---|
| HVR-001 construct identity | Delete `constructId` | `falsification HVR-001: missing construct identity` |
| HVR-002 lineage identity | Make map key and `lineageId` disagree | `falsification HVR-002: contradictory lineage identity` |
| HVR-003 provenance reference | Point a lineage at an unknown source | `falsification HVR-003: unknown provenance source` |
| HVR-004 supporting-source uniqueness | Duplicate a supporting source | `falsification HVR-004: duplicate supporting source` |
| HVR-005 primary/support separation | Repeat the primary source as support | `falsification HVR-005: primary source repeated as support` |
| HVR-006 availability enum | Replace the state with `GUESSED` | `falsification HVR-006: invalid measurement state` |
| HVR-007 abstention reason | Remove the reason from an abstaining lineage | `falsification HVR-007: abstention without reason` |
| HVR-008 abstention termination | Mark availability as abstention but continue | `falsification HVR-008: abstention without termination` |
| HVR-009 safety lock | Mark a lineage prohibited but allow inference | `falsification HVR-009: prohibited lineage without inference lock` |
| HVR-012 section citation | Remove the section locator from verified evidence | `falsification HVR-012: verified citation without section locator` |
| HVR-013 evidence ceiling | Downgrade citation while retaining verified evidence | `falsification HVR-013: verified evidence exceeding citation` |
| HVR-014 contradicted attribution | Promote contradicted attribution to verified evidence | `falsification HVR-014: contradicted attribution promoted to verified evidence` |
| HVR-015 translation provenance | Make runtime copy not translated | `falsification HVR-015: runtime copy without translation` |
| HVR-016 translation agent | Give project copy an unknown agent | `falsification HVR-016: project translation without registered agent` |
| HVR-017 alias witness | Remove provenance for a recorded alias | `falsification HVR-017: alias without witness provenance` |
| HVR-018 member uniqueness | Duplicate a constituent ID | `falsification HVR-018: duplicate constituent identity` |
| HVR-019 system distinction | Reuse a related-system name as a construct alias | `falsification HVR-019: related system also declared as alias` |
| HVR-020 unattested claim | Promote `NONE_ATTESTED` without a source | `falsification HVR-020: malformed unattested research claim` |
| HVC-001 connector identity | Delete `connectorId` | `connector falsification HVC-001: missing connector ID` |
| HVC-002 relationship type enum | Set an invalid `relationshipType` | `connector falsification HVC-002: invalid relationship type` |
| HVC-003 REQUIRES direction | REQUIRES with UNDIRECTED | `connector falsification HVC-003: REQUIRES not DIRECTED` |
| HVC-004 MODIFIES direction | MODIFIES with UNDIRECTED | `connector falsification HVC-004: MODIFIES not DIRECTED` |
| HVC-005 SEQUENTIAL_RELATION direction | SEQUENTIAL_RELATION with UNDIRECTED | `connector falsification HVC-005: SEQUENTIAL_RELATION not ORDERED` |
| HVC-006 CONJUNCTIVE_CONFIGURATION direction | CONJUNCTIVE_CONFIGURATION with DIRECTED | `connector falsification HVC-006: CONJUNCTIVE_CONFIGURATION not UNDIRECTED` |
| HVC-007 collectiveMode required | Delete `collectiveMode` on a COLLECTIVE_RULE | `connector falsification HVC-007: COLLECTIVE_RULE without collectiveMode` |
| HVC-008 collectiveMode scope | Set `collectiveMode` on a non-COLLECTIVE_RULE type | `connector falsification HVC-008: collectiveMode on inappropriate type` |
| HVC-009 direction participant reference | Point `to` at an undeclared participant | `connector falsification HVC-009: unknown participant referenced by direction` |
| HVC-010 participant uniqueness | Duplicate a participant | `connector falsification HVC-010: duplicate participant` |
| HVC-011 self-edge | DIRECTED with the same participant on both sides | `connector falsification HVC-011: invalid self-edge` |
| HVC-012 source reference | Point `sourceId` at an unknown source | `connector falsification HVC-012: unknown source` |
| HVC-013 concept reference | Point a HERITAGE_CONCEPT participant at an unknown concept | `connector falsification HVC-013: unknown concept` |
| HVC-014 related-system reference | Add a RELATED_SYSTEM participant with an unknown ID | `connector falsification HVC-014: unknown related system` |
| HVC-015 disagreement target | Point a disagreement's `target.targetRef` at an unknown construct | `connector falsification HVC-015: missing disagreement target` |
| HVC-016 disagreement reference | Point `disagreementIds` at an unknown disagreement | `connector falsification HVC-016: invalid disagreement reference` |
| HVC-017 alternate connector reference | Point `alternateConnectorIds` at an unknown connector | `connector falsification HVC-017: invalid alternate connector reference` |
| HVC-018 AST node type | Use an invalid condition node `type` | `connector falsification HVC-018: malformed AST` |
| HVC-019 AST ALL arity | `ALL` with zero operands | `connector falsification HVC-019: empty ALL` |
| HVC-020 AST ANY arity | `ANY` with zero operands | `connector falsification HVC-020: empty ANY` |
| HVC-021 AST depth | Nest `NOT` five levels deep | `connector falsification HVC-021: AST depth exceeds 4` |
| HVC-022 AST operand ceiling | `ANY` with nine operands | `connector falsification HVC-022: more than 8 operands` |
| HVC-023 AST state reference | `STATE` referencing an undeclared `historicalState` | `connector falsification HVC-023: unknown STATE` |
| HVC-024 Shen unmeasurable | Give a Shen `historicalState` a non-UNMEASURABLE availability | `connector falsification HVC-024: measurable Shen` |
| HVC-025 Qi Se/heritageQiSe binding | Bind `heritageQiSe`'s `modernMeasurementBinding` to a measurement ID | `connector falsification HVC-025: modern Qi Se binding to heritageQiSe` |
| HVC-026 Qi Se/Five Forms boundary | Connect `heritageQiSe` directly to `fiveElements` | `connector falsification HVC-026: Qi Se classifying Five Forms` |
| HVC-027 Five Forms/Five Phases boundary | Connect `fiveElements` directly to related system `five-phases` | `connector falsification HVC-027: Five Forms/Five Phases conflation` |
| HVC-028 Twelve Palaces/ZWDS boundary | Connect `twelvePalaces` directly to related system `zwds` | `connector falsification HVC-028: Zi Wei Dou Shu contamination` |
| HVC-029 registry separation | Give a connector a `policyType` field | `connector falsification HVC-029: editorial policy in historical graph` |
| HVC-030 verified locator requirement | VERIFIED_PRIMARY connector with a non-VERIFIED `sectionLocatorStatus` | `connector falsification HVC-030: verified citation without required locator` |
| HVC-032 negative-rule honesty | Give a PRODUCT_GOVERNANCE_INVARIANT rule a historical `sourceId` | `connector falsification HVC-032: negative-rule violation (product/governance rule fabricated a source)` |
| HVC-033 textual adjacency | Connect `threeSections` directly to `fiveElements` | `connector falsification HVC-033: textual adjacency promoted to historical relationship` |
| — negative-rule honesty (reverse) | Strip the `sourceIds` from a HISTORICAL_NEGATIVE_FINDING rule | `negative rule falsification: historical finding without a source` |
| — editorial/historical separation | Set `historicalRelationshipAsserted: true` on an editorial policy | `editorial composition policy falsification: cannot assert a historical relationship` |
| — Shen concept invariant | Set the `shen` concept's `measurementAvailability` away from UNMEASURABLE | `heritage concept falsification: shen cannot become measurable` |
| HVS-001 section status | Record section status without a locator | `falsification HVS-001: section status without section locator` |
| HVS-002 folio status | Add a folio while status says not recorded | `falsification HVS-002: folio locator without folio status` |
| HVS-003 stable URL | Use a non-HTTPS source URL | `falsification HVS-003: non-HTTPS stable URL` |
| HVS-004 artifact integrity | Use a malformed SHA-256 | `falsification HVS-004: malformed artifact hash` |
| HVS-005 discovery ceiling | Promote a discovery-only surrogate to verified | `falsification HVS-005: discovery surrogate promoted to verified` |
| HVS-006 bibliographic ceiling | Promote a source with `bibliographicIdentityStatus: UNRESOLVED` to verified | `falsification HVS-006: unresolved source promoted to verified` |
| HVS-007 SHA/commit distinction | Put a 40-character git-revision-shaped value in `sha256` | `falsification HVS-007: commit SHA substituted for SHA-256` |
| HVS-008 WYG_PB syntax | Set `folioLocatorKind: WYG_PB` with a non-`<pb:...>` locator | `falsification HVS-008: invalid WYG PB marker` |

The JSON Schema metadata URI has its own negative sweep in `tests/copy-lint.test.js`: the exact 2020-12 identifier is accepted, while a query string, fragment, and the 2019-09 identifier are rejected.
