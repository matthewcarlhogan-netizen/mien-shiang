# SAFETY AUTHORIZATION INTERFACE

What real upstream safety state exists for Stage 3's `safetyPassed` input, and
what decision is required to unblock it. **No safety signal is implemented,
proposed, or fabricated here.**

Inspected: `src/qise/gates.js`, `src/qise/store.js`, `src/qise/reading-state.js`,
`src/ui/qise/app.js` (branch `main`); `src/heritage/composition.js`,
`src/qise/heritage-connections.js` (branch `feature/heritage-stage3-reflection-integration`,
= PR #40).

---

## 1. What real upstream safety state exists?

**None.** `src/qise/gates.js` (frozen) defines exactly ten gates:

| gate | kind | what it measures |
|---|---|---|
| `pose` | quality | head yaw/pitch/roll within limits |
| `distance` | quality | outer-canthi span ≥ fraction of frame |
| `overexposed` / `underexposed` | quality | skin pixels at exposure clip |
| `sidelight` | quality | left/right ΔL* |
| `illuminant` | quality | sclera-estimated white-balance error |
| `sclera` | quality | sclera pixel count ≥ minimum |
| `motion` | quality | landmark drift px between burst frames |
| `filter` | quality | Laplacian variance (beauty-filter / blur detector) |
| `roiValidity` | quality | count of extractable ROIs ≥ minimum |

Grouped `frame` / `light` / `camera` / `steady`. **Every one returns
`{value, limit, margin}` — they are capture-QUALITY gates.** There is no
safety/clinical/referral gate, and no analogue in the Qi Se tracker to the legacy
scanner's Module A/B malar-rash referral gate (`src/rules.js` `safety_gate` /
`src/adapters/safety.js` — a *different feature*, not wired to Qi Se). The only
`malar` tokens in `src/qise/` are code comments citing that legacy gate as an
analogy.

`src/qise/store.js` persists `captureTier` (`captureTier: r.captureTier ?? null`)
— a **quality** tier, not a safety verdict.

---

## 2. Is there an authoritative boolean Stage 3 could consume?

**For capture quality — yes.** `captureAuthorizationFromReading(reading)`
(`src/qise/heritage-connections.js`) derives it from the persisted `captureTier`:
`"clean"`/`"assisted"` → `true`, `"waiting"` → `false`, anything else →
`undefined`. `app.js` wires this into
`readingTiersWithHeritage(reflection, { captureQualityPassed: … })`.

**For a clinical/referral signal — no.** There is nothing true to assert and no
clinical signal is being fabricated. For closed-beta runtime presentation, the
product owner has separately chosen the explicit no-referral-gate policy
recorded below; `src/ui/qise/app.js` passes that named policy to
`readingTiersWithHeritage()`.

### Stage 3's own side of the interface (PR #40 — complete and fail-closed)

`src/heritage/composition.js`:

```
SUPPRESSION_REASONS = [ CAPTURE_QUALITY_GATE_FAILED, CAPTURE_QUALITY_GATE_UNKNOWN,
                        SAFETY_GATE_FAILED,          SAFETY_GATE_UNKNOWN ]

gateStatus(value):  value === true  -> "PASSED"
                    value === false -> "FAILED"
                    anything else   -> "UNKNOWN"     // including never being set
```

`composeHeritageForReading()` calls `gateStatus()` on **both**
`captureQualityPassed` and `safetyPassed` **before** the Stage-2 resolver is ever
invoked. Only a literal `true` on both proceeds. `safetyPassed` is never `true`
anywhere in production ⇒ `gateStatus(undefined)` = `"UNKNOWN"` ⇒ suppressed under
`SAFETY_GATE_UNKNOWN`.

**Historical consequence:** before the closed-beta decision below, heritage
connector output was always suppressed in the production path. That was correct
for an unset policy, but it is no longer the beta runtime configuration.

---

## 2a. Closed-beta runtime decision

The product owner has decided that Qi Se is a non-clinical self-observation
experience and has **no additional safety/referral gate by design** for closed
beta. This is represented by the named `QISE_BETA_SAFETY_AUTHORIZATION` policy,
not by truthy coercion or an unnamed default. The app passes its
`heritageConnectors` value as `safetyPassed`.

This decision does not clear source rights, provenance, cultural attribution,
store approval, or commercial-release obligations. It also does not remove the
capture-quality gate: a missing or failed capture-quality authorization still
suppresses connector output. The low-level composition interface remains
fail-closed for callers that omit or explicitly fail either input.

---

## 3. What exact product/system decision was required?

One of:

**(a) A product-owner determination that Qi Se needs no safety gate**, and
`safetyPassed` should be supplied as `true` unconditionally. This is a **product
decision, not an engineering one** — it changes what the product claims about
itself. The Qi Se tracker is already positioned as a general-wellness
longitudinal colour tracker with six compliance gates
(`tests/qise/no-medical-language.test.js`, `no-absolutes.test.js`, etc.) and no
disease vocabulary; an argument that it therefore needs no *additional* safety
referral gate is plausible but must be made and recorded by the product owner,
with the reasoning that would go in front of a regulator.

**(b) An actual Qi Se safety signal designed and built.** Out of scope for Stage
3 — a new clinical/safety subsystem with its own evidentiary and legal
requirements (the legacy scanner's malar gate exists because a specific
clinical pattern on specific pixels warranted a "see a clinician" nudge;
whether Qi Se's personal-baseline colour deltas have any analogue is itself a
research + clinical question).

**Decision applied:** option (a) was selected for closed beta. The implementation
uses the named `QISE_BETA_SAFETY_AUTHORIZATION` policy, recorded in
`docs/DECISION_REGISTER.md`, rather than a bare `safetyPassed: true` literal.

---

## 4. What must remain fail-closed?

- `gateStatus()` — only literal `true` proceeds; `false`/`undefined`/anything
  else suppresses. **Never** loosen to truthy.
- `SAFETY_GATE_FAILED` ≠ `SAFETY_GATE_UNKNOWN` — a real "safety check ran and
  failed" and "no safety check exists" are different reasons and must stay
  distinguishable (same rule as `zoneNotExtracted` vs `colourNotMeasurable`).
- `app.js` must never default `safetyPassed` to `true` as a side effect. If (a)
  is chosen, the `true` must come from a named decision constant, not a literal.
- `captureTier` fail-closed at `finish()` (PR #40 Round 3) — a missing
  `captureTier` throws, it does not default to `"clean"`.

---

## 5. Does the missing safety authorization block…?

| stage | blocked? | why |
|---|---|---|
| **internal prototype** | **NO** | The complete path is now exercised by the same production entry point used for beta. |
| **closed beta** | **NO** | The named no-referral-gate policy enables the connector path; capture-quality checks and explicit non-inference boundaries remain active. |
| **public/commercial release** | **YES** | Rights, provenance, store approval and other external release obligations remain separate from beta runtime availability. |

**Current Stage 3 status:** closed-beta runtime active; public/commercial release
remains separately gated by external evidence and owner/counsel decisions.
