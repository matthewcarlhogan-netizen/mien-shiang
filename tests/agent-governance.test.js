import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(REPO, path), "utf8");

function workflowFiles() {
  const directory = join(REPO, ".github", "workflows");
  return readdirSync(directory)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => join(directory, name));
}

function forbiddenAgentWorkflowReferences(source) {
  const patterns = [
    /CLAUDE_CODE_OAUTH_TOKEN/,
    /anthropics\/claude-code-action/i,
  ];
  return patterns.filter((pattern) => pattern.test(source));
}

test("Gemini CLI imports the canonical repository instructions", () => {
  const source = read("GEMINI.md");
  assert.match(source, /^@\.\/AGENTS\.md$/m);
  assert.ok(source.length < 500,
    "GEMINI.md must remain a small adapter rather than a duplicate charter");
  assert.doesNotMatch(source, /Non-negotiable workflow|Project charter|Agent operating model/,
    "project governance belongs in the canonical documents imported via AGENTS.md");
});

test("critical governance and release paths name the product owner", () => {
  const source = read(".github/CODEOWNERS");
  const requiredPaths = [
    "/AGENTS.md",
    "/CLAUDE.md",
    "/GEMINI.md",
    "/.github/CODEOWNERS",
    "/.github/claude/prompts/",
    "/.github/workflows/",
    "/.devcontainer/",
    "/docs/PROJECT_CHARTER.md",
    "/docs/DECISION_REGISTER.md",
    "/docs/AGENT_OPERATING_MODEL.md",
    "/docs/INTERPRETATION_SYSTEM.md",
    "/docs/OPTION_B_PROGRAM.md",
    "/docs/OPTION_B_EXECUTION_PLAN.md",
    "/docs/agents/",
    "/docs/proposals/",
    "/docs/CLAUDE_CODE_BOOTSTRAP.md",
    "/docs/CLOUD_AGENT_RUNBOOK.md",
    "/docs/BETA_RELEASE.md",
    "/scripts/check-release.js",
    "/scripts/release-profile.js",
    "/scripts/copy-scan.js",
    "/scripts/lint-bundle.js",
    "/tests/agent-governance.test.js",
    "/tests/release-lanes.test.js",
    "/tests/copy-guard.test.js",
    "/tests/copy-lint.test.js",
    "/tests/source-integrity.test.js",
  ];

  for (const path of requiredPaths) {
    const line = source.split(/\r?\n/).find((entry) => entry.trimStart().startsWith(`${path} `));
    assert.ok(line, `CODEOWNERS must cover ${path}`);
    assert.match(line, /@matthewcarlhogan-netizen\s*$/,
      `${path} must be owned by the product owner`);
  }
});

test("the paid public-comment Claude workflow is absent", () => {
  assert.equal(existsSync(join(REPO, ".github", "workflows", "claude.yml")), false,
    "claude.yml must not be reintroduced as a public-comment spending trigger");

  const offenders = [];
  for (const file of workflowFiles()) {
    if (forbiddenAgentWorkflowReferences(readFileSync(file, "utf8")).length > 0) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [],
    "GitHub workflows must not use the retired paid Claude credential or action");
});

test("the workflow scanner has positive and negative controls", () => {
  assert.equal(forbiddenAgentWorkflowReferences("uses: anthropics/claude-code-action@v1").length, 1);
  assert.equal(forbiddenAgentWorkflowReferences("token: CLAUDE_CODE_OAUTH_TOKEN").length, 1);
  assert.equal(forbiddenAgentWorkflowReferences("run: npm test").length, 0);
});

test("the Codespace stays small and installs a pinned Gemini CLI", () => {
  const source = read(".devcontainer/devcontainer.json");
  const config = JSON.parse(source);

  assert.equal(config.hostRequirements?.cpus, 2);
  assert.equal(config.image, "mcr.microsoft.com/devcontainers/universal:2");
  assert.match(config.postCreateCommand,
    /npm ci && npm install --global @google\/gemini-cli@0\.55\.1$/);
  assert.deepEqual(Object.keys(config.secrets || {}), ["GEMINI_API_KEY"]);
  assert.deepEqual(Object.keys(config.secrets.GEMINI_API_KEY).sort(),
    ["description", "documentationUrl"],
    "the devcontainer may recommend the Codespaces secret but cannot contain its value");
  assert.equal(config.secrets.GEMINI_API_KEY.documentationUrl,
    "https://ai.google.dev/gemini-api/docs/api-key");
  assert.doesNotMatch(JSON.stringify({
    image: config.image,
    hostRequirements: config.hostRequirements,
    postCreateCommand: config.postCreateCommand,
    containerEnv: config.containerEnv,
    remoteEnv: config.remoteEnv,
  }), /GEMINI_API_KEY|GOOGLE_API_KEY|CLAUDE_CODE_OAUTH_TOKEN/,
    "credentials must not be embedded or mapped in the devcontainer configuration");
});

