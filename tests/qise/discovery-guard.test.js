/*
 * PHASE 10, gate 6 — the runner fails on zero discovered test files.
 *
 * ── WHY THIS IS A COMPLIANCE GATE AND NOT A NICETY ─────────────────────────
 * Every other gate in Phase 10 is a test. A test runner that can report
 * success having run nothing turns all five of them into decoration, and this
 * repository has shipped exactly that: `node --test 'tests/**\/*.test.js'`,
 * where npm runs the script through cmd.exe on Windows, cmd.exe does not strip
 * single quotes, Node received a literal glob, matched no files, and reported
 * 0 tests with exit code 0. A green run that asserted nothing.
 *
 * So the guard is checked by RUNNING the runner against an empty tree and
 * asserting it fails, rather than by reading its source and believing it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const RUNNER = join(REPO, "scripts", "run-tests.js");

/** A throwaway copy of the runner, pointed at a tree we control. */
function runnerIn(testDirContents) {
  const root = mkdtempSync(join(tmpdir(), "qise-runner-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(join(root, "scripts", "run-tests.js"), readFileSync(RUNNER));
  for (const [name, body] of Object.entries(testDirContents)) {
    mkdirSync(dirname(join(root, "tests", name)), { recursive: true });
    writeFileSync(join(root, "tests", name), body);
  }
  const r = spawnSync(process.execPath, [join(root, "scripts", "run-tests.js")], { encoding: "utf8" });
  rmSync(root, { recursive: true, force: true });
  return r;
}

test("an empty tests directory FAILS, loudly", () => {
  const r = runnerIn({});
  assert.notEqual(r.status, 0, "the runner reported success having run nothing");
  assert.match(`${r.stderr}${r.stdout}`, /found 0 test files|Refusing to report success/);
});

test("a tests directory with only non-test files also fails", () => {
  // The realistic version: a helpers file and a fixture, and every actual test
  // accidentally excluded by a renamed pattern.
  const r = runnerIn({ "helpers.js": "export const x = 1;\n", "fixtures/data.js": "export const y = 2;\n" });
  assert.notEqual(r.status, 0);
});

test("a tests directory WITH tests passes and prints the count", () => {
  // The paired positive control. "Fails on empty" is worthless if it fails on
  // everything.
  const r = runnerIn({
    "a.test.js": 'import { test } from "node:test";\ntest("ok", () => {});\n',
    "nested/b.test.js": 'import { test } from "node:test";\ntest("ok", () => {});\n',
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Running 2 test file\(s\)/);
});

test("the runner prints a discoverable count line that CI can assert on", () => {
  // CI greps for this line precisely so a reversion to a shell glob cannot
  // pass quietly.
  const out = execFileSync(process.execPath, [RUNNER, "--list-only"], {
    cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  }).split("\n")[0];
  const m = out.match(/Running (\d+) test file\(s\)/);
  assert.ok(m, `the runner did not print a count line, it printed: ${out}`);
  assert.ok(Number(m[1]) > 0);
});

test("no test glob is passed through a shell", () => {
  // The specific historical defect. Double-quoting fixed that one case, but it
  // still relies on shell quoting behaviour and on Node >= 21 for glob
  // arguments; discovery in Node removes both dependencies.
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts.test, "node scripts/run-tests.js");
  assert.doesNotMatch(pkg.scripts.test, /\*/, "a glob in the npm script reaches cmd.exe on Windows");
});

test("all six Phase 10 gates exist as discoverable files", () => {
  // The set is meant to be findable. A gate that was renamed out of discovery
  // is a gate that is not running.
  const dir = join(REPO, "tests", "qise");
  const required = [
    "no-network.test.js", "no-medical-language.test.js", "no-absolutes.test.js",
    "persistence-shape.test.js", "consent-precedes-inference.test.js",
    "discovery-guard.test.js",
  ];
  for (const f of required) {
    assert.doesNotThrow(() => readFileSync(join(dir, f)), `missing compliance gate: ${f}`);
  }
});
