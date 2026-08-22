import { HERITAGE } from "../qise/reflection-corpus.js";
import { validateHeritageRecord } from "./validator.js";

/**
 * The canonical registry of heritage records.
 */
export const HERITAGE_REGISTRY = {};

// Populate and validate
Object.entries(HERITAGE).forEach(([constructId, data]) => {
  const record = {
    constructId,
    canonicalChineseName: "pending-canonical-name",
    aliases: [],
    lineages: Object.entries(data).reduce((acc, [lineageId, lineageData]) => {
      acc[lineageId] = {
        lineageId,
        definition: lineageData.text || "",
        source: lineageData.source || "pending-source",
        note: lineageData.note || "",
        availability: "available",
        safetyStatus: "safe",
        disagreements: lineageData.disagreements || []
      };
      return acc;
    }, {})
  };

  const validation = validateHeritageRecord(record);
  if (validation.valid) {
    HERITAGE_REGISTRY[constructId] = record;
  } else {
    throw new Error(`Heritage record ${constructId} is invalid: ${validation.errors.join(", ")}`);
  }
});
