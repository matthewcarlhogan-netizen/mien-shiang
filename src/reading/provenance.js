/*
 * Reading-content provenance and expansion registry.
 *
 * Variety is not evidence. A passage can have thousands of combinations and
 * still rest on one unattributed claim, so each content family has a stable ID
 * and explicit source and rights state. Existing gaps are
 * recorded as gaps; this file never upgrades "mentioned in copy" into a
 * verified or commercially cleared source.
 */

/*
 * PROVENANCE STATUS TAXONOMY.
 *
 * These are rungs on a ladder, not synonyms. Recording which edition a text is
 * does not mean its locator has been checked against that text, and recording a
 * public-domain determination does not mean the commercial gate has been
 * satisfied. Only the top rung of each ladder satisfies the release contract.
 * The rungs below exist so that a partial result can be stated precisely
 * instead of collapsing into an undifferentiated "not verified" — and so that
 * nothing is ever promoted by relabelling it.
 */
export const CITATION_STATUS = Object.freeze({
  /** No source has been identified for the claim. */
  SOURCE_REQUIRED: "source-required",
  /** Edition and locator recorded. Not yet checked against the actual source. */
  EDITION_RECORDED: "edition-recorded",
  /** Locator independently checked against the actual source. Release-satisfying. */
  VERIFIED: "verified",
});

export const RIGHTS_STATUS = Object.freeze({
  /** No rights basis recorded. */
  UNVERIFIED: "unverified",
  /** A public-domain determination is recorded. This is a basis, not a clearance. */
  PUBLIC_DOMAIN_BY_AGE: "public-domain-by-age",
  /** The commercial rights and legal approval gate has been satisfied. Release-satisfying. */
  CLEARED: "cleared",
});

/** The release contract accepts these and nothing weaker. */
export const CITATION_RELEASE_STATUS = CITATION_STATUS.VERIFIED;
export const RIGHTS_RELEASE_STATUS = RIGHTS_STATUS.CLEARED;

/** Why a source does not yet meet the gate, in words rather than a bare negation. */
export const PROVENANCE_BLOCKER_DETAIL = Object.freeze({
  "rights-not-cleared":
    "family rights determination is not cleared",
  "citation-source-required":
    "no source identified for the claim",
  "citation-recorded-not-verified":
    "citation recorded but not independently verified against the source",
  "citation-status-unrecognised":
    "citation status is outside the recorded taxonomy",
  "source-rights-unverified":
    "no rights basis recorded",
  "source-rights-public-domain-not-cleared":
    "public-domain basis recorded but commercial/legal clearance not complete",
  "source-rights-status-unrecognised":
    "rights status is outside the recorded taxonomy",
});

/** Expands `code:sourceId` into the sentence a reader can act on. */
export function explainProvenanceIssue(issue) {
  const detail = PROVENANCE_BLOCKER_DETAIL[String(issue).split(":")[0]];
  return detail ? `${issue} — ${detail}` : String(issue);
}

export const CONTRIBUTOR_REGISTRY = Object.freeze({
  "repository-editorial": Object.freeze({
    displayName: "Repository editorial copy",
    role: "modern-commentary",
    agreementStatus: "not-recorded",
  }),
});

