/* Beta claim-structure test — no second-person state assertions.
 * Regex: /\byou\s+(are|will|feel|look|seem|have)\b/i must return zero matches.
 * Also checks against medical blocklist.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";

const BETA_DIR = fileURLToPath(new URL("../../beta", import.meta.url));
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const files = walk(BETA_DIR).filter((f) => f.endsWith(".js") || f.endsWith(".html"));
const rel = (f) => relative(BETA_DIR, f).replace(/\\/g, "/");

// Claim-structure regex: no "you are/will/feel/look/seem/have" assertions
const CLAIM_STRUCTURE_REGEX = /\byou\s+(are|will|feel|look|seem|have)\b/i;

// Medical blocklist (from tests/qise/no-medical-language.test.js)
const MEDICAL_BLOCKLIST = [
  "disease", "disorder", "syndrome", "condition", "diagnosis", "diagnose",
  "symptom", "clinical", "pathology", "pathological", "abnormal", "lesion",
  "inflammation", "inflamed", "dermatitis", "eczema", "psoriasis", "acne",
  "rosacea", "melasma", "vitiligo", "cancer", "tumor", "malignant",
  "benign", "biopsy", "prognosis", "treatment", "therapy", "medication",
  "prescription", "drug", "pharmaceutical", "clinician", "physician",
  "dermatologist", "patient", "medical", "medicine", "health condition",
  "health issue", "health problem", "see a doctor", "see a clinician",
];

const medicalRegex = new RegExp(
  "\\b(" + MEDICAL_BLOCKLIST.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")\\b",
  "i"
);

test("claim-structure: no second-person state assertions in beta files", () => {
  const offenders = [];
  for (const f of files) {
    const code = readFileSync(f, "utf8");
    // Strip comments to avoid false positives in code comments
    const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const m = stripped.match(CLAIM_STRUCTURE_REGEX);
    if (m) {
      offenders.push(`${rel(f)}: "${m[0]}"`);
    }
  }
  assert.deepEqual(offenders, [],
    "claim-structure violation — no second-person state assertions:\n  " +
    offenders.join("\n  "));
});

test("medical language: no disease/diagnostic vocabulary in beta files", () => {
  const offenders = [];
  for (const f of files) {
    const code = readFileSync(f, "utf8");
    const stripped = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const m = stripped.match(medicalRegex);
    if (m) {
      offenders.push(`${rel(f)}: "${m[0]}"`);
    }
  }
  assert.deepEqual(offenders, [],
    "medical language violation — no disease/diagnostic vocabulary:\n  " +
    offenders.join("\n  "));
});

test("the guard is scanning real beta files", () => {
  assert.ok(files.length >= 2, `only ${files.length} files found in beta/`);
  assert.ok(files.some((f) => rel(f) === "beta.js"));
  assert.ok(files.some((f) => rel(f) === "qise.html"));
});
