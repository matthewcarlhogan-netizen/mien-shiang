
import { stringField, nullableStringField, enumField } from "./schema-helpers.js";
import { HERITAGE_MEASUREMENT_AVAILABILITY } from "./constants.js";

export const HERITAGE_CONCEPT_FIELDS = Object.freeze({
  conceptId: stringField(true),
  canonicalChineseName: nullableStringField(true),
  measurementAvailability: enumField(HERITAGE_MEASUREMENT_AVAILABILITY, true),
  modernMeasurementBinding: nullableStringField(true),
  note: nullableStringField(false),
});

/*
 * A tiny registry. These are NOT a seventh/eighth/ninth core construct —
 * HERITAGE_CONSTRUCT_IDS in constants.js stays exactly six. `form` is not
 * auto-mapped to the modern Five Forms classifier and `heritageQiSe` is not
 * bound to measured Qi Se state; both bindings are explicitly forbidden by
 * HERITAGE_NEGATIVE_RELATIONSHIP_REGISTRY.
 */
export const HERITAGE_CONCEPT_REGISTRY = Object.freeze({
  form: Object.freeze({
    conceptId: "form",
    canonicalChineseName: "形",
    measurementAvailability: "CAMERA_GEOMETRY_INSUFFICIENT",
    modernMeasurementBinding: null,
    note: "Heritage-only concept describing classical 形/形神 discussion. Not the modern geometry face-shape classifier.",
  }),
  shen: Object.freeze({
    conceptId: "shen",
    canonicalChineseName: "神",
    measurementAvailability: "UNMEASURABLE",
    modernMeasurementBinding: null,
    note: "Shen is heritage-only and is never measured; see the shen-unmeasurable negative rule.",
  }),
  heritageQiSe: Object.freeze({
    conceptId: "heritageQiSe",
    canonicalChineseName: "氣色",
    measurementAvailability: "UNMEASURABLE",
    modernMeasurementBinding: null,
    note: "The classical 氣色 discussion. Not bound to the modern Qi Se measurement pipeline; see the no-qise-to-form-classification negative rule.",
  }),
});
