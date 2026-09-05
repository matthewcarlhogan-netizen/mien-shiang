# Option B execution plan

## Controller protocol

This is the executable queue for the dedicated Daily Loop Program Architect. It is deliberately a sequence of bounded pull requests, not one unreviewable autonomous change.

At the start of every run, the agent must:

1. synchronise from protected `main`, read `AGENTS.md`, `docs/DECISION_REGISTER.md`, `docs/OPTION_B_PROGRAM.md` and the relevant role briefs;
2. choose the first `ready` item whose dependencies are `complete` and whose human gates are satisfied;
3. create `codex/option-b-<lowercase-task-id>` and restate the task's acceptance criteria and exclusions before editing;
4. work only on that task, record sources and observed evidence, run proportionate repository gates, commit, push and open a **draft** pull request;
5. update this queue only with evidence links and an honest state; never mark its own evidence verdict or release verdict approved;
6. stop for product-owner diff review and merge. After merge, begin the next task from the new `main`.

Allowed states are `blocked`, `ready`, `in-progress`, `evidence-review`, `complete` and `rejected`. A task is `complete` only when its named acceptance evidence is merged. If no item is ready, the agent stops and reports the first exact dependency, owner and evidence needed. It must not route around a human, device, source, rights, cultural, legal or store gate.

The agent may edit, test, commit, push and open a draft pull request without step-by-step prompting inside the selected task branch. It must not mark a pull request ready, merge, push to `main`, change branch protection, create a public-comment trigger, use `--yolo`, or write outside the repository.

## Queue

| ID | State | Owner | Depends on | Deliverable and acceptance evidence |
|---|---|---|---|---|
| B-000 | complete | Daily Loop Program Architect | — | Establish this approved programme, role separation, controller protocol and governance tests. Complete when the bootstrap PR is merged with all required CI green. |
| B-010 | evidence-review | Daily Loop Program Architect + domain owners | B-000 | Repository truth and gap ledger. Cite exact code/tests for existing Qi Se, burst quality, still fallback, expression state and implemented/missing enduring constructs; correct stale roadmap/handoff claims. No proposed signal may be labelled implemented. |
| B-015 | complete | Qi Se Colour Scientist + Interpretation Systems Engineer | B-010 | Repair and contract the existing Qi Se daily foundation: production baseline reset/lineage and algorithm/capture-class segmentation; genuine personal `ming`/`run` course deltas with persisted replay; canonical-day/reroll policy; and an explicit keep/build/park decision for unreachable tags. Tests exercise capture, storage, reopen and history paths. Editorial band edges remain provisional pending evidence. |
| B-020 | evidence-review | Geometry Researcher + Corpus Research Editor | B-015 | Source and terminology dossier for all six enduring constructs plus the Shen and tension hypotheses. Distinguish primary/traditional claims, modern measurement evidence, disagreements, translation/rights status and prohibited inferences. Evidence/source record synchronized for the approved and unresolved dispositions. |
| B-025 | blocked | Geometry Researcher + Scanner Engineer | B-020 | Versioned definitions and finite coverage matrix for Five Mountains, Five Officers and Four Rivers, kept distinct from existing systems. Every region has source, geometry evidence, confidence and `needsVerification`; unsupported anatomy such as unavailable ears abstains. |
| B-030 | blocked | Scanner Engineer + Interpretation Systems Engineer | B-020 | Versioned neutral gaze/burst-candidate contract and fixtures. Define observable, timestamped window, unit, pose/blink/iris exclusions, confounders, personal baseline, confidence, abstention and non-claims. The traditional label is not an observable; still captures are ineligible. |
| B-040 | blocked | Scanner Engineer + Interpretation Systems Engineer | B-020 | Versioned `mouthJawAsymmetryShift` candidate contract and fixtures. Separate it from single-capture asymmetry; preserve `EXPRESSION_IS_STATE_NOT_TRAIT`; define whitelisted inputs, personal baseline/reset/confidence/abstention and non-claims. “Tension” remains an unapproved display label. |
| B-050 | blocked | Interpretation Systems Engineer + Compliance Auditor | B-030, B-040 | `DailyReadingTrace`, eligibility and persistence contracts with schema validation and privacy-negative fixtures. Record the exact owner decision needed on retention before any new field is stored. |
| B-060 | blocked | Product owner | B-050 | Decide retention, consent, migration, export and deletion semantics for new longitudinal fields. Acceptance is a dated decision record; absence of a decision keeps persistence work blocked. |
| B-070 | blocked | Scanner Engineer | B-025, B-030, B-040 | Proof harness with synthetic positive/negative/boundary controls, deterministic replay, geometry invariance and explicit separation between capture-quality and interpretation candidates. Synthetic success does not approve a signal. |
| B-075 | blocked | Scanner Engineer | B-050, B-070 | Default-off research instrumentation: timestamped live sampling, neutral iris/gaze aggregate, whitelisted mouth/jaw aggregate, structural debug evidence, local derived-evidence export and performance trace. Raw buffers are erased on success, error, cancellation and backgrounding; production remains unchanged with the flag off. |
| B-080 | blocked | Compliance Auditor + product owner | B-075 | Pre-registered, consented real-device and longitudinal evidence protocol, including device/lighting/pose/mechanism-control conditions, exclusions, fairness/accessibility slices, pass/fail criteria and data deletion. Approve numeric criteria before decisive collection. |
| B-090 | blocked | Human evidence operator | B-080 | Execute the approved protocol on the named device/participant matrix. Commit only derived, consent-compatible evidence and environment metadata; never images, pixels, landmarks or embeddings. |
| B-100 | blocked | Independent evidence reviewer | B-090 | Separate `approved`, `revise` or `rejected` verdict for each candidate contract and region-definition version, with reproducible evidence links and unresolved confounders. The implementer cannot perform this review. |
| B-110 | blocked | Scanner Engineer + Geometry Researcher | B-100 | Implement only approved candidate and missing-structure versions behind default-off rollout flags. Rejected/revise candidates remain absent or ineligible; unsupported geometry abstains. Unit, invariance, privacy-negative and browser tests pass. |
| B-120 | blocked | Qi Se Colour Scientist + Compliance Auditor | B-060, B-110 | Approved allow-listed persistence migration and baseline/reset behaviour, or a recorded no-persistence design. Export/delete/upgrade tests and rollback evidence pass. |
| B-130 | blocked | Interpretation Systems Engineer | B-100, B-110 | Deterministic eligibility and `DailyReadingTrace` implementation. Golden fixtures prove abstention, conflict handling, traceability, replay and recent-history suppression without `Math.random()` or wall-clock selection. |
| B-140 | blocked | Corpus Research Editor | B-020, B-100, B-130 | Source-led corpus for supported states only. Every reachable variant has stable ID, source/rights/cultural status, safe non-diagnostic copy, similarity/blocklist results and trace fixtures; unsupported cells abstain. |
| B-150 | blocked | Experience Director | B-120, B-130, B-140 | Daily ritual, calibration, retake, abstention, history, export and delete UX behind an approved rollout flag. Accessibility, offline behaviour and no-horizontal-overflow checks pass. No streak or notification scope is inferred. |
| B-160 | blocked | Compliance Auditor | B-150 | Independent claims, privacy/data-flow, rights, cultural and store-policy audit. All findings are fixed or explicitly accepted by the product owner; the implementation agent cannot self-clear them. |
| B-170 | blocked | Release Gatekeeper | B-160 | Independent full release evidence: repository checks, browser matrix, supported real Android devices, low-end performance, install/offline/update and provenance. Record residual risks and go/no-go recommendation without changing requirements. |
| B-180 | blocked | Product owner | B-170 | Final human diff/evidence review and release decision. Mark ready and merge only with required CI green and every external hard stop resolved. |

