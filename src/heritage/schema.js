/**
 * Canonical Heritage Library Schema Definition
 * Represents the structure of a heritage construct record.
 */
export const HeritageRecordSchema = {
  type: "object",
  required: [
    "constructId",
    "canonicalChineseName",
    "lineages"
  ],
  properties: {
    constructId: { type: "string" },
    canonicalChineseName: { type: "string" },
    aliases: { type: "array", items: { type: "string" } },
    lineages: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["lineageId", "definition", "source"],
        properties: {
          lineageId: { type: "string" },
          definition: { type: "string" },
          source: { type: "string" },
          note: { type: "string" },
          availability: { type: "string", enum: ["available", "abstention"] },
          abstentionReason: { type: "string" },
          safetyStatus: { type: "string", enum: ["safe", "prohibited"] },
          attestedCombinations: { type: "array", items: { type: "string" } },
          translationProvenance: { type: "string" },
          disagreements: { type: "array", items: { type: "string" } }
        }
      }
    }
,
    // ... (expanded fields for the whole record)
  }
};
