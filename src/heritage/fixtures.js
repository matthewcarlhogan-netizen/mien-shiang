import { HERITAGE } from "../qise/reflection-corpus.js";

/**
 * Fixture data derived from the current HERITAGE structure in reflection-corpus.js.
 */
export const heritageFixtures = Object.entries(HERITAGE).map(([constructId, lineages]) => {
  return {
    constructId,
    // Placeholder as Chinese names are not explicitly defined in the current structure
    canonicalChineseName: "pending-canonical-name",
    aliases: [],
    lineages: Object.entries(lineages).map(([lineageId, data]) => {
      return {
        lineageId,
        definition: data.text,
        source: data.source,
        note: data.note,
        disagreements: data.disagreements || []
      };
    }).reduce((acc, lineage) => {
      acc[lineage.lineageId] = lineage;
      return acc;
    }, {})
  };
});
