# Agent operating model

Agents are accountable roles, not permission to run disconnected workstreams. The Architect selects only the roles required for a phase and integration occurs through versioned contracts, fixtures and pull requests.

## Roster

| Role | Owns | Must not own |
|---|---|---|
| Architect | phase scope, dependency map, decisions, integration order | release verdict |
| Experience Director | product flows, visual system, accessibility, anti-generic review | measurement thresholds |
| Scanner Engineer | camera, MediaPipe, capture lifecycle, performance, fallback | classical interpretation claims |
| Geometry Researcher | sourced systems, region definitions, landmark evidence | invented indices or production approval |
| Qi Se Colour Scientist | ROI sampling, adaptation, colour space, personal baseline, fairness | diagnostic prose |
| Interpretation Systems Engineer | schemas, eligibility, composition, determinism, coverage tests | unsourced content claims |
| Corpus Research Editor | source ledger, reading variants, tone and distinctness | scanner or release-gate changes |
| Commerce & Entitlements Engineer | Play billing, access state, restore and failure behaviour | inventing prices or legal claims |
| Compliance Auditor | blocklists, notices, privacy/data flows, store claims | sole release approval |
| Release Gatekeeper | CI, release checks, performance/device evidence, reproducibility | changing requirements to get green |

Detailed briefs live in `docs/agents/`.

## Delivery loop

1. **Declare the phase.** Architect names branch, objective, exclusions, decision status, acceptance criteria and required roles.
2. **Define contracts first.** Agree schemas, IDs, units, confidence semantics, fixtures and versioning before parallel implementation.
3. **Research before claims.** Geometry and corpus roles produce source records, disagreements and verification flags. No implementation may erase uncertainty.
4. **Implement in dependency order.** Measurement and eligibility precede interpretation composition; content follows stable contracts; experience integrates eligible outputs.
5. **Cross-review.** Compliance reviews claims/data flow. Experience reviews visible output. Domain owners review their contracts.
6. **Gate independently.** Release Gatekeeper runs repository checks and records device/performance evidence without editing product thresholds.
7. **Integrate through a PR.** Architect reconciles handoffs, updates the decision register and requests product-owner decisions for unresolved items.

Recommended integration order: research/source ledger → schema and fixtures → scanner/colour implementation → eligibility/composition → corpus → interface → compliance audit → release evidence.

## Handoff packet

Every handoff is a committed Markdown note or PR section containing:

- objective and acceptance criteria;
- branch/base SHA and source/corpus versions;
- files and public contracts changed;
- tests run, fixtures used and observed results;
- decisions made and their register IDs;
- uncertainty, abstentions and `needsVerification` items;
- privacy, accessibility, performance and policy impact;
- blockers and exact next owner.

## Hard stops

Stop and escalate when a task requires an unresolved product decision, primary-source access is inadequate, a landmark cannot be verified, performance evidence is missing, a legal classification is assumed, an entitlement can be bypassed, or a validation threshold would need to be weakened to pass.
