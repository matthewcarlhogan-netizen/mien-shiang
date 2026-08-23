/*
 * Canonical heritage registry.
 *
 * The registry is built from the existing corpus, then frozen deeply. The
 * factory is intentionally exported so abstention behavior can be tested with
 * an isolated corpus without mutating runtime state.
 */

import { HERITAGE } from "../qise/reflection-corpus.js";
import { validateHeritageRecord } from "./validator.js";
import { SOURCE_REGISTRY } from "../reading/provenance.js";
import { HERITAGE_EVIDENCE } from "./evidence.js";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export const CANONICAL_CHINESE_NAMES = Object.freeze({
  threeSections: "三停",
  fiveElements: "五形",
  twelvePalaces: "十二宮",
  fiveMountains: "五岳",
  fourRivers: "四瀆",
  fiveOfficers: "五官",
});

const CANONICAL_ALIASES = Object.freeze({
  threeSections: Object.freeze([]),
  fiveElements: Object.freeze(["五形人"]),
  twelvePalaces: Object.freeze([]),
  fiveMountains: Object.freeze(["五嶽"]),
  fourRivers: Object.freeze([]),
  fiveOfficers: Object.freeze([]),
});

const SOURCE_ID_BY_CONSTRUCT = Object.freeze({
  threeSections: "heritage-three-sections",
  fiveElements: "heritage-five-elements",
  twelvePalaces: "heritage-twelve-palaces",
  fiveMountains: "heritage-five-mountains",
  fourRivers: "heritage-four-rivers",
  fiveOfficers: "heritage-five-officers",
});

const SOURCE_ID_BY_LINEAGE = Object.freeze({
  fourRivers: Object.freeze({
    primary: "heritage-four-rivers-primary",
    variant: "heritage-four-rivers-sxqb-shoujuan-xiangshuo",
  }),
});

const MEASUREMENT_AVAILABILITY_BY_CONSTRUCT = Object.freeze({
  threeSections: "SUPPORTED_2D",
  fiveElements: "NOT_RECORDED",
  twelvePalaces: "CONDITIONALLY_SUPPORTED",
  fiveMountains: "CAMERA_GEOMETRY_INSUFFICIENT",
  // The current dossier does not yet split Four Rivers by feature/lineage.
  fourRivers: "NOT_RECORDED",
  fiveOfficers: "CONDITIONALLY_SUPPORTED",
});

const SOURCE_CITATION_FALLBACK = "mianxiang-unspecified";

