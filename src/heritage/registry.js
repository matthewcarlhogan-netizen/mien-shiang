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
  fiveElements: Object.freeze(["五行", "五形人"]),
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
    variant: "heritage-four-rivers-variant",
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
    const constructSourceId = SOURCE_ID_BY_CONSTRUCT[constructId]
      || SOURCE_CITATION_FALLBACK;

    const lineages = Object.entries(data).reduce((acc, [lineageId, lineageData]) => {
      const sourceId = SOURCE_ID_BY_LINEAGE[constructId]?.[lineageId]
        || constructSourceId;
      const source = SOURCE_REGISTRY[sourceId]
        || SOURCE_REGISTRY[constructSourceId]
        || SOURCE_REGISTRY[SOURCE_CITATION_FALLBACK];
      const combinations = lineageData.attestedCombinations || [];

      acc[lineageId] = {
        lineageId,
        definition: lineageData.text || "",
        source: lineageData.source || "",
        sourceId,
        evidenceKind: "POSITIVE_CLAIM",
        evidenceStrength: "RECORDED_NOT_VERIFIED",
        preciseLocator: source?.locator ?? null,
        locatorStatus: source?.locator ? "RECORDED" : "NOT_RECORDED",
        citationStatus: source?.citationStatus || "source-required",
        rightsStatus: source?.rightsStatus || "unverified",
        workRightsStatus: lineageData.workRightsStatus
          || source?.rightsStatus
          || "unverified",
        editionRightsStatus: lineageData.editionRightsStatus || "unverified",
        measurementAvailability: MEASUREMENT_AVAILABILITY_BY_CONSTRUCT[constructId]
          || "NOT_RECORDED",
        terminationState: lineageData.terminationState || "continue",
        note: lineageData.note || "",
        availability: lineageData.availability || "available",
        abstentionReason: lineageData.abstentionReason ?? null,
        abstentionReasonCode: lineageData.abstentionReasonCode ?? null,
        safetyStatus: lineageData.safetyStatus || "safe",
        permittedHeritageSemantics:
          "Report the named source's claim as attributed; do not convert it into a claim about the user.",
        prohibitedInference:
          "Do not infer health, identity, character, fate, status, or outcome from this construct.",
        translationProvenance: "repository-editorial",
        attestedCombinations: combinations,
        attestedCombinationsStatus: lineageData.attestedCombinationsStatus
          || (combinations.length ? "RECORDED" : "NONE_ATTESTED"),
        disagreements: lineageData.disagreements || [],
        negativeFinding: lineageData.negativeFinding ?? null,
      };
      return acc;
    }, {});

    const record = {
      constructId,
      canonicalChineseName: CANONICAL_CHINESE_NAMES[constructId] || null,
      canonicalNameStatus: CANONICAL_CHINESE_NAMES[constructId]
        ? "RECORDED_NOT_VERIFIED" : "NOT_RECORDED",
      aliases: CANONICAL_ALIASES[constructId] || [],
      verificationStatus: "RECORDED_NOT_VERIFIED",
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
