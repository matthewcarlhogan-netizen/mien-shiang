import {
  HERITAGE_ALIAS_WITNESS_FIELDS,
  HERITAGE_CONSTITUENT_FIELDS,
  HERITAGE_DISAGREEMENT_FIELDS,
  HERITAGE_FIELD_FINDING_FIELDS,
  HERITAGE_FIELD_MANIFEST,
  HERITAGE_RELATED_SYSTEM_FIELDS,
  HERITAGE_SOURCE_FIELDS,
  HERITAGE_UNVERIFIED_CLAIM_FIELDS,
  HERITAGE_CONNECTOR_FIELDS,
  HERITAGE_NEGATIVE_RULE_FIELDS,
  HERITAGE_COMPOSITION_POLICY_FIELDS,
  HERITAGE_CONCEPT_FIELDS,
  HERITAGE_CONSTRUCT_IDS,
} from "./schema.js";
import { HERITAGE_CONCEPT_REGISTRY } from "./concepts.js";
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
  if (source.citationStatus === "verified"
    && source.bibliographicIdentityStatus === "UNRESOLVED") {
    errors.push("Verified citation cannot have an unresolved bibliographic identity");
  }
  if (["ACQUIRED", "VERIFIED"].includes(source.independentWitnessStatus)
    && !source.repositoryCommit) {
    errors.push(
      "Acquired or verified independent witness requires a pinned repositoryCommit"
      + " — a project-owned acquisition, not a previously inspected web/raw source",
    );
  }
  if (source.repositoryCommit !== null
    && !/^[a-f0-9]{7,40}$/u.test(source.repositoryCommit)) {
    errors.push("Source repositoryCommit must be a lowercase hexadecimal git revision");
  }
  if (source.repositoryCommit !== null && source.sha256 !== null
    && source.repositoryCommit === source.sha256) {
    errors.push("Source repositoryCommit is a git revision and cannot double as the byte sha256");
  }
  if (source.folioLocatorKind === "WYG_PB") {
    if (source.folioLocator === null || !/^<pb:[A-Za-z0-9_]+>$/u.test(source.folioLocator)) {
      errors.push("Source folioLocatorKind WYG_PB requires a folioLocator matching <pb:...>");
    }
  } else if (source.folioLocator !== null && !source.folioLocatorKind) {
    errors.push("Source folioLocator requires a recorded folioLocatorKind");
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

/*
 * A deliberately tiny condition AST: ALL/ANY/NOT/PRESENT/ABSENT/STATE only.
 * No BEFORE — SEQUENTIAL_RELATION owns ordered semantics. No JavaScript
 * expressions, property paths, arithmetic or generic expression language.
 */
const CONDITION_NODE_TYPES = Object.freeze(["ALL", "ANY", "NOT", "PRESENT", "ABSENT", "STATE"]);
export const CONDITION_MAX_DEPTH = 4;
export const CONDITION_MAX_OPERANDS = 8;

export function validateConditionExpression(expr, historicalStates = [], depth = 1) {
  const errors = [];
  if (!expr || typeof expr !== "object" || Array.isArray(expr)) {
    return { valid: false, errors: ["Expression node must be an object"] };
  }
  if (!CONDITION_NODE_TYPES.includes(expr.type)) {
    return { valid: false, errors: ["Expression node has invalid type " + expr.type] };
  }
  if (depth > CONDITION_MAX_DEPTH) {
    return { valid: false, errors: ["Expression tree exceeds max depth " + CONDITION_MAX_DEPTH] };
  }

  if (expr.type === "ALL" || expr.type === "ANY") {
    if (!Array.isArray(expr.operands) || expr.operands.length === 0) {
      errors.push(expr.type + " requires at least one operand");
    } else {
      if (expr.operands.length > CONDITION_MAX_OPERANDS) {
        errors.push(expr.type + " exceeds max operands " + CONDITION_MAX_OPERANDS);
      }
      for (const operand of expr.operands) {
        errors.push(...validateConditionExpression(operand, historicalStates, depth + 1).errors);
      }
    }
  } else if (expr.type === "NOT") {
    if (!expr.operand || typeof expr.operand !== "object") {
      errors.push("NOT requires an operand");
    } else {
      errors.push(...validateConditionExpression(expr.operand, historicalStates, depth + 1).errors);
    }
  } else if (expr.type === "PRESENT" || expr.type === "ABSENT") {
    if (typeof expr.participantId !== "string" || expr.participantId.length === 0) {
      errors.push(expr.type + " requires a participantId");
    }
  } else if (expr.type === "STATE") {
    if (typeof expr.participantId !== "string" || expr.participantId.length === 0
      || typeof expr.stateId !== "string" || expr.stateId.length === 0) {
      errors.push("STATE requires participantId and stateId");
    } else if (!historicalStates.some((state) =>
      state?.stateId === expr.stateId && state?.participantId === expr.participantId)) {
      errors.push("STATE references undeclared historicalState " + expr.stateId);
    }
  }
  return { valid: errors.length === 0, errors };
}

const DIRECTION_KIND_BY_RELATIONSHIP_TYPE = Object.freeze({
  CONJUNCTIVE_CONFIGURATION: ["UNDIRECTED"],
  REQUIRES: ["DIRECTED"],
  MODIFIES: ["DIRECTED"],
  SEQUENTIAL_RELATION: ["ORDERED"],
  COLLECTIVE_RULE: ["UNDIRECTED"],
  // CORRESPONDS_TO is intentionally absent: UNDIRECTED, or explicitly
  // DIRECTED where source semantics require it — both are legal.
});

const participantRefId = (participant) => {
  if (participant.nodeType === "CONSTRUCT") return participant.constructId ?? participant.participantId;
  if (participant.nodeType === "CONSTITUENT") return participant.constituentId;
  if (participant.nodeType === "HERITAGE_CONCEPT") return participant.conceptId ?? participant.participantId;
  if (participant.nodeType === "RELATED_SYSTEM") return participant.relatedSystemId ?? participant.participantId;
  return undefined;
};

/*
 * Structural bans mirroring HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY. These
 * are checked directly against connector shape rather than by interpreting
 * the negative-rule registry generically, because a generic rule-interpreter
 * over free-text fromRef/toRef names would be unverifiable in itself; a
 * fixed, named check per rule is the one that can actually be tested.
 */
function checkNegativeRelationshipInvariants(connector, errors) {
  const participants = Array.isArray(connector.participants) ? connector.participants : [];
  const hasConstruct = (id) => participants.some((p) => p.nodeType === "CONSTRUCT"
    && (p.constructId ?? p.participantId) === id);
  const hasConcept = (id) => participants.some((p) => p.nodeType === "HERITAGE_CONCEPT"
    && (p.conceptId ?? p.participantId) === id);
  const hasRelatedSystem = (id) => participants.some((p) => p.nodeType === "RELATED_SYSTEM"
    && (p.relatedSystemId ?? p.participantId) === id);

  if (hasRelatedSystem("zwds") && hasConstruct("twelvePalaces")) {
    errors.push("no-zwds-import: Zi Wei Dou Shu network semantics cannot be imported into facial Twelve Palaces");
  }
  if (hasConstruct("fiveElements") && hasRelatedSystem("five-phases")) {
    errors.push("no-five-forms-five-phases-conflation: Five Forms and Five Phases cannot be linked as equivalent");
  }
  if (hasConcept("heritageQiSe") && hasConstruct("fiveElements")) {
    errors.push("no-qise-to-form-classification: measured Qi Se cannot classify Five Forms");
  }
  if (hasConstruct("threeSections") && hasConstruct("fiveElements")) {
    errors.push("no-three-sections-five-forms-promotion: textual adjacency cannot be promoted into an explicit historical relationship");
  }
  for (const state of connector.historicalStates || []) {
    const owner = participants.find((p) => p.participantId === state?.participantId);
    if (owner && participantRefId(owner) === "shen" && state.measurementAvailability !== "UNMEASURABLE") {
      errors.push("shen-unmeasurable: Shen cannot acquire a measurement binding");
    }
  }
}

export function validateHeritageConnector(connector, context = {}) {
  const errors = [];
  if (!connector || typeof connector !== "object" || Array.isArray(connector)) {
    return { valid: false, errors: ["Connector must be an object"] };
  }
  if (connector.policyType !== undefined) {
    return { valid: false, errors: ["An editorial composition policy cannot enter the connector registry"] };
  }

  const {
    constructIds = HERITAGE_CONSTRUCT_IDS,
    conceptRegistry = HERITAGE_CONCEPT_REGISTRY,
    relatedSystemIds = [],
    connectorRegistry = {},
    disagreementRegistry = {},
    sourceRegistry = SOURCE_REGISTRY,
  } = context;

  validateFields(connector, HERITAGE_CONNECTOR_FIELDS, "Connector ", errors);

  // --- relationshipDirection: a single object, not an array. ---
  const direction = connector.relationshipDirection;
  if (!direction || typeof direction !== "object" || Array.isArray(direction)) {
    errors.push("Connector relationshipDirection must be an object");
  } else if (!["UNDIRECTED", "DIRECTED", "ORDERED"].includes(direction.kind)) {
    errors.push("Connector relationshipDirection has invalid kind " + direction.kind);
  } else {
    const allowedKinds = DIRECTION_KIND_BY_RELATIONSHIP_TYPE[connector.relationshipType];
    if (allowedKinds && !allowedKinds.includes(direction.kind)) {
      errors.push(
        "Connector relationshipType " + connector.relationshipType
        + " requires direction " + allowedKinds.join("/") + ", not " + direction.kind,
      );
    }
    if (direction.kind === "DIRECTED") {
      if (!Array.isArray(direction.from) || direction.from.length === 0
        || !Array.isArray(direction.to) || direction.to.length === 0) {
        errors.push("DIRECTED relationshipDirection requires non-empty from and to");
      } else if (direction.from.some((id) => direction.to.includes(id))) {
        errors.push("Connector has an invalid self-edge: a participant is on both sides of a DIRECTED relationship");
      }
    }
    if (direction.kind === "ORDERED") {
      if (!Array.isArray(direction.sequence) || direction.sequence.length < 2) {
        errors.push("ORDERED relationshipDirection requires a sequence of at least two participants");
      } else if (new Set(direction.sequence).size !== direction.sequence.length) {
        errors.push("Connector has an invalid self-edge: ORDERED sequence repeats a participant");
      }
    }
  }

  // --- collectiveMode: required exactly for COLLECTIVE_RULE. ---
  if (connector.relationshipType === "COLLECTIVE_RULE") {
    if (!connector.collectiveMode) {
      errors.push("COLLECTIVE_RULE requires collectiveMode");
    }
  } else if (connector.collectiveMode) {
    errors.push("collectiveMode is only valid on COLLECTIVE_RULE, not " + connector.relationshipType);
  }

  // --- participants ---
  const participants = Array.isArray(connector.participants) ? connector.participants : [];
  if (participants.length === 0) {
    errors.push("Connector requires at least one participant");
  }
  validateUniqueObjectIds(participants, "participantId", "Connector participants ", errors);
  for (const [index, participant] of participants.entries()) {
    const p = "Connector participants[" + index + "] ";
    if (!participant || typeof participant !== "object") {
      errors.push(p + "must be an object");
      continue;
    }
    if (!["CONSTRUCT", "CONSTITUENT", "HERITAGE_CONCEPT", "RELATED_SYSTEM"].includes(participant.nodeType)) {
      errors.push(p + "has invalid nodeType " + participant.nodeType);
      continue;
    }
    if (!["NODE", "ALL_MEMBERS"].includes(participant.memberScope)) {
      errors.push(p + "has invalid memberScope " + participant.memberScope);
    }
    const refId = participantRefId(participant);
    if (participant.nodeType === "CONSTRUCT" && !constructIds.includes(refId)) {
      errors.push(p + "references unknown construct " + refId);
    }
    if (participant.nodeType === "HERITAGE_CONCEPT" && !conceptRegistry[refId]) {
      errors.push(p + "references unknown heritage concept " + refId);
    }
    if (participant.nodeType === "RELATED_SYSTEM" && !relatedSystemIds.includes(refId)) {
      errors.push(p + "references unknown related system " + refId);
    }
    if (participant.nodeType === "CONSTITUENT" && !hasValue(participant.constituentId)) {
      errors.push(p + "requires a constituentId");
    }
  }
  const participantIds = new Set(participants.map((p) => p?.participantId).filter(hasValue));
  if (direction?.kind === "DIRECTED") {
    for (const id of [...(direction.from || []), ...(direction.to || [])]) {
      if (!participantIds.has(id)) errors.push("Connector relationshipDirection references unknown participant " + id);
    }
  }
  if (direction?.kind === "ORDERED") {
    for (const id of direction.sequence || []) {
      if (!participantIds.has(id)) errors.push("Connector relationshipDirection references unknown participant " + id);
    }
  }

  // --- provenance ---
  if (connector.sourceId && !sourceRegistry[connector.sourceId]) {
    errors.push("Connector sourceId references unknown source " + connector.sourceId);
  }
  const source = sourceRegistry[connector.sourceId];
  validateSourceIds(connector.supportingSourceIds, "Connector supportingSourceIds ", errors);
  validateUniqueValues(connector.supportingSourceIds, "Connector supportingSourceIds ", errors);
  if (connector.supportingSourceIds?.includes(connector.sourceId)) {
    errors.push("Connector supportingSourceIds repeats the primary sourceId");
  }
  if (connector.evidenceStrength === "VERIFIED_PRIMARY" && source?.citationStatus !== "verified") {
    errors.push("Connector verified primary evidence cannot exceed source citationStatus");
  }
  if (connector.evidenceStrength === "VERIFIED_SECONDARY"
    && !["edition-recorded", "verified"].includes(source?.citationStatus)) {
    errors.push("Connector verified secondary evidence requires a recorded source");
  }
  if (source?.citationStatus === "attribution-contradicted"
    && ["VERIFIED_PRIMARY", "VERIFIED_SECONDARY"].includes(connector.evidenceStrength)) {
    errors.push("Connector cannot carry verified evidence from a contradicted attribution source");
  }
  if (connector.evidenceStrength === "VERIFIED_PRIMARY" && connector.sectionLocatorStatus !== "VERIFIED") {
    errors.push("Connector verified primary evidence requires a verified section locator (verified citation without required locator)");
  }
  const checkConnectorLocator = (name, statusName) => {
    if (connector[name] !== null && connector[name] !== undefined
      && connector[statusName] === "NOT_RECORDED") {
      errors.push("Connector has " + name + " without a recorded " + statusName);
    }
    if ((connector[name] === null || connector[name] === undefined)
      && connector[statusName] && connector[statusName] !== "NOT_RECORDED") {
      errors.push("Connector " + statusName + " " + connector[statusName] + " requires " + name);
    }
  };
  checkConnectorLocator("sectionLocator", "sectionLocatorStatus");
  checkConnectorLocator("folioLocator", "folioLocatorStatus");
  if (connector.folioLocatorKind === "WYG_PB") {
    if (!connector.folioLocator || !/^<pb:[A-Za-z0-9_]+>$/u.test(connector.folioLocator)) {
      errors.push("Connector folioLocatorKind WYG_PB requires a folioLocator matching <pb:...>");
    }
  }

  // --- historicalStates + condition AST ---
  const historicalStates = Array.isArray(connector.historicalStates) ? connector.historicalStates : [];
  validateUniqueObjectIds(historicalStates, "stateId", "Connector historicalStates ", errors);
  for (const state of historicalStates) {
    if (state && !participantIds.has(state.participantId)) {
      errors.push("Connector historicalStates references unknown participant " + state.participantId);
    }
  }
  if (connector.conditionExpression !== undefined && connector.conditionExpression !== null) {
    const conditionResult = validateConditionExpression(connector.conditionExpression, historicalStates, 1);
    errors.push(...conditionResult.errors);
  }

  // --- cross-references ---
  for (const disagreementId of connector.disagreementIds || []) {
    if (!disagreementRegistry[disagreementId]) {
      errors.push("Connector disagreementIds references unknown disagreement " + disagreementId);
    }
  }
  for (const alternateId of connector.alternateConnectorIds || []) {
    if (alternateId === connector.connectorId) {
      errors.push("Connector alternateConnectorIds cannot reference itself");
    } else if (!connectorRegistry[alternateId]) {
      errors.push("Connector alternateConnectorIds references unknown connector " + alternateId);
    }
  }

  checkNegativeRelationshipInvariants(connector, errors);

  return { valid: errors.length === 0, errors };
}

export function validateHeritageDisagreementRecord(disagreement, context = {}) {
  const errors = [];
  if (!disagreement || typeof disagreement !== "object" || Array.isArray(disagreement)) {
    return { valid: false, errors: ["Disagreement must be an object"] };
  }
  const {
    constructIds = HERITAGE_CONSTRUCT_IDS,
    connectorRegistry = {},
    sourceRegistry = SOURCE_REGISTRY,
  } = context;

  validateFields(disagreement, HERITAGE_DISAGREEMENT_FIELDS, "Disagreement ", errors);

  const target = disagreement.target;
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    errors.push("Disagreement target must be an object");
  } else {
    if (!["CONSTRUCT", "LINEAGE", "CONSTITUENT", "CONNECTOR", "PREDICATE", "TEXTUAL_LAYER", "SOURCE"].includes(target.targetType)) {
      errors.push("Disagreement target has invalid targetType " + target.targetType);
    }
    if (!hasValue(target.targetRef)) {
      errors.push("Disagreement target is missing targetRef (missing disagreement target)");
    } else if (target.targetType === "CONSTRUCT" && !constructIds.includes(target.targetRef)) {
      errors.push("Disagreement target references unknown construct " + target.targetRef + " (missing disagreement target)");
    } else if (target.targetType === "CONNECTOR" && !connectorRegistry[target.targetRef]) {
      errors.push("Disagreement target references unknown connector " + target.targetRef + " (missing disagreement target)");
    } else if (target.targetType === "SOURCE" && !sourceRegistry[target.targetRef]) {
      errors.push("Disagreement target references unknown source " + target.targetRef + " (missing disagreement target)");
    }
  }

  if (!Array.isArray(disagreement.positions) || disagreement.positions.length === 0) {
    errors.push("Disagreement requires at least one position");
  } else {
    validateUniqueObjectIds(disagreement.positions, "positionId", "Disagreement positions ", errors);
    for (const position of disagreement.positions) {
      if (position?.sourceId && !sourceRegistry[position.sourceId]) {
        errors.push("Disagreement position references unknown source " + position.sourceId);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateHeritageNegativeRule(rule) {
  const errors = [];
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    return { valid: false, errors: ["Negative rule must be an object"] };
  }
  validateFields(rule, HERITAGE_NEGATIVE_RULE_FIELDS, "Negative rule ", errors);
  validateSourceIds(rule.sourceIds, "Negative rule sourceIds ", errors);

  if (rule.evidenceKind === "PRODUCT_GOVERNANCE_INVARIANT") {
    if (Array.isArray(rule.sourceIds) && rule.sourceIds.length > 0) {
      errors.push("Product/governance invariant cannot cite a historical sourceId");
    }
    if (rule.evidenceStrength !== "ABSTAINED") {
      errors.push("Product/governance invariant cannot claim a historical evidenceStrength other than ABSTAINED");
    }
  } else if (rule.evidenceKind === "HISTORICAL_NEGATIVE_FINDING") {
    if (!Array.isArray(rule.sourceIds) || rule.sourceIds.length === 0) {
      errors.push("Historical negative finding requires at least one sourceId");
    }
    if (rule.evidenceStrength === "VERIFIED_PRIMARY"
      && rule.sourceIds?.some((id) => SOURCE_REGISTRY[id]?.citationStatus !== "verified")) {
      errors.push("Verified primary negative finding requires verified sources");
    }
    if (rule.evidenceStrength === "VERIFIED_SECONDARY"
      && rule.sourceIds?.some((id) => !["edition-recorded", "verified"].includes(SOURCE_REGISTRY[id]?.citationStatus))) {
      errors.push("Verified secondary negative finding requires recorded sources");
    }
  }
  if (rule.status === "ACTIVE" && hasValue(rule.supersededBy)) {
    errors.push("Active negative rule cannot carry a supersededBy reference");
  }
  if (rule.status === "SUPERSEDED" && !hasValue(rule.supersededBy)) {
    errors.push("Superseded negative rule requires supersededBy");
  }
  return { valid: errors.length === 0, errors };
}

export function validateHeritageCompositionPolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
    return { valid: false, errors: ["Composition policy must be an object"] };
  }
  validateFields(policy, HERITAGE_COMPOSITION_POLICY_FIELDS, "Composition policy ", errors);
  if (policy.historicalRelationshipAsserted !== false) {
    errors.push("Editorial juxtaposition must set historicalRelationshipAsserted: false");
  }
  if (policy.requiresSeparateAttribution !== true) {
    errors.push("Editorial juxtaposition must set requiresSeparateAttribution: true");
  }
  if (!(Number.isInteger(policy.maxItems) && policy.maxItems > 0)) {
    errors.push("Composition policy maxItems must be a positive integer");
  }
  return { valid: errors.length === 0, errors };
}

export function validateHeritageConcept(concept) {
  const errors = [];
  if (!concept || typeof concept !== "object" || Array.isArray(concept)) {
    return { valid: false, errors: ["Heritage concept must be an object"] };
  }
  validateFields(concept, HERITAGE_CONCEPT_FIELDS, "Heritage concept ", errors);
  if (concept.conceptId === "shen") {
    if (concept.measurementAvailability !== "UNMEASURABLE") {
      errors.push("shen concept must stay measurementAvailability UNMEASURABLE (measurable Shen)");
    }
    if (concept.modernMeasurementBinding !== null) {
      errors.push("shen concept cannot carry a modernMeasurementBinding");
    }
  }
  if (concept.conceptId === "heritageQiSe" && concept.modernMeasurementBinding !== null) {
    errors.push("heritageQiSe concept cannot bind to the modern Qi Se measurement pipeline (modern Qi Se binding to heritageQiSe)");
  }
  return { valid: errors.length === 0, errors };
}
