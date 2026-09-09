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
- Heritage connector architecture Stages 1 (data spine) and 2 (deterministic resolver) are approved and frozen; see `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md` for the frozen code baseline, verification counts and architectural locks. Stage 3 (prose/Reflection Engine integration) **code is present on `main`** (merged via PR #40, 30 August 2026 correction — the previous "has not started" line here was stale). Presence is not approval: see `docs/HERITAGE_CONNECTOR_STAGE_STATUS.md`'s six-axis status for what is and is not true of Stage 3 as a result, and `docs/heritage-evidence/SAFETY_AUTHORIZATION_INTERFACE.md` for why it remains fail-closed in production regardless.

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

### DR-2026-08-31-D2-CONNECTOR-PREDICATE

- **Date:** 31 August 2026
- **Owner:** product owner
- **Status:** approved
- **Context:** `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` established that no heritage
  connector is both measurable from a flat photograph and authorised for presentation, so the
  connector layer contributes exactly one state everywhere. These four decisions respond to that
  finding.

- **D2-1 — APPROVED.** Promote `three-sections-facial-proportion-taiqing` from `RESEARCH_ONLY` to
  `HERITAGE_PRESENTATION_ALLOWED`, and route `threeSections/primary` from `RESEARCH_ONLY` to
  `RUNTIME_PROSE`. **Must land together with D2-2** — the promotion is not authorised on its own,
  because the promoted record's source text carries a rank clause.

- **D2-2 — APPROVED WITH ENFORCEMENT.** The product may carry the source-attested geometric
  predicate while excluding the fortune/status clause.
    - The full source text remains in the evidence registry for audit and provenance.
    - Runtime surfaces may expose only the verified geometric excerpt and a project-owned
      translation.
    - 上相, 貴, and any English rank, status or fortune interpretation must never appear in
      Tier 1, Tier 2, Tier 3, source cards, accessibility text, exports or share surfaces.
    - An `excludedPredicateClauses` field is **necessary but not sufficient**. It must be consumed
      or otherwise enforced by the reader-facing path and pinned by negative tests. Unused
      metadata does not satisfy this decision.

- **D2-3 — APPROVED, with the corrected record set.** Exactly **two** Three Sections predicate
  records in total, never three:
    1. **Retain and update** the existing `three-sections-facial-proportion-taiqing` —
       `relationshipPredicate: 相稱`, `disagreementIds: ["three-sections-predicate"]`,
       `alternateConnectorIds: ["three-sections-pingdeng-yuguan"]`, plus the approved explicit
       fortune-clause exclusion.
    2. **Add exactly one** new record, `three-sections-pingdeng-yuguan`.
  A `three-sections-xiangcheng-taiqing` record must **not** be created — it would duplicate the
  existing Taiqing record. After promotion, active count and connector residue must be exactly
  **2**, not 3.

- **D2-4 — HOLD THE TARGET.** Gate D stays at 250 and `NOT_READY` is accepted. The threshold is
  not to be revised to fit the current corpus. A later evidence-based capacity review may
  reconsider it only after source acquisition. **Passing the gate is not authorised during this
  task.**

- **Consequence recorded, not decided here:** satisfying D2-2's enforcement clause requires a
  bounded Stage 1/2 freeze exception on `src/heritage/resolver.js`'s `toResolvedEntry()`. See
  `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` §6 — that exception is proposed, not
  approved, and no implementation may proceed without it.

- **Implementation clarification (31 August 2026, same date).** Two corrections to how D2-1 is
  realised, given by the product owner alongside the approval of the bounded `resolver.js`
  exception above:
    1. **The `resolver.js` exception is scoped to exactly `relationshipPredicate` and
       `excludedPredicateClauses`.** No `predicateTranslation` field, no new enum, and no changes
       to `connectors.js`/`schema.js`/`validator.js` — narrower than the exception originally
       proposed in the contract document's §6.5.
    2. **D2-1 is implemented by ROUTING, not by promoting the contested lineage.** Rather than
       moving `threeSections/primary`'s literal registry key (the received Ma Yi lineage) to
       `RUNTIME_PROSE`, `ABSTRACT_LINEAGE_OVERRIDES.threeSections.primary` (a mechanism already
       reserved in `composition.js` for exactly this kind of decision) now resolves the
       CONNECTOR-resolution path's abstract "primary" request to the verified
       `taiqing-mianbu-facial` lineage instead. The Ma Yi lineage itself is untouched, stays
       `RESEARCH_ONLY`, and is never the source of an active passage — satisfying the requirement
       that its "the reading is auspicious" clause never render as active user inference.
       `heritageMaterialFor()` (the PASSAGE renderer) does not consult this override and continues
       to read the literal `"primary"` key, so the passage for `threeSections/primary` continues
       to abstain exactly as before this decision.
    Implemented in commit `4c36c2c`-onward on `claude/heritage-connector-relationships-d2`; full
    trace in `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` §8. This is exactly one connector
    (`three-sections-facial-proportion-taiqing`) activated, not the full two-record D2-3 scope —
    the second (`three-sections-pingdeng-yuguan`) record remains future work under this decision.

- **D2-3 IMPLEMENTED (1 September 2026).** The second record, `three-sections-pingdeng-yuguan`,
  is now added, following the field-by-field spec in `docs/archive/D2_GEMINI_HANDOFF.md` Task 2b
  exactly: `relationshipPredicate: 平等`, `excludedPredicateClauses: ["和美"]` (the verse's
  harmony/beauty consequence-clause, excluded on the same grounds as the sibling record's `上相`),
  `sourceId: heritage-three-sections-yuguan` (an independent, byte-pinned, `VERIFIED_PRIMARY`
  Southern Tang/early Song witness — not a Ma Yi source and not the same juan as the Taiqing
  facial material), `alternateConnectorIds`/`disagreementIds` cross-referencing its sibling. The
  existing Taiqing record gained the corresponding `disagreementIds`/`alternateConnectorIds`
  fields the D2-3 spec requires. No third record was created; `three-sections-xiangcheng-taiqing`
  remains absent and forbidden. Both connectors reach `ACTIVE` disposition, measured through the
  production composition seam: `threeSections/primary` active count and connector residue are
  both exactly **2**, matching this entry's "never three" requirement. Ma Yi and its lineage are
  untouched, still `RESEARCH_ONLY`. Gate D (`DIVERSITY_TARGET = 250`, D2-4) is untouched and still
  fails; `NOT_READY` is unchanged. Full trace, measured numbers, and the leak-check methodology in
  `docs/HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md` §8.7.

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

### DR-2026-09-06-SCANNER-CAPTURE-CORRECTION

- **Date:** 6 September 2026
- **Owner:** product owner
- **Status:** approved and implemented
- **Context:** the beta scanner could not complete a capture in any room. Root cause: an
  `illuminant` gate that had no sclera sample to judge returned the same shape (`margin: -1`) as a
  gate that measured a REAL problem, and `-1` sorted ahead of every genuine failure — so a face
  failing only on eye visibility was told to change its lamps, unconditionally, forever. CLAUDE.md
  item 54 had already claimed this was fixed and pinned by a test; neither existed. Diagnosed and
  scoped in `docs/agents/BETA_CAPTURE_FIX_BRIEF.md` (PR #55, superseded by this record and its
  implementation — see below). This correction also found the beta had never adopted several
  capture-runtime behaviours production already had (autofocus recovery, the light escape hatch,
  real halo markup), and that neither surface used distinct-video-frame scheduling or prevented a
  screen-light assist from becoming the burst's illuminant.
- **Decision — four principles, binding on this codebase's capture and gate architecture:**
    1. **A Qi Se reading requires usable illuminant evidence.** Missing sclera evidence is not the
       same product state as strange coloured light actually measured. `SCLERA UNAVAILABLE` routes
       to an instruction about WHY the sclera could not be read (eyes, or darkness); only a
       genuinely measured out-of-tolerance reading may show the coloured-light instruction.
    2. **Missing evidence never becomes a fabricated measurement failure.** Every gate result now
       carries a `status` of `"pass" | "fail" | "blocked" | "unavailable"`, not a bare margin.
       Only `"fail"` is a real measurement outside its allowed range; `captureInstruction` prefers
       any `"fail"` over a `"blocked"`/`"unavailable"` entry regardless of margin, and resolves a
       blocked entry through its named `blockedBy` gate and `reason` rather than inventing a
       diagnosis for a measurement that was never taken. Implemented generically in
       `src/qise/gates.js`, not as a one-off patch to `illuminant` alone — `filter` uses the same
       mechanism when the sharpness Laplacian could not be computed at all.
    3. **Screen illumination is an acquisition aid, never the measurement's illuminant.** The
       white screen-light assist may help find a face, let autofocus lock, and make the preview
       readable, but a burst may never complete while it is active — a browser cannot standardise
       a phone's own display brightness, so light bounced off it is not a controlled illuminant.
       Every on/off transition resets the capture hold and releases any exposure/white-balance
       lock taken under the light that just changed; once ambient light alone looks sustainable
       for a full hold, the assist is tried off, and a fresh hold is required before any burst.
       Implemented as `ScreenAssistGuard`/`gatesPassForHold()` in `src/qise/capture-runtime.js`
       (new capacity for the beta) and as an equivalent gating condition on production's existing
       `screenLightRequested` state (`src/ui/qise/app.js`) — production had exactly the gap this
       decision describes, evidenced by its own code comment ("It stays on through the hold and
       burst") until this correction.
    4. **Thresholds are not the fix.** No focus, distance, sclera-minimum or exposure threshold
       changed. The measurement-seam corrections above are architectural, not calibration; where a
       measurement is itself under-evidenced (the underexposure metric's skin-reflectance
       confound — already tracked below under Unresolved proposals) it stays flagged rather than
       silently retuned.
- **What was implemented (see PR opened from branch `claude/scanner-capture-correction`):**
    - Gate dependency model (`src/qise/gates.js`, `src/qise/framestats.js`) — principle 1 and 2,
      pinned by `tests/qise/gate-dependency.test.js`. This also corrects CLAUDE.md item 54, which
      claimed this fix already existed; it did not, and item 54 is corrected in the same PR.
    - `src/qise/frame-scheduler.js` — distinct decoded-video-frame scheduling
      (`requestVideoFrameCallback`, with a `currentTime`-deduped `requestAnimationFrame` fallback),
      adopted by both the beta and production capture loops. Neither previously distinguished a
      display repaint from a new camera frame, which a 120Hz panel against a 30–60fps camera makes
      routine.
    - `src/qise/capture-runtime.js` — `ScreenAssistGuard` (principle 3), `RefocusRecovery` and
      `StallTracker`, extracted so a decision that already existed correctly in production is
      available to the beta rather than reimplemented divergently.
    - `src/qise/frame-geometry.js` — the on-screen face guide is now sized from the SAME
      `DISTANCE_MIN_FRACTION` the distance gate enforces, mapped through the actual
      `object-fit: cover` crop, rather than an independently chosen percentage that could (and
      did) silently disagree with what the gate measured.
    - `src/qise/diagnostics.js` — a development-flag-gated (`?devtelemetry=1` / `?captdbg=1`),
      non-biometric capture-telemetry recorder (device capabilities, frame throughput,
      time-to-milestone, refocus/assist-cycle counts, per-blocker stall duration). No pixel, mesh
      or landmark is ever accepted by any of its methods. For the next physical-device test.
    - The beta's capture stage gained the real quality-ring markup its own JS had queried for
      since it shipped (`createExposureHalo`'s `[data-halo-progress]` lookup had always returned
      null), a neutral acquisition-light wash kept structurally separate from the ring's colour
      states, the same four-chip readiness strip production uses, and hidden-by-default debug
      output — a consumer mid-capture no longer sees `L*`/`WB`/`HALO` readouts.
    - Two real bugs found in the existing Playwright e2e fixtures while building the verification
      for this: `launchArgs` is not a Playwright Test option (the real key is
      `launchOptions.args`), and `--use-file-for-fake-video-capture` alone registers no device
      without `--use-fake-device-for-media-stream` alongside it. Both meant the fake camera never
      engaged and every existing beta e2e test tolerated a real `NotFoundError`, passing anyway.
    - `e2e/beta-capture-finalisation.spec.js` and `e2e/qise-capture-finalisation.spec.js` — genuine
      positive and negative controls driving the REAL, unmodified capture code through a
      canvas-painted synthetic face (built from the same canonical reference mesh every unit test
      already uses) to an actually-stored reading, on both surfaces. Explicitly not a MediaPipe
      accuracy test (the mesh is supplied, not detected) — the existing smoke tests against the
      real bundle remain what proves MediaPipe itself still loads.
- **What was deliberately NOT done, and why:** no threshold changed (principle 4); the underexposure
  metric's skin-reflectance confound is not re-derived (already correctly tracked below, under
  Unresolved proposals, as needing recorded physical-device evidence, not a guess); no rewrite of
  production's illumination-check, selfie-upload, or twelve-palace reading logic — the two changes
  to `src/ui/qise/app.js` are the frame-scheduler swap and the screen-assist hold-gating, verified
  by a new e2e smoke test plus the full existing `qise-integration`/`qise-redesign` suites, which
  all still pass; a full visual redesign of the capture journey is parked behind
  `docs/VISUAL_DIRECTION.md`'s research-note prerequisite (a bounded note was produced alongside
  this record — see `docs/design/CAPTURE_JOURNEY_RESEARCH_NOTE.md`).
- **Physical-device verification (explicitly NOT claimed by this record):** everything above was
  verified in a sandboxed Linux CI-style environment with a synthetic camera. What real Android
  camera buffer dimensions and orientation are, what sclera pixel yield a real eye produces, and
  whether the quality ring/refocus/assist behaviour reads correctly on an actual screen all remain
  to be checked on a Samsung device — the diagnostics module above exists specifically so that
  test can report back more than "it worked" or "it didn't".
- **PR #55 disposition:** closed as superseded. It was a diagnosis-only handoff brief written
  against an earlier state of `main`; this record and its implementation supersede it directly.

### DR-2026-09-09-GUIDED-MULTIVIEW-CAPTURE

- **Date:** 9 September 2026
- **Owner:** product owner
- **Status:** approved — direction and constraints only. This is the first repository record of
  this decision. No `DR-2026-09-07-GUIDED-MULTIVIEW-CAPTURE` or any similarly named entry existed
  before this one: verified by a full-repository grep and a `git log --all` search across every
  branch and commit on 9 September 2026, both returning zero matches. The direction was discussed
  conversationally earlier in the same product-owner session that produced this entry; that
  conversation is not itself a repository decision, and this entry does not claim it was.
- **Context:** the product's stated north star is a fast, deliberate daily-portrait ritual, not a
  biometric scanning procedure. The current capture flow (`src/qise/`, `src/ui/qise/app.js`) is
  single-frontal-view, still-photo, burst-based (`BURST_FRAMES = 9`, `src/qise/camera.js`). This
  decision authorises exploring a guided multi-view capture architecture as a bounded direction,
  under an explicit governing test rather than an open licence to capture more:
  > *"What is the smallest guided capture sequence that can legitimately expose the largest useful
  > set of already-authorised observations?"* — never *"what is the largest number of views we can
  > technically capture?"* An additional view earns a place in the default flow only by meaningful
  > authorised utility it cannot reliably obtain from the canonical frontal view alone, never merely
  > because the camera can technically capture it.
- **Four things this decision keeps distinct**, because collapsing any pair is the actual risk in
  "richer capture, richer product": **source authority** (what the historical corpus attests),
  **measurement authority** (what a validated method can legitimately measure), **capture
  observability** (what a capture session makes observable), and **product output** (what the
  application actually shows). Improved observability must never jump directly to product output
  without first clearing source and measurement authority — the same discipline `rawScalars()` /
  `analyse()` already enforce in `src/engine.js` (CLAUDE.md item 16) and `RESEARCH_ONLY` /
  `RUNTIME_PROSE` already enforce in the heritage connector registry. Multi-view capture gets no
  exception to it.
- **Decision — five product-owner determinations, plus the constraints that bound them:**
    - **A. First-release capture scope.** Canonical frontal capture, controlled left oblique, and
      controlled right oblique — three views, no more. Profile, rear, ear-specific, top/bottom or
      any other view is explicitly **excluded from the first release** unless the repository later
      contains evidence that makes a specific one both necessary and authorised; absent that
      evidence, it stays out. This is a scope decision, not an approval of exact yaw/pitch values
      for the two oblique views — those remain calibration parameters (see below).
    - **B. Capture technology.** The target is a short guided **video** capture session, not a
      sequence of manually requested stills: `open → guided capture → automatic acquisition →
      automatic quality assessment → automatic valid-frame/segment selection → reading/portrait`.
      The video is an acquisition mechanism, not a new data product. Automatic frame/segment
      selection is permitted only bounded by the existing quality and safety architecture (see
      constraint 2 below) and must never optimise for flattering appearance, attractiveness, a more
      interesting or favourable reading, or construct availability at the expense of valid capture
      quality.
    - **C. Stage 3 is not a capture dependency.** Guided multi-view capture does not require, and
      must not be blocked on, Stage 3 heritage production work. Capture observability does not
      create source authority, does not create measurement authority, does not promote a
      `RESEARCH_ONLY` connector, and does not authorise Stage 3 production — a future Stage 3
      promotion remains its own, separate decision regardless of what capture makes observable.
    - **D. Capture burden.** Product-experience targets, not calibrated runtime constants: roughly
      10–20 seconds for the guided capture itself, with the overall default flow staying under 60
      seconds. Exact duration, frame rate, yaw/pitch targets, pose tolerance, quality thresholds and
      scanner thresholds are **not** set by this decision — they require calibration, device
      testing and regression evidence, exactly as `docs/CALIBRATION_TODO.md`'s existing open items
      already do for the current pipeline. The user is not exposed to yaw/pitch/landmark/confidence
      mechanics unless later usability evidence explicitly justifies it; automatic progression is
      preferred over a checklist of poses.
    - **E. Fairness ownership.** Engineering/research owns producing the fairness evidence; the
      product owner owns final release acceptance of it. Evaluation should consider skin tone, age,
      device tier/camera characteristics, resolution, lighting, pose, frame-selection behaviour, and
      capture failure/retry/abstention behaviour, **where the available evidence supports doing
      so** — this decision does not invent a demographic-testing harness the repository does not
      have; if one is required, that is implementation work to scope separately, not something to
      pretend already exists.
    - **1. Epistemic separation is absolute, unchanged by capture richness.** Qi Se stays
      within-subject, self-referenced, longitudinal. The canonical frontal segment stays the
      longitudinal reference unless a *separate* decision validates and approves an alternate
      baseline. Alternate views never silently enter the historical baseline. No between-subject
      comparison, no demographic classification, and none of the fourteen prohibited-inference
      categories already listed in this register (`docs/OPTION_B_020_DOSSIER.md` §10.2) gain a new
      pathway because a new view exists.
    - **2. "Controlled view" is a runtime contract, not prose.** A frame does not become a
      controlled view because the user happened to turn their head. It requires an explicit guided
      target, measurable pose/quality/illumination validity, bounded acceptance conditions, and
      deterministic rejection of invalid frames. This decision does not fix the numbers.
    - **3. Best-frame/segment selection is bounded by the existing gates, not a new one.** It must
      operate within the existing `captureQualityGate → safetyGate` precedence (`docs/
      PRODUCT_DESIGN_V2.md`, cited live from `src/heritage/composition.js:20`), never weaken either
      gate, use deterministic and versioned criteria, preserve longitudinal comparability (matching
      the `basis`-tagging discipline `glowIndex`/harmony already use — CLAUDE.md items 18 and 33),
      reject invalid frames rather than choose the least-bad invalid one, and abstain if no valid
      frame exists.
    - **4. Confidence measures capture/measurement quality only.** It cannot create a construct,
      authorise a source relationship or a proxy, rescue invalid anatomy, override an abstention or
      a safety gate, widen an existing output boundary, or become a hidden user score. Higher
      confidence means stronger evidence for an already-authorised observation, never broader
      product authority.
    - **5. The privacy boundary covers the whole acquisition pipeline.** Raw video, transient
      frames, processed frames, landmarks, geometry, intermediate representations, embeddings,
      metadata, logs, caches and crash/error artifacts are all in scope. Moving from still capture
      to video must not silently create persistent biometric storage: raw video and transient
      frames stay volatile by default, and nothing is persisted or transmitted merely because the
      capture class changed. **This decision authorises no persistent biometric embedding of any
      kind.** Any future proposal to persist one is a separate decision against `docs/
      SECURITY_PRIVACY_THREAT_MODEL.md` and `docs/LOCAL_AND_CLOUD_DATA_ARCHITECTURE.md`.
    - **6. Enforcement is architectural, not documentary.** A capture session would conceptually
      need to represent canonical frontal capture, left- and right-oblique capture, view/capture
      class, quality evidence, per-view availability, confidence, and abstention state. Measurement
      resolution consumes only capture classes it explicitly supports; a missing required view fails
      closed; there is no silent fallback from oblique to a frontal proxy, from unavailable anatomy
      to an invented proxy, or from an invalid frame to a "best available" invalid one. This
      decision does not prescribe an exact object shape — that is an implementation task to weigh
      against the current architecture, not a decision to make in the abstract.
    - **7. Traditional/heritage fidelity cannot be a casualty of better capture.** Source
      disagreement, multiple lineages, partial observability and attribution are all preserved, per
      the existing heritage connector disagreement-preservation contract (`docs/
      HERITAGE_CONNECTOR_RELATIONSHIP_CONTRACT.md`; CLAUDE.md item 20). Richer capture is not
      licence to erase ambiguity, silently modernise a traditional relationship, or convert an
      observable geometry into a traditional claim the source evidence and measurement authority
      don't already support.
    - **8. The current production pipeline stays authoritative until a replacement earns it**,
      against the acceptance criteria listed below. A rollback path is required. A technically
      working prototype is not sufficient grounds to demote the current pipeline.
- **Consequences:** authorises bounded architectural design and prototyping work toward guided
  multi-view capture, under every constraint above. It does not authorise writing or shipping
  production capture code, and does not itself change `src/qise/`, `src/ui/qise/app.js`, or any
  gate/threshold in `src/qise/gates.js`.
- **Explicit non-consequences:**
    - Does not approve exact capture duration, frame rate, yaw/pitch targets, pose tolerance, or
      any capture-quality or scanner threshold.
    - Does not approve new landmark mappings, auricle measurement, calibrated 3D reconstruction, or
      3D reconstruction as a proxy for missing evidence.
    - Does not approve any new construct, any new measurement, or any Stage 3 heritage production
      behaviour (constraint C).
    - Does not adjudicate R3, R6, R8 or R9 — those remain governed by whatever this register
      separately says about them, unaffected by this entry.
    - Does not reintroduce the independent cultural-review requirement retired by
      `DR-2026-08-19-CULTURAL-REVIEW-RETIREMENT`.
    - Does not change the current production capture pipeline's authoritative status, and does not
      change scanner code, capture-quality gates, or safety gates.
    - Does not modify pull request #61 or anything on its branch.
    - Does not authorise any medical, personality, fortune, longevity, wealth/rank, destiny,
      attractiveness, identity, or other already-prohibited inference — the existing
      fourteen-item prohibited-inference list is unchanged.
- **Acceptance criteria before any replacement of the current capture pipeline:** repeatability
  (measured test-retest agreement); longitudinal baseline compatibility (no accidental second,
  incompatible baseline); regression against the current pipeline (same subject, same conditions,
  both pipelines, diffed); capture-quality-gate preservation or measured improvement; safety-gate
  preservation; a full-pipeline privacy audit against constraint 5; p95 time-to-valid-capture and a
  total capture-time budget; a declared physical-device coverage matrix; deterministic behaviour;
  graceful failure; correct, tested abstention; per-view availability correctness; zero
  unauthorised claim expansion (a copy-guard-style scan, matching `tests/copy-guard.test.js`'s
  method); fairness evidence (constraint E); an exercised rollback path; no persistent biometric
  embeddings; no hidden proxy substitution. A technically working prototype does not by itself
  satisfy this list.
- **Supersedes:** nothing. No prior entry addressed guided multi-view capture.

### DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9

- **Date:** 9 September 2026
- **Owner:** product owner
- **Status:** approved
- **Context:** `DR-2026-08-17-B020-CLASS-A` approved ten Class-A dispositions from B-020 and left
  R3, R6, R8 and R9 **not approved** because those four are Class B (cultural judgement) and/or
  Class C (legal exposure) rows, not mechanical ones — `docs/OPTION_B_020_DISPOSITIONS.md` §R3/R6/
  R8/R9 is the evidence record for each, cited verbatim below rather than re-derived. The product
  owner reviewed and approved each row's recommended disposition earlier in this session; this
  entry is the repository record of that approval, requested explicitly so these four rows stop
  being an open blocker on downstream work (`docs/RELEASE_GATES.md`'s "R3, R6, R8 and R9 remain
  provisional" line, and Decision Card 10 in `docs/DECISION_CARDS.md`, both cite this gap).
- **Decision — all four approved as recommended in the dossier:**

    | Row | Decision |
    |---|---|
    | **R3** | **Four Rivers (四瀆) carries both source-attested 目/口 lineages, tagged by lineage — neither is selected as sole primary.** 太清神鑑 and 人倫大統賦 give 目=淮／口=河; 神相全編 and the 神異賦 commentary give 目=河／口=淮; both are internally reinforced and contemporary sources reproduce the split without noticing it. Picking one would silently assert a resolution to a disagreement this project has no standing to make. Already implemented: `sourceLineage` is a reading-affecting dimension with `primary`/`variant` entries across the heritage registry/resolver/composition layer. |
    | **R6** | **Five Officers (五官) ship as the physiognomic membership — ear, eyebrow, eye, nose, mouth — never the Neijing membership (which substitutes tongue and carries organ-correspondence/diagnostic semantics).** 保壽官's longevity title is stripped. The Neijing set (靈樞·五閱五使) is medical doctrine, not divination doctrine; shipping it would be a diagnostic claim this product must not make, and the tongue is not visible in a face capture regardless. Already implemented: the current heritage entry uses the physiognomic five and already omits the longevity title. |
    | **R8** | **妻妾宮 and 奴僕宮 are retained in source/provenance records verbatim, but suppressed from reader-facing interpretation.** 妻妾宮 is explicitly polygynous and 奴僕宮 is servile in the source texts; rendering either literally is offensive, and silently modernising them (e.g. to 夫妻宮) misrepresents the primary source. Ten of the twelve palaces remain readable; these two are documented as existing, never rendered as a reading about the user. Corroborated by two independent primary sources this session (太清神鑑, already `VERIFIED_PRIMARY` in `src/heritage/evidence.js`; and 欽定古今圖書集成's excerpting of 神相全編, provisional/unproofread — see `docs/heritage-evidence/SOURCE_ACQUISITION_FINDINGS_2026-09-09.md`), both giving the same names and the same 魚尾 (fish tail) location for 妻妾宮. **Code consequence, not yet built as of this entry:** `src/reading/twelve-palaces.js` currently withholds the entire construct (`WITHHELD_PENDING_SOURCE_REVIEW`) pending broader source review; a follow-up change is required to add an explicit suppression list for these two names specifically, distinct from the general withholding, before the other ten can responsibly render. |
    | **R9** | **Colour (五色) is permanently excluded as an input to Five Elements classification. Not negotiable, not merely a product preference.** Complexion (蒼/赤/黃/白/黑) is intrinsic to the classical typology, so a faithful implementation is bias-generating by construction, and EU AI Act Art. 5(1)(g) prohibits biometric categorisation to infer race as an outright prohibition, not a risk tier to weigh. Qi Se still measures colour, but only as a within-subject delta against the user's own baseline, never as a between-subject type. Already true of the reflection engine. A standing test (in the spirit of `tests/copy-guard.test.js`) that element assignment does not correlate with skin tone remains a good follow-up if not already covered. |

- **Evidence:** `docs/OPTION_B_020_DOSSIER.md` and `docs/OPTION_B_020_DISPOSITIONS.md` §R3/R6/R8/
  R9, which carry the full source citations, product/corpus consequences and risk analysis both
  ways for each row — this entry records the approval, it does not restate the underlying
  research.
- **Consequences:** `docs/RELEASE_GATES.md`'s "R3, R6, R8 and R9 remain provisional" line is
  stale as of this entry and should be updated to reflect all fourteen B-020 rows closed. R8 still
  requires the code follow-up named above before it is fully reflected at runtime — approval of
  the disposition does not itself implement the suppression list. None of these four approvals
  changes any heritage family's commercial-release status; all six remain `Blocked` in
  `docs/commercial-rights-audit.md` exactly as `DR-2026-08-17-B020-CLASS-A` already states.
- **Explicitly not decided:** this entry does not touch Decision Card 10 (whether the Twelve
  Palaces *construct's* overall runtime status should be promoted) — that remains a separate,
  narrower question about presentation weight, addressed on its own below. It does not authorise
  any new construct, measurement, or Stage 3 production behaviour.
- **Supersedes:** the "not approved... remain provisional" clause of `DR-2026-08-17-B020-CLASS-A`
  for rows R3, R6, R8 and R9 only; that entry's ten Class-A rows and all other text are unchanged.

### DR-2026-09-09-R8-TWELVE-PALACES-RESTORED

- **Date:** 9 September 2026
- **Owner:** product owner
- **Status:** approved and implemented
- **Context:** the R8 disposition in the entry directly above this one recorded the product owner's
  approval of *suppressing* 妻妾宮 and 奴僕宮 from reader-facing interpretation, and
  `src/reading/twelve-palaces.js` implemented that suppression the same session. Minutes later, in
  the same conversation, the product owner reviewed the actual tradeoff (a disclaimer does not cure
  content that could read as demeaning; nothing about the suppression "gutted" the source, which
  remained fully intact in `src/heritage/evidence.js` throughout) and explicitly reversed course,
  choosing literal rendering over suppression. This entry is that reversal's repository record.
  **It is a genuine change of decision, not a correction of an error** — the earlier suppression
  was a legitimate, considered call at the time it was made; the product owner is entitled to revisit
  it, and this record says so plainly rather than quietly rewriting history.
- **Decision — two separable questions, resolved differently:**
    1. **Naming.** 妻妾宮 and 奴僕宮 render literally as "Wife/Concubine Palace" and "Servant Palace"
       — the R8 suppression mechanism (`R8_SUPPRESSED_PALACE_KEYS`, `suppressedByR8`) is removed
       entirely from `src/reading/twelve-palaces.js`. No modern substitution, no omission. The
       mitigation is *not* merely a general disclaimer (a disclaimer does not by itself keep
       personalised content from reading as a verdict about the user) — it is the same
       tradition-attributed, never-assertive framing every other Module A reading surface already
       uses (CLAUDE.md item 19), which both keeps the content honest about what it is (a statement
       about a classical tradition, not about the reader) and keeps it passing
       `tests/copy-guard.test.js`'s existing, unweakened rules.
    2. **Structure — a separate, newly surfaced question the naming decision did not settle.**
       Checking the actual evidence before writing content surfaced that this project's own
       `VERIFIED_PRIMARY` source (太清神鑑, `src/heritage/evidence.js`, folio
       `<pb:KR3g0045_WYG_001_17b>`) disagrees with the received/widely-circulated layout on two
       *other* palaces — Wealth (nose vs. forehead/jaw) and Property (太清神鑑 has no such palace at
       all; its twelfth slot is a general "Appearance" category) — a disagreement already on record
       in `evidence.js` (`twelve-palaces-constituents`, `twelve-palaces-twelfth-slot`) before this
       session, silently unresolved in the code's placeholder layout. Put to the product owner
       separately, because it is a different kind of problem (the app's own best evidence
       disagreeing with itself, not an offence question): resolved by following this same module
       family's existing precedent — `src/reading/three-courts.js` ships `heritageReading: null`
       plus a `sourcesDiffer` note rather than silently picking a boundary when its own sources
       conflict. Wealth and Property now do the same: region measured, `reading: null`, a
       palace-specific `structuralNote` explaining why, and the general disagreement stated in the
       module's `SOURCES_DIFFER` export. The other ten palaces, including the two contested-name
       ones, carry full tradition-attributed content.
- **Implementation:** `src/reading/twelve-palaces.js` rewritten — all twelve palaces now render
  (`heritageStatus: "RUNTIME_PROSE"` for ten, `"WITHHELD_STRUCTURAL_DISAGREEMENT"` for Wealth and
  Property), each with real reading prose cited to Taiqing Shenjian. Reader-facing strings use
  romanised forms (e.g. "Qiqie Gong", "Nupu Gong"), not Han characters — `tests/ui-language.test.js`
  pins a project-wide, pre-existing rule that reader-facing `src/` string literals outside
  `heritage/` and `reading/provenance.js` stay English-only; the Han characters are not hidden, they
  remain exactly where they already were, uncensored, in `src/heritage/evidence.js`. `src/
  readingview.js` and `src/ui/qise/screens.js`/`app.js` (the two independent view consumers of this
  data) updated to match: location now always shown (a factual statement of where the app samples,
  independent of whether an interpretation is offered), stale "interpretation withheld" copy
  corrected, `structuralNote`/`translationNote` wired through both render paths.
- **Evidence:** `docs/OPTION_B_020_DISPOSITIONS.md` §R8 (naming); `src/heritage/evidence.js`'s
  `twelvePalaces` record (structure, both open disagreements, pre-dating this session);
  `src/reading/three-courts.js` (the precedent followed for structural disagreement).
- **Consequences:** supersedes the R8 row's *suppression* outcome recorded in
  `DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9` above — that entry's R3, R6 and R9 rows are unchanged;
  only R8's disposition changes, from "suppressed" to "rendered literally." Also supersedes Decision
  Card 10's "no change" resolution in `DR-2026-09-09-DECISION-CARDS-3-4-5-7-8-10` below: this entry
  *does* promote the construct's presentation for ten of twelve palaces, while deliberately not
  promoting Wealth or Property, which is a third option neither of Card 10's original two
  (`docs/DECISION_CARDS.md`) considered. `docs/DECISION_CARDS.md`'s Card 10 entry is updated to
  point here. Does not change any heritage-connector-registry field
  (`verificationStatus`/`runtimeStatus` in `src/heritage/evidence.js`) — this is Module A
  hand-authored reading content, the same mechanism `five-elements.js`/`three-courts.js` already
  use, not a change to Stage 3 connector eligibility.
- **Verified:** `npm test` → `tests 1403 / pass 1403 / fail 0`. `npm run build` → 108 files. `npm
  run lint:bundle` → all four guards ok, including the copy blocklist and the pre-existing
  English-only guards this entry's content had to be rewritten once to satisfy (an early draft
  embedded Han characters directly in `twelve-palaces.js`'s string literals; caught by
  `tests/ui-language.test.js`, not by review).
- **Supersedes:** as stated in Consequences above — R8's outcome in
  `DR-2026-09-09-B020-CLASS-BC-R3-R6-R8-R9`, and Card 10's outcome in
  `DR-2026-09-09-DECISION-CARDS-3-4-5-7-8-10`.

### DR-2026-09-09-DECISION-CARDS-3-4-5-7-8-10

- **Date:** 9 September 2026
- **Owner:** product owner
- **Status:** approved
- **Context:** `docs/DECISION_CARDS.md` accumulated eleven open cards, several with a stated
  research recommendation that was never itself an approval. The product owner asked for
  blockers to be cleared and the work carried through. This entry approves the recommendation on
  every card where doing so does not touch a safety gate or a rights/legal determination — those
  two categories (Cards 6, 9, 11) are deliberately **not** included here; see the entry below.
- **Decision, one row per card, each approving the card's own stated research recommendation
  verbatim unless noted:**

    | Card | Decision |
    |---|---|
    | **3** (retention shape) | **Option A — canonical (aligned, cropped) frame only**, with Option B (original retained in optional backup) recorded as a documented future option if a concrete reprocessing need is ever identified. Storage is not unlimited and doubling per-day storage forever (Option C) was rejected for trading against that with no identified need. This decision is **downstream of Card 1** below and takes effect only if/when Card 1's charter amendment is acted on. |
    | **4** (encryption/key recovery) | **A generated recovery key, shown once at setup**, with an explicit "write this down, we cannot recover it for you" message, as the primary mechanism — chosen because it does not depend on a memorable-but-weak user passphrase or a platform credential store's availability across every target device. Also downstream of Card 1. |
    | **5** (multi-device policy) | **Approved: one active writing device for v1**, with a conflict surfaced rather than merged. Full multi-device conflict resolution for a face-photo archive is exactly the kind of architecturally significant work not to build speculatively before a simpler version has shipped and been used. Also downstream of Card 1. |
    | **7** (Five Mountains lineage routing) | **Option D now** — `ABSTRACT_LINEAGE_OVERRIDES` stays empty; the abstract `"primary"` rotation slot stays unrouted, rendering as measured geometry plus a note that the classical rule needs multiple witnesses. **Option E (a genuine multi-witness render path) is the approved future direction**, not approved for implementation now — it may require a change to frozen Stage 2 semantics and needs its own review first. Options A/B/C (routing to one single witness) are rejected: each would silently privilege one lineage's predicate set over the others and erase a documented disagreement. |
    | **8** (supersede R7 disclosure) | **Option A — correct the disclosure.** `src/qise/reflection-corpus.js`'s `HERITAGE.fiveElements` entry is corrected in this session (see below) to cite Taiqing Shenjian's own Five Forms chapter as the physiognomic source and to characterise 靈樞·陰陽二十五人 (Ling Shu, Yin-Yang Twenty-Five Types) as a related classical framework sharing imagery, not as physiognomic evidence for a twenty-five-fold face-reading subdivision. **R7's runtime eligibility (the five-type reduction itself) is unchanged** — only the attribution's characterisation was corrected, per the recommendation's own reasoning that the reduction's defensibility does not depend on the conflation. |
    | **10** (Twelve Palaces construct runtime status) | **Superseded, same day, by `DR-2026-09-09-R8-TWELVE-PALACES-RESTORED` below.** This row originally recorded "Option A — no change" against Card 10's original binary framing. Minutes later, resolving Card 8's naming question surfaced the same underlying disagreement this row is about, and the product owner chose a third option neither of Card 10's two considered: promote ten of twelve palaces to real reading content, while Wealth and Property specifically stay unpromoted (`heritageStatus: "WITHHELD_STRUCTURAL_DISAGREEMENT"`) for exactly the reason this row gives — the open disagreement is real and must not be obscured. See that entry for the full reasoning; this row is left in place, struck through in effect rather than deleted, so the register shows the actual sequence rather than a single retroactively-tidied answer. |

- **Evidence:** `docs/DECISION_CARDS.md` §CARD 3/4/5/7/8/10, which carries the full options table,
  evidence and the research recommendation this entry approves for each.
- **Consequences:** `src/qise/reflection-corpus.js` is amended (Card 8) — see that file's
  `HERITAGE.fiveElements.primary` entry and its inline comment citing this record.
  `docs/DECISION_CARDS.md` is updated to mark Cards 3, 4, 5, 7, 8 and 10 resolved, each pointing at
  this entry. Cards 3, 4 and 5 remain non-actionable until Card 1 (below) is acted on — approving
  their shape now means the shape is settled whenever that happens, not that anything is built yet.
- **Explicitly not decided:** Cards 6, 9 and 11 are unchanged by this entry — see the dedicated
  entry immediately below for why each is excluded on purpose.
- **Supersedes:** nothing; these six cards had no prior decision recorded.

### DR-2026-09-09-CARDS-1-2-DAILY-PORTRAIT-CHARTER

- **Date:** 9 September 2026
- **Owner:** product owner
- **Status:** approved — decision and charter wording only; PR C's implementation is separately
  gated (see Consequences)
- **Context:** `docs/PROJECT_CHARTER.md` and `AGENTS.md` independently state that raw camera
  frames are volatile-only and never persisted. `docs/PRODUCT_NORTH_STAR.md`'s Daily Portrait
  pillar requires a persisted photograph, which is impossible under the charter's current wording.
  Decision Card 1 asked whether to amend the charter (narrowly, for a display frame only) or not
  build Daily Portrait's persistence layer at all. Decision Card 2 asked whether Daily Portrait
  storage consent should be its own domain or extend Qi Se's existing consent gate.
- **Decision:**
    - **Card 1 — Option A, approved.** The charter is amended to permit persisting a **timeline
      display frame** — the aligned, cropped, orientation-corrected artefact
      `docs/DAILY_PORTRAIT_ARCHITECTURE.md` specifies — and nothing else. The **measurement-path
      guarantee is explicitly unaffected**: raw camera frames, and any frame consumed by
      `regionStats()`/`computeReadingMetrics()`/the Qi Se measurement path, remain volatile-only,
      never persisted, never transmitted, exactly as today. `docs/PROJECT_CHARTER.md` and
      `AGENTS.md` are both amended in this same change to state this precisely, per the card's own
      scoping — see the diff in each file, dated to this entry.
    - **Card 2 — Option B, approved (the card's own conservative default).** Daily Portrait
      storage extends `src/qise/consent.js`'s existing single consent gate rather than gaining a
      separate consent domain. This forecloses "timeline without Qi Se consent" as a v1 product
      path; migrating to separate domains later (Card 2's Option A) remains available and would be
      additive, not a weakening of anything shipped under Option B. `withdraw()`'s existing
      mandatory `deleteAll` argument is unaffected either way.
- **Evidence:** `docs/DECISION_CARDS.md` §CARD 1/CARD 2; `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s
  measurement/display separation rule, which is what makes Card 1's narrow amendment possible
  without touching the tested measurement-path guarantee.
- **Consequences:** this entry approves the **charter wording and the consent shape**. It does
  **not** implement PR C — no photo-persistence code, no new IndexedDB store, no backup/encryption
  wiring is written by this entry. `docs/DAILY_PORTRAIT_ARCHITECTURE.md`'s own scope (schema,
  one-day-one-frame rules, timezone handling, the three required tests) remains the specification
  PR C must follow when it is actually built, as a separate, substantial engineering effort with
  its own tests and its own review — bundling that into a decision-recording pass would be exactly
  the kind of storage-heavy, safety-relevant change that deserves dedicated scrutiny, not a rider
  on this entry. Cards 3, 4 and 5's approvals (above) take effect only once PR C is scoped.
- **Explicitly not decided:** exact schema field types beyond what
  `docs/DAILY_PORTRAIT_ARCHITECTURE.md` already specifies; encryption implementation; backup wire
  format details; any UI design for the timeline itself.
- **Supersedes:** nothing; Cards 1 and 2 had no prior decision recorded.

### DR-2026-09-09-CARDS-6-9-11-NOT-RESOLVED

- **Date:** 9 September 2026
- **Owner:** product owner (this entry records a deliberate non-decision, not an oversight)
- **Status:** recorded — no change to any of the three cards
- **Context:** in the same pass that closed Cards 1–5, 7, 8 and 10, three cards were
  **deliberately left open**, on the judgement that "clear the blockers" should not be read as
  "resolve every open question the same way" — these three are not product preferences with a
  research recommendation waiting for a rubber stamp; each is a safety gate, an explicit
  no-agent-recommendation card, or a legal/rights determination.
- **Decision — left exactly as `docs/DECISION_CARDS.md` already states, for these reasons:**
    - **Card 6 (Qi Se safety authorisation) — not resolved.** `SAFETY_AUTHORIZED = NOT_GRANTED`
      stands. This is not a content or product-shape choice; it is the switch that determines
      whether Stage 3 heritage production stays fail-closed. Approving "no safety-referral gate
      needed" without an actual designed and built safety signal (option (b) in the card) would be
      approving a regulatory posture change by fiat, in a session with no new safety-engineering
      evidence to justify it. Left `NOT_GRANTED`.
    - **Card 9 (analytics boundary) — not resolved, and not to be resolved by an agent.** The
      card's own text is explicit: "not so that Claude can recommend turning them on." Nothing in
      this pass changes that; no telemetry event is implemented.
    - **Card 11 (Kanripo surrogate rights) — not resolved.** `SURROGATE_RIGHTS_NOT_DECLARED` stands
      for every affected `SOURCE_REGISTRY` record. Whether an organisation-level CC BY-SA 4.0
      declaration clears this product's commercial use is a rights/licensing determination, not a
      product preference — the card itself says it "requires product-owner and/or counsel review."
      The product owner has decision authority here, but that authority is exercised by an actual
      considered rights determination, not by this pass declaring it cleared to remove a blocker.
      If the product owner wants to make that determination now, it needs its own entry stating
      the reasoning, not a line item in a batch closure.
- **Consequences:** none — this entry changes no code, no status field, no runtime behaviour. Its
  only effect is to make the exclusion a recorded decision rather than a silent gap, so a future
  pass does not mistake "not mentioned" for "cleared."
- **Supersedes:** nothing.

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
