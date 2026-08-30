# Option B daily-loop programme

## Authority and outcome

Decision `DR-2026-08-15-DAILY-LOOP` approves Option B as the product direction. This document is the authoritative programme boundary. `docs/OPTION_B_EXECUTION_PLAN.md` is its ordered work queue.

The intended outcome is a voluntary, on-device daily reflection loop that can combine the existing enduring portrait and Qi Se personal-baseline history with additional transient observations **only where those observations have separately passed source, measurement, fairness, privacy and copy gates**.

Approval of the programme is not approval of a proposed signal. Research names such as “Shen burst variance” and “tension delta” must not be rendered to users, persisted or routed into interpretation merely because they appear here.

## Truth at programme start

| Area | Repository evidence | Programme treatment |
|---|---|---|
| Qi Se | Implemented median/MAD personal comparison with a trailing 30-reading window, recent-three exclusion, calibration, history, magnitude bands, confidence and allow-listed derived persistence under `src/qise/`. | Reuse as the first daily-loop foundation after the defects below are repaired and physically verified. Do not rewrite it to make the new programme look uniform. |
| Qi Se passages | Timestamp-seeded composition exists, but the course expects personal `ming`/`run` z-scores that the production baseline does not calculate or persist. | Treat course variation as defective until production and reopen-path tests prove genuine personal deltas. |
| Qi Se baseline continuity | `shouldResetBaseline()` has device, capture-mode and long-gap rules in isolated tests, but the production path does not call it and persistence deliberately omits the device fingerprint it expects. | Contract and wire baseline lineage, algorithm/capture-class segmentation, reset and recalibration before adding new longitudinal signals. |
| Qi Se patterns and cadence | The pattern engine consumes tags, but production always stores `tags: []`; timestamp-keyed storage also permits multiple readings per day. | Decide the tag feature and canonical-day/reroll policy explicitly; do not describe either as a live retention mechanism. |
| Burst data | Qi Se live capture records per-region frame stability and aggregate `frameJitter` from a colour burst. Its landmarker sets `outputFaceBlendshapes: false`. | Capture-quality evidence only. It is not an observable called Shen and cannot support spiritual, emotional or character inference. |
| Still-photo path | The fallback duplicates one colour sample to satisfy the reducer and correctly records temporal jitter as unavailable. | Always ineligible for any temporal candidate; duplication must never be represented as multiple temporal observations. |
| Expression and asymmetry | `src/expression.js` describes a single capture using MediaPipe blendshapes and explicitly limits its use to state/capture observations. | Candidate vocabulary for research only. It is not a longitudinal tension signal and must never become a trait judgement. |
| Enduring structures | The integrated record contains Five Elements, Three Sections, Twelve Palaces and Harmony. Five Mountains, Five Officers and Four Rivers are not implemented. | Define and verify each missing construct separately. Unsupported front-camera anatomy, including ears where unavailable, must remain ineligible rather than receive invented geometry. |
| Shen | No production measurement contract, eligibility rule or approved corpus exists. | Begin with source and construct research. Use a neutral internal candidate ID until terminology and meaning are approved. |
| Baseline-relative tension | No production longitudinal measurement, baseline reset rule, proof verdict or approved corpus exists. | Design and prove separately from single-capture asymmetry and from Qi Se colour. Compare a user only with their own eligible history. |
| Cross-construct daily corpus | No verified parallel corpus exists for the proposed transient states. | Draft only after the corresponding signal has an approved proof verdict and source ledger. |

## Non-negotiable boundaries

- Raw frames, ROI pixels, landmark coordinates and embeddings remain volatile, on-device and unpersisted.
- No runtime cloud AI, server-side face inference or account requirement is introduced by this programme.
- A transient observation describes an eligible capture relative to a versioned personal baseline. It does not identify emotion, health, personality, character, attractiveness, protected traits, fortune or future behaviour.
- No cross-user norm may be used for skin colour, facial movement, asymmetry or the proposed transient signals.
- Qi Se, the proposed burst candidate and the proposed tension candidate are independent signals. One passing cannot validate another.
- A quality metric cannot silently become an interpretation metric. In particular, `frameJitter` remains capture quality unless a new observable with its own contract and proof is approved.
- A traditional term cannot silently become a computer-vision claim. Sources may establish cultural meaning; they do not prove that a camera measurement observes that meaning.
- Missing evidence produces `abstain`, `ineligible` or `needsVerification`; it never produces a guessed value or generic substitute reading.
- Thresholds and acceptance criteria are decisions. The agent implementing a threshold may not lower its proof gate or approve its own evidence.
- User-facing copy follows signal proof and source permission. Corpus volume is not a substitute for support or distinctness.

## Target pipeline

`capture → quality gates → derived observations → personal baseline → independently approved transient signals → eligibility → deterministic reflection composition → local history → user controls`

Every daily reflection must produce a versioned `DailyReadingTrace` that records inputs, quality and baseline versions, eligible and rejected signals with reasons, rule and corpus versions, selected passage IDs, recent-history suppression and deterministic seed material. The trace contains derived values only and must pass the existing persistence allow-list and forbidden-key scan.

## Contract required before measurement code

Each proposed transient signal needs a versioned contract containing:

