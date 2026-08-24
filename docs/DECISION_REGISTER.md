# Decision register

Use this register to stop prompts, discussions and implementation from collapsing into one another. A proposal becomes approved only when the product owner records approval in a pull request or decision record.

## Established and implemented

- Scanner-first, on-device PWA; current application code is plain JavaScript.
- MediaPipe Tasks Vision is a runtime dependency; Playwright is a development dependency.
- Raw camera frames are not persisted or transmitted.
- Persisted data is constructed from allow-listed derived fields, with negative scanning as defence in depth.
- Entertainment/self-discovery positioning; no diagnosis, medical claim, identity, attractiveness score, fortune/prediction or fixed-trait conclusion.
- en-AU user-facing spelling.
- Existing release commands are the scripts in `package.json`, including `scripts/check-release.js`; `verify-release.mjs` does not exist.
- Five Mountains and Twelve Palaces are separate systems; the nose/central mountain maps to Earth in the Five Mountains model.
- Exact geometry with insufficient evidence is marked `needsVerification: true` and is not shipped as fact.
- Current history/baseline behaviour and limits remain as implemented until deliberately migrated.
- Heritage connector architecture Stages 1 (data spine) and 2 (deterministic resolver) are approved and frozen; see `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` for the frozen code baseline, verification counts and architectural locks. Stage 3 (prose/Reflection Engine integration) has not started.

### DR-2026-08-25-AI-CONTEXT-MODEL-ROUTING

- **Date:** 25 August 2026
- **Owner:** product owner
- **Status:** approved
- **Decision:**
    - Claude is reserved primarily for research, source adjudication, architecture and difficult semantic/safety review.
    - Gemini Flash is the default worker for bounded implementation, repetitive coding, repository administration and mechanical verification.
    - /compact is required during genuinely long same-task Claude sessions.
    - /clear is required when switching materially different tasks.
    - Repository checkpoints/canonical docs are persistent project memory; large chat histories are not.
    - This routing changes development workflow only and does not weaken provenance, safety, heritage freezes, release gates or product contracts.

## Approved direction, not necessarily complete

- Scanner-first Android TWA route and GitHub-hosted HTTPS deployment.
- Still-photo fallback and explicit capture-session lifecycle ownership.
- A premium editorial, anti-generic visual system.
- Broader, source-led interpretation coverage with deterministic eligibility and abstention.
- No ads and no weekly subscription.
- Independent compliance and release review.
- A human-supervised cloud development path using a two-core GitHub Codespace and interactive Gemini CLI sign-in. It creates task branches and pull requests; it does not add runtime AI or a public-comment agent trigger.

### DR-2026-08-24-HERITAGE-CONNECTOR-STAGES-1-2-FREEZE

- **Date:** 24 August 2026
- **Owner:** product owner
- **Status:** approved
- **Decision:** Heritage connector architecture Stage 1 (the typed connector-graph data spine — `HERITAGE_REGISTRY`, `HERITAGE_CONNECTOR_REGISTRY`, and the surrounding Stage 1 registries/schema/validator) and Stage 2 (the deterministic, pure `resolveHeritageConnections` resolver in `src/heritage/resolver.js`) are both APPROVED and FROZEN.
- **Frozen Stage-2 code baseline:** `df8cf22b9257c2a7fb75affd30b5e7dc6d15caa0` on `feature/heritage-connectors`, full detail in `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md`.
- **Rationale:** Both stages went through repeated, specific correction rounds against detailed review, ending in a resolver whose finite/fail-closed contracts, condition-AST semantics, and Stage 1/Module boundaries are all pinned by named tests. Freezing establishes a stable base for Stage 3 (prose/Reflection Engine integration) rather than leaving Stage 2 as an indefinite moving target.
- **Consequence:** `src/heritage/resolver.js` and its Stage 1 registries are not to be modified without a demonstrated regression against one of the architectural locks recorded in `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md`. Stage 3 branches from `main` after this freeze, not from `feature/heritage-connectors`.
- **Explicit non-consequence:** This freeze does not itself authorise Stage 3 work to begin; Stage 3 remains a separate, not-yet-started decision.

### DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT

- **Date:** 19 August 2026
- **Owner:** product owner
- **Status:** approved
- **Decision:** The independent cultural-review requirement is retired.
- **Rationale:** The product owner has decided not to make external cultural review a mandatory dependency for development or commercial release.
- **Consequence:** No signed reviewer artifact, disposition JSON, or cultural-review approval is required by release tooling.
- **Explicit non-consequence:** This decision does not authorise unsupported claims and does not weaken legal, rights, safety, provenance, or evidence-integrity requirements.

### DR-2026-08-17-B020-CLASS-A

- **Date:** 17 August 2026
- **Owner:** product owner
- **Status:** approved
- **Question:** B-020 produced fourteen open dispositions (R1–R14). Which can the product owner settle alone, and what are they?
- **Decision:** the ten Class-A rows below are approved as recorded. R3, R6, R8 and R9 are **not** approved and remain provisional pending independent cultural review; the fact that the flagged corpus already embodies the recommendation for those rows is a build artefact, not a disposition. Superseded for cultural-review dependency by DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT.

