/*
 * Privacy boundary between the temporary 478-point map and a saved reading.
 * Only the closed, derived Module A shape below may cross into storage.
 */

import { geometryReport } from "../geometry.js";
import { rawScalars, shadesOfGray } from "../engine.js";
import { composeReading } from "../reading/index.js";
import { extractRegions, eraseExtractedRegions } from "../region-extractor.js";

const scalar = (value) => (Number.isFinite(value) ? value : null);

const projectFiveElements = (value) => value ? {
  available: value.available === true,
  why: value.why ?? null,
  note: value.note ?? null,
  shape: value.shape ?? null,
  element: value.element ?? null,
  hanzi: value.hanzi ?? null,
  name: value.name ?? null,
  reading: value.reading ?? null,
  alternates: (Array.isArray(value.alternates) ? value.alternates : []).map((item) => ({
    element: item?.element ?? null,
    name: item?.name ?? null,
    hanzi: item?.hanzi ?? null,
  })),
  sourcesDiffer: value.sourcesDiffer ?? null,
  residualShape: value.residualShape === true,
} : null;

const projectThreeCourts = (value) => value ? {
  available: value.available === true,
  balanced: value.balanced === true,
  fractions: {
    upper: scalar(value.fractions?.upper),
    middle: scalar(value.fractions?.middle),
    lower: scalar(value.fractions?.lower),
  },
  dominant: value.dominant ?? null,
  court: value.court ? {
    hanzi: value.court.hanzi ?? null,
    name: value.court.name ?? null,
    span: value.court.span ?? null,
    reading: value.court.reading ?? null,
  } : null,
  reading: value.reading ?? null,
  sourcesDiffer: value.sourcesDiffer ?? null,
  measurementCaveat: value.measurementCaveat ?? null,
  dominanceMargin: scalar(value.dominanceMargin),
} : null;

const projectPalaces = (value) => value ? {
  measuredCount: Number.isInteger(value.measuredCount) ? value.measuredCount : 0,
  supportedCount: Number.isInteger(value.supportedCount) ? value.supportedCount : 0,
  totalCount: Number.isInteger(value.totalCount) ? value.totalCount : 12,
  sourcesDiffer: value.sourcesDiffer ?? null,
  palaces: (Array.isArray(value.palaces) ? value.palaces : []).map((palace) => ({
    key: palace?.key ?? null,
    hanzi: palace?.hanzi ?? null,
    name: palace?.name ?? null,
    location: palace?.location ?? null,
    supported: palace?.supported === true,
    measured: palace?.measured === true,
    tone: palace?.tone ?? null,
    toneGloss: palace?.toneGloss ?? null,
    reading: palace?.reading ?? null,
    translationNote: palace?.translationNote ?? null,
    notMeasuredNote: palace?.notMeasuredNote ?? null,
  })),
} : null;

const projectHarmony = (value) => value ? {
  module: "A",
  value: scalar(value.value),
  withoutSurface: scalar(value.withoutSurface),
  basis: value.basis ?? null,
  surface: value.surface ? {
    value: scalar(value.surface.value),
    zones: Number.isInteger(value.surface.zones) ? value.surface.zones : 0,
  } : null,
  components: (Array.isArray(value.components) ? value.components : []).map((component) => ({
    key: component?.key ?? null,
    value: scalar(component?.value),
    weight: scalar(component?.weight),
    degrees: scalar(component?.degrees),
    ratio: scalar(component?.ratio),
    reads: component?.reads ?? null,
    parts: (Array.isArray(component?.parts) ? component.parts : []).map((part) => ({
      key: part?.key ?? null,
      match: scalar(part?.match),
      value: scalar(part?.value),
      canon: scalar(part?.canon),
      source: part?.source ?? null,
    })),
  })),
  dropped: (Array.isArray(value.dropped) ? value.dropped : []).map((item) => ({
    key: item?.key ?? null,
    why: item?.why ?? null,
  })),
  sourcesDiffer: value.sourcesDiffer ?? null,
} : null;

/** Positive allow-list for the only integrated fields that may be stored. */
export function projectIntegratedReading(reading) {
  if (!reading) return null;
  return {
    version: 1,
    provenanceIds: Object.fromEntries(Object.entries(reading.provenanceIds || {})
      .filter(([, value]) => typeof value === "string")),
    fiveElements: projectFiveElements(reading.fiveElements),
    threeCourts: projectThreeCourts(reading.threeCourts),
    twelvePalaces: projectPalaces(reading.twelvePalaces),
    harmony: projectHarmony(reading.harmony),
  };
}

/** Pure path for callers that already hold the neutral scalar layer. */
export function integratedReadingFromScalars(points, raw = null) {
  return projectIntegratedReading(composeReading(geometryReport(points), null, raw));
}

/** Measure an accepted frame once; no frame, map, mask or sample is returned. */
export function measureIntegratedReading(image, points, documentRef = document) {
  const geometry = geometryReport(points);
  const balanced = shadesOfGray(image.data);
  const { regions } = extractRegions(
    balanced, image.width, image.height, points, documentRef,
  );
  try {
    return projectIntegratedReading(composeReading(geometry, null, rawScalars(regions)));
  } finally {
    balanced.fill(0);
    eraseExtractedRegions(regions);
  }
}
