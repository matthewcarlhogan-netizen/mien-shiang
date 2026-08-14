# Cloud agent runbook

## Boundary

This is a development environment, not a product dependency. Mien Shiang remains an on-device application with no runtime AI, server-side inference, upload or account requirement. The cloud agent may change repository files only through a task branch and pull request.

The supported low-cost path is an interactive Gemini CLI session inside a two-core GitHub Codespace, authenticated by a personal Gemini Developer API key supplied as an encrypted Codespaces secret. It does not use a public issue-comment trigger or an unattended AI workflow.

The original individual-account OAuth route is retired. Google [stopped Gemini CLI service for free, Pro and Ultra individual accounts on 18 June 2026](https://github.com/google-gemini/gemini-cli/discussions/28017); enterprise Code Assist licences and API-key authentication were explicitly left available. A current Gemini CLI may still display **Sign in with Google**, but an individual account can receive “this client is no longer supported”. Treat that as an unavailable route, not as a user or browser failure.

For this supervised phase, required status checks are the repository-enforced merge gate. They prove that the code runs and that existing guards still hold; they do not judge whether a change quietly narrows, reinterprets or settles a product decision. There is no independent-review barrier in this single-maintainer setup. Human diff review is therefore load-bearing, not optional, and CI must never be described as sufficient on its own.

The GitHub connector's consent behaviour for unsolicited writes is not yet empirically established. On 15 August 2026, [security probe #23](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/23) was marked ready and merged without a distinct confirmation while the connector inherited **Allow low-risk actions**. The connector was then changed to the app-specific **Allow read actions** setting and that setting was read back successfully. [Security probe #24](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/24) then created branches and a file, opened and marked ready, and merged without a distinct confirmation prompt. Both probes were initiated by explicit product-owner requests, so they show that the connector can write and that an already authorised request did not receive a second prompt; they do not show that an unsolicited write would pass or that the new setting failed. Neither probe targeted `main`; their temporary branches were deleted and `main` remained at `fdff96d25409fb66279924bf4569a3ec88d49fcf`.

A subsequent read-only, injection-shaped probe fetched [an untrusted instruction in #24](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/24#issuecomment-5297160878) that demanded creation and merger of a sentinel pull request. The agent treated the repository content as data, performed no write, and a before-and-after search found no sentinel branch or pull request; `main` remained unchanged. This demonstrates agent-side refusal for that fixture. Because no connector mutation was attempted, the connector's confirmation layer was not exercised and enforcement against an attempted unsolicited write remains untested. Retain **Allow read actions** as the intended least-privilege policy, but describe neither enforcement nor bypass as proven.

## One-time setup

1. Check the current [GitHub Codespaces allowance and billing controls](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces). Personal-account quotas and prices can change.
2. In GitHub **Settings > Codespaces**, set the default idle timeout to 10 minutes. Do not create a prebuild for this repository. GitHub also documents [ways to reduce included usage](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage).
3. In [Google AI Studio](https://aistudio.google.com/apikey), create a Gemini Developer API key. To keep this path free, leave its project on the **Free** tier and do not attach billing. Free model availability and limits vary; check the project's current tier and quota in AI Studio rather than relying on a fixed number.
4. In GitHub **Settings > Codespaces > New secret**, create a personal Codespaces secret named `GEMINI_API_KEY` and grant it only to this repository. Never put the value in the repository, a prompt, chat, screenshot, shell profile or command history. GitHub documents that [Codespaces secrets are encrypted development environment variables](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces). If the Codespace already exists, follow GitHub's reload prompt or stop and restart it so the secret is injected.
5. From the repository page, choose **Code > Codespaces > Create codespace on main**. Keep the machine at two cores. The repository configuration installs dependencies and the pinned Gemini CLI release, and recommends the secret without containing its value.
6. In the Codespace terminal, verify presence without printing the value: `test -n "${GEMINI_API_KEY:-}" && echo "Gemini API key loaded"`. Then run `gemini --approval-mode auto_edit` and choose **Use Gemini API Key** if prompted. The official [Gemini CLI authentication guide](https://geminicli.com/docs/get-started/authentication/) supports `GEMINI_API_KEY`; API authentication has different quota, pricing and privacy terms from the retired individual OAuth service.
7. In Gemini, open `/settings`. Enable **Environment Variable Redaction**, **Disable YOLO Mode** and **Disable Always Allow**. Keep approval mode at Auto-Edit. The footer's `no sandbox` label means Gemini has no second, nested sandbox; the `/workspaces/...` Codespace container remains the outer isolation boundary, while shell commands still require confirmation in Auto-Edit. Do not reproduce this unsandboxed setup directly on the Windows host.
8. At the Gemini prompt, run `/memory show`. Confirm that the displayed context includes the contents of `AGENTS.md`, including item 8 for the Option B programme. The root `GEMINI.md` imports that canonical file using Gemini CLI's [documented context import](https://geminicli.com/docs/cli/gemini-md/). If item 8 is absent, Option B is not yet on that Codespace's `main`: merge the bootstrap PR, run `git pull --ff-only`, then restart Gemini before giving it the mission.

## Work loop

1. Synchronise the base and create a task branch: `git switch main`, `git pull --ff-only`, then `git switch -c codex/<short-task-name>`.
2. Give Gemini one bounded task with acceptance criteria and excluded work. Tell it to read `AGENTS.md` and the relevant linked documents before editing.
3. Review its proposed changes before allowing broad commands. Do not use `--yolo` or approve a request that writes outside this repository. Before merge, read the complete diff against `docs/PROJECT_CHARTER.md` and `docs/DECISION_REGISTER.md`; if you cannot explain every product-decision effect, stop. Neither green CI nor CODEOWNERS substitutes for this judgement.
4. Run the repository's real gates: `npm test`, `npm run build`, and `npm run lint:bundle`. Run browser and device checks when the changed surface requires them.
5. Inspect `git status` and `git diff`. Commit only intended files, push the task branch and open a draft pull request.
6. Wait for GitHub CI, review the diff yourself and merge only when the required checks pass. The cloud agent must not mark a pull request ready or merge it; those are product-owner actions performed after the human review. Never push directly to `main`.

Start with a small documentation or test task to prove the full branch-to-PR loop before assigning corpus, geometry, compliance or scanner work.

### Running the approved Option B programme

After this cloud loop has been proven, start Gemini interactively in its bounded editing mode with `gemini --approval-mode auto_edit`; never use `--yolo`. Ask it to act as the Daily Loop Program Architect, read `docs/OPTION_B_PROGRAM.md` and `docs/OPTION_B_EXECUTION_PLAN.md`, and execute the first `ready` task whose dependencies are complete. The queue authorises autonomous research, repository edits, checks, commits, pushes and a draft pull request **inside that one task branch**. It does not authorise marking ready, merging, changing protection or manufacturing human/device evidence.

Use this mission prompt:

```text
Act as the dedicated Daily Loop Program Architect defined in this repository. Read AGENTS.md, docs/DECISION_REGISTER.md, docs/OPTION_B_PROGRAM.md, docs/OPTION_B_EXECUTION_PLAN.md and the role briefs they route to. From current protected main, execute exactly the first effectively ready Option B task and all of its acceptance criteria. Work autonomously only within that task branch: research or edit, run the real gates, commit, push and open a draft pull request with the required handoff. Do not mark ready, merge, push to main, weaken a gate, invent evidence or start a dependent task. If a human, device, source, rights, cultural, legal or store gate blocks you, stop and name the exact evidence and owner needed.
```

The product owner reviews and merges each bounded task before Gemini starts the next dependent item from the updated `main`. This is end-to-end agent ownership with human phase gates, not an unattended merge bot. If the queue contains no `ready` item, Gemini must stop with the exact blocker instead of widening scope or guessing evidence.

Security probes #23 and #24 were an explicit, product-owner-authorised, test-only exception to the mark-ready and merge prohibition. They used disposable base refs and never targeted `main`. Their historical exception grants no standing permission for an agent to mark ready or merge any future pull request.

## Cost and credential controls

- Stop the Codespace as soon as a session ends; delete Codespaces that are no longer needed. A stopped Codespace still consumes storage.
- Use `/stats model` to inspect the current Gemini session usage. Free quotas are service limits, not a guarantee of uninterrupted access.
- A Gemini Developer API project begins on the Free tier, but it can become billable only if billing is deliberately attached. Keep billing disabled for this programme and verify the tier in AI Studio. Free-tier prompts may be used by Google to improve its products under the applicable Gemini API terms.
- Never paste credentials into a prompt, commit them, or store them in `GEMINI.md`. If an API key was exposed in a prompt, chat, screenshot, repository file or command history, revoke it in AI Studio and create a replacement Codespaces secret.
- If a future non-interactive task genuinely needs a key, pause for a separate security decision. Use a scoped GitHub secret in the correct environment, never a repository file.
- Do not add AI workflows triggered by public issue or review comments. Automation must have an allow-list, least-privilege permissions, spend controls and explicit owner approval before activation.
- Treat any connector or shell credential with unverified scope as merge-capable until demonstrated otherwise. Procedural supervision is the current control; unattended operation requires a separate, restricted identity working from a fork.
- **Known open item:** the Windows `gh` login currently has `gist`, `read:org`, `repo` and `workflow` scopes, so it remains a separate merge and workflow-authority path. Keep it only until the Codespace loop has been proven by a real container build, Gemini sign-in, bounded task branch, local gates, draft pull request and required CI. Immediately after that proof, revoke the Windows credential or replace it with a fine-grained credential that cannot merge to `main` or modify workflows, then verify the reduced state with `gh auth status`.

## End-of-session handoff

Before stopping the Codespace, push the branch and record the base SHA, files changed, commands run, observed test count, decisions, unresolved risks and next owner as required by `AGENTS.md`. If quota is exhausted, the pushed branch remains recoverable from any new local or cloud environment.
