
import { stringField, nullableStringField, enumField, arrayField } from "./schema-helpers.js";

/*
 * A negative rule is either grounded in a historical source (a text records
 * that two things are distinct, or the repository record establishes an
 * absence) or it is a product/governance invariant this project imposes on
 * its own architecture. The two must not be conflated: a governance rule is
 * not "verified primary historical evidence", and marking it so was exactly
 * the defect this file was auditing when it was found.
 *
 * HISTORICAL_NEGATIVE_FINDING rules require at least one real sourceId whose
 * citationStatus backs the claimed evidenceStrength (validator.js enforces
 * this the same way it enforces evidenceStrength elsewhere). Governance rules
 * carry no sourceIds and no verification-strength claim, because there is no
 * historical evidence to grade; evidenceStrength is fixed at "ABSTAINED" for
 * them precisely because none of the other four rungs describes "this is not
 * a claim about a historical text at all".
 */
export const HERITAGE_NEGATIVE_RULE_FIELDS = Object.freeze({
  negativeRuleId: stringField(true),
  negativeRuleType: enumField(["FORBID_RELATIONSHIP_FAMILY", "FORBID_NODE_MAPPING", "FORBID_RUNTIME_BINDING", "TEXTUAL_ADJACENCY_ONLY"], true),
  evidenceKind: enumField(["HISTORICAL_NEGATIVE_FINDING", "PRODUCT_GOVERNANCE_INVARIANT"], true),
  fromRef: stringField(true),
  toRef: stringField(true),
  sourceIds: arrayField(true),
  evidenceStrength: enumField(["RECORDED_NOT_VERIFIED", "CORROBORATED_NOT_VERIFIED", "VERIFIED_SECONDARY", "VERIFIED_PRIMARY", "ABSTAINED"], true),
  status: enumField(["ACTIVE", "SUPERSEDED"], true),
  supersededBy: nullableStringField(false),
  note: nullableStringField(false),
});
