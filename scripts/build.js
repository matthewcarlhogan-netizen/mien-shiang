#!/usr/bin/env node
/**
 * Zero-dependency build.
 *
 * ── WHY THIS EXISTS AT ALL ─────────────────────────────────────────────────
 * CLAUDE.md said "there is no build step and `src/` ships as-is", and for a
 * long time that was right. Two things changed:
 *
 * 1. The compliance guards must run against the ARTEFACT, not the source. A
 *    term that survives into the deployed bundle is the one that matters; a
 *    term in a file that never ships is not a finding.
 * 2. `flags.js` documented an honest limitation — flipping the flag removed
 *    Module B's BEHAVIOUR but not its BYTES, so an entertainment-only build
 *    still shipped health-adjacent copy and could not truthfully answer
 *    Google Play's Health declaration. This build closes that gap.
 *
 * It stays true to the spirit of the original decision: no bundler, no npm
 * dependencies, no transform. `dist/` is a copy of `src/`, and for the
 * entertainment flavour two Module B files are REPLACED BY STUBS so their copy
 * is genuinely absent from the artefact.
 *
 * Stubs rather than deletion because `rules.js` and `analysis.js` import these
 * modules statically. Deleting the files would break the import graph; stubbing
 * them keeps it valid while removing every health-adjacent string.
 *
 * NOTE ON FILE WRITES: this is a Node script on purpose. A PowerShell
 * Get-Content/Set-Content round-trip double-encodes every non-ASCII character
 * and has already corrupted two files in this repo (CLAUDE.md item 18b).
 */
import {
  existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync,
  statSync, copyFileSync,
}
  from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(REPO, "src");
const DIST = join(REPO, "dist");
const MODEL_CACHE = join(REPO, "saved_models", "face_landmarker.task");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MODEL_SHA256 = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function ensureFaceModel() {
  if (existsSync(MODEL_CACHE)) {
    const cached = readFileSync(MODEL_CACHE);
    if (sha256(cached) === MODEL_SHA256) return cached;
    rmSync(MODEL_CACHE, { force: true });
  }
  const response = await fetch(MODEL_URL);
  if (!response.ok) throw new Error(`build: MediaPipe model download failed (${response.status})`);
  const model = Buffer.from(await response.arrayBuffer());
  const actual = sha256(model);
  if (actual !== MODEL_SHA256) throw new Error(`build: MediaPipe model hash mismatch (${actual})`);
  mkdirSync(dirname(MODEL_CACHE), { recursive: true });
  writeFileSync(MODEL_CACHE, model);
  return model;
}

