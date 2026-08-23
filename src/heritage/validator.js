import {
  HERITAGE_ALIAS_WITNESS_FIELDS,
  HERITAGE_COMBINATION_FIELDS,
  HERITAGE_CONSTITUENT_FIELDS,
  HERITAGE_DISAGREEMENT_FIELDS,
  HERITAGE_FIELD_FINDING_FIELDS,
  HERITAGE_FIELD_MANIFEST,
  HERITAGE_RELATED_SYSTEM_FIELDS,
  HERITAGE_SOURCE_FIELDS,
  HERITAGE_UNVERIFIED_CLAIM_FIELDS,
} from "./schema.js";
import {
  CONTRIBUTOR_REGISTRY,
  SOURCE_REGISTRY,
} from "../reading/provenance.js";

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const typeMatches = (value, type) => {
  if (type === "string") return typeof value === "string" && value.length > 0;
  if (type === "string|null") {
    return value === null || (typeof value === "string" && value.length > 0);
  }
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
    if (field.type === "array" && current !== undefined && Array.isArray(current)
      && field.items === "string"
      && current.some((item) => typeof item !== "string")) {
      errors.push(prefix + name + " has invalid array format");
    }
  }
}

function validateObjectArray(value, manifest, prefix, errors) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    const itemPrefix = prefix + "[" + index + "].";
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push(itemPrefix + "must be an object");
      return;
    }
    validateFields(item, manifest, itemPrefix, errors);
    if (item.sourceId && !SOURCE_REGISTRY[item.sourceId]) {
      errors.push(itemPrefix + "sourceId references unknown sourceId " + item.sourceId);
    }
    const source = SOURCE_REGISTRY[item.sourceId];
    if (item.evidenceStrength === "VERIFIED_PRIMARY"
      && source?.citationStatus !== "verified") {
      errors.push(itemPrefix + "verified primary evidence requires a verified source");
    }
    if (item.evidenceStrength === "VERIFIED_SECONDARY"
      && !["edition-recorded", "verified"].includes(source?.citationStatus)) {
      errors.push(itemPrefix + "verified secondary evidence requires a recorded source");
    }
  });
}

function validateSourceIds(sourceIds, prefix, errors, requireOne = false) {
  if (!Array.isArray(sourceIds)) return;
  if (requireOne && sourceIds.length === 0) {
    errors.push(prefix + "requires at least one sourceId");
  }
  for (const sourceId of sourceIds) {
    if (!SOURCE_REGISTRY[sourceId]) {
      errors.push(prefix + "references unknown sourceId " + sourceId);
    }
  }
}

function validateUniqueValues(values, prefix, errors) {
  if (!Array.isArray(values)) return;
  if (new Set(values).size !== values.length) {
    errors.push(prefix + "contains duplicate values");
  }
}

function validateUniqueObjectIds(values, idField, prefix, errors) {
  if (!Array.isArray(values)) return;
  const ids = values.map((value) => value?.[idField]).filter(hasValue);
  validateUniqueValues(ids, prefix + idField + " ", errors);
}

export function validateHeritageSourceRecord(source) {
  const errors = [];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return { valid: false, errors: ["Source record must be an object"] };
  }

  validateFields(source, HERITAGE_SOURCE_FIELDS, "Source ", errors);
  const checkLocator = (name, statusName) => {
    const locator = source[name];
    const status = source[statusName];
    if (locator === null && status !== "NOT_RECORDED") {
      errors.push(`Source ${statusName} ${status} requires ${name}`);
    }
    if (locator !== null && status === "NOT_RECORDED") {
      errors.push(`Source ${name} requires a recorded ${statusName}`);
    }
  };
  checkLocator("sectionLocator", "sectionLocatorStatus");
  checkLocator("folioLocator", "folioLocatorStatus");

  if (source.citationStatus === "verified"
    && source.sectionLocatorStatus !== "VERIFIED") {
    errors.push("Verified source requires a verified section locator");
  }
  if (source.citationStatus === "attribution-contradicted"
    && source.authorshipStatus !== "ATTRIBUTED_AND_CONTESTED") {
    errors.push("Contradicted attribution requires contested authorship metadata");
  }
  if (source.sourceAccess === "DISCOVERY_ONLY"
    && source.citationStatus === "verified") {
    errors.push("Discovery-only source cannot be verified");
  }
  if (source.sourceUrl !== null && !/^https:\/\/[^\s]+$/u.test(source.sourceUrl)) {
    errors.push("Source sourceUrl must be an HTTPS URL");
  }
  if (source.sha256 !== null && !/^[a-f0-9]{64}$/u.test(source.sha256)) {
    errors.push("Source sha256 must be 64 lowercase hexadecimal characters");
  }
  if (source.retrievedAt !== null
    && !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/u.test(source.retrievedAt)) {
    errors.push("Source retrievedAt must be an ISO date or UTC timestamp");
  }
  if (source.sha256 !== null
    && [source.sourceUrl, source.retrievedAt, source.editionFingerprint]
      .some((value) => value === null)) {
    errors.push("Hashed source requires sourceUrl, retrievedAt and editionFingerprint");
  }
  if (["LOCAL_ARTIFACT", "STABLE_REMOTE"].includes(source.sourceAccess)
    && source.sha256 === null) {
    errors.push("Stable source access requires a sha256 artifact hash");
  }

  return { valid: errors.length === 0, errors };
}

