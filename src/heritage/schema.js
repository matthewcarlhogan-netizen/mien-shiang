/*
 * Canonical heritage data is more explicit than the prose corpus.
 * The manifest below is the source of truth for validation and JSON Schema.
 */

export const HERITAGE_MEASUREMENT_AVAILABILITY = Object.freeze([
  "SUPPORTED_2D",
  "CONDITIONALLY_SUPPORTED",
  "CAMERA_GEOMETRY_INSUFFICIENT",
  "UNSUPPORTED",
  "UNMEASURABLE",
  "MODERN_MAPPING_UNSUPPORTED",
  "NOT_RECORDED",
  "PERMANENTLY_ABSTAIN",
]);

export const HERITAGE_VERIFICATION_STATUSES = Object.freeze([
  "RECORDED_NOT_VERIFIED",
  "CORROBORATED_NOT_VERIFIED",
  "VERIFIED_SECONDARY",
  "VERIFIED_PRIMARY",
  "ABSTAINED",
]);

const stringField = (required = false) => ({ type: "string", required });
const nullableStringField = (required = false) => ({ type: "string|null", required });
const enumField = (values, required = false) => ({ type: "enum", values, required });
const arrayField = (required = false) => ({ type: "array", items: "string", required });
const objectArrayField = (items, required = false) => ({
  type: "array",
  items,
  required,
});

export const HERITAGE_COMBINATION_FIELDS = Object.freeze({
  combinationId: stringField(true),
  constructIds: arrayField(true),
  sourceId: stringField(true),
  preciseLocator: nullableStringField(true),
  combinationScope: enumField(["WITHIN_CONSTRUCT", "CROSS_CONSTRUCT"], true),
  renderPolicy: enumField(["RUNTIME_ALLOWED", "HERITAGE_ONLY", "RESEARCH_ONLY"], true),
  measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
  prohibitedForUserInference: { type: "boolean", required: true },
  note: nullableStringField(true),
});

export const HERITAGE_DISAGREEMENT_FIELDS = Object.freeze({
  disagreementId: stringField(true),
  positionId: stringField(true),
  sourceId: stringField(true),
  summary: stringField(true),
  status: enumField(["OPEN", "PARALLEL", "RESOLVED"], true),
  note: nullableStringField(true),
});

export const HERITAGE_CONSTITUENT_FIELDS = Object.freeze({
  constituentId: stringField(true),
  canonicalChineseName: nullableStringField(true),
  aliases: arrayField(true),
  definition: stringField(true),
  sourceId: stringField(true),
  preciseLocator: nullableStringField(true),
  evidenceStrength: enumField(HERITAGE_VERIFICATION_STATUSES, true),
  measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
  prohibitedForUserInference: { type: "boolean", required: true },
  note: nullableStringField(true),
});

export const HERITAGE_RELATED_SYSTEM_FIELDS = Object.freeze({
  relatedSystemId: stringField(true),
  canonicalChineseName: nullableStringField(true),
  relationship: stringField(true),
  sourceId: stringField(true),
  note: nullableStringField(true),
});

export const HERITAGE_FIELD_FINDING_FIELDS = Object.freeze({
  findingId: stringField(true),
  scope: enumField(["FIELD", "MODERN_CANON", "MODERN_TAXONOMY"], true),
  evidenceKind: enumField(["NEGATIVE_FINDING"], true),
  evidenceStrength: enumField(HERITAGE_VERIFICATION_STATUSES, true),
  sourceIds: arrayField(true),
  summary: stringField(true),
  productConsequence: stringField(true),
  note: nullableStringField(true),
});

