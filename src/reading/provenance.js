/*
 * Reading-content provenance and expansion registry.
 *
 * Variety is not evidence. A passage can have thousands of combinations and
 * still rest on one unattributed claim, so each content family has a stable ID
 * and explicit source, rights and cultural-review state. Existing gaps are
 * recorded as gaps; this file never upgrades "mentioned in copy" into a
 * verified or commercially cleared source.
 */

export const CONTRIBUTOR_REGISTRY = Object.freeze({
  "repository-editorial": Object.freeze({
    displayName: "Repository editorial copy",
    role: "modern-commentary",
    agreementStatus: "not-recorded",
  }),
});

export const SOURCE_REGISTRY = Object.freeze({
  "suwen-ch17-unverified": Object.freeze({
    title: "Su Wen, chapter 17 (edition and translation not yet recorded)",
    kind: "historical-primary-text",
    locator: "chapter-17",
    citationStatus: "needs-edition-audit",
    rightsStatus: "unverified",
  }),
  "mianxiang-unspecified": Object.freeze({
    title: "Mian Xiang tradition referenced by existing application copy",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: "source-required",
    rightsStatus: "unverified",
  }),
  "neoclassical-canons-unspecified": Object.freeze({
    title: "Neoclassical proportion canons referenced by existing application copy",
    kind: "unresolved-historical-source",
    locator: null,
    citationStatus: "source-required",
    rightsStatus: "unverified",
  }),
});

const profile = (value) => Object.freeze({
  tradition: "Mian Xiang",
  contributorIds: Object.freeze(["repository-editorial"]),
  rightsStatus: "audit-required",
  culturalReview: "pending",
  releaseStatus: "existing-copy-needs-audit",
  ...value,
  sourceIds: Object.freeze(value.sourceIds),
});

export const CONTENT_PROVENANCE = Object.freeze({
  "five-elements-v1": profile({
    family: "five-elements", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { mappedShapes: 6 },
  }),
  "three-courts-v1": profile({
    family: "three-courts", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { courts: 3, hairlineMeasured: false },
  }),
  // Retained only so readings already stored on a user's device keep a
  // resolvable provenance ID after the complete twelve-region upgrade.
  "twelve-palaces-v1": profile({
    family: "twelve-palaces", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { listed: 12, sampled: 6 },
  }),
  "twelve-palaces-v2": profile({
    family: "twelve-palaces", sourceIds: ["mianxiang-unspecified"],
    measurementCoverage: { listed: 12, sampled: 12, bilateralRegionsRequired: true },
  }),
  "qi-se-reading-v1": profile({
    family: "qi-se", sourceIds: ["mianxiang-unspecified", "suwen-ch17-unverified"],
    measurementCoverage: { bands: 3 },
  }),
  "harmony-v1": profile({
    family: "proportion-harmony",
    sourceIds: ["mianxiang-unspecified", "neoclassical-canons-unspecified"],
    measurementCoverage: { components: 4 },
  }),
  "qise-passages-v1": profile({
    family: "qi-se-composed-passages",
    sourceIds: ["mianxiang-unspecified", "suwen-ch17-unverified"],
    measurementCoverage: { theoreticalCompositions: 12000 },
  }),
});

/** Missing breadth is a visible roadmap, not prose pretending to be complete. */
export const EXPANSION_AREAS = Object.freeze([
  { id: "ears", label: "Ears", status: "source-and-measurement-required" },
  { id: "nose", label: "Nose structure", status: "source-and-measurement-required" },
  { id: "mouth", label: "Mouth and philtrum", status: "source-and-measurement-required" },
  { id: "markings", label: "Lines and visible markings", status: "cultural-review-required" },
  { id: "life-stage-map", label: "Traditional position and life-stage maps", status: "source-review-required" },
]);

export function validateProvenanceEntry(id, entry) {
  const issues = [];
  if (!id || typeof id !== "string") issues.push("stable-id-required");
  if (!entry?.family) issues.push("family-required");
  if (!Array.isArray(entry?.sourceIds) || entry.sourceIds.length === 0) issues.push("source-id-required");
  for (const sourceId of entry?.sourceIds || []) {
    if (!SOURCE_REGISTRY[sourceId]) issues.push(`unknown-source:${sourceId}`);
  }
  if (!Array.isArray(entry?.contributorIds) || entry.contributorIds.length === 0) {
    issues.push("contributor-required");
  }
  for (const contributorId of entry?.contributorIds || []) {
    if (!CONTRIBUTOR_REGISTRY[contributorId]) issues.push(`unknown-contributor:${contributorId}`);
  }
  if (!entry?.rightsStatus) issues.push("rights-status-required");
  if (!entry?.culturalReview) issues.push("cultural-review-required");
  return issues;
}

export function auditContentProvenance() {
  const results = {};
  for (const [id, entry] of Object.entries(CONTENT_PROVENANCE)) {
    const issues = validateProvenanceEntry(id, entry);
    if (entry.rightsStatus !== "cleared") issues.push("rights-not-cleared");
    if (entry.culturalReview !== "approved") issues.push("cultural-review-pending");
    for (const sourceId of entry.sourceIds) {
      const source = SOURCE_REGISTRY[sourceId];
      if (source.citationStatus !== "verified") issues.push(`citation-not-verified:${sourceId}`);
      if (source.rightsStatus !== "cleared") issues.push(`source-rights-not-cleared:${sourceId}`);
    }
    results[id] = { ready: issues.length === 0, issues: [...new Set(issues)] };
  }
  return results;
}

export const READING_PROVENANCE_IDS = Object.freeze({
  fiveElements: "five-elements-v1",
  threeCourts: "three-courts-v1",
  twelvePalaces: "twelve-palaces-v2",
  qiSe: "qi-se-reading-v1",
  harmony: "harmony-v1",
});