export function validateHeritageCombination(combination, constructId = null) {
  const errors = [];
  validateFields(combination, HERITAGE_COMBINATION_FIELDS, "Combination ", errors);
  if (combination?.sourceId && !SOURCE_REGISTRY[combination.sourceId]) {
    errors.push("Combination references unknown sourceId " + combination.sourceId);
  }
  if (Array.isArray(combination?.constructIds)) {
    validateUniqueValues(combination.constructIds, "Combination constructIds ", errors);
    if (combination.constructIds.length === 0) {
      errors.push("Combination constructIds requires at least one constructId");
    }
    if (combination.combinationScope === "WITHIN_CONSTRUCT"
      && combination.constructIds.length !== 1) {
      errors.push("WITHIN_CONSTRUCT combination requires exactly one constructId");
    }
    if (combination.combinationScope === "CROSS_CONSTRUCT"
      && combination.constructIds.length < 2) {
      errors.push("CROSS_CONSTRUCT combination requires at least two constructIds");
    }
    if (constructId && combination.combinationScope === "WITHIN_CONSTRUCT"
      && combination.constructIds[0] !== constructId) {
      errors.push("WITHIN_CONSTRUCT combination contradicts parent constructId " + constructId);
    }
  }
  if (combination?.renderPolicy === "RUNTIME_ALLOWED"
    && combination.prohibitedForUserInference === true) {
    errors.push("RUNTIME_ALLOWED combination cannot be prohibited for user inference");
  }
  if (combination?.renderPolicy === "RUNTIME_ALLOWED"
    && ["CAMERA_GEOMETRY_INSUFFICIENT", "UNSUPPORTED", "UNMEASURABLE",
      "MODERN_MAPPING_UNSUPPORTED", "NOT_RECORDED", "PERMANENTLY_ABSTAIN"]
      .includes(combination.measurementAvailability)) {
    errors.push("RUNTIME_ALLOWED combination requires measurable evidence");
  }
  return { valid: errors.length === 0, errors };
}

export function validateHeritageFieldFinding(finding) {
  const errors = [];
  if (!finding || typeof finding !== "object" || Array.isArray(finding)) {
    return { valid: false, errors: ["Field finding must be an object"] };
  }
  validateFields(finding, HERITAGE_FIELD_FINDING_FIELDS, "Field finding ", errors);
  validateSourceIds(finding.sourceIds, "Field finding sourceIds ", errors, true);
  validateUniqueValues(finding.sourceIds, "Field finding sourceIds ", errors);
  if (finding.evidenceStrength === "VERIFIED_PRIMARY"
    && finding.sourceIds?.some((sourceId) =>
      SOURCE_REGISTRY[sourceId]?.citationStatus !== "verified")) {
    errors.push("Verified primary field finding requires verified sources");
  }
  if (finding.evidenceStrength === "VERIFIED_SECONDARY"
    && finding.sourceIds?.some((sourceId) =>
      !["edition-recorded", "verified"].includes(
        SOURCE_REGISTRY[sourceId]?.citationStatus,
      ))) {
    errors.push("Verified secondary field finding requires recorded sources");
  }
  return { valid: errors.length === 0, errors };
}

