#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditContentProvenance, CONTENT_PROVENANCE, explainProvenanceIssue,
} from "../src/reading/provenance.js";
import { BETA_RELEASE_PROFILE } from "./release-profile.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const requireReady = args.includes("--require-ready");
const lane = args.includes("--beta")
  ? "beta"
  : (args.includes("--commercial") ? "commercial" : "both");
const verifyBetaArtifact = args.includes("--verify-beta-artifact");
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function auditCommercialRelease() {
  const rights = JSON.parse(readFileSync(join(REPO, "docs", "commercial-rights-manifest.json"), "utf8"));
  const stores = JSON.parse(readFileSync(join(REPO, "docs", "store-release-evidence.json"), "utf8"));
  const issues = [];

  if (rights.schemaVersion !== 1) issues.push("commercial manifest schema is not supported");
  if (stores.schemaVersion !== 1) issues.push("store evidence schema is not supported");

  const provenanceAudit = auditContentProvenance();
  for (const id of Object.keys(CONTENT_PROVENANCE)) {
    const record = rights.families?.[id];
    if (!record) {
      issues.push(`${id}: missing commercial-rights manifest record`);
      continue;
    }
    const provenance = provenanceAudit[id];
    if (!provenance) issues.push(`${id}: provenance audit produced no result`);
    else if (!provenance.ready) {
      // Name each shortfall. "Not cleared" alone cannot distinguish a source
      // that was never identified from one whose edition is recorded and still
      // needs an independent check.
      for (const issue of provenance.issues) {
        issues.push(`${id}: ${explainProvenanceIssue(issue)}`);
      }
    }
    if (record.status !== "cleared") issues.push(`${id}: manifest status is ${record.status || "missing"}`);
    if (record.status === "cleared") {
      for (const kind of ["sourceEdition", "translationRights", "contributorAgreement", "legalApproval"]) {
        const evidence = record.evidence?.[kind];
        if (!evidence?.path || !/^[0-9a-f]{64}$/i.test(evidence.sha256 || "")) {
          issues.push(`${id}: ${kind} evidence path and SHA-256 are required`);
          continue;
        }
        const absolute = join(REPO, evidence.path);
        if (!existsSync(absolute)) issues.push(`${id}: ${kind} evidence file is missing`);
        else if (sha256(absolute) !== evidence.sha256.toLowerCase()) issues.push(`${id}: ${kind} evidence hash changed`);
      }
    }
  }

  if (stores.realDevicePerformance?.status !== "approved") {
    issues.push("real-device performance evidence is not approved");
  }
  for (const [store, record] of Object.entries(stores.stores || {})) {
    if (record.status !== "approved") issues.push(`${store}: store evidence is not approved`);
  }
  return issues;
}

function auditBetaArtifact() {
  const issues = [];
  const dist = join(REPO, "dist-beta");
  const infoPath = join(dist, "build-info.json");

  if (!existsSync(infoPath)) {
    if (verifyBetaArtifact) issues.push("dist-beta/build-info.json is missing; run npm run build:beta first");
    return issues;
  }

  let info;
  try {
    info = JSON.parse(readFileSync(infoPath, "utf8"));
  } catch (error) {
    issues.push(`dist-beta/build-info.json is invalid: ${error.message}`);
    return issues;
  }

  if (info.releaseLane !== BETA_RELEASE_PROFILE.lane) {
    issues.push(`beta artefact release lane is ${info.releaseLane || "missing"}`);
  }
  if (info.releaseProfile !== BETA_RELEASE_PROFILE.name) {
    issues.push(`beta artefact profile is ${info.releaseProfile || "missing"}`);
  }
  if (info.enabledSurface !== BETA_RELEASE_PROFILE.enabledSurface) {
    issues.push(`beta artefact surface is ${info.enabledSurface || "missing"}`);
  }
  if (info.qiseFeatureEnabled !== false) {
    issues.push("beta artefact has the Qi Se longitudinal feature enabled");
  }

  for (const prefix of BETA_RELEASE_PROFILE.excludedSourcePrefixes) {
    if (existsSync(join(dist, prefix))) issues.push(`beta artefact contains excluded path ${prefix}`);
  }

  const manifestPath = join(dist, "manifest.webmanifest");
  if (!existsSync(manifestPath)) {
    issues.push("beta artefact manifest is missing");
  } else {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      if (manifest.start_url !== "./index.html") issues.push("beta manifest does not start at the core scanner");
    } catch (error) {
      issues.push(`beta artefact manifest is invalid: ${error.message}`);
    }
  }

  const index = join(dist, "index.html");
  if (!existsSync(index)) issues.push("beta core scanner entry is missing");
  else if (/qise\.html/i.test(readFileSync(index, "utf8"))) {
    issues.push("beta core scanner entry still references the Qi Se tracker");
  }

  const serviceWorker = join(dist, "sw.js");
  if (!existsSync(serviceWorker)) issues.push("beta service worker is missing");
  else {
    const serviceWorkerSource = readFileSync(serviceWorker, "utf8");
    if (!serviceWorkerSource.includes('const CACHE = "mienshiang-beta-v1";')) {
      issues.push("beta service worker does not use the beta cache namespace");
    }
    if (/\.\/qise(?:[./"]|$)|\.\/ui\/qise(?:[./"]|$)/i.test(serviceWorkerSource)) {
      issues.push("beta service worker still precaches the Qi Se feature");
    }
  }
  return issues;
}

const commercialIssues = lane === "beta" ? [] : auditCommercialRelease();
const betaIssues = auditBetaArtifact();
const selectedIssues = lane === "beta" ? betaIssues : commercialIssues;

function printGate(label, issues) {
  console.log(`${label}: ${issues.length ? "BLOCKED" : "READY"}`);
  for (const issue of issues) console.log(`  - ${issue}`);
}

if (lane === "beta") {
  printGate("Beta release gate", betaIssues);
  console.log("  Scope: disclosed beta, core scanner only; commercial/store evidence is outside this lane.");
  console.log("  Qi Se longitudinal tracker and heritage connector depth: disabled in the beta artefact.");
  console.log("  Qi Se safety authorization: unset; any connector path remains fail-closed.");
} else if (lane === "commercial") {
  printGate("Commercial store release gate", commercialIssues);
} else {
  console.log("Release audit — separate release lanes");
  printGate("Beta release gate", betaIssues);
  console.log("  Scope: disclosed beta, core scanner only; commercial/store evidence is outside this lane.");
  console.log("  Qi Se longitudinal tracker and heritage connector depth: disabled in the beta artefact.");
  console.log("  Qi Se safety authorization: unset; any connector path remains fail-closed.");
  printGate("Commercial store release gate", commercialIssues);
}

if (requireReady && selectedIssues.length) process.exit(1);
