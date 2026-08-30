/*
 * Product-owned routing for the abstract daily lineage slots.
 *
 * The reading state intentionally keeps only the abstract labels "primary"
 * and "variant". The evidence registry has construct-specific witnesses, so
 * the runtime needs one explicit mapping from the abstract slot to the
 * witness used for the heritage graph. This is a routing decision, not an
 * evidence upgrade: the selected witness keeps its own citation, rights,
 * disagreement and safety metadata all the way to the view model.
 */

export const ABSTRACT_LINEAGE_OVERRIDES = Object.freeze({
  threeSections: Object.freeze({ primary: "taiqing-mianbu-facial" }),
  twelvePalaces: Object.freeze({ primary: "taiqing-yuguan" }),
  fiveMountains: Object.freeze({ primary: "taiqing-siku" }),
  fiveOfficers: Object.freeze({ variant: "renlun-xue" }),
});

/*
 * Evidence `definition` fields are the audit record and may intentionally
 * retain source-language wording. The reading surface is English-only, so
 * every routed lineage also gets a bounded, source-attributed presentation.
 * These sentences describe the historical system; they never turn a source
 * predicate into a measurement or a prediction about the reader.
 */
const RUNTIME_LINEAGE_PRESENTATIONS = Object.freeze({
  threeSections: Object.freeze({
    "taiqing-mianbu-facial": "Taiqing Shenjian's facial section describes three regions — upper, middle and lower — with boundaries from the hairline to the brow, brow to nose root, and nose root or philtrum to cheek. It also relates the regions to heaven, humanity and earth. This is attributed historical material; the camera supplies no evidence about those categories.",
  }),
  twelvePalaces: Object.freeze({
    "taiqing-yuguan": "Taiqing Shenjian records a Twelve Palaces arrangement across the face, including life at the brow centre, wealth at the temples and jaw hollows, and a concluding appearance category. This is an attributed historical mapping; the camera supplies no evidence about those categories.",
  }),
  fiveMountains: Object.freeze({
    "taiqing-siku": "Taiqing Shenjian records Five Mountains across the face: forehead, jaw contour, left and right cheekbones, and nose. It also describes their fullness and orientation, which this camera cannot measure. This is attributed historical material, not a judgment about the reader.",
  }),
  fiveOfficers: Object.freeze({
    "renlun-xue": "Renlun Datong Fu's commentary records Five Officers as an ordered set across the mouth, nose, ear, eye and philtrum, with several titles differing from the Taiqing witness. This is an attributed historical disagreement; the camera supplies no evidence about those offices.",
  }),
});

const RUNTIME_LINEAGE_ATTRIBUTIONS = Object.freeze({
  threeSections: Object.freeze({
    "taiqing-mianbu-facial": "Taiqing Shenjian, Book 5, Facial Section",
  }),
  twelvePalaces: Object.freeze({
    "taiqing-yuguan": "Taiqing Shenjian, Book 1, Twelve Palaces Section",
  }),
  fiveMountains: Object.freeze({
    "taiqing-siku": "Taiqing Shenjian, Book 2, Five Mountains Section",
  }),
  fiveOfficers: Object.freeze({
    "renlun-xue": "Renlun Datong Fu, Xue Yannian commentary, Book 1, Five Officers Section",
  }),
});

const RUNTIME_LINEAGE_NOTES = Object.freeze({
  threeSections: Object.freeze({
    "taiqing-mianbu-facial": "The facial witness is kept separate from the body-proportion witness and from the received equal-thirds maxim.",
  }),
  twelvePalaces: Object.freeze({
    "taiqing-yuguan": "This is a parallel historical assignment; the open palace-mapping disagreement remains visible in the expanded source view.",
  }),
  fiveMountains: Object.freeze({
    "taiqing-siku": "The source's fullness and orientation language is retained as historical context; the lower-face mapping remains contested across witnesses.",
  }),
  fiveOfficers: Object.freeze({
    "renlun-xue": "The alternate witness is shown to preserve a documented title and membership disagreement; it is not a judgment about the reader.",
  }),
});

export function runtimeLineageFor(constructId, sourceLineage, registry) {
  const record = registry?.[constructId];
  if (!record?.lineages) return null;
  if (record.lineages[sourceLineage]?.availability === "abstention") return sourceLineage;
  const routed = ABSTRACT_LINEAGE_OVERRIDES[constructId]?.[sourceLineage]
    ?? sourceLineage;
  if (record.lineages[routed]) return routed;
  if (record.lineages[sourceLineage]) return sourceLineage;
  return record.lineages.primary ? "primary" : Object.keys(record.lineages).sort()[0] || null;
}

export function runtimePresentationFor(constructId, sourceLineage, registry) {
  const lineageId = runtimeLineageFor(constructId, sourceLineage, registry);
  return RUNTIME_LINEAGE_PRESENTATIONS[constructId]?.[lineageId] || null;
}

export function runtimeAttributionFor(constructId, sourceLineage, registry) {
  const lineageId = runtimeLineageFor(constructId, sourceLineage, registry);
  return RUNTIME_LINEAGE_ATTRIBUTIONS[constructId]?.[lineageId] || null;
}

export function runtimeNoteFor(constructId, sourceLineage, registry) {
  const lineageId = runtimeLineageFor(constructId, sourceLineage, registry);
  return RUNTIME_LINEAGE_NOTES[constructId]?.[lineageId] || null;
}
