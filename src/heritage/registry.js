/*
 * Canonical heritage registry.
 *
 * The registry is built from the existing corpus, then frozen deeply. The
 * factory is intentionally exported so abstention behavior can be tested with
 * an isolated corpus without mutating runtime state.
 */

import { HERITAGE } from "../qise/reflection-corpus.js";
import {
  validateHeritageRecord,
  validateHeritageConnector,
  validateHeritageDisagreementRecord,
  validateHeritageNegativeRule,
  validateHeritageCompositionPolicy,
  validateHeritageConcept,
} from "./validator.js";
import { SOURCE_REGISTRY } from "../reading/provenance.js";
import { HERITAGE_EVIDENCE } from "./evidence.js";
import { HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY } from "./negative-relationships-registry.js";
import { HERITAGE_COMPOSITION_POLICIES } from "./composition-policies-registry.js";
import { HERITAGE_CONCEPT_REGISTRY } from "./concepts.js";
import { HERITAGE_CONSTRUCT_IDS } from "./constants.js";

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

/*
 * Stage 1 connector graph.
 *
 * Six of these (the four COLLECTIVE_RULE connectors, plus the two
 * CORRESPONDS_TO connectors) migrate legacy `attestedCombinations` and the
 * flat `taiqing-form-spirit-qise-mountains-rivers` cross-family combination.
 * The remaining five (shen-requires-form, form-requires-shen,
 * heritage-qise-modifies-form-shen-mountains-rivers,
 * yuebo-mountains-rivers-form-shen-configuration,
 * five-forms-generative-overcoming-system) encode the research dispositions
 * recorded in the Stage 1 handoff that the legacy model never captured at
 * all. See docs/HERITAGE_RECONCILIATION_2026-08-24.md for prior corrections
 * to the underlying source records this graph cites.
 */
/*
 * Every field HERITAGE_CONNECTOR_FIELDS marks required must be present even
 * when empty (nullableStringField(true) still means the KEY must exist).
 * This factory fills those in so each entry below only states what is
 * actually known, the same discipline evidence.js's constituent()/
 * disagreement() helpers use.
 */
const connectorRecord = (fields) => ({
  sourceText: null,
  sectionLocator: null,
  sectionLocatorStatus: "NOT_RECORDED",
  folioLocator: null,
  folioLocatorStatus: "NOT_RECORDED",
  historicalStates: [],
  relationshipPredicate: null,
  historicalPredicateCategories: [],
  sourceRuleGroupId: null,
  disagreementIds: [],
  alternateConnectorIds: [],
  supportingSourceIds: [],
  note: null,
  ...fields,
});

