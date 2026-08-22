import { HERITAGE_FIELD_MANIFEST } from "./schema.js";
import { SOURCE_REGISTRY } from "../reading/provenance.js";

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const typeMatches = (value, type) => {
  if (type === "string") return typeof value === "string" && value.length > 0;
  if (type === "string|null") return value === null || (typeof value === "string" && value.length > 0);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "array") return Array.isArray(value);
  return true;
};

function validateFields(value, manifest, prefix, errors) {
  for (const [name, field] of Object.entries(manifest)) {
    const current = value?.[name];
    if (field.required && current === undefined) {
      errors.push("Missing " + prefix + name);
      continue;
    }
    if (current !== undefined && !typeMatches(current, field.type)) {
      errors.push(prefix + name + " has invalid type");
    }
    if (field.type === "enum" && current !== undefined && !field.values.includes(current)) {
      errors.push(prefix + name + " has invalid value: " + current);
    }
    if (field.type === "array" && current !== undefined
      && (!Array.isArray(current) || current.some((item) => typeof item !== "string"))) {
      errors.push(prefix + name + " has invalid array format");
    }
  }
}

export function validateHeritageRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { valid: false, errors: ["Record must be an object"] };
  }

  if (!hasValue(record.constructId)) errors.push("Missing constructId");
  if (record.canonicalChineseName === undefined) errors.push("Missing canonicalChineseName");
  validateFields(record, HERITAGE_FIELD_MANIFEST.record, "", errors);

  if (record.canonicalChineseName === null && record.canonicalNameStatus !== "NOT_RECORDED") {
    errors.push("Null canonicalChineseName requires canonicalNameStatus NOT_RECORDED");
  }
  if (record.canonicalChineseName !== null && record.canonicalNameStatus === "NOT_RECORDED") {
    errors.push("Non-null canonicalChineseName cannot have canonicalNameStatus NOT_RECORDED");
  }

  if (!record.lineages || typeof record.lineages !== "object" || Array.isArray(record.lineages)) {
    errors.push("Missing or invalid lineages");
    return { valid: false, errors };
  }
  const lineageEntries = Object.entries(record.lineages);
  if (lineageEntries.length === 0) errors.push("At least one lineage is required");

  for (const [key, lineage] of lineageEntries) {
    const prefix = "Lineage " + key + " ";
    if (!lineage || typeof lineage !== "object") {
      errors.push(prefix + "must be an object");
      continue;
    }
    if (!hasValue(lineage.lineageId)) errors.push(prefix + "missing lineageId");
    if (!hasValue(lineage.definition)) errors.push(prefix + "missing definition");
    if (!hasValue(lineage.source)) errors.push(prefix + "missing source");
    validateFields(lineage, HERITAGE_FIELD_MANIFEST.lineage, prefix, errors);

    if (lineage.lineageId && lineage.lineageId !== key) {
      errors.push(prefix + "has contradictory lineageId " + lineage.lineageId);
    }
    if (lineage.sourceId && !SOURCE_REGISTRY[lineage.sourceId]) {
      errors.push(prefix + "references unknown sourceId " + lineage.sourceId);
    }
    if (lineage.attestedCombinations && !lineage.sourceId) {
      errors.push(prefix + "has attestedCombinations but missing sourceId");
    }
    if (lineage.preciseLocator !== null && lineage.locatorStatus === "NOT_RECORDED") {
      errors.push(prefix + "has preciseLocator without a recorded locator status");
    }
    if (lineage.citationStatus === "verified" && lineage.locatorStatus !== "VERIFIED") {
      errors.push(prefix + "verified citation requires locatorStatus VERIFIED");
    }
    if (lineage.evidenceStrength === "VERIFIED" && lineage.citationStatus !== "verified") {
      errors.push(prefix + "verified evidence cannot exceed citationStatus");
    }
    if (lineage.availability === "abstention" && !hasValue(lineage.abstentionReason)) {
      errors.push(prefix + "abstention requires abstentionReason");
    }
    if (lineage.terminationState === "abstain" && lineage.availability !== "abstention") {
      errors.push(prefix + "abstain termination requires availability abstention");
    }
    if (lineage.availability === "abstention" && lineage.terminationState !== "abstain") {
      errors.push(prefix + "abstention availability requires terminationState abstain");
    }
    if (lineage.safetyStatus === "prohibited" && lineage.prohibitedForUserInference !== true) {
      errors.push(prefix + "prohibited safety status requires prohibitedForUserInference");
    }
  }
  return { valid: errors.length === 0, errors };
}
