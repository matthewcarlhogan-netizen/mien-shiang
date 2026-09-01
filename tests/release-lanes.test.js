import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  BETA_RELEASE_PROFILE, isExcludedFromBeta,
} from "../scripts/release-profile.js";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");

function runReleaseAudit(...args) {
  return spawnSync(process.execPath, ["scripts/check-release.js", ...args], {
    cwd: REPO,
    encoding: "utf8",
  });
}

test("the disclosed beta profile contains only the core scanner surface", () => {
  assert.equal(BETA_RELEASE_PROFILE.lane, "beta");
  assert.equal(BETA_RELEASE_PROFILE.name, "disclosed-beta");
  assert.equal(BETA_RELEASE_PROFILE.enabledSurface, "core-scanner");
  assert.equal(BETA_RELEASE_PROFILE.qiseFeatureEnabled, false);

  for (const path of ["qise.html", "qise/", "ui/qise/", "heritage/"]) {
    assert.equal(isExcludedFromBeta(path), true, `${path} must stay out of beta`);
  }
  for (const path of ["index.html", "ui.js", "reading/provenance.js"]) {
    assert.equal(isExcludedFromBeta(path), false, `${path} is part of the core scanner`);
  }
});

test("the beta audit is independent of commercial evidence", () => {
  const result = runReleaseAudit("--beta");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Beta release gate: READY/);
  assert.match(result.stdout, /core scanner only/);
  assert.match(result.stdout, /safety authorization: unset/i);
  assert.doesNotMatch(result.stdout, /Google Play|Samsung|Apple/i);
  assert.doesNotMatch(result.stdout, /rights-not-cleared|citation-provenance/i);
});

test("the commercial audit remains a strict, separately selectable gate", () => {
  const result = runReleaseAudit("--commercial", "--require-ready");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Commercial store release gate: BLOCKED/);
  assert.match(result.stdout, /rights-not-cleared|citation-provenance|store evidence/i);
});

test("the default release audit reports both lanes", () => {
  const result = runReleaseAudit();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Beta release gate:/);
  assert.match(result.stdout, /Commercial store release gate:/);
});