- a neutral stable ID and a separate approved display label;
- the bounded observable being measured and the claims explicitly not made;
- required capture inputs, sampling window, unit and numerical range;
- capture-quality dependencies and exclusion reasons;
- personal-baseline window, minimum calibration, recent-reading exclusion and reset conditions;
- uncertainty/confidence semantics and the minimum eligibility rule;
- missing-data, abstention and invalidation behaviour;
- device/change sensitivity and anticipated confounders;
- storage projection, retention requirement, consent version and migration behaviour;
- fairness slices that test measurement failure without constructing population norms;
- fixtures, contract version and a rollback path;
- source records for any traditional interpretation, kept separate from measurement evidence.

Names alone are not contracts. “Burst variance” must identify exactly what varies, across which frames and after which quality exclusions. “Tension delta” must identify which bounded facial-action features change relative to which personal baseline, while preserving `EXPRESSION_IS_STATE_NOT_TRAIT`.

## Proof ladder

Proof proceeds in this order and cannot be collapsed into a single green test run:

1. **Code controls:** synthetic fixtures, missing inputs, boundary values, deterministic replay, privacy-negative scans and explicit negative controls. These prove implementation behaviour only.
2. **Capture repeatability:** repeated captures on real supported devices across controlled pose, expression, lighting and capture-mode conditions. Record exclusions and failures, not just accepted readings.
3. **Personal-baseline behaviour:** consented longitudinal sessions show whether the candidate is stable under a repeated condition and responsive only to the bounded change it claims to observe.
4. **Confound and fairness review:** report quality, rejection and confidence by representative device and appearance slices without using those slices to classify people.
5. **Independent evidence verdict:** a reviewer other than the implementing agent returns `approved`, `revise` or `rejected` for each candidate and contract version. The raw evidence, protocol and environment remain reproducible.

Pre-register the protocol and pass/fail criteria before collecting the decisive evidence. Synthetic data cannot satisfy a real-device or participant gate. A failed verdict blocks that signal only; Qi Se and the rest of the daily loop may continue with explicit abstention.

## Programme phases

### 0 — research and repository truth

Inventory the actual implementation, stale documents, sources, terminology, legal/rights questions and measurement hypotheses. Separate classical source support from camera-measurement support. Repair the existing Qi Se foundation before adding new longitudinal signals: production reset/lineage, real `ming`/`run` course deltas, canonical-day policy, unreachable tag scope, version segmentation and reopen determinism. The output is a gap/evidence ledger and tested foundation, not new transient copy.

### 1 — design and contracts

Define candidate signal contracts, `DailyReadingTrace`, eligibility, persistence projection, consent/history behaviour, feature flags and fixtures. Resolve or explicitly block on the 90-day retention question before persisting new longitudinal fields.

### 2 — proof

Build the proof harness, approve a consented evidence protocol, collect real-device/longitudinal evidence and obtain independent verdicts. No user-visible signal or corpus is enabled in this phase.

### 3 — measurement implementation

Implement approved candidates behind research-off feature flags, using allow-listed derived outputs only. A candidate with no approved verdict remains absent or permanently ineligible. Add migrations only after the retention and deletion contract is approved.

### 4 — eligibility, reflection and corpus

Route only approved signal versions into deterministic eligibility and composition. Create source-led parallel corpus cells only for supported states. Require source IDs, rights status, blocklist results, similarity results, reachability and golden traces.

### 5 — experience integration

Add the daily ritual, calibration, retake, abstention, history, export and delete experience. Preserve offline use, accessibility, low-end performance and a non-coercive cadence. The separate notification tool follows `DR-2026-08-31-DAILY-NOTIFICATION-RESTORATION`; it is not a Daily Portrait dependency and does not add streak pressure.

### 6 — compliance and release evidence

Run independent privacy, claims, rights, cultural, browser, device, performance and store audits. `npm test`, `npm run build` and `npm run lint:bundle` are necessary code gates, not proof of product judgement. The Release Gatekeeper reports residual risk and the product owner alone decides readiness.

## Ownership and separation

The **Daily Loop Program Architect** owns the dependency map, task selection, contract integration, evidence index and end-to-end handoff. It may execute research, design and implementation tasks on dedicated branches, but it cannot:

- approve its own source, cultural, measurement, fairness, privacy or release evidence;
- change a threshold, proof protocol or acceptance criterion in order to pass;
- mark a pull request ready or merge it;
- represent human/device work as complete without the underlying evidence;
- convert an unresolved legal, rights, pricing, retention or store question into a decision.

Domain roles retain their responsibilities. The Geometry Researcher and Corpus Research Editor establish source provenance; Scanner and Qi Se roles own measurements; Interpretation Systems owns contracts and deterministic traces; Compliance audits claims and data flow; the Release Gatekeeper remains independent. The product owner reviews every diff and owns product decisions.

## Definition of programme completion

Option B is complete only when:

- every enabled signal version has an approved contract and independent evidence verdict;
- unsupported candidates abstain without weakening the existing Qi Se path;
- every rendered statement traces to eligible derived evidence and permitted sources;
- the complete daily loop works offline on supported real Android devices;
- local history, reset, export and deletion behaviour match an approved retention decision;
- rights, cultural, privacy, accessibility, performance and store evidence is recorded;
- all repository and release gates pass without threshold or expectation weakening;
- the Release Gatekeeper records a recommendation and the product owner records the final decision.
