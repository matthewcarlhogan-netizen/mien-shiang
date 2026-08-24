
/*
 * Canonical heritage data is more explicit than the prose corpus.
 * The manifest below is the source of truth for validation and JSON Schema.
 */

import { HERITAGE_CONNECTOR_FIELDS } from "./connectors.js";
import { HERITAGE_DISAGREEMENT_FIELDS } from "./disagreements.js";
import { HERITAGE_NEGATIVE_RULE_FIELDS } from "./negative-relationships.js";
import { HERITAGE_COMPOSITION_POLICY_FIELDS } from "./composition-policy.js";
import {
  stringField,
  nullableStringField,
  enumField,
  arrayField,
  objectArrayField,
} from "./schema-helpers.js";
import {
  HERITAGE_MEASUREMENT_AVAILABILITY,
  HERITAGE_CITATION_STATUSES,
  HERITAGE_LOCATOR_STATUSES,
  HERITAGE_VERIFICATION_STATUSES,
  HERITAGE_TRANSLATION_PROVENANCE,
} from "./constants.js";

export {
  HERITAGE_CONNECTOR_FIELDS,
  HERITAGE_DISAGREEMENT_FIELDS,
  HERITAGE_NEGATIVE_RULE_FIELDS,
  HERITAGE_COMPOSITION_POLICY_FIELDS,
  HERITAGE_MEASUREMENT_AVAILABILITY,
  HERITAGE_CITATION_STATUSES,
  HERITAGE_LOCATOR_STATUSES,
  HERITAGE_VERIFICATION_STATUSES,
  HERITAGE_TRANSLATION_PROVENANCE,
};

export const HERITAGE_ALIAS_WITNESS_FIELDS = Object.freeze({
  alias: stringField(true),
  sourceId: stringField(true),
  sectionLocator: nullableStringField(true),
  evidenceStrength: enumField(HERITAGE_VERIFICATION_STATUSES, true),
  note: nullableStringField(true),
});

export const HERITAGE_CONSTITUENT_FIELDS = Object.freeze({
  constituentId: stringField(true),
  canonicalChineseName: nullableStringField(true),
  aliases: arrayField(true),
  aliasWitnesses: objectArrayField(HERITAGE_ALIAS_WITNESS_FIELDS, true),
  definition: stringField(true),
  sourceId: stringField(true),
  sectionLocator: nullableStringField(true),
  folioLocator: nullableStringField(true),
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

export const HERITAGE_UNVERIFIED_CLAIM_FIELDS = Object.freeze({
  claimId: stringField(true),
  summary: stringField(true),
  citationStatus: enumField(["source-required"], true),
  attestationStatus: enumField(["NONE_ATTESTED"], true),
  prohibitedForUserInference: { type: "boolean", required: true },
  note: nullableStringField(true),
});

export const HERITAGE_SOURCE_FIELDS = Object.freeze({
  title: stringField(true),
  kind: stringField(true),
  edition: nullableStringField(true),
  sectionLocator: nullableStringField(true),
  sectionLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
  folioLocator: nullableStringField(true),
  folioLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
  folioLocatorKind: enumField([
    "WYG_PB",
    "FOLIO",
    "PAGE",
    "OTHER",
  ], false),
  bibliographicIdentityStatus: enumField([
    "UNRESOLVED",
    "RECORDED_IN_BIBLIOGRAPHY",
    "WORK_IDENTIFIED",
  ], true),
  independentWitnessStatus: enumField([
    "UNRESOLVED",
    "IDENTIFIED",
    "ACQUIRED",
    "VERIFIED",
  ], true),
  repository: nullableStringField(false),
  repositoryCommit: nullableStringField(false),
  repositoryFile: nullableStringField(false),
  juan: nullableStringField(false),
  citationStatus: enumField(HERITAGE_CITATION_STATUSES, true),
  rightsStatus: enumField([
    "unverified",
    "public-domain-by-age",
    "cleared",
  ], true),
  sourceAccess: enumField([
    "NOT_RECORDED",
    "DISCOVERY_ONLY",
    "REFERENCE_ONLY",
    "LOCAL_ARTIFACT",
    "STABLE_REMOTE",
  ], true),
  sourceUrl: nullableStringField(true),
  sha256: nullableStringField(true),
  retrievedAt: nullableStringField(true),
  editionFingerprint: nullableStringField(true),
  surrogateRights: enumField([
    "UNREVIEWED",
    "NOT_APPLICABLE",
    "PUBLIC_DOMAIN_TAGGED",
    "SURROGATE_RIGHTS_NOT_DECLARED",
    "HOST_TERMS_SEPARATE",
    "CLEARED",
  ], true),
  authorshipStatus: enumField([
    "NOT_RECORDED",
    "ANONYMOUS",
    "ATTRIBUTED",
    "ATTRIBUTED_AND_CONTESTED",
    "IDENTIFIED",
  ], true),
  authorshipNote: nullableStringField(true),
  translationStatus: nullableStringField(true),
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
    sectionLocator: nullableStringField(true),
    sectionLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
    folioLocator: nullableStringField(true),
    folioLocatorStatus: enumField(HERITAGE_LOCATOR_STATUSES, true),
    citationStatus: enumField(HERITAGE_CITATION_STATUSES, true),
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
    translationProvenance: enumField(HERITAGE_TRANSLATION_PROVENANCE, true),
    translationAgentId: nullableStringField(true),
    constituents: objectArrayField(
      HERITAGE_CONSTITUENT_FIELDS,
      true,
    ),
    relatedSystems: objectArrayField(
      HERITAGE_RELATED_SYSTEM_FIELDS,
      true,
    ),
    disagreements: objectArrayField(
      HERITAGE_DISAGREEMENT_FIELDS,
      true,
    ),
    unverifiedClaims: objectArrayField(
      HERITAGE_UNVERIFIED_CLAIM_FIELDS,
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