async function vendorMediaPipe() {
  const packageRoot = join(REPO, "node_modules", "@mediapipe", "tasks-vision");
  const vendorRoot = join(DIST, "vendor", "mediapipe");
  const files = [
    "vision_bundle.mjs",
    "wasm/vision_wasm_internal.js",
    "wasm/vision_wasm_internal.wasm",
    "wasm/vision_wasm_nosimd_internal.js",
    "wasm/vision_wasm_nosimd_internal.wasm",
  ];
  for (const rel of files) {
    const source = join(packageRoot, rel);
    if (!existsSync(source)) throw new Error(`build: missing pinned MediaPipe asset ${rel}`);
    const destination = join(vendorRoot, rel);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
  const model = await ensureFaceModel();
  const modelDestination = join(vendorRoot, "models", "face_landmarker.task");
  mkdirSync(dirname(modelDestination), { recursive: true });
  writeFileSync(modelDestination, model);

  const pkg = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  const assets = [...files, "models/face_landmarker.task"].map((rel) => ({
    path: rel,
    sha256: sha256(readFileSync(join(vendorRoot, rel))),
  }));
  writeFileSync(join(vendorRoot, "manifest.json"), JSON.stringify({
    package: pkg.name,
    version: pkg.version,
    license: pkg.license,
    modelSource: "google-ai-edge/mediapipe-models:face_landmarker/float16/1",
    assets,
  }, null, 2) + "\n", "utf8");
  return assets.length;
}

/** Read the flag without importing (the build must not execute app code). */
function readFlavour() {
  const text = readFileSync(join(SRC, "flags.js"), "utf8");
  const m = text.match(/MODULE_B_SAFETY_REFERRALS\s*=\s*(true|false)/);
  if (!m) throw new Error("build: could not read MODULE_B_SAFETY_REFERRALS from src/flags.js");
  return m[1] === "true"
    ? { moduleB: true, name: "wellness" }
    : { moduleB: false, name: "entertainment-only" };
}

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

/* Module B replacements for the entertainment flavour. Same export surface,
 * no health-adjacent copy, no thresholds, nothing to render. */
const STUB_SAFETY = `/* Entertainment build: Module B is not shipped.
 * Generated by scripts/build.js. Same export surface as the real adapter so
 * the import graph stays valid, with no referral logic and no clinical copy. */
export const SAFETY_THRESHOLDS = Object.freeze({});
export const isSafetyEnabled = () => false;
export function evaluateSafety() {
  return { enabled: false, assessable: false, referrals: [], reason: null };
}
export const SAFETY_IS_NEVER_BILLED = true;
`;

const STUB_RULES_B = `/* Entertainment build: Module B is not shipped.
 * Generated by scripts/build.js. No safety gates, no advisory, no disclaimer
 * text -- none of it is in this artefact. */
export const MODULE_B_DISCLAIMER = "";
export const RULES_B = [];
`;

/* The RENDERER is Module B too. Stubbing only the content left the referral
 * headings ("see a clinician", "dermatologist") in the entertainment artefact,
 * where they would have to be explained on a store declaration despite being
 * unreachable. Views ship with their content or not at all. */
const STUB_MODULE_B_VIEW = `/* Entertainment build: Module B is not shipped.
 * Generated by scripts/build.js. Same export surface, renders nothing. */
export const renderReferrals = () => "";
export const renderHaltNotice = () => "";
export const renderAdvisories = () => "";
export function renderMeasurementLimits(baseline, notMeasured) {
  const list = (notMeasured || []).join(", ").replace(/_/g, " ");
  return \`
    <div class="limits">
      <p class="eyebrow">What this photo could and couldn't measure</p>
      <p class="notmeasured">Not checked: \${list}</p>
      <p class="muted" style="font-size:.78rem">Those need a model trained on
        labelled photographs, which this build doesn't have. Nothing above is a
        check for them.</p>
    </div>\`;
}
`;

async function build() {
  const flavour = readFlavour();
  const commitSha = process.env.BUILD_COMMIT || process.env.GITHUB_SHA || "local";

  if (process.env.CI && !/^[0-9a-f]{40}$/i.test(commitSha)) {
    throw new Error("build: CI requires BUILD_COMMIT or GITHUB_SHA to be a full commit SHA");
  }

  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST, { recursive: true });

  let copied = 0;
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file);
    const dest = join(DIST, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    copied++;
  }

  // Copy beta/ → dist/beta/ for the Beta Scanner UI
  const BETA = join(REPO, "beta");
  if (existsSync(BETA)) {
    for (const file of walk(BETA)) {
      const rel = relative(BETA, file);
      const dest = join(DIST, "beta", rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(file, dest);
      copied++;
    }
  }

  // Copy docs/design-prototype.html → dist/docs/design-prototype.html
  const designProtoSrc = join(REPO, "docs", "design-prototype.html");
  if (existsSync(designProtoSrc)) {
    const designProtoDest = join(DIST, "docs", "design-prototype.html");
    mkdirSync(dirname(designProtoDest), { recursive: true });
    copyFileSync(designProtoSrc, designProtoDest);
    copied++;
  }

  const stubbed = [];
  if (!flavour.moduleB) {
    writeFileSync(join(DIST, "adapters", "safety.js"), STUB_SAFETY, "utf8");
    writeFileSync(join(DIST, "rules-b.js"), STUB_RULES_B, "utf8");
    writeFileSync(join(DIST, "modulebview.js"), STUB_MODULE_B_VIEW, "utf8");
    stubbed.push("adapters/safety.js", "rules-b.js", "modulebview.js");
  }

  const vendoredAssets = await vendorMediaPipe();

  // Recorded in the artefact so a store submission can be checked against what
  // was actually shipped rather than against what the flag said at the time.
  // Name and version come from package.json rather than being retyped, so the
  // About screen cannot drift from the released version.
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  const rightsManifest = JSON.parse(readFileSync(
    join(REPO, "docs", "commercial-rights-manifest.json"), "utf8",
  ));
  const commercialContentCleared = rightsManifest.launchStatus === "cleared"
    && Object.values(rightsManifest.families || {}).every((family) => family.status === "cleared");

  writeFileSync(join(DIST, "build-info.json"), JSON.stringify({
    name: pkg.name,
    version: pkg.version,
    commitSha,
    flavour: flavour.name,
    moduleBShipped: flavour.moduleB,
    stubbedModules: stubbed,
    mediaPipe: { version: "0.10.18", sameOrigin: true, assets: vendoredAssets },
    commercialContentCleared,
  }, null, 2) + "\n", "utf8");

  console.log(`Built dist/ — flavour: ${flavour.name}`);
  console.log(`  ${copied} files copied`);
  console.log(stubbed.length
    ? `  ${stubbed.length} Module B module(s) stubbed out: ${stubbed.join(", ")}`
    : "  Module B shipped (wellness flavour)");
  console.log(`  ${vendoredAssets} pinned MediaPipe assets copied for same-origin delivery`);

  if (copied === 0) {
    console.error("FAIL: build produced 0 files.");
    process.exit(1);
  }
}

await build();