export const HERITAGE_FIELD_MANIFEST = Object.freeze({
  record: Object.freeze({
    constructId: stringField(true),
    canonicalChineseName: nullableStringField(true),
    canonicalNameStatus: enumField([
      "VERIFIED",
      "RECORDED_NOT_VERIFIED",
      "NOT_RECORDED",
    ], true),
    aliases: arrayField(true),
    verificationStatus: enumField([
      ...HERITAGE_VERIFICATION_STATUSES,
    ], true),
    prohibitedForUserInference: { type: "boolean", required: true },
    lineages: { type: "lineage-map", required: true },
  }),
  lineage: Object.freeze({
    lineageId: stringField(true),
    definition: stringField(true),
    source: stringField(true),
    sourceId: stringField(true),
    supportingSourceIds: arrayField(true),
    evidenceKind: enumField([
      "POSITIVE_CLAIM",
      "DISAGREEMENT",
      "NEGATIVE_FINDING",
    ], true),
    evidenceStrength: enumField(HERITAGE_VERIFICATION_STATUSES, true),
    preciseLocator: nullableStringField(true),
    locatorStatus: enumField([
      "VERIFIED",
      "RECORDED",
      "NOT_RECORDED",
    ], true),
    citationStatus: enumField([
      "source-required",
      "work-recorded",
      "edition-recorded",
      "verified",
    ], true),
    rightsStatus: enumField([
      "unverified",
      "public-domain-by-age",
      "cleared",
    ], true),
    workRightsStatus: enumField([
      "unverified",
      "public-domain-by-age",
      "cleared",
    ], true),
    editionRightsStatus: enumField([
      "unverified",
      "public-domain-by-age",
      "surrogate-terms-separate",
      "cleared",
    ], true),
    measurementAvailability: enumField(
      HERITAGE_MEASUREMENT_AVAILABILITY,
      true,
    ),
    runtimeStatus: enumField([
      "RUNTIME_PROSE",
      "HERITAGE_ONLY",
      "RESEARCH_ONLY",
    ], true),
    terminationState: enumField(["continue", "abstain"], true),
    availability: enumField(["available", "abstention"], true),
    abstentionReason: nullableStringField(true),
    abstentionReasonCode: nullableStringField(true),
    safetyStatus: enumField(["safe", "prohibited"], true),
    prohibitedForUserInference: { type: "boolean", required: true },
    permittedHeritageSemantics: stringField(true),
    prohibitedInference: stringField(true),
    translationProvenance: nullableStringField(true),
    constituents: objectArrayField(
      HERITAGE_CONSTITUENT_FIELDS,
      true,
    ),
    relatedSystems: objectArrayField(
      HERITAGE_RELATED_SYSTEM_FIELDS,
      true,
    ),
    attestedCombinations: objectArrayField(
      HERITAGE_COMBINATION_FIELDS,
      true,
    ),
    attestedCombinationsStatus: enumField([
      "NONE_ATTESTED",
      "RECORDED",
      "NOT_RECORDED",
    ], true),
    disagreements: objectArrayField(
      HERITAGE_DISAGREEMENT_FIELDS,
      true,
    ),
    negativeFinding: nullableStringField(true),
    note: nullableStringField(true),
  }),
});

const required = (manifest) => Object.entries(manifest)
  .filter(([, field]) => field.required)
  .map(([name]) => name);

function properties(manifest) {
  return Object.fromEntries(Object.entries(manifest).map(([name, field]) => {
    if (field.type === "enum") {
      return [name, { type: "string", enum: field.values }];
    }
    if (field.type === "array") {
      const items = field.items === "string"
        ? { type: "string" }
        : {
          type: "object",
          required: required(field.items),
          properties: properties(field.items),
        };
      return [name, { type: "array", items }];
    }
    if (field.type === "string|null") {
      return [name, { type: ["string", "null"] }];
    }
    if (field.type === "lineage-map") {
      return [name, {
        type: "object",
        minProperties: 1,
        additionalProperties: {
          type: "object",
          required: required(HERITAGE_FIELD_MANIFEST.lineage),
          properties: properties(HERITAGE_FIELD_MANIFEST.lineage),
        },
      }];
    }
    return [name, { type: field.type }];
  }));
}

export const HeritageRecordSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: required(HERITAGE_FIELD_MANIFEST.record),
  properties: properties(HERITAGE_FIELD_MANIFEST.record),
});
