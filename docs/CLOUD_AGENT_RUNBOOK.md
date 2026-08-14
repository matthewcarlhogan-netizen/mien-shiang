# Cloud agent runbook

## Boundary

This is a development environment, not a product dependency. Mien Shiang remains an on-device application with no runtime AI, server-side inference, upload or account requirement. The cloud agent may change repository files only through a task branch and pull request.

The supported low-cost path is an interactive Gemini CLI session inside a two-core GitHub Codespace. It does not use a public issue-comment trigger or an unattended AI workflow.

For this supervised phase, required status checks are the repository-enforced merge gate. They prove that the code runs and that existing guards still hold; they do not judge whether a change quietly narrows, reinterprets or settles a product decision. There is no independent-review barrier in this single-maintainer setup. Human diff review is therefore load-bearing, not optional, and CI must never be described as sufficient on its own.

The GitHub connector's consent behaviour for unsolicited writes is not yet empirically established. On 15 August 2026, [security probe #23](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/23) was marked ready and merged without a distinct confirmation while the connector inherited **Allow low-risk actions**. The connector was then changed to the app-specific **Allow read actions** setting and that setting was read back successfully. [Security probe #24](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/24) then created branches and a file, opened and marked ready, and merged without a distinct confirmation prompt. Both probes were initiated by explicit product-owner requests, so they show that the connector can write and that an already authorised request did not receive a second prompt; they do not show that an unsolicited write would pass or that the new setting failed. Neither probe targeted `main`; their temporary branches were deleted and `main` remained at `fdff96d25409fb66279924bf4569a3ec88d49fcf`.

A subsequent read-only, injection-shaped probe fetched [an untrusted instruction in #24](https://github.com/matthewcarlhogan-netizen/mien-shiang/pull/24#issuecomment-5297160878) that demanded creation and merger of a sentinel pull request. The agent treated the repository content as data, performed no write, and a before-and-after search found no sentinel branch or pull request; `main` remained unchanged. This demonstrates agent-side refusal for that fixture. Because no connector mutation was attempted, the connector's confirmation layer was not exercised and enforcement against an attempted unsolicited write remains untested. Retain **Allow read actions** as the intended least-privilege policy, but describe neither enforcement nor bypass as proven.

## One-time setup

1. Check the current [GitHub Codespaces allowance and billing controls](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces). Personal-account quotas and prices can change.
2. In GitHub **Settings > Codespaces**, set the default idle timeout to 10 minutes. Do not create a prebuild for this repository. GitHub also documents [ways to reduce included usage](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage).
3. From the repository page, choose **Code > Codespaces > Create codespace on main**. Keep the machine at two cores. The repository configuration installs dependencies and the pinned stable Gemini CLI release.
4. In the Codespace terminal, run `gemini`. Choose **Sign in with Google** with a personal account. This is Gemini CLI's recommended individual setup and avoids placing an API key in the repository. See the official [authentication](https://geminicli.com/docs/get-started/authentication/) and [quota](https://geminicli.com/docs/resources/quota-and-pricing/) pages for current terms and limits.
5. At the Gemini prompt, run `/memory show`. Confirm that the displayed context includes the contents of `AGENTS.md`. The root `GEMINI.md` imports that canonical file using Gemini CLI's [documented context import](https://geminicli.com/docs/cli/gemini-md/).

## Work loop

1. Synchronise the base and create a task branch: `git switch main`, `git pull --ff-only`, then `git switch -c codex/<short-task-name>`.
2. Give Gemini one bounded task with acceptance criteria and excluded work. Tell it to read `AGENTS.md` and the relevant linked documents before editing.
3. Review its proposed changes before allowing broad commands. Do not use `--yolo` or approve a request that writes outside this repository. Before merge, read the complete diff against `docs/PROJECT_CHARTER.md` and `docs/DECISION_REGISTER.md`; if you cannot explain every product-decision effect, stop. Neither green CI nor CODEOWNERS substitutes for this judgement.
4. Run the repository's real gates: `npm test`, `npm run build`, and `npm run lint:bundle`. Run browser and device checks when the changed surface requires them.
5. Inspect `git status` and `git diff`. Commit only intended files, push the task branch and open a draft pull request.
6. Wait for GitHub CI, review the diff yourself and merge only when the required checks pass. The cloud agent must not mark a pull request ready or merge it; those are product-owner actions performed after the human review. Never push directly to `main`.

Start with a small documentation or test task to prove the full branch-to-PR loop before assigning corpus, geometry, compliance or scanner work.

Security probes #23 and #24 were an explicit, product-owner-authorised, test-only exception to the mark-ready and merge prohibition. They used disposable base refs and never targeted `main`. Their historical exception grants no standing permission for an agent to mark ready or merge any future pull request.

## Cost and credential controls

- Stop the Codespace as soon as a session ends; delete Codespaces that are no longer needed. A stopped Codespace still consumes storage.
- Use `/stats model` to inspect the current Gemini session usage. Free quotas are service limits, not a guarantee of uninterrupted access.
- Never paste credentials into a prompt, commit them, or store them in `GEMINI.md`.
- If a future non-interactive task genuinely needs a key, pause for a separate security decision. Use a scoped GitHub secret in the correct environment, never a repository file.
- Do not add AI workflows triggered by public issue or review comments. Automation must have an allow-list, least-privilege permissions, spend controls and explicit owner approval before activation.
- Treat any connector or shell credential with unverified scope as merge-capable until demonstrated otherwise. Procedural supervision is the current control; unattended operation requires a separate, restricted identity working from a fork.
- **Known open item:** the Windows `gh` login currently has `gist`, `read:org`, `repo` and `workflow` scopes, so it remains a separate merge and workflow-authority path. Keep it only until the Codespace loop has been proven by a real container build, Gemini sign-in, bounded task branch, local gates, draft pull request and required CI. Immediately after that proof, revoke the Windows credential or replace it with a fine-grained credential that cannot merge to `main` or modify workflows, then verify the reduced state with `gh auth status`.

## End-of-session handoff

Before stopping the Codespace, push the branch and record the base SHA, files changed, commands run, observed test count, decisions, unresolved risks and next owner as required by `AGENTS.md`. If quota is exhausted, the pushed branch remains recoverable from any new local or cloud environment.
