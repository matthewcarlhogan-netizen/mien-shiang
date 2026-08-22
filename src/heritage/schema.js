/*
 * Canonical heritage data is more explicit than the prose corpus.
 * This manifest is the single field list used by the schema and validator.
 */
export const HERITAGE_MEASUREMENT_AVAILABILITY = Object.freeze([
  "SUPPORTED_2D",
  "CONDITIONALLY_SUPPORTED",
  "CAMERA_GEOMETRY_INSUFFICIENT",
  "UNSUPPORTED",
  "UNMEASURABLE",
  "MODERN_MAPPING_UNSUPPORTED",
  "PERMANENTLY_ABSTAIN",
]);

/* Runtime capture states and the audit vocabulary are different axes. */
export const RUNTIME_TO_MEASUREMENT_AVAILABILITY = Object.freeze({
  read: "SUPPORTED_2D",
  abstained_capture: "CAMERA_GEOMETRY_INSUFFICIENT",
  abstained_anatomy: "CAMERA_GEOMETRY_INSUFFICIENT",
  abstained_confidence: "UNMEASURABLE",
  abstained_calibrating: "MODERN_MAPPING_UNSUPPORTED",
});

const stringField = (required = false) => ({ type: "string", required });
const nullableStringField = (required = false) => ({ type: "string|null", required });
const enumField = (values, required = false) => ({ type: "enum", values, required });
const arrayField = (required = false) => ({ type: "array", items: "string", required });

export const HERITAGE_FIELD_MANIFEST = Object.freeze({
  record: Object.freeze({
    constructId: stringField(true),
    canonicalChineseName: nullableStringField(true),
    canonicalNameStatus: enumField(["VERIFIED", "RECORDED_NOT_VERIFIED", "NOT_RECORDED"], true),
    aliases: arrayField(true),
    verificationStatus: enumField(["VERIFIED", "RECORDED_NOT_VERIFIED", "ABSTAINED"], true),
    prohibitedForUserInference: { type: "boolean", required: true },
    lineages: { type: "lineage-map", required: true },
  }),
  lineage: Object.freeze({
    lineageId: stringField(true),
    definition: stringField(true),
    source: stringField(true),
    sourceId: stringField(true),
    evidenceKind: enumField(["POSITIVE_CLAIM", "DISAGREEMENT", "NEGATIVE_FINDING"], true),
    evidenceStrength: enumField(["RECORDED_NOT_VERIFIED", "CORROBORATED_NOT_VERIFIED", "VERIFIED"], true),
    preciseLocator: nullableStringField(true),
    locatorStatus: enumField(["VERIFIED", "RECORDED", "NOT_RECORDED"], true),
    citationStatus: enumField(["source-required", "edition-recorded", "verified"], true),
    rightsStatus: enumField(["unverified", "public-domain-by-age", "cleared"], true),
    measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
    terminationState: enumField(["continue", "abstain"], true),
    availability: enumField(["available", "abstention"], true),
    abstentionReason: nullableStringField(true),
    abstentionReasonCode: nullableStringField(true),
    safetyStatus: enumField(["safe", "prohibited"], true),
    permittedHeritageSemantics: stringField(true),
    prohibitedInference: stringField(true),
    translationProvenance: nullableStringField(true),
    attestedCombinations: arrayField(true),
    disagreements: arrayField(true),
    negativeFinding: nullableStringField(true),
    note: nullableStringField(true),
  }),
});

const required = (manifest) => Object.entries(manifest)
  .filter(([, field]) => field.required)
  .map(([name]) => name);

const properties = (manifest) => Object.fromEntries(Object.entries(manifest).map(([name, field]) => {
  if (field.type === "enum") return [name, { type: "string", enum: field.values }];
  if (field.type === "array") return [name, { type: "array", items: { type: "string" } }];
  if (field.type === "string|null") return [name, { type: ["string", "null"] }];
  if (field.type === "lineage-map") return [name, {
    type: "object",
    additionalProperties: { type: "object", properties: properties(HERITAGE_FIELD_MANIFEST.lineage) },
  }];
  return [name, { type: field.type }];
}));

export const HeritageRecordSchema = Object.freeze({
  type: "object",
  required: required(HERITAGE_FIELD_MANIFEST.record),
  properties: properties(HERITAGE_FIELD_MANIFEST.record),
  lineage: {
    type: "object",
    required: required(HERITAGE_FIELD_MANIFEST.lineage),
    properties: properties(HERITAGE_FIELD_MANIFEST.lineage),
  },
});
