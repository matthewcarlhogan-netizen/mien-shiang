#!/usr/bin/env node
/**
 * Discovers test files in Node and passes them to the runner as explicit
 * arguments. No glob reaches a shell, so cmd.exe and POSIX sh behave
 * identically, and there is no dependency on Node's own glob support
 * (which only exists from v21).
 *
 * Exits 1 if zero test files are found. A test run that asserts nothing must
 * never report success.
 */
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEST_DIR = join(REPO, 'tests');
const PATTERN = /\.test\.m?js$/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (PATTERN.test(entry.name)) out.push(full);
  }
  return out;
}

if (!existsSync(TEST_DIR)) {
  console.error(`FAIL: no tests directory at ${TEST_DIR}`);
  process.exit(1);
}

const files = walk(TEST_DIR).sort();

if (files.length === 0) {
  console.error(`FAIL: found 0 test files under ${TEST_DIR} matching ${PATTERN}`);
  console.error('Refusing to report success for a run that asserts nothing.');
  process.exit(1);
}

console.log(`Running ${files.length} test file(s):`);
for (const f of files) console.log(`  ${relative(REPO, f)}`);

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  cwd: REPO,
});

process.exit(result.status ?? 1);
