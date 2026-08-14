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
    "/docs/agents/",
    "/docs/proposals/",
    "/docs/CLAUDE_CODE_BOOTSTRAP.md",
    "/docs/CLOUD_AGENT_RUNBOOK.md",
    "/scripts/check-release.js",
    "/scripts/copy-scan.js",
    "/scripts/lint-bundle.js",
    "/tests/agent-governance.test.js",
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
  assert.doesNotMatch(source, /GEMINI_API_KEY|GOOGLE_API_KEY|CLAUDE_CODE_OAUTH_TOKEN/,
    "credentials must not be embedded in the devcontainer configuration");
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

  const proposal = read("docs/proposals/SPIRITUAL_SCANNER_DEFINITION.md");
  assert.match(proposal, /Status:\*\* proposed, not approved/);
  assert.match(proposal, /conversation-derived/);
  assert.match(proposal, /not verified against the repository before it was written/);
  assert.match(proposal, /`verify-release\.mjs` as the release gate\. That file does not exist/);
  assert.match(proposal, /plain-JavaScript PWA, not Vite/);
  assert.match(proposal, /word-boundary matching/);

  const register = read("docs/DECISION_REGISTER.md");
  assert.match(register, /DR-2026-08-15-DAILY-LOOP/);
  assert.match(register, /Option A — enduring portrait/);
  assert.match(register, /Option B — daily loop/);
});
