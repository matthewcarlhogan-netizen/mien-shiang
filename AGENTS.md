# Mien Shiang agent entry point

This repository is the source of truth. Do not reconstruct project decisions from chat memory.

Before changing the product, read:

1. `CLAUDE.md` for existing implementation invariants.
2. `docs/PROJECT_CHARTER.md` for product and design constraints.
3. `docs/DECISION_REGISTER.md` to separate facts, approved work and unresolved proposals.
4. `docs/AGENT_OPERATING_MODEL.md` for ownership, handoffs and integration order.
5. The relevant brief under `docs/agents/`.
6. `docs/INTERPRETATION_SYSTEM.md` for scanner-to-reading expansion work.
7. `docs/scanner-development-report.md` for the scanner's evidence and remaining limitations.
8. For approved daily-loop work, `docs/OPTION_B_PROGRAM.md`, `docs/OPTION_B_EXECUTION_PLAN.md` and `docs/agents/daily-loop-program-architect.md`.
9. Before changing any user-facing visual experience, `docs/VISUAL_DIRECTION.md`.

## Non-negotiable workflow

- Work on a task branch and open a pull request; do not commit directly to `main`.
- Do not change a product decision, source interpretation, geometry mapping or validation threshold merely to make a check pass.
- Mark new ideas as proposals until the product owner approves them.
- Treat the current code and tests as evidence of implementation, not proof that every document is current.
- Use en-AU spelling in user-facing copy.
- Raw frames remain in volatile memory and are not persisted or transmitted.
- The product is entertainment and self-discovery, not diagnosis, identity, attractiveness scoring, prediction or a fixed judgement of character.
- When evidence is missing, abstain or set `needsVerification: true`; never fabricate a MediaPipe index, classical claim, legal conclusion or commercial decision.
- For Option B, programme approval is not signal approval. Follow the execution queue in dependency order; no new transient signal becomes persistent, eligible or user-facing before its contract and independent proof verdict pass.

## Required handoff

Every agent handoff must state: task and acceptance criteria; inputs and source versions; files changed; contracts changed; tests and evidence; decisions made; unresolved risks; and the next owner. The Release Gatekeeper must be independent of the Architect.
