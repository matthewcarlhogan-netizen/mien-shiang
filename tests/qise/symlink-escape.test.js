import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

test("symlink escape refusal", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "escape-"));
  try {
    const outside = path.join(tmp, "outside.txt");
    fs.writeFileSync(outside, "outside");
    const insideDir = path.join(tmp, "inside");
    fs.mkdirSync(insideDir);
    const symlink = path.join(insideDir, "sig.pdf");
    fs.symlinkSync(outside, symlink);

    // Create minimal valid disposition JSON
    const jsonPath = path.join(insideDir, "disposition.json");
    fs.writeFileSync(jsonPath, JSON.stringify({
        schemaVersion: 1, briefVersion: 1, date: "2026-09-30",
        reviewer: { name: "A", qualifications: "12345678901234567890", interestsDeclared: "none", signatureArtifact: "sig.pdf" },
        questions: { Q1: { verdict: "approved", rationale: "Rationale for Q1 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q2: { verdict: "approved", rationale: "Rationale for Q2 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q3: { verdict: "approved", rationale: "Rationale for Q3 is long enough.", contestedInterpretations: [], wordingDecisions: [] }, Q4: { verdict: "approved", rationale: "Rationale for Q4 is long enough.", contestedInterpretations: [], wordingDecisions: [] } },
        families: {}
    }));

    // Should fail when running script with --write (or just via plan/apply if path is checked)
    assert.throws(() => execSync(`node scripts/ingest-disposition.mjs ${jsonPath} --write`), /outside disposition directory/);

  } finally {
    fs.rmSync(tmp, { recursive: true });
  }
});