export function createHeritageRegistry(corpus = HERITAGE) {
  const registry = {};

  Object.entries(corpus).forEach(([constructId, data]) => {
    const constructEvidence = HERITAGE_EVIDENCE[constructId] || {};
    const constructSourceId = SOURCE_ID_BY_CONSTRUCT[constructId]
      || SOURCE_CITATION_FALLBACK;

    const lineageIds = new Set([
      ...Object.keys(data),
      ...Object.keys(constructEvidence.lineages || {}),
    ]);

    const lineages = [...lineageIds].reduce((acc, lineageId) => {
      const lineageData = data[lineageId] || {};
      const lineageEvidence = constructEvidence.lineages?.[lineageId] || {};
      const sourceId = lineageEvidence.sourceId
        || SOURCE_ID_BY_LINEAGE[constructId]?.[lineageId]
        || constructSourceId;
      const source = SOURCE_REGISTRY[sourceId]
        || SOURCE_REGISTRY[constructSourceId]
        || SOURCE_REGISTRY[SOURCE_CITATION_FALLBACK];
      const combinations = lineageEvidence.attestedCombinations
        ?? lineageData.attestedCombinations
        ?? [];
      const sectionLocator = lineageEvidence.sectionLocator
        ?? source?.sectionLocator
        ?? null;
      const folioLocator = lineageEvidence.folioLocator
        ?? source?.folioLocator
        ?? null;

      acc[lineageId] = {
        lineageId,
        definition: lineageEvidence.definition || lineageData.text || "",
        source: lineageEvidence.source || lineageData.source || source?.title || "",
        sourceId,
        supportingSourceIds: lineageEvidence.supportingSourceIds || [],
        evidenceKind: lineageEvidence.evidenceKind || "POSITIVE_CLAIM",
        evidenceStrength: lineageEvidence.evidenceStrength || "RECORDED_NOT_VERIFIED",
        sectionLocator,
        sectionLocatorStatus: lineageEvidence.sectionLocatorStatus
          || source?.sectionLocatorStatus
          || "NOT_RECORDED",
        folioLocator,
        folioLocatorStatus: lineageEvidence.folioLocatorStatus
          || source?.folioLocatorStatus
          || "NOT_RECORDED",
        citationStatus: lineageEvidence.citationStatus
          || source?.citationStatus
          || "source-required",
        rightsStatus: lineageEvidence.rightsStatus
          || source?.rightsStatus
          || "unverified",
        workRightsStatus: lineageEvidence.workRightsStatus
          || lineageData.workRightsStatus
          || source?.rightsStatus
          || "unverified",
        editionRightsStatus: lineageEvidence.editionRightsStatus
          || lineageData.editionRightsStatus
          || (source?.rightsStatus === "public-domain-by-age"
            ? "surrogate-terms-separate"
            : "unverified"),
        measurementAvailability: lineageEvidence.measurementAvailability
          || MEASUREMENT_AVAILABILITY_BY_CONSTRUCT[constructId]
          || "NOT_RECORDED",
        runtimeStatus: lineageEvidence.runtimeStatus
          || (data[lineageId] ? "RUNTIME_PROSE" : "HERITAGE_ONLY"),
        terminationState: lineageData.terminationState || "continue",
        note: lineageEvidence.note ?? lineageData.note ?? null,
        availability: lineageData.availability || "available",
        abstentionReason: lineageData.abstentionReason ?? null,
        abstentionReasonCode: lineageData.abstentionReasonCode ?? null,
        safetyStatus: lineageEvidence.safetyStatus || lineageData.safetyStatus || "safe",
        prohibitedForUserInference: true,
        permittedHeritageSemantics: lineageEvidence.permittedHeritageSemantics ||
          "Report the named source's claim as attributed; do not convert it into a claim about the user.",
        prohibitedInference: lineageEvidence.prohibitedInference ||
          "Do not infer health, identity, character, fate, status, or outcome from this construct.",
        translationProvenance: lineageEvidence.translationProvenance
          || "PROJECT_ORIGINAL",
        translationAgentId: lineageEvidence.translationAgentId
          ?? "repository-editorial",
        constituents: lineageEvidence.constituents || [],
        relatedSystems: lineageEvidence.relatedSystems || [],
        attestedCombinations: combinations,
        attestedCombinationsStatus: lineageEvidence.attestedCombinationsStatus
          || lineageData.attestedCombinationsStatus
          || (combinations.length ? "RECORDED" : "NONE_ATTESTED"),
        disagreements: lineageEvidence.disagreements || lineageData.disagreements || [],
        unverifiedClaims: lineageEvidence.unverifiedClaims
          || lineageData.unverifiedClaims
          || [],
        negativeFinding: lineageEvidence.negativeFinding
          ?? lineageData.negativeFinding
          ?? null,
      };
      return acc;
    }, {});

    const record = {
      constructId,
      canonicalChineseName: CANONICAL_CHINESE_NAMES[constructId] || null,
      canonicalNameStatus: CANONICAL_CHINESE_NAMES[constructId]
        ? "VERIFIED" : "NOT_RECORDED",
      aliases: constructEvidence.aliases || CANONICAL_ALIASES[constructId] || [],
      verificationStatus: constructEvidence.verificationStatus
        || "RECORDED_NOT_VERIFIED",
      prohibitedForUserInference: true,
      lineages,
    };

    const validation = validateHeritageRecord(record);
    if (!validation.valid) {
      throw new Error(
        "Heritage record " + constructId + " is invalid: " + validation.errors.join(", "),
      );
    }
    registry[constructId] = record;
  });

  return deepFreeze(registry);
}

export const HERITAGE_REGISTRY = createHeritageRegistry();
