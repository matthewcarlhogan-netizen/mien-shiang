
import { stringField, nullableStringField, enumField } from "./schema-helpers.js";

export const HERITAGE_COMPOSITION_POLICY_FIELDS = Object.freeze({
  policyId: stringField(true),
  policyType: enumField(["EDITORIAL_JUXTAPOSITION"], true),
  leftEligibility: stringField(true),
  rightEligibility: stringField(true),
  requiresSeparateAttribution: { type: "boolean", required: true },
  historicalRelationshipAsserted: { type: "boolean", required: true },
  disclosureId: stringField(true),
  maxItems: { type: "number", required: true },
});
