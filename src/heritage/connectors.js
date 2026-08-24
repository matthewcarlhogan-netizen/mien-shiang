
import { HERITAGE_MEASUREMENT_AVAILABILITY, HERITAGE_VERIFICATION_STATUSES, HERITAGE_LOCATOR_STATUSES } from "./constants.js";
import {
  stringField, nullableStringField, enumField, arrayField, objectField, objectArrayField,
  conditionExpressionField,
} from "./schema-helpers.js";

/*
 * The bounded condition AST, expressed as real JSON Schema rather than as
 * `{ type: "object" }` — which the Stage 1 checkpoint rejected because it is
 * indistinguishable from "any object is acceptable". Exactly the six node
 * shapes below are legal; `additionalProperties: false` on every branch
 * rejects anything else (no arithmetic, no arbitrary properties, no JS
 * expressions, no BEFORE, no generic expression language). Recursion for
 * ALL/ANY/NOT is expressed with a self-referencing `$ref`; the depth<=4 and
 * operand<=8 ceilings are NOT expressible here without hand-unrolling the
 * recursion, so those stay enforced only by `validateConditionExpression`
 * (validator.js) — this schema is a structural contract, not a substitute
 * for it.
 */
export const CONDITION_EXPRESSION_JSON_SCHEMA = Object.freeze({
  $ref: "#/$defs/conditionNode",
  $defs: Object.freeze({
    conditionNode: Object.freeze({
      oneOf: Object.freeze([
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "operands"],
          properties: Object.freeze({
            type: Object.freeze({ const: "ALL" }),
            operands: Object.freeze({ type: "array", minItems: 1, items: Object.freeze({ $ref: "#/$defs/conditionNode" }) }),
          }),
        }),
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "operands"],
          properties: Object.freeze({
            type: Object.freeze({ const: "ANY" }),
            operands: Object.freeze({ type: "array", minItems: 1, items: Object.freeze({ $ref: "#/$defs/conditionNode" }) }),
          }),
        }),
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "operand"],
          properties: Object.freeze({
            type: Object.freeze({ const: "NOT" }),
            operand: Object.freeze({ $ref: "#/$defs/conditionNode" }),
          }),
        }),
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "participantId"],
          properties: Object.freeze({
            type: Object.freeze({ const: "PRESENT" }),
            participantId: Object.freeze({ type: "string", minLength: 1 }),
          }),
        }),
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "participantId"],
          properties: Object.freeze({
            type: Object.freeze({ const: "ABSENT" }),
            participantId: Object.freeze({ type: "string", minLength: 1 }),
          }),
        }),
        Object.freeze({
          type: "object", additionalProperties: false, required: ["type", "participantId", "stateId"],
          properties: Object.freeze({
            type: Object.freeze({ const: "STATE" }),
            participantId: Object.freeze({ type: "string", minLength: 1 }),
            stateId: Object.freeze({ type: "string", minLength: 1 }),
          }),
        }),
      ]),
    }),
  }),
});

export const HERITAGE_CONNECTOR_FIELDS = Object.freeze({
  connectorId: stringField(true),
  relationshipType: enumField(["CORRESPONDS_TO", "CONJUNCTIVE_CONFIGURATION", "REQUIRES", "MODIFIES", "SEQUENTIAL_RELATION", "COLLECTIVE_RULE"], true),
  relationshipDirection: objectField({
    kind: enumField(["UNDIRECTED", "DIRECTED", "ORDERED"], true),
    from: arrayField(false),
    to: arrayField(false),
    sequence: arrayField(false),
  }, true),
  collectiveMode: enumField(["ALL_MEMBERS", "ANY_MEMBER", "SYSTEM_AS_WHOLE"], false),
  graphScope: enumField(["CORE_HERITAGE", "ADJACENT_HISTORICAL_SYSTEM"], true),
  participants: objectArrayField({
    participantId: stringField(true),
    nodeType: enumField(["CONSTRUCT", "CONSTITUENT", "HERITAGE_CONCEPT", "RELATED_SYSTEM"], true),
    constructId: nullableStringField(false),
    lineageId: nullableStringField(false),
    constituentId: nullableStringField(false),
    conceptId: nullableStringField(false),
    relatedSystemId: nullableStringField(false),
    memberScope: enumField(["NODE", "ALL_MEMBERS"], true),
  }, true),
  evidenceClass: enumField(["EXPLICITLY_ATTESTED", "STRUCTURALLY_IMPLIED"], true),
  evidenceStrength: enumField(HERITAGE_VERIFICATION_STATUSES, true),
  sourceId: stringField(true),
  supportingSourceIds: arrayField(false),
  textualLayer: enumField(["BASE_TEXT", "COMMENTARY", "QUOTED_SOURCE", "COLLATION_NOTE", "LATER_EDITION", "RECONSTRUCTED_TEXT", "EMBEDDED_LOST_WORK_EXCERPT"], true),
  sourceText: nullableStringField(true),
  sourceTextStatus: enumField(["VERIFIED", "RECORDED", "NOT_RECORDED"], true),
  sectionLocator: nullableStringField(true),
  sectionLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
  folioLocator: nullableStringField(true),
  folioLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
  folioLocatorKind: enumField(["WYG_PB", "FOLIO", "PAGE", "OTHER"], false),
  historicalStates: objectArrayField({
    stateId: stringField(true),
    participantId: stringField(true),
    gloss: nullableStringField(true),
    measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
  }, true),
  conditionExpression: conditionExpressionField(CONDITION_EXPRESSION_JSON_SCHEMA, false),
  relationshipPredicate: nullableStringField(false),
  historicalPredicateCategories: arrayField(false),
  measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
  runtimePolicy: enumField(["HERITAGE_PRESENTATION_ALLOWED", "SOURCE_PANEL_ONLY", "RESEARCH_ONLY"], true),
  prohibitedForUserInference: { type: "boolean", required: true },
  sourceRuleGroupId: nullableStringField(false),
  disagreementIds: arrayField(false),
  alternateConnectorIds: arrayField(false),
  note: nullableStringField(false),
});