test("local agent state and temporary credentials are ignored", () => {
  const source = read(".gitignore");
  assert.match(source, /^\.gemini\/$/m);
  assert.match(source, /^gha-creds-\*\.json$/m);
});

test("human review and proposal provenance are explicit gates", () => {
  const runbook = read("docs/CLOUD_AGENT_RUNBOOK.md");
  assert.match(runbook, /Human diff review is therefore load-bearing, not optional/);
  assert.match(runbook, /They prove that the code runs and that existing guards still hold; they do not judge/);
  assert.match(runbook, /must not mark a pull request ready or merge it/);
  assert.match(runbook, /probe #23/);
  assert.match(runbook, /probe #24/);
  assert.match(runbook, /Both probes were initiated by explicit product-owner requests/);
  assert.match(runbook, /enforcement against an attempted unsolicited write remains untested/);
  assert.match(runbook, /This demonstrates agent-side refusal for that fixture/);
  assert.match(runbook, /test-only exception to the mark-ready and merge prohibition/);
  assert.match(runbook, /Windows `gh` login currently has `gist`, `read:org`, `repo` and `workflow` scopes/);
  assert.match(runbook, /Immediately after that proof, revoke the Windows credential/);
  assert.match(runbook, /stopped Gemini CLI service for free, Pro and Ultra individual accounts/);
  assert.match(runbook, /Codespaces secret named `GEMINI_API_KEY`/);
  assert.match(runbook, /Enable \*\*Environment Variable Redaction\*\*/);
  assert.match(runbook, /`no sandbox` label means Gemini has no second, nested sandbox/);
  assert.match(runbook, /including item 8 for the Option B programme/);
  assert.match(runbook, /If item 8 is absent, Option B is not yet on that Codespace's `main`/);

  const proposal = read("docs/proposals/SPIRITUAL_SCANNER_DEFINITION.md");
  assert.match(proposal, /Status:\*\* proposed, not approved/);
  assert.match(proposal, /conversation-derived/);
  assert.match(proposal, /not verified against the repository before it was written/);
  assert.match(proposal, /`verify-release\.mjs` as the release gate\. That file does not exist/);
  assert.match(proposal, /plain-JavaScript PWA, not Vite/);
  assert.match(proposal, /word-boundary matching/);

  const register = read("docs/DECISION_REGISTER.md");
  assert.match(register, /DR-2026-08-15-DAILY-LOOP/);
  assert.match(register, /Status:\*\* approved/);
  assert.match(register, /Decision:\*\* Option B — daily loop/);
  assert.match(register, /research → design → proof → implementation/);
});

test("Option B is executable but cannot self-certify", () => {
  const programme = read("docs/OPTION_B_PROGRAM.md");
  assert.match(programme, /Approval of the programme is not approval of a proposed signal/);
  assert.match(programme, /frameJitter.*capture quality/s);
  assert.match(programme, /single capture using MediaPipe blendshapes/);
  assert.match(programme, /independent evidence verdict/);
  assert.match(programme, /may not.*mark a pull request ready or merge/s);

  const plan = read("docs/OPTION_B_EXECUTION_PLAN.md");
  for (const task of [
    "B-000", "B-010", "B-015", "B-020", "B-025", "B-030", "B-040", "B-050", "B-060",
    "B-070", "B-075", "B-080", "B-090", "B-100", "B-110", "B-120", "B-130",
    "B-140", "B-150", "B-160", "B-170", "B-180",
  ]) {
    assert.match(plan, new RegExp(`\\| ${task} \\|`), `${task} must remain in the execution queue`);
  }
  assert.match(plan, /first `ready` item whose dependencies are `complete`/);
  assert.match(plan, /must not mark a pull request ready, merge, push to `main`/);
  assert.match(plan, /Synthetic success does not approve a signal/);

  const operatingModel = read("docs/AGENT_OPERATING_MODEL.md");
  assert.match(operatingModel, /Daily Loop Program Architect/);
  assert.match(operatingModel, /does not replace the domain owners or the independent evidence/);

  const role = read("docs/agents/daily-loop-program-architect.md");
  assert.match(role, /Existing Qi Se is the foundation/);
  assert.match(role, /Never approve your own source, cultural, measurement, fairness, privacy or release evidence/);
});