**B-020 evidence-review note (30 August 2026):** The dossier and disposition package are synchronized with the decision register. R1, R2, R4, R5, R7, R10, R11, R12, R13 and R14 are approved under `DR-2026-08-17-B020-CLASS-A`. R3, R6, R8 and R9 remain explicitly open; the retirement of the independent cultural-review requirement does not itself decide those rows. See `docs/OPTION_B_020_DOSSIER.md` §12, `docs/OPTION_B_020_DISPOSITIONS.md` and `docs/DECISION_REGISTER.md`. B-025 remains blocked until its unresolved Five Officers and Four Rivers prerequisites are disposed; the ear/auricle and cheekbone-bone capture ceilings remain independently documented.

## State transitions

- When the bootstrap containing this file is present on `main` with required CI green, B-000 is effectively `complete` and B-010 is effectively `ready`. The Program Architect records both state changes in the B-010 draft PR; no separate status-only pull request is required.
- A task becomes `ready` only when every dependency is merged and every named human gate is evidenced.
- Code controls may advance a task to `evidence-review`; only the independent named owner may record a proof verdict.
- `revise` returns to the earliest affected design task with a new contract version. `rejected` permanently disables the candidate version and does not block a Qi Se-only daily loop.
- Queue-state changes must not bundle a weaker acceptance criterion with the implementation that benefits from it.

## Required handoff for every task

Record task ID and acceptance criteria; base and head SHA; source, schema and corpus versions; files/contracts changed; commands and environments; observed test results; evidence links; privacy/accessibility/performance impact; decisions; abstentions; unresolved risks; next ready task and its owner.
