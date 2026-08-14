# Cloud agent runbook

## Boundary

This is a development environment, not a product dependency. Mien Shiang remains an on-device application with no runtime AI, server-side inference, upload or account requirement. The cloud agent may change repository files only through a task branch and pull request.

The supported low-cost path is an interactive Gemini CLI session inside a two-core GitHub Codespace. It does not use a public issue-comment trigger or an unattended AI workflow.

## One-time setup

1. Check the current [GitHub Codespaces allowance and billing controls](https://docs.github.com/en/billing/concepts/product-billing/github-codespaces). Personal-account quotas and prices can change.
2. In GitHub **Settings > Codespaces**, set the default idle timeout to 10 minutes. Do not create a prebuild for this repository. GitHub also documents [ways to reduce included usage](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-included-usage).
3. From the repository page, choose **Code > Codespaces > Create codespace on main**. Keep the machine at two cores. The repository configuration installs dependencies and the pinned stable Gemini CLI release.
4. In the Codespace terminal, run `gemini`. Choose **Sign in with Google** with a personal account. This is Gemini CLI's recommended individual setup and avoids placing an API key in the repository. See the official [authentication](https://geminicli.com/docs/get-started/authentication/) and [quota](https://geminicli.com/docs/resources/quota-and-pricing/) pages for current terms and limits.
5. At the Gemini prompt, run `/memory show`. Confirm that the displayed context includes the contents of `AGENTS.md`. The root `GEMINI.md` imports that canonical file using Gemini CLI's [documented context import](https://geminicli.com/docs/cli/gemini-md/).

## Work loop

1. Synchronise the base and create a task branch: `git switch main`, `git pull --ff-only`, then `git switch -c codex/<short-task-name>`.
2. Give Gemini one bounded task with acceptance criteria and excluded work. Tell it to read `AGENTS.md` and the relevant linked documents before editing.
3. Review its proposed changes before allowing broad commands. Do not use `--yolo` or approve a request that writes outside this repository.
4. Run the repository's real gates: `npm test`, `npm run build`, and `npm run lint:bundle`. Run browser and device checks when the changed surface requires them.
5. Inspect `git status` and `git diff`. Commit only intended files, push the task branch and open a draft pull request.
6. Wait for GitHub CI, review the diff yourself and merge only when the required checks pass. Never push directly to `main`.

Start with a small documentation or test task to prove the full branch-to-PR loop before assigning corpus, geometry, compliance or scanner work.

## Cost and credential controls

- Stop the Codespace as soon as a session ends; delete Codespaces that are no longer needed. A stopped Codespace still consumes storage.
- Use `/stats model` to inspect the current Gemini session usage. Free quotas are service limits, not a guarantee of uninterrupted access.
- Never paste credentials into a prompt, commit them, or store them in `GEMINI.md`.
- If a future non-interactive task genuinely needs a key, pause for a separate security decision. Use a scoped GitHub secret in the correct environment, never a repository file.
- Do not add AI workflows triggered by public issue or review comments. Automation must have an allow-list, least-privilege permissions, spend controls and explicit owner approval before activation.

## End-of-session handoff

Before stopping the Codespace, push the branch and record the base SHA, files changed, commands run, observed test count, decisions, unresolved risks and next owner as required by `AGENTS.md`. If quota is exhausted, the pushed branch remains recoverable from any new local or cloud environment.
