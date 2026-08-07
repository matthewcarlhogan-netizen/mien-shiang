/*
 * MODULE A — Five Elements typing (五行).
 *
 * Consumes the face shape from geometry.js. Emits attributed tradition and
 * nothing else: no trait is asserted of the reader, and every mapping names
 * the tradition it comes from.
 *
 * ── WHY EVERY SHAPE CARRIES A DISAGREEMENT NOTE ────────────────────────────
 * Because the sources genuinely disagree, and more here than anywhere else in
 * the system. The square face is read as Earth in many Mian Xiang texts and as
 * Metal in others; the diamond is not a classical category at all; "oval" is a
 * modern styling word that classical Chinese face reading does not use.
 *
 * Picking one silently would present a contested reading as settled, which is
 * the same failure as reporting an unmeasured value as zero. So `sourcesDiffer`
 * is REQUIRED on every mapping and the UI renders it beside the reading rather
 * than in a footnote.
 */

/** The five types. Readings are of the TYPE, never of the reader. */
export const ELEMENTS = {
  wood: {
    hanzi: "木",
    name: "Wood",
    reading:
      "In Mian Xiang the Wood type is read through the upright and the long — trees rather than stones. " +
      "The classical texts associate it with people who plan in seasons rather than in days, who would " +
      "rather grow something slowly than force it, and who feel the strain most when they are made to rush.",
  },
  fire: {
    hanzi: "火",
    name: "Fire",
    reading:
      "Classical Chinese face reading gives Fire the tapering face — broad above and narrowing below, " +
      "like a flame. The texts associate it with quickness of feeling and of thought: warmth that arrives " +
      "fast, interest that catches easily, and a preference for beginnings over middles.",
  },
  earth: {
    hanzi: "土",
    name: "Earth",
    reading:
      "In Mian Xiang, Earth is read through breadth and squareness — ground rather than weather. The " +
      "classical association is with steadiness and with being relied upon: the person others bring " +
      "things to, who would rather be dependable than dazzling.",
  },
  metal: {
    hanzi: "金",
    name: "Metal",
    reading:
      "In Mian Xiang the Metal type is read through clear edges and defined structure. The texts associate " +
      "it with precision and with a liking for order — doing a thing properly over doing it quickly, and a " +
      "reserve that the classical writers read as discipline rather than coldness.",
  },
  water: {
    hanzi: "水",
    name: "Water",
    reading:
      "Classical Chinese face reading gives Water the full and rounded face — pooling rather than cutting. " +
      "The texts associate it with adaptability and with depth held quietly: taking the shape of what one " +
      "is in, and thinking for longer than one speaks.",
  },
};

/**
 * Face shape to element. `primary` is what this build reads; `alternates` are
 * the readings other texts give the same shape, and they are shown, not hidden.
 */
export const SHAPE_TO_ELEMENT = {
  oblong: {
    primary: "wood",
    alternates: ["earth"],
    sourcesDiffer:
      "Sources differ on this — most Mian Xiang texts read a long face as Wood, but some reserve Wood for " +
      "a face that is long and narrow together, and read a long face carrying breadth as Earth instead.",
  },
  heart: {
    primary: "fire",
    alternates: ["wood"],
    sourcesDiffer:
      "Sources differ on this — the tapering face is read as Fire in most classical texts, though some " +
      "schools call it Fire only when the chin is markedly pointed, and otherwise assign it to Wood.",
  },
  square: {
    primary: "earth",
    alternates: ["metal"],
    sourcesDiffer:
      "Sources differ on this more than anywhere else in the system — a square face is read as Earth in " +
      "many Mian Xiang texts and as Metal in others. The distinction the texts draw is between breadth " +
      "that reads as ground and squareness that reads as edge, and they do not agree on where the line falls.",
  },
  round: {
    primary: "water",
    alternates: ["earth"],
    sourcesDiffer:
      "Sources differ on this — a full round face is read as Water in most texts, while some read " +
      "pronounced roundness carrying a heavy lower face as Earth.",
  },
  diamond: {
    primary: "metal",
    alternates: ["fire"],
    sourcesDiffer:
      "Sources differ on this — the diamond face is not a classical category at all. Texts that recognise " +
      "it read it as Metal for its angles or as Fire for its narrow chin, and others split it between the " +
      "two depending on which feature dominates.",
  },
  oval: {
    primary: "wood",
    alternates: ["water"],
    sourcesDiffer:
      "Sources differ on this — 'oval' is a modern styling category rather than a classical one. Mian " +
      "Xiang has no oval type, and texts addressing a balanced face of this kind read it as Wood or as " +
      "Water depending on the fullness of the lower face.",
  },
};

/**
 * @param {object} geometry `geometryReport()` output
 * @returns Module A reading, or a refusal when the shape is not trustworthy
 */
export function readFiveElements(geometry) {
  const shape = geometry?.shape?.shape;
  const mapping = SHAPE_TO_ELEMENT[shape];
  if (!mapping) return null;

  // The shape is derived from widths, and widths foreshorten when the head is
  // turned. Rather than type a face from a measurement that is known to be off,
  // say so — the same refusal the colorimetry layer makes on unmeasurable colour.
  if (!geometry.shapeReliable) {
    return {
      available: false,
      why: "headTurned",
      note:
        "The head is turned far enough in this photo that the face proportions are foreshortened, so " +
        "the Five Elements typing isn't offered for it. A photo taken square to the camera will read cleanly.",
    };
  }

  const primary = ELEMENTS[mapping.primary];
  return {
    available: true,
    shape,
    element: mapping.primary,
    hanzi: primary.hanzi,
    name: primary.name,
    reading: primary.reading,
    /** Named, not hidden. Instruction of the tradition, not of this build. */
    alternates: mapping.alternates.map((k) => ({
      element: k, name: ELEMENTS[k].name, hanzi: ELEMENTS[k].hanzi,
    })),
    sourcesDiffer: mapping.sourcesDiffer,
    /** Oval is geometry's residual class, so the typing built on it is the
     *  least anchored of the six. Surfaced rather than smoothed over. */
    residualShape: Boolean(geometry.shape.residual),
  };
}