export function validateHeritageRecord(record) {
  const errors = [];
  if (!record || typeof record !== "object") {
    return { valid: false, errors: ["Record must be an object"] };
  }

  if (!hasValue(record.constructId)) errors.push("Missing constructId");
  if (record.canonicalChineseName === undefined) {
    errors.push("Missing canonicalChineseName");
  }
  validateFields(record, HERITAGE_FIELD_MANIFEST.record, "", errors);
  validateUniqueValues(record.aliases, "aliases ", errors);

  if (record.canonicalChineseName === null
    && record.canonicalNameStatus !== "NOT_RECORDED") {
    errors.push("Null canonicalChineseName requires canonicalNameStatus NOT_RECORDED");
  }
  if (record.canonicalChineseName !== null
    && record.canonicalNameStatus === "NOT_RECORDED") {
    errors.push("Non-null canonicalChineseName cannot have canonicalNameStatus NOT_RECORDED");
  }

  if (!record.lineages || typeof record.lineages !== "object"
    || Array.isArray(record.lineages)) {
    errors.push("Missing or invalid lineages");
    return { valid: false, errors };
  }

  const lineageEntries = Object.entries(record.lineages);
  if (lineageEntries.length === 0) errors.push("At least one lineage is required");

  for (const [key, lineage] of lineageEntries) {
    const prefix = "Lineage " + key + " ";
    if (!lineage || typeof lineage !== "object" || Array.isArray(lineage)) {
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
    validateSourceIds(lineage.supportingSourceIds, prefix + "supportingSourceIds ", errors);
    validateUniqueValues(lineage.supportingSourceIds, prefix + "supportingSourceIds ", errors);
    if (lineage.supportingSourceIds?.includes(lineage.sourceId)) {
      errors.push(prefix + "supportingSourceIds repeats the primary sourceId");
    }
    if (lineage.attestedCombinations && !lineage.sourceId) {
      errors.push(prefix + "has attestedCombinations but missing sourceId");
    }
    validateObjectArray(
      lineage.attestedCombinations,
      HERITAGE_COMBINATION_FIELDS,
      prefix + "attestedCombinations",
      errors,
    );
    for (const combination of lineage.attestedCombinations || []) {
      const result = validateHeritageCombination(combination, record.constructId);
      errors.push(...result.errors.map((error) => prefix + error));
    }
    validateObjectArray(
      lineage.disagreements,
      HERITAGE_DISAGREEMENT_FIELDS,
      prefix + "disagreements",
      errors,
    );
    validateObjectArray(
      lineage.unverifiedClaims,
      HERITAGE_UNVERIFIED_CLAIM_FIELDS,
      prefix + "unverifiedClaims",
      errors,
    );
    validateObjectArray(
      lineage.constituents,
      HERITAGE_CONSTITUENT_FIELDS,
      prefix + "constituents",
      errors,
    );
    validateObjectArray(
      lineage.relatedSystems,
      HERITAGE_RELATED_SYSTEM_FIELDS,
      prefix + "relatedSystems",
      errors,
    );
    for (const [index, member] of (lineage.constituents || []).entries()) {
      const memberPrefix = prefix + `constituents[${index}].`;
      validateObjectArray(
        member.aliasWitnesses,
        HERITAGE_ALIAS_WITNESS_FIELDS,
        memberPrefix + "aliasWitnesses",
        errors,
      );
      validateUniqueObjectIds(
        member.aliasWitnesses,
        "alias",
        memberPrefix + "aliasWitnesses ",
        errors,
      );
      const witnessedAliases = new Set(
        (member.aliasWitnesses || []).map((witness) => witness.alias),
      );
      for (const alias of member.aliases || []) {
        if (!witnessedAliases.has(alias)) {
          errors.push(memberPrefix + `alias ${alias} requires witness provenance`);
        }
      }
      for (const alias of witnessedAliases) {
        if (!member.aliases?.includes(alias)) {
          errors.push(memberPrefix + `alias witness ${alias} is not declared in aliases`);
        }
      }
    }
    validateUniqueObjectIds(
      lineage.attestedCombinations,
      "combinationId",
      prefix + "attestedCombinations ",
      errors,
    );
    validateUniqueObjectIds(
      lineage.constituents,
      "constituentId",
      prefix + "constituents ",
      errors,
    );
    validateUniqueObjectIds(
      lineage.relatedSystems,
      "relatedSystemId",
      prefix + "relatedSystems ",
      errors,
    );
    validateUniqueObjectIds(
      lineage.unverifiedClaims,
      "claimId",
      prefix + "unverifiedClaims ",
      errors,
    );
    for (const relatedSystem of lineage.relatedSystems || []) {
      if (relatedSystem.canonicalChineseName
        && record.aliases.includes(relatedSystem.canonicalChineseName)) {
        errors.push(
          prefix + "related system " + relatedSystem.canonicalChineseName
          + " cannot also be a construct alias",
        );
      }
    }
    if (lineage.attestedCombinationsStatus === "NONE_ATTESTED"
      && Array.isArray(lineage.attestedCombinations)
      && lineage.attestedCombinations.length > 0) {
      errors.push(prefix + "NONE_ATTESTED cannot contain attestedCombinations");
    }
    if (lineage.attestedCombinationsStatus === "RECORDED"
      && Array.isArray(lineage.attestedCombinations)
      && lineage.attestedCombinations.length === 0) {
      errors.push(prefix + "RECORDED requires at least one attested combination");
    }

    const validateLineageLocator = (name, statusName) => {
      if (lineage[name] !== null && lineage[statusName] === "NOT_RECORDED") {
        errors.push(prefix + `has ${name} without a recorded ${statusName}`);
      }
      if (lineage[name] === null && lineage[statusName] !== "NOT_RECORDED") {
        errors.push(prefix + `${statusName} ${lineage[statusName]} requires ${name}`);
      }
    };
    validateLineageLocator("sectionLocator", "sectionLocatorStatus");
    validateLineageLocator("folioLocator", "folioLocatorStatus");
    if (lineage.citationStatus === "verified"
      && lineage.sectionLocatorStatus !== "VERIFIED") {
      errors.push(prefix + "verified citation requires sectionLocatorStatus VERIFIED");
    }
    if (lineage.evidenceStrength === "VERIFIED_PRIMARY"
      && lineage.citationStatus !== "verified") {
      errors.push(prefix + "verified primary evidence cannot exceed citationStatus");
    }
    if (lineage.evidenceStrength === "VERIFIED_SECONDARY"
      && !["edition-recorded", "verified"].includes(lineage.citationStatus)) {
      errors.push(prefix + "verified secondary evidence requires a recorded citation");
    }
    if (lineage.citationStatus === "attribution-contradicted"
      && ["VERIFIED_PRIMARY", "VERIFIED_SECONDARY"].includes(lineage.evidenceStrength)) {
      errors.push(prefix + "contradicted attribution cannot carry verified evidence");
    }
    if (["VERIFIED_PRIMARY", "VERIFIED_SECONDARY"].includes(lineage.evidenceStrength)
      && lineage.sectionLocator === null) {
      errors.push(prefix + "verified evidence requires a sectionLocator");
    }
    if (lineage.translationProvenance === "PROJECT_ORIGINAL") {
      if (!hasValue(lineage.translationAgentId)
        || !CONTRIBUTOR_REGISTRY[lineage.translationAgentId]) {
        errors.push(prefix + "project-original translation requires a registered translationAgentId");
      }
    } else if (lineage.translationAgentId !== null
      && lineage.translationAgentId !== undefined) {
      errors.push(prefix + "translationAgentId is only valid for PROJECT_ORIGINAL copy");
    }
    if (lineage.runtimeStatus === "RUNTIME_PROSE"
      && lineage.translationProvenance === "NOT_TRANSLATED_HERITAGE_ONLY") {
      errors.push(prefix + "runtime prose requires translation provenance");
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
    if (lineage.safetyStatus === "prohibited"
      && lineage.prohibitedForUserInference !== true) {
      errors.push(prefix + "prohibited safety status requires prohibitedForUserInference");
    }
  }

  if (record.verificationStatus === "VERIFIED_PRIMARY"
    && !lineageEntries.some(([, lineage]) => lineage?.evidenceStrength === "VERIFIED_PRIMARY")) {
    errors.push("VERIFIED_PRIMARY record requires at least one verified primary lineage");
  }

  return { valid: errors.length === 0, errors };
}
