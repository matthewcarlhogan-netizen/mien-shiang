# Conversation idea audit

**Audit date:** 15 August 2026
**Repository evidence:** `origin/main` at `c223f17` (B-010), refreshed before this audit
**Purpose:** reconcile useful Mien Shiang product and design ideas from historical Codex conversations with the repository's current truth. This is a documentation record, not an implementation or approval.

## Evidence and limits

Read-only conversation sources:

- `019ff6fd-efdc-7843-83e9-9569c59cec34` — Vault engagement, Workings and post-scan receipt.
- `019ff519-6f87-7493-9c41-d02f22411846` — result presentation and return hook.
- `019ff5e9-0713-72c0-956a-11a378cc6065` — archival-ritual visual experiments.
- `019fe6eb-9f08-7b92-9820-04a604ed1d43` — stress, source, fairness and commercial risks.
- `019ff113-f523-7fe0-ada8-96929bdde1d4` — capture and strategic lessons.
- `019feca7-05d4-7750-a2ac-613e3ff272a4` — mobile scan and selfie fallback UX.
- `019fe84b-24d8-7f01-8a84-0e371635cde1` — scan recovery and screen separation.

Current truth was checked against `AGENTS.md`, `CLAUDE.md`, the Project Charter, Decision Register, Interpretation System, scanner report, Option B programme and execution plan, relevant role briefs, and open PRs #10, #11, #13, #17, #18, #27 and #28. PR #25 and #26 are merged and are represented by the refreshed main branch.

Conversation records are provenance, not authority. A conversation's claimed implementation is not treated as code unless it is present on current main or in a clearly identified open PR. Old dirty worktrees were not opened or modified. Historical summaries may omit context, and open draft PRs are not canonical until merged.

## Status key

- **Canonical/implemented:** present in current repository evidence or an approved repository document.
- **Active approved work:** bounded work is visible in an open PR or active task, but is not yet canonical; do not duplicate it.
- **Unresolved proposal:** useful direction requiring an explicit decision, contract or evidence gate.
- **Superseded/rejected:** contradicted by current privacy, fairness, safety, commercial or authorship constraints.
- **Unverifiable:** the historical record does not establish enough evidence to classify it safely.

## Reconciliation

| Idea | Status | Current evidence and disposition |
|---|---|---|
| An honest post-scan **Workings** / “why this reading” receipt, with real processing stages and a short reflection | **Active approved work** | The historical thread records a dirty-worktree implementation, including an ephemeral receipt. Current main has a legacy geometry trace and reading summary, but not that Qi Se Workings surface. PR #28 documents the honest-reveal standard, and a separate active task owns the narrow reveal. Preserve the concept; do not recover or duplicate the old code. |
| Historical claims that old visual/camera work was deployed, committed or proven by phone screenshots | **Unverifiable** | The thread records self-reported tests, deployments and dirty-worktree changes, but those claims are not proof of current-main behaviour. They are retained only as leads for the relevant PRs and device evidence; no release or implementation status is inferred from them. |
| A non-coercive return loop: a personal column, what held or shifted, and a completed mark leading to another voluntary scan | **Canonical/implemented** (specific copy still active work) | The Android roadmap makes the personal column and “scan again” the product loop and rejects streaks, streak loss, notifications, invite quotas and share-to-unlock. The current Qise share model already supports today/seven/fourteen-reading columns. PR #17's mechanism-based next-scan block is still draft; its exact emotional wording is not canonical. |
| Product-facing provenance: show which observation, source and rule produced a reading | **Unresolved proposal** | `src/reading/provenance.js` and integrated provenance IDs exist, but entries remain audit-required/source-required and the technical contract does not by itself guarantee a user-facing `DailyReadingTrace`. Option B requires a versioned trace before new daily signals become eligible or user-facing. This is a valuable gap, not approval to persist landmarks or raw metrics. |
| Repeat use, unprompted sharing and willingness-to-pay as commercial validation gates | **Unresolved proposal** | The roadmap requires scan completion, retake stability, voluntary share and seven/fourteen-reading return before testing paid access; the release gates say these and production billing evidence are not yet run. No historical conversation establishes passing commercial evidence. |
| Mainland China / OPPO entry | **Unresolved proposal** | The current store gates require a China counsel decision, Chinese privacy/consent work and OPPO evidence. No current decision records mainland launch scope. Treat it as a future market-entry workstream requiring native cultural, legal, distribution and compliance expertise. |
| Weekly subscription or opaque paywall mechanics | **Superseded/rejected**; billing trust remains a gate | The Charter and roadmap reject a weekly subscription; exact prices, SKUs and entitlement design remain unresolved, and the store gates record no production billing service. Any future paid feature still needs adjacent price, renewal, trial, next-charge, cancellation, restore and recovery information. Legacy/dev billing code is not product approval. |
| Guided mobile capture, explicit blockers, still-selfie fallback and separate result screens | **Canonical/implemented** (further device proof pending) | The current repository includes a consent-gated local scanner, quality guidance, a still-photo fallback and separated Qi Se UI surfaces. The historical mobile threads correctly identified recovery and scroll problems; the scanner report still requires physical Android completion, fairness and performance evidence. |
| Exact “archival ritual” recipe: named web fonts, fixed palette, paper-noise filter, spring timings, cinnabar thread and generic keynote slogans | **Superseded/rejected** as a recipe; restrained editorial authorship is retained | PR #18 is an open draft and explicitly records deviations from that recipe: no React/Framer dependency, no external font request, and unsafe health/verdict copy rewritten. Current charter direction favours authored editorial structure, useful marks and cultural responsibility—not a transplanted visual formula. |
| Artificial 1.5–2.5 second loading delay, fake progress or full landmark theatre | **Superseded/rejected** | The current visual direction in PR #28 requires real production events, forbids fabricated durations and rejects displaying all 478 landmarks or invented connections. A reveal may be brief when computation is brief. |
| Persist exact biometric coordinates or a recognisable face map for the receipt | **Superseded/rejected** | Current storage and Option B contracts keep frames, pixels, landmarks and embeddings volatile and on-device; the store allow-list and negative scan enforce this boundary. A transient, non-identifying visual may be considered only within those limits. |
| RGB flashing as liveness or colour-accuracy infrastructure | **Unresolved proposal** | Historical capture discussions support only a bounded experiment. They do not prove benefit, fairness, accessibility or browser capability. It must remain research-off until a separate observable contract, non-flashing fallback, real-device protocol and independent verdict exist; it is not an identity feature. |
| Generic mystical slogans, fixed-trait voice and old dermatological/colourimetry claims | **Superseded/rejected** | Current copy guards, the Charter, scanner report and PR #18 require attributed, bounded entertainment/self-discovery language and abstention where colour evidence is weak. Historical atmosphere is not evidence for a health, personality, attractiveness or prediction claim. |

## What was lost, captured and rejected

The valuable idea most at risk of being lost is the product-facing Workings receipt and its honest explanation of why a reading appeared. It is now recorded as active work and must be completed from the current contracts, not copied from the dirty worktree. The non-coercive personal-column loop, privacy boundary, guided recovery and share-without-photo principles are already captured in current docs/code. The exact visual recipe, artificial effort signals, landmark persistence, weekly subscription and unsupported health or trait language should stay rejected.

No change to `docs/DECISION_REGISTER.md` is made by this audit: the unresolved items above are already governed by the Option B queue, roadmap release gates or existing unresolved decisions. The next owner for the Workings receipt is the active post-scan implementation task; provenance-trace contract gaps belong to Interpretation Systems with Compliance review; commercial and market-entry questions remain with the product owner and their named domain reviewers.