export const SOURCE_REGISTRY = Object.freeze({
  /*
   * RESOLVED 17 August 2026 — DR-2026-08-17-SU-WEN-EDITION.
   *
   * The audit's recorded defect was "the Su Wen chapter reference has no
   * recorded edition or translation", and this entry carried the defect in its
   * own title. The chapter has now been retrieved verbatim and the edition
   * designated, so the citation is recorded.
   */
  "suwen-ch17": Object.freeze({
    title: "黃帝內經·素問·脈要精微論第十七 (Huangdi Neijing, Suwen, ch. 17)",
    kind: "historical-primary-text",
    edition: "四庫全書 recension; received text per the 王冰 762 CE arrangement",
    locator: "素問 卷五·脈要精微論第十七",
    citationStatus: CITATION_STATUS.EDITION_RECORDED,
    rightsStatus: RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE,
    translationStatus: "original-to-this-project",
  }),
  "mianxiang-unspecified": Object.freeze({
    title: "Mian Xiang tradition referenced by existing application copy",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
    "heritage-three-sections": Object.freeze({
    title: "麻衣神相 material used by the existing Three Sections corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-five-elements": Object.freeze({
    title: "黃帝內經·靈樞·陰陽二十五人 material used by the existing Five Elements corpus entry",
    kind: "historical-primary-text",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-twelve-palaces": Object.freeze({
    title: "神相全編·十二宮相論 material used by the existing Twelve Palaces corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-five-mountains": Object.freeze({
    title: "太清神鑑 material used by the existing Five Mountains corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),  "heritage-four-rivers": Object.freeze({
    title: "太清神鑑 and 神相全編 material used by the existing Four Rivers corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-four-rivers-primary": Object.freeze({
    title: "太清神鑑 material used by the existing Four Rivers primary corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-four-rivers-variant": Object.freeze({
    title: "神相全編 material used by the existing Four Rivers variant corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
  "heritage-five-officers": Object.freeze({
    title: "神相全編 material used by the existing Five Officers corpus entry",
    kind: "unresolved-tradition-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
"neoclassical-canons-unspecified": Object.freeze({
    title: "Neoclassical proportion canons referenced by existing application copy",
    kind: "unresolved-historical-source",
    locator: null,
    citationStatus: CITATION_STATUS.SOURCE_REQUIRED,
    rightsStatus: RIGHTS_STATUS.UNVERIFIED,
  }),
});

const profile = (value) => Object.freeze({
  tradition: "Mian Xiang",
  contributorIds: Object.freeze(["repository-editorial"]),
  rightsStatus: "audit-required",
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
    family: "qi-se", sourceIds: ["mianxiang-unspecified", "suwen-ch17"],
    measurementCoverage: { bands: 3 },
  }),
  "harmony-v1": profile({
    family: "proportion-harmony",
    sourceIds: ["mianxiang-unspecified", "neoclassical-canons-unspecified"],
    measurementCoverage: { components: 4 },
  }),
  "qise-passages-v1": profile({
    family: "qi-se-composed-passages",
    sourceIds: ["mianxiang-unspecified", "suwen-ch17"],
    measurementCoverage: { theoreticalCompositions: 12000 },
  }),
});

/** Missing breadth is a visible roadmap, not prose pretending to be complete. */
export const EXPANSION_AREAS = Object.freeze([
  { id: "ears", label: "Ears", status: "source-and-measurement-required" },
  { id: "nose", label: "Nose structure", status: "source-and-measurement-required" },
  { id: "mouth", label: "Mouth and philtrum", status: "source-and-measurement-required" },
  { id: "markings", label: "Lines and visible markings", status: "source-review-required" },
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
  return issues;
}

/*
 * The gate is unchanged and deliberately strict: only `verified` and `cleared`
 * pass. What each helper adds is the reason. "Edition recorded but not checked"
 * and "no source at all" are different states of the world, and reporting both
 * as `citation-not-verified` made a recorded edition look like a missing one —
 * which is the reading that invites someone to "fix" it by relabelling the
 * evidence. Naming the actual shortfall keeps the record honest and keeps the
 * remaining work legible.
 */
const citationBlocker = (status) => {
  if (status === CITATION_RELEASE_STATUS) return null;
  if (status === CITATION_STATUS.EDITION_RECORDED) return "citation-recorded-not-verified";
  if (status === CITATION_STATUS.SOURCE_REQUIRED) return "citation-source-required";
  return "citation-status-unrecognised";
};

const sourceRightsBlocker = (status) => {
  if (status === RIGHTS_RELEASE_STATUS) return null;
  if (status === RIGHTS_STATUS.PUBLIC_DOMAIN_BY_AGE) return "source-rights-public-domain-not-cleared";
  if (status === RIGHTS_STATUS.UNVERIFIED) return "source-rights-unverified";
  return "source-rights-status-unrecognised";
};

export function auditContentProvenance() {
  const results = {};
  for (const [id, entry] of Object.entries(CONTENT_PROVENANCE)) {
    const issues = validateProvenanceEntry(id, entry);
    if (entry.rightsStatus !== RIGHTS_RELEASE_STATUS) issues.push("rights-not-cleared");
    for (const sourceId of entry.sourceIds) {
      const source = SOURCE_REGISTRY[sourceId];
      const citation = citationBlocker(source.citationStatus);
      if (citation) issues.push(`${citation}:${sourceId}`);
      const sourceRights = sourceRightsBlocker(source.rightsStatus);
      if (sourceRights) issues.push(`${sourceRights}:${sourceId}`);
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
