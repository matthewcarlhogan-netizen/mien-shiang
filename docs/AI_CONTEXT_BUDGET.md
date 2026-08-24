# AI Context Budget Policy

## Objective
To manage AI model usage costs and maintain efficient session context by routing tasks to the appropriate model and enforcing strict context management.

## Model Routing

### CLAUDE
The repository's research/review specialist. Use for:
- Deep research and architectural decisions.
- Historical/source adjudication.
- Difficult semantic review and debugging.
- Compliance/safety reasoning.
- Reviewing sensitive Gemini output.

### GEMINI 2.5 FLASH
The repository's default implementation/toil worker. Use for:
- Implementation from an approved specification.
- Mechanical refactoring, repetitive coding, bulk test creation.
- Repository administration, PR cleanup, build/test/lint loops.
- Straightforward documentation toil.

## Mandatory Session Rules

- **Repository state is the long-term memory.** Chat context is temporary working memory. Do not pay repeatedly for history that has already been converted into repository state.
- **`/compact`**: Use before context becomes very large during a long single task.
- **`/clear`**: Mandatory when switching to a materially different task. Start the new task from Git + canonical docs + a compact handoff.

## Checkpoint and Handoff Format
A substantial Claude task must end by recording:
- Objective
- Authoritative branch / HEAD
- Decisions frozen during the task
- Files changed
- Unresolved blockers
- Exact verification results
- Exact next action
- Explicit files/contracts the next agent must not modify

## Escalation
Gemini 2.5 Flash must STOP and escalate if:
- Source meaning is uncertain or heritage provenance is missing.
- Architecture conflicts or safety/compliance invariant is ambiguous.
- Requested work would reopen a frozen contract.
- A test failure indicates the specification itself may be wrong.
