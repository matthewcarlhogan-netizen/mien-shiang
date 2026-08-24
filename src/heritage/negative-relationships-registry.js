
/*
 * Historical negative findings are graded like any other heritage claim.
 * Product/governance invariants are this project's own architectural
 * boundaries — real and enforced, but not historical evidence, and never
 * marked VERIFIED_PRIMARY against a source that doesn't exist. See
 * negative-relationships.js for why the two are kept apart.
 */
export const HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY = Object.freeze({
  "no-zwds-import": {
    negativeRuleId: "no-zwds-import",
    negativeRuleType: "FORBID_RELATIONSHIP_FAMILY",
    evidenceKind: "PRODUCT_GOVERNANCE_INVARIANT",
    fromRef: "zwds",
    toRef: "twelvePalaces",
    sourceIds: [],
    evidenceStrength: "ABSTAINED",
    status: "ACTIVE",
    note: "Product architecture boundary, not a historical source claim: no Zi Wei Dou Shu palace-network dependency may be imported into facial Twelve Palaces.",
  },
  "no-five-forms-five-phases-conflation": {
    negativeRuleId: "no-five-forms-five-phases-conflation",
    negativeRuleType: "FORBID_NODE_MAPPING",
    evidenceKind: "HISTORICAL_NEGATIVE_FINDING",
    fromRef: "fiveForms",
    toRef: "fivePhases",
    sourceIds: ["heritage-five-elements-taiqing"],
    evidenceStrength: "VERIFIED_PRIMARY",
    status: "ACTIVE",
    note: "太清神鑑 places 五行所生 and 五形 in separate sections (see fiveElements.primary.relatedSystems in evidence.js); Five Forms cannot be silently conflated with Five Phases.",
  },
  "no-modern-geometry-mapping": {
    negativeRuleId: "no-modern-geometry-mapping",
    negativeRuleType: "FORBID_NODE_MAPPING",
    evidenceKind: "HISTORICAL_NEGATIVE_FINDING",
    fromRef: "faceShape",
    toRef: "fiveForms",
    sourceIds: ["heritage-five-elements", "heritage-five-elements-taiqing"],
    evidenceStrength: "CORROBORATED_NOT_VERIFIED",
    status: "ACTIVE",
    note: "Matches the 'modern-face-shape-labels-not-classical-equivalents' field finding in evidence.js: modern geometric face-shape labels are not established classical Five Form equivalents.",
  },
  "no-qise-to-form-classification": {
    negativeRuleId: "no-qise-to-form-classification",
    negativeRuleType: "FORBID_RUNTIME_BINDING",
    evidenceKind: "PRODUCT_GOVERNANCE_INVARIANT",
    fromRef: "heritageQiSe",
    toRef: "fiveForms",
    sourceIds: [],
    evidenceStrength: "ABSTAINED",
    status: "ACTIVE",
    note: "Product architecture boundary: measured Qi Se is personal-baseline colour deviation and cannot classify Five Forms. No historical source is cited because this is a modern-measurement boundary, not a claim about a classical text.",
  },
  "shen-unmeasurable": {
    negativeRuleId: "shen-unmeasurable",
    negativeRuleType: "FORBID_RUNTIME_BINDING",
    evidenceKind: "PRODUCT_GOVERNANCE_INVARIANT",
    fromRef: "shen",
    toRef: "measurementBinding",
    sourceIds: [],
    evidenceStrength: "ABSTAINED",
    status: "ACTIVE",
    note: "Product safety boundary: Shen is heritage-only and cannot acquire a measurement binding. No historical source establishes a measurement method for Shen, so none is cited.",
  },
  "no-three-sections-five-forms-promotion": {
    negativeRuleId: "no-three-sections-five-forms-promotion",
    negativeRuleType: "TEXTUAL_ADJACENCY_ONLY",
    evidenceKind: "PRODUCT_GOVERNANCE_INVARIANT",
    fromRef: "threeSections",
    toRef: "fiveForms",
    sourceIds: [],
    evidenceStrength: "ABSTAINED",
    status: "ACTIVE",
    note: "Methodological rule, not a source claim: textual proximity between Three Sections and Five Forms material cannot be promoted into an explicit historical relationship merely from adjacency.",
  },
});