export const HERITAGE_CONNECTOR_REGISTRY = deepFreeze({
  "three-sections-equality-mayi-received": connectorRecord({
    connectorId: "three-sections-equality-mayi-received",
    relationshipType: "COLLECTIVE_RULE",
    relationshipDirection: { kind: "UNDIRECTED" },
    collectiveMode: "SYSTEM_AS_WHOLE",
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "threeSections", nodeType: "CONSTRUCT", constructId: "threeSections", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "STRUCTURALLY_IMPLIED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-three-sections",
    textualLayer: "BASE_TEXT",
    sourceTextStatus: "RECORDED",
    measurementAvailability: "SUPPORTED_2D",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "Contested/unverified: the received Ma Yi equality maxim is held against a contradicted-attribution source (see heritage-three-sections). Research-only.",
  }),
  "five-mountains-mutual-facing-fullness": connectorRecord({
    connectorId: "five-mountains-mutual-facing-fullness",
    relationshipType: "COLLECTIVE_RULE",
    relationshipDirection: { kind: "UNDIRECTED" },
    collectiveMode: "ALL_MEMBERS",
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-five-mountains",
    textualLayer: "BASE_TEXT",
    sourceText: "五嶽須要豐隆而相朝",
    sourceTextStatus: "RECORDED",
    sectionLocator: "「五嶽」; 卷二 (Siku)",
    sectionLocatorStatus: "VERIFIED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
    prohibitedForUserInference: true,
    note: "Historical fullness/mutual-facing only; no modern capture support.",
  }),
  "four-rivers-flow-and-banks": connectorRecord({
    connectorId: "four-rivers-flow-and-banks",
    relationshipType: "COLLECTIVE_RULE",
    relationshipDirection: { kind: "UNDIRECTED" },
    collectiveMode: "ALL_MEMBERS",
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-four-rivers-primary",
    textualLayer: "BASE_TEXT",
    sourceTextStatus: "RECORDED",
    sectionLocator: "「四瀆」; 卷二 (Siku)",
    sectionLocatorStatus: "VERIFIED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "HERITAGE_PRESENTATION_ALLOWED",
    prohibitedForUserInference: true,
    note: "Mutual flow/banks only; no modern measurement support.",
  }),
  "five-officers-one-good-office-ten-years": connectorRecord({
    connectorId: "five-officers-one-good-office-ten-years",
    relationshipType: "COLLECTIVE_RULE",
    relationshipDirection: { kind: "UNDIRECTED" },
    collectiveMode: "ANY_MEMBER",
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fiveOfficers", nodeType: "CONSTRUCT", constructId: "fiveOfficers", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-five-officers",
    textualLayer: "BASE_TEXT",
    sourceText: "一官好則貴十年",
    sourceTextStatus: "RECORDED",
    sectionLocator: "「五官」; 卷二 (Siku)",
    sectionLocatorStatus: "VERIFIED",
    measurementAvailability: "NOT_RECORDED",
    runtimePolicy: "SOURCE_PANEL_ONLY",
    prohibitedForUserInference: true,
    note: "Fortune-typed heritage; source-panel only and never operationalised as a user-facing inference.",
  }),
  "five-mountains-four-rivers-corresponds": connectorRecord({
    connectorId: "five-mountains-four-rivers-corresponds",
    relationshipType: "CORRESPONDS_TO",
    relationshipDirection: { kind: "UNDIRECTED" },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" },
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-taiqing-juan1-mountains-rivers",
    textualLayer: "BASE_TEXT",
    sourceText: "五嶽四瀆要相應",
    sourceTextStatus: "RECORDED",
    sectionLocator: "卷一「須辨三停端不端，五嶽四瀆要相應」",
    sectionLocatorStatus: "RECORDED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "太清神鑑 卷一 pairs a Three Sections balance clause with this mountains/rivers correspondence clause; only the mountains/rivers clause is encoded here. Do not merge Three Sections into this connector from this line alone.",
  }),
  "four-rivers-shen-corresponds": connectorRecord({
    connectorId: "four-rivers-shen-corresponds",
    relationshipType: "CORRESPONDS_TO",
    relationshipDirection: { kind: "DIRECTED", from: ["fourRivers"], to: ["shen"] },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "VERIFIED_PRIMARY",
    sourceId: "heritage-four-rivers-primary",
    textualLayer: "BASE_TEXT",
    sourceText: "四瀆欲得端直清大眀浄流暢涯岸成就者則應於神",
    sourceTextStatus: "RECORDED",
    sectionLocator: "「四瀆」; 卷二 (Siku)",
    sectionLocatorStatus: "VERIFIED",
    historicalStates: [{
      stateId: "shen-unmeasurable",
      participantId: "shen",
      gloss: "Shen as the endpoint the Four Rivers' standing is said to manifest in; never itself measured.",
      measurementAvailability: "UNMEASURABLE",
    }],
    measurementAvailability: "UNMEASURABLE",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "四瀆...則應於神 — a good state of the Four Rivers is said to manifest (應) in Shen. Directed because the source states the Rivers' standing as antecedent to the Shen appraisal, not a symmetric identity. Shen is unmeasurable and this stays research-only.",
  }),
  "shen-requires-form": connectorRecord({
    connectorId: "shen-requires-form",
    relationshipType: "REQUIRES",
    relationshipDirection: { kind: "DIRECTED", from: ["shen"], to: ["form"] },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
      { participantId: "form", nodeType: "HERITAGE_CONCEPT", conceptId: "form", memberScope: "NODE" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-taiqing-juan4-form-shen-reciprocity",
    textualLayer: "BASE_TEXT",
    sourceText: "神須形而始安",
    sourceTextStatus: "RECORDED",
    sectionLocator: "卷四",
    sectionLocatorStatus: "RECORDED",
    measurementAvailability: "UNMEASURABLE",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    sourceRuleGroupId: "taiqing-form-shen-reciprocity",
    alternateConnectorIds: ["form-requires-shen"],
    note: "神須形而始安 — Shen requires Form before it can be settled. Atomic connector paired with form-requires-shen in the same sourceRuleGroup; the two directions are kept separate because the source gives each a distinct predicate (安 vs 運), not a single symmetric claim.",
  }),
  "form-requires-shen": connectorRecord({
    connectorId: "form-requires-shen",
    relationshipType: "REQUIRES",
    relationshipDirection: { kind: "DIRECTED", from: ["form"], to: ["shen"] },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "form", nodeType: "HERITAGE_CONCEPT", conceptId: "form", memberScope: "NODE" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-taiqing-juan4-form-shen-reciprocity",
    textualLayer: "BASE_TEXT",
    sourceText: "形須神而始運",
    sourceTextStatus: "RECORDED",
    sectionLocator: "卷四",
    sectionLocatorStatus: "RECORDED",
    measurementAvailability: "UNMEASURABLE",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    sourceRuleGroupId: "taiqing-form-shen-reciprocity",
    alternateConnectorIds: ["shen-requires-form"],
    note: "形須神而始運 — Form requires Shen before it can move/function. Atomic connector paired with shen-requires-form.",
  }),
  "heritage-qise-modifies-form-shen-mountains-rivers": connectorRecord({
    connectorId: "heritage-qise-modifies-form-shen-mountains-rivers",
    relationshipType: "MODIFIES",
    relationshipDirection: { kind: "DIRECTED", from: ["heritageQiSe"], to: ["form", "shen", "fiveMountains", "fourRivers"] },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "heritageQiSe", nodeType: "HERITAGE_CONCEPT", conceptId: "heritageQiSe", memberScope: "NODE" },
      { participantId: "form", nodeType: "HERITAGE_CONCEPT", conceptId: "form", memberScope: "NODE" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
      { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" },
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "VERIFIED_PRIMARY",
    sourceId: "heritage-taiqing-form-qise-interaction",
    textualLayer: "BASE_TEXT",
    sourceTextStatus: "RECORDED",
    sectionLocator: "卷四「論㸔形神體像」",
    sectionLocatorStatus: "VERIFIED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "Decomposed from the legacy 'taiqing-form-spirit-qise-mountains-rivers' flat cross-family record. Historical Qi Se (氣色) is said to modify the appraisal/context of form, spirit, mountains and rivers per 卷四「論㸔形神體像」. This is a claim about the CLASSICAL predicate only — see the no-qise-to-form-classification negative rule for the explicitly forbidden modern-measurement inference this must not become.",
  }),
  "yuebo-mountains-rivers-form-shen-configuration": connectorRecord({
    connectorId: "yuebo-mountains-rivers-form-shen-configuration",
    relationshipType: "CONJUNCTIVE_CONFIGURATION",
    relationshipDirection: { kind: "UNDIRECTED" },
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fiveMountains", nodeType: "CONSTRUCT", constructId: "fiveMountains", memberScope: "ALL_MEMBERS" },
      { participantId: "fourRivers", nodeType: "CONSTRUCT", constructId: "fourRivers", memberScope: "ALL_MEMBERS" },
      { participantId: "form", nodeType: "HERITAGE_CONCEPT", conceptId: "form", memberScope: "NODE" },
      { participantId: "shen", nodeType: "HERITAGE_CONCEPT", conceptId: "shen", memberScope: "NODE" },
    ],
    evidenceClass: "EXPLICITLY_ATTESTED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-yuebo-dongzhongji-configuration",
    textualLayer: "BASE_TEXT",
    sourceText: "凡相人靣五嶽欲其相朝四瀆欲其不混形神備足",
    sourceTextStatus: "RECORDED",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "月波洞中記: in appraising a face, the Five Mountains should mutually face, the Four Rivers should not intermingle, and Form and Shen should be fully complete. Represented at the evidence strength the current repository record supports: work identified, no edition/juan locator recorded yet.",
  }),
  "five-forms-generative-overcoming-system": connectorRecord({
    connectorId: "five-forms-generative-overcoming-system",
    relationshipType: "COLLECTIVE_RULE",
    relationshipDirection: { kind: "UNDIRECTED" },
    collectiveMode: "SYSTEM_AS_WHOLE",
    graphScope: "CORE_HERITAGE",
    participants: [
      { participantId: "fiveElements", nodeType: "CONSTRUCT", constructId: "fiveElements", memberScope: "ALL_MEMBERS" },
    ],
    evidenceClass: "STRUCTURALLY_IMPLIED",
    evidenceStrength: "RECORDED_NOT_VERIFIED",
    sourceId: "heritage-five-elements-taiqing",
    textualLayer: "BASE_TEXT",
    sourceTextStatus: "NOT_RECORDED",
    sectionLocator: "卷四「五形」",
    sectionLocatorStatus: "RECORDED",
    measurementAvailability: "MODERN_MAPPING_UNSUPPORTED",
    runtimePolicy: "RESEARCH_ONLY",
    prohibitedForUserInference: true,
    note: "太清神鑑 discusses the five forms in terms of mutual generation (相生) and mutual overcoming (相尅). Recorded at SYSTEM_AS_WHOLE only: this does not enumerate the ten pairwise edges and does not import the Five Phases (五行) cycle order — see the no-five-forms-five-phases-conflation negative rule. A pairwise breakdown needs a located, quoted predicate for each pair, not yet in the repository record.",
  }),
});

export const HERITAGE_DISAGREEMENT_REGISTRY = deepFreeze({
  "three-sections-boundaries": {
    disagreementId: "three-sections-boundaries",
    nature: "MAPPING",
    target: { targetType: "CONSTRUCT", targetRef: "threeSections" },
    status: "OPEN",
    positions: [
      {
        positionId: "sxqb-mingdu",
        sourceId: "heritage-three-sections-sxqb",
        summary: "神相全編 boundary scheme distinct from common transmitted form",
        note: "Records a distinct boundary scheme.",
      },
      {
        positionId: "common-transmitted",
        sourceId: "mianxiang-unspecified",
        summary: "Common transmitted boundary form begins middle section at brow centre",
        note: "Starts middle section at brow centre.",
      },
      {
        positionId: "mayi-ten-observations",
        sourceId: "heritage-three-sections",
        summary: "麻衣十觀 names three points rather than boundary intervals",
        note: "Names points, not intervals.",
      },
      {
        positionId: "received-mayi-contradiction",
        sourceId: "heritage-three-sections",
        summary: "Received Ma Yi witness contradicts attributed auspiciousness predicate",
        note: "Contradiction found.",
      },
    ],
  },
  "twelve-palaces-constituents": {
    disagreementId: "twelve-palaces-constituents",
    nature: "CONSTITUENT_MEMBERSHIP",
    target: { targetType: "CONSTRUCT", targetRef: "twelvePalaces" },
    status: "OPEN",
    positions: [
      {
        positionId: "taiqing-yuguan",
        sourceId: "heritage-twelve-palaces-taiqing",
        summary: "太清神鑑 records a parallel palace assignment with no 田宅宮 and with 財帛宮 away from the nose",
        note: null,
      },
    ],
  },
  "twelve-palaces-twelfth-slot": {
    disagreementId: "twelve-palaces-twelfth-slot",
    nature: "PREDICATE",
    target: { targetType: "CONSTRUCT", targetRef: "twelvePalaces" },
    status: "OPEN",
    positions: [
      {
        positionId: "appearance-palace",
        sourceId: "heritage-twelve-palaces-taiqing",
        summary: "The 太清神鑑 sequence closes with 相貌 rather than a twelfth slot normalised to another lineage",
        note: null,
      },
    ],
  },
  "five-mountains-northern-region": {
    disagreementId: "five-mountains-northern-region",
    nature: "MAPPING",
    target: { targetType: "CONSTRUCT", targetRef: "fiveMountains" },
    status: "OPEN",
    positions: [
      {
        positionId: "taiqing-han",
        sourceId: "heritage-five-mountains",
        summary: "太清神鑑 assigns 恆嶽 to 頷",
        note: null,
      },
      {
        positionId: "sxqb-chin",
        sourceId: "heritage-five-mountains-sxqb",
        summary: "The Shenxiang Quanbian witness assigns the northern mountain to the chin point",
        note: null,
      },
      {
        positionId: "shenyi-lower-face-zone",
        sourceId: "heritage-five-mountains-shenyi",
        summary: "The Shenyi Fu commentary uses a broader lower-face zone for the northern mountain",
        note: null,
      },
      {
        positionId: "renlun-datong-chin",
        sourceId: "heritage-five-mountains-renlun-datong",
        summary: "人倫大統賦 witnesses the northern mountain as 頦 (chin), distinguished from 太清's 頷",
        note: null,
      },
    ],
  },
  "four-rivers-eye-mouth": {
    disagreementId: "four-rivers-eye-mouth",
    nature: "MAPPING",
    target: { targetType: "CONSTRUCT", targetRef: "fourRivers" },
    status: "OPEN",
    positions: [
      {
        positionId: "primary-eye-huai-mouth-he",
        sourceId: "heritage-four-rivers-primary",
        summary: "Primary position: eye is 淮 and mouth is 河",
        note: null,
      },
      {
        positionId: "variant-eye-he-mouth-huai",
        sourceId: "heritage-four-rivers-sxqb-shoujuan-xiangshuo",
        summary: "Variant position: eye is 河 and mouth is 淮",
        note: "The separate Shenxiang Quanbian juan 2 section is not yet compared, so intra-text variation cannot be ruled out. This is a mapping-level disagreement — it does not duplicate or contest the higher-level five-mountains-four-rivers-corresponds connector.",
      },
    ],
  },
});

const CONNECTOR_VALIDATION_CONTEXT = Object.freeze({
  constructIds: HERITAGE_CONSTRUCT_IDS,
  conceptRegistry: HERITAGE_CONCEPT_REGISTRY,
  relatedSystemIds: Object.freeze(["five-phases", "zwds", "medical-five-organs", "five-directions-cosmology"]),
  connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
  disagreementRegistry: HERITAGE_DISAGREEMENT_REGISTRY,
  sourceRegistry: SOURCE_REGISTRY,
});

for (const connector of Object.values(HERITAGE_CONNECTOR_REGISTRY)) {
  const result = validateHeritageConnector(connector, CONNECTOR_VALIDATION_CONTEXT);
  if (!result.valid) {
    throw new Error("Heritage connector " + connector.connectorId + " is invalid: " + result.errors.join(", "));
  }
}

for (const disagreement of Object.values(HERITAGE_DISAGREEMENT_REGISTRY)) {
  const result = validateHeritageDisagreementRecord(disagreement, {
    constructIds: HERITAGE_CONSTRUCT_IDS,
    connectorRegistry: HERITAGE_CONNECTOR_REGISTRY,
    sourceRegistry: SOURCE_REGISTRY,
  });
  if (!result.valid) {
    throw new Error("Heritage disagreement " + disagreement.disagreementId + " is invalid: " + result.errors.join(", "));
  }
}

for (const rule of Object.values(HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY)) {
  const result = validateHeritageNegativeRule(rule);
  if (!result.valid) {
    throw new Error("Heritage negative rule " + rule.negativeRuleId + " is invalid: " + result.errors.join(", "));
  }
}

for (const policy of Object.values(HERITAGE_COMPOSITION_POLICIES)) {
  const result = validateHeritageCompositionPolicy(policy);
  if (!result.valid) {
    throw new Error("Heritage composition policy " + policy.policyId + " is invalid: " + result.errors.join(", "));
  }
}

for (const concept of Object.values(HERITAGE_CONCEPT_REGISTRY)) {
  const result = validateHeritageConcept(concept);
  if (!result.valid) {
    throw new Error("Heritage concept " + concept.conceptId + " is invalid: " + result.errors.join(", "));
  }
}

// Editorial composition policies must never enter the historical connector
// graph (item: "editorial policies excluded from historical registry").
const connectorPolicyCollision = Object.keys(HERITAGE_COMPOSITION_POLICIES)
  .find((id) => id in HERITAGE_CONNECTOR_REGISTRY);
if (connectorPolicyCollision) {
  throw new Error(
    "Editorial composition policy " + connectorPolicyCollision
    + " collides with a connector ID in HERITAGE_CONNECTOR_REGISTRY",
  );
}
