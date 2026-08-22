import { HERITAGE } from "../qise/reflection-corpus.js";
import { validateHeritageRecord } from "./validator.js";
import { SOURCE_REGISTRY } from "../reading/provenance.js";

export const HERITAGE_REGISTRY = {};

const CANONICAL_CHINESE_NAMES = Object.freeze({
  threeSections: "三停",
  fiveElements: "五行",
  twelvePalaces: "十二宮",
  fiveMountains: "五岳",
  fourRivers: "四瀆",
  fiveOfficers: "五官",
});

const SOURCE_ID_BY_CONSTRUCT = Object.freeze({
  threeSections: "heritage-three-sections",
  fiveElements: "heritage-five-elements",
  twelvePalaces: "heritage-twelve-palaces",
  fiveMountains: "heritage-five-mountains",
  fourRivers: "heritage-four-rivers",
  fiveOfficers: "heritage-five-officers",
});

const SOURCE_CITATION_FALLBACK = "mianxiang-unspecified";

Object.entries(HERITAGE).forEach(([constructId, data]) => {
  const sourceId = SOURCE_ID_BY_CONSTRUCT[constructId] || SOURCE_CITATION_FALLBACK;
  const source = SOURCE_REGISTRY[sourceId] || SOURCE_REGISTRY[SOURCE_CITATION_FALLBACK];
  const record = {
    constructId,
    canonicalChineseName: CANONICAL_CHINESE_NAMES[constructId] || null,
    canonicalNameStatus: CANONICAL_CHINESE_NAMES[constructId]
      ? "RECORDED_NOT_VERIFIED" : "NOT_RECORDED",
    aliases: [],
    verificationStatus: "RECORDED_NOT_VERIFIED",
    prohibitedForUserInference: true,
    lineages: Object.entries(data).reduce((acc, [lineageId, lineageData]) => {
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
        measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
        terminationState: "continue",
        note: lineageData.note || "",
        availability: "available",
        abstentionReason: null,
        abstentionReasonCode: null,
        safetyStatus: "safe",
        permittedHeritageSemantics:
          "Report the named source's claim as attributed; do not convert it into a claim about the user.",
        prohibitedInference:
          "Do not infer health, identity, character, fate, status, or outcome from this construct.",
        translationProvenance: "repository-editorial",
        attestedCombinations: [],
        disagreements: lineageData.disagreements || [],
        negativeFinding: null,
      };
      return acc;
    }, {}),
  };

  const validation = validateHeritageRecord(record);
  if (validation.valid) {
    HERITAGE_REGISTRY[constructId] = record;
  } else {
    throw new Error("Heritage record " + constructId + " is invalid: " + validation.errors.join(", "));
  }
});