| Row | Decision |
|---|---|
| R1 | The construct is **Three Sections** 三停. "Three Courts" is withdrawn — no scholarly source for it was located and 停 does not mean "court". |
| R2 | **Harmony is not one of the six enduring constructs.** It remains available only as an explicitly computed proportion score, labelled as our own measure. |
| R4 | **北岳 = 頦** (menton). 頷 and 地閣 are retained and versioned in the source notes as alternative readings. |
| R5 | **中岳 = 鼻**, subject to measurement availability. The traditional criterion is prominence, which a front-facing capture cannot recover, so the region abstains. |
| R7 | Ship the **five-type Five Elements reduction**, stating clearly that 靈樞·陰陽二十五人 defines twenty-five. The tonal subdivision has no visual correlate. |
| R10 | **Subject-side laterality**, enforced by a CI mirroring test. The 男左女右 rule is **rejected** — unattested in every source retrieved, and it would make output depend on declared gender. |
| R11 | The **fourteen prohibited inferences** in `OPTION_B_020_DOSSIER.md` §10.2 are absolute product constraints, pending legal confirmation where marked. |
| R12 | Safety-gate copy is **completely non-specific** and never names a clinical finding, pending legal confirmation. |
| R13 | **假神 is removed** from the rule system. Gate precedence is enforced programmatically with negative tests, not by convention. |
| R14 | The **diagonal-earlobe-crease gate is withdrawn from v1** and the charter is amended. The MediaPipe canonical mesh contains no auricle geometry; `src/engine.js:227` already recorded this. |

- **Evidence:** `docs/OPTION_B_020_DOSSIER.md` and `docs/OPTION_B_020_DISPOSITIONS.md`, which carry the source, the consequence and the risk both ways for each row.
- **Consequences:** these are decisions, not recommendations. Corpus and code may be changed to match without further approval. They do **not** approve any heritage family for commercial release — all six remain `Blocked` in `docs/commercial-rights-audit.md`.
- **Explicitly not decided:** R3 (Four Rivers lineage), R6 (五官 membership), R8 (妻妾宮 / 奴僕宮 handling), R9 (colour as classifier input). R9's recommendation — exclusion — is additionally constrained by EU AI Act Art. 5(1)(g) and should not be treated as a free choice.

### DR-2026-08-17-REFLECTION-ENGINE-INTERNAL-DEFAULT

- **Date:** 17 August 2026
- **Owner:** product owner
- **Status:** approved
- **Question:** The Reflection Engine has met the engineering bar. Should it become the default?
- **Decision:** **internal default yes, public default no.** Development proceeds against the Reflection Engine; public release behaviour stays on the passage engine until the heritage rights gates close. Superseded for cultural-review dependency by DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT.
- **Mechanism:** `src/qise/reading-flags.js` defaults to `on` for development origins on a named allowlist and `off` for every other origin, including any it has never heard of. This was chosen over a build flag deliberately: a build flag can be set wrongly in a release pipeline and fails open in public; a host allowlist fails closed. `?reflection=` and stored preference still override in both directions, and `compare` remains available.
- **Evidence:** `docs/PARITY_2026-08-17.md` — ten of ten migration gates pass, 1,152 real records, zero regressions, 0.0% verbatim repetition over a simulated year against the passage engine's 26.8%.
- **Consequences:** the passage engine is **not** removed. Both engines remain, and the parity gate keeps running against both.

### DR-2026-08-15-DAILY-LOOP

- **Date:** 15 August 2026
- **Owner:** product owner
- **Status:** approved
- **Question:** Should the product remain an enduring portrait, enhanced by the existing Qi Se longitudinal comparison, or expand into a daily loop that crosses structural constructs with additional measured transient variables and parallel corpora?
- **Decision:** Option B — daily loop. Run it as an ordered research → design → proof → implementation programme under a dedicated Daily Loop Program Architect. The programme is defined in `docs/OPTION_B_PROGRAM.md` and its executable queue is `docs/OPTION_B_EXECUTION_PLAN.md`.
- **Existing foundation:** Qi Se already measures personal-baseline deviation, history and magnitude bands. Preserve and reuse that implementation unless a separately approved migration has evidence for changing it.
- **Unproven scope:** “Shen burst variance” and “baseline-relative tension delta” are research labels, not established production signals. Current burst jitter is capture-quality data and current blendshape/asymmetry output describes one capture. Neither may drive a user-facing reading until its versioned contract and independent proof verdict pass.
- **Consequences:** approving Option B commits the product direction and the research programme; it does not pre-approve a measurement definition, threshold, source interpretation, persistence change, corpus claim or release. Failed proof means abstention, redesign or removal—not a weakened gate.
- **Execution authority:** the dedicated agent may research, design and implement on task branches, run checks, commit, push and open draft pull requests. It may not approve its own evidence, mark a pull request ready, merge, alter acceptance criteria to obtain a pass or issue the final release verdict.
- **Human and external gates:** the product owner retains product decisions and diff review. Consented participant/device evidence, source review, legal/rights review, the unresolved history-retention decision and store approval cannot be manufactured or self-certified by an agent. Superseded for cultural-review dependency by DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT.
- **Supersedes:** the unresolved state of this same decision record. Option A is parked, not the selected product direction.

## Unresolved proposals

These must not be implemented as settled decisions without approval:

- A strict rolling 90-day TTL for derived IndexedDB history. Reconcile it with the existing baseline window, migration, user controls and deletion semantics first.
- React/Vite migration. If approved, explicitly solve GitHub Pages base paths and MediaPipe WASM/asset resolution; this is not a current-stack bug.
- Exact lifetime, quarterly and annual prices and which SKU launches first.
- Whether the product is legally a biometric categorisation system, whether Article 50(3) applies, and the resulting notice flow.
- A future corpus-schema property for tradition attribution. Current DOM markers use kebab-case `data-copy`; do not infer a JSON field name from that syntax.
- Unimplemented scanner improvements, including underexposure rejection and any threshold changes. Thresholds require recorded evidence and must not be silently retuned.
- Mappings where primary sources disagree, including left/right cheek traditions.

## Decision template

Record: ID, date, owner, status, question, options, evidence, decision, consequences, migration, tests and superseded decisions.
