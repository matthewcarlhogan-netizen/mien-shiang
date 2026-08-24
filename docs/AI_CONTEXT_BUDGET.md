# AI Context Budget Policy

## Objective
To manage AI model usage costs and maintain efficient session context by routing tasks to the appropriate model and enforcing strict context management.

## Model Routing

### Claude
The repository's research/review specialist. Use for:
- Deep research and architectural decisions.
- Historical/source adjudication.
- Difficult semantic review and debugging.
- Compliance/safety reasoning.
- Reviewing sensitive Gemini output.

### Gemini 2.5 Flash
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
Every agent handoff must state:
- task and acceptance criteria
- inputs and source versions
- files changed
- contracts changed
- tests and evidence
- decisions made
- unresolved risks
- next owner
- authoritative branch / HEAD
- frozen decisions/contracts
- exact next action
- files/contracts not to modify

## Escalation
Gemini 2.5 Flash must STOP and escalate if:
- Source meaning is uncertain or heritage provenance is missing.
- Architecture conflicts or safety/compliance invariant is ambiguous.
- Requested work would reopen a frozen contract.
- A test failure indicates the specification itself may be wrong.
