#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { auditContentProvenance, CONTENT_PROVENANCE } from "../src/reading/provenance.js";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const rights = JSON.parse(readFileSync(join(REPO, "docs", "commercial-rights-manifest.json"), "utf8"));
const stores = JSON.parse(readFileSync(join(REPO, "docs", "store-release-evidence.json"), "utf8"));
const requireReady = process.argv.includes("--require-ready");
const issues = [];
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

if (rights.schemaVersion !== 1) issues.push("commercial manifest schema is not supported");
if (stores.schemaVersion !== 1) issues.push("store evidence schema is not supported");

const provenanceAudit = auditContentProvenance();
for (const id of Object.keys(CONTENT_PROVENANCE)) {
  const record = rights.families?.[id];
  if (!record) {
    issues.push(`${id}: missing commercial-rights manifest record`);
    continue;
  }
  if (!provenanceAudit[id]?.ready) issues.push(`${id}: provenance is not cleared`);
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

console.log(`Release gate: ${issues.length ? "BLOCKED" : "READY"}`);
for (const issue of issues) console.log(`  - ${issue}`);
if (requireReady && issues.length) process.exit(1);
