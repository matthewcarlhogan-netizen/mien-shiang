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

## Approved direction, not necessarily complete

- Scanner-first Android TWA route and GitHub-hosted HTTPS deployment.
- Still-photo fallback and explicit capture-session lifecycle ownership.
- A premium editorial, anti-generic visual system.
- Broader, source-led interpretation coverage with deterministic eligibility and abstention.
- No ads and no weekly subscription.
- Independent compliance and release review.
- A human-supervised cloud development path using a two-core GitHub Codespace and interactive Gemini CLI sign-in. It creates task branches and pull requests; it does not add runtime AI or a public-comment agent trigger.

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
- **Human and external gates:** the product owner retains product decisions and diff review. Consented participant/device evidence, source and cultural review, legal/rights review, the unresolved history-retention decision and store approval cannot be manufactured or self-certified by an agent.
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
