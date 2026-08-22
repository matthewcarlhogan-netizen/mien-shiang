/**
 * Validates a heritage record against the canonical schema and business rules.
 * @param {object} record
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateHeritageRecord(record) {
  const errors = [];

  if (!record.constructId) errors.push("Missing constructId");
  if (!record.canonicalChineseName) errors.push("Missing canonicalChineseName");
  
  if (!record.lineages || typeof record.lineages !== 'object') {
    errors.push("Missing or invalid lineages");
  } else {
    for (const [key, lineage] of Object.entries(record.lineages)) {
      if (!lineage.lineageId) errors.push(`Lineage ${key} missing lineageId`);
      if (!lineage.definition) errors.push(`Lineage ${key} missing definition`);
      if (!lineage.source) errors.push(`Lineage ${key} missing source`);
      
      // Enforce availability and safety fields
      if (!lineage.availability) {
        errors.push(`Lineage ${key} missing availability`);
      } else if (!["available", "abstention"].includes(lineage.availability)) {
        errors.push(`Lineage ${key} has invalid availability: ${lineage.availability}`);
      }
      
      if (lineage.availability === "abstention" && !lineage.abstentionReason) {
        errors.push(`Lineage ${key} abstention requires abstentionReason`);
      }
      
      if (!lineage.safetyStatus) {
        errors.push(`Lineage ${key} missing safetyStatus`);
      } else if (!["safe", "prohibited"].includes(lineage.safetyStatus)) {
        errors.push(`Lineage ${key} has invalid safetyStatus: ${lineage.safetyStatus}`);
      }

      if (lineage.attestedCombinations && !lineage.source) {
        errors.push(`Lineage ${key} has attestedCombinations but missing source`);
      }

      if (lineage.disagreements && !Array.isArray(lineage.disagreements)) {
        errors.push(`Lineage ${key} has invalid disagreements format`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
