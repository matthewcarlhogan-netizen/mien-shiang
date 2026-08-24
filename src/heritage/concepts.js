
import { stringField, nullableStringField } from "./schema-helpers.js";

export const HERITAGE_CONCEPT_REGISTRY = Object.freeze({
  form: { conceptId: "form" },
  shen: { conceptId: "shen" },
  heritageQiSe: { conceptId: "heritageQiSe" },
});

export const HERITAGE_CONCEPT_FIELDS = Object.freeze({
  conceptId: stringField(true),
  canonicalChineseName: nullableStringField(true),
  note: nullableStringField(false),
});
