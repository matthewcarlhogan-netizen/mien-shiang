# Heritage validator falsification sweep

This table records destructive mutations, not only happy-path coverage. Every row names the validator boundary, the mutation applied to a known-valid fixture, and the subtest that must fail the mutated record. The executable sweep is `tests/heritage/falsification.test.js`.

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
| HVR-010 attestation honesty | Put combinations under `NONE_ATTESTED` | `falsification HVR-010: non-empty combinations marked none attested` |
| HVR-011 attestation completeness | Mark an empty list `RECORDED` | `falsification HVR-011: recorded combinations with no entries` |
| HVR-012 section citation | Remove the section locator from verified evidence | `falsification HVR-012: verified citation without section locator` |
| HVR-013 evidence ceiling | Downgrade citation while retaining verified evidence | `falsification HVR-013: verified evidence exceeding citation` |
| HVR-014 contradicted attribution | Promote contradicted attribution to verified evidence | `falsification HVR-014: contradicted attribution promoted to verified evidence` |
| HVR-015 translation provenance | Make runtime copy not translated | `falsification HVR-015: runtime copy without translation` |
| HVR-016 translation agent | Give project copy an unknown agent | `falsification HVR-016: project translation without registered agent` |
| HVR-017 alias witness | Remove provenance for a recorded alias | `falsification HVR-017: alias without witness provenance` |
| HVR-018 member uniqueness | Duplicate a constituent ID | `falsification HVR-018: duplicate constituent identity` |
| HVR-019 system distinction | Reuse a related-system name as a construct alias | `falsification HVR-019: related system also declared as alias` |
| HVR-020 unattested claim | Promote `NONE_ATTESTED` without a source | `falsification HVR-020: malformed unattested research claim` |
| HVC-001 cross-family arity | Reduce a cross-family combination to one construct | `falsification HVC-001: cross-family combination with one construct` |
| HVC-002 render safety | Make a prohibited combination runtime-allowed | `falsification HVC-002: runtime combination marked prohibited` |
| HVC-003 measurement safety | Runtime-enable an unmeasurable combination | `falsification HVC-003: runtime combination without measurable evidence` |
| HVC-004 combination provenance | Point a combination at an unknown source | `falsification HVC-004: combination with unknown source` |
| HVS-001 section status | Record section status without a locator | `falsification HVS-001: section status without section locator` |
| HVS-002 folio status | Add a folio while status says not recorded | `falsification HVS-002: folio locator without folio status` |
| HVS-003 stable URL | Use a non-HTTPS source URL | `falsification HVS-003: non-HTTPS stable URL` |
| HVS-004 artifact integrity | Use a malformed SHA-256 | `falsification HVS-004: malformed artifact hash` |
| HVS-005 discovery ceiling | Promote a discovery-only surrogate to verified | `falsification HVS-005: discovery surrogate promoted to verified` |

The JSON Schema metadata URI has its own negative sweep in `tests/copy-lint.test.js`: the exact 2020-12 identifier is accepted, while a query string, fragment, and the 2019-09 identifier are rejected.
