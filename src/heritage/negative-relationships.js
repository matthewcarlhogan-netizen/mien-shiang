
import { stringField, nullableStringField, enumField, arrayField } from "./schema-helpers.js";

export const HERITAGE_NEGATIVE_RULE_FIELDS = Object.freeze({
  negativeRuleId: stringField(true),
  negativeRuleType: enumField(["FORBID_RELATIONSHIP_FAMILY", "FORBID_NODE_MAPPING", "FORBID_RUNTIME_BINDING", "TEXTUAL_ADJACENCY_ONLY"], true),
  fromRef: stringField(true),
  toRef: stringField(true),
  sourceIds: arrayField(true),
  evidenceStrength: enumField(["RECORDED_NOT_VERIFIED", "CORROBORATED_NOT_VERIFIED", "VERIFIED_SECONDARY", "VERIFIED_PRIMARY", "ABSTAINED"], true),
  status: enumField(["ACTIVE", "SUPERSEDED"], true),
  supersededBy: nullableStringField(false),
  note: nullableStringField(false),
});
