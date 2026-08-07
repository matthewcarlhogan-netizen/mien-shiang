/*
 * Whole-source integrity checks.
 *
 * ── WHY THIS FILE HAD TO EXIST ─────────────────────────────────────────────
 * `src/analysis.js` imports the MediaPipe bundle from a CDN at module scope,
 * so it CANNOT be imported under `node --test`. Every other test file works by
 * importing what it tests, which means analysis.js was covered by nothing at
 * all — and it shipped a hard syntax error (`Identifier 'raw' has already been
 * declared`, from two different `const raw` bindings in one function) that
 * broke `ui.js` completely. The whole app failed to boot. 155 tests passed.
 *
 * A test run that is green while the app does not start is exactly the
 * false-green this repo's Verification Protocol exists to prevent. So: parse
 * every source file, whether or not anything can import it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const jsFiles = () => walk(SRC).filter((f) => f.endsWith(".js"));

test("every source file parses", () => {
  const files = jsFiles();
  assert.ok(files.length >= 15, `expected the source tree, found ${files.length} files`);

  const broken = [];
  for (const f of files) {
    try {
      execFileSync(process.execPath, ["--check", f], { stdio: "pipe" });
    } catch (err) {
      const detail = String(err.stderr ?? err.message).split("\n").find((l) => /Error/.test(l));
      broken.push(`${f.replace(SRC, "src")}: ${detail ?? "parse failed"}`);
    }
  }
  assert.deepEqual(broken, [],
    "source files failed to parse — the app will not boot:\n  " + broken.join("\n  "));
});

test("no source file declares the same const twice in one scope", () => {
  // The specific defect above, pinned directly rather than only via the parser,
  // so the failure message names the cause instead of a line number.
  const offenders = [];
  for (const f of jsFiles()) {
    const text = readFileSync(f, "utf8");
    const names = [...text.matchAll(/^\s*const\s+([A-Za-z_$][\w$]*)\s*=/gm)].map((m) => m[1]);
    const seen = new Set(), dup = new Set();
    for (const n of names) (seen.has(n) ? dup : seen).add(n);
    // Module-scope and function-scope names both land here, so a duplicate is
    // only a signal — the parser check above is the authority. Report it as a
    // hint alongside, not as an independent failure.
    if (dup.size) offenders.push(`${f.replace(SRC, "src")}: repeated const name(s) ${[...dup].join(", ")}`);
  }
  // Informational: assert only that the parser check passed for these files.
  for (const o of offenders) {
    const file = join(SRC, o.split(":")[0].replace(/^src[\\/]/, ""));
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--check", file], { stdio: "pipe" }),
      `repeated const name is an actual redeclaration: ${o}`);
  }
});

test("no source file contains double-encoded UTF-8", () => {
  // A PowerShell 5.1 Get-Content/Set-Content round-trip reads UTF-8 as ANSI and
  // writes it back double-encoded. It has damaged two files here: flags.js
  // (caught immediately) and ui.js (which shipped, turning every em-dash into
  // "â€”" on screen). Catch it in CI rather than by eye.
  const damaged = [];
  for (const f of walk(SRC).filter((x) => /\.(js|html|webmanifest)$/.test(x))) {
    const hits = readFileSync(f, "utf8").match(/â€"|â€œ|â€™|â€”|Â·|Â»|Ã¢â‚¬/g);
    if (hits) damaged.push(`${f.replace(SRC, "src")}: ${[...new Set(hits)].join(" ")}`);
  }
  assert.deepEqual(damaged, [],
    "double-encoded UTF-8 found — a file was round-tripped through PowerShell:\n  "
    + damaged.join("\n  "));
});

test("every module in the service worker SHELL exists on disk", () => {
  // sw.js precaching a file that isn't there is what silently killed offline
  // support once already.
  const sw = readFileSync(join(SRC, "sw.js"), "utf8");
  const shell = [...sw.matchAll(/"(\.\/[^"]*)"/g)].map((m) => m[1]);
  assert.ok(shell.length > 20, `expected a full SHELL list, found ${shell.length}`);

  const missing = [];
  for (const entry of shell) {
    const rel = entry.replace(/^\.\//, "") || "index.html";
    try { statSync(join(SRC, rel === "" ? "index.html" : rel)); }
    catch { missing.push(entry); }
  }
  assert.deepEqual(missing, [], "sw.js precaches files that do not exist: " + missing.join(", "));
});

test("every local module imported by a source file exists on disk", () => {
  const missing = [];
  for (const f of jsFiles()) {
    const dir = join(f, "..");
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      try { statSync(join(dir, m[1])); }
      catch { missing.push(`${f.replace(SRC, "src")} imports missing ${m[1]}`); }
    }
  }
  assert.deepEqual(missing, [], "broken local imports:\n  " + missing.join("\n  "));
});
