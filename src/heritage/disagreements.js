
import { stringField, nullableStringField, enumField, arrayField, objectArrayField, objectField } from "./schema-helpers.js";

export const HERITAGE_DISAGREEMENT_FIELDS = Object.freeze({
  disagreementId: stringField(true),
  nature: enumField(["MAPPING", "TERMINOLOGY", "ANATOMY", "PREDICATE", "CONSTITUENT_MEMBERSHIP", "TEXTUAL_LAYER", "DIRECTION_NAMING", "EDITION_VARIATION", "SOURCE_ATTRIBUTION"], true),
  target: objectField({
    targetType: enumField(["CONSTRUCT", "LINEAGE", "CONSTITUENT", "CONNECTOR", "PREDICATE", "TEXTUAL_LAYER", "SOURCE"], true),
    targetRef: stringField(true),
  }, true),
  status: enumField(["OPEN", "PARALLEL", "RESOLVED"], true),
  positions: objectArrayField({
    positionId: stringField(true),
    sourceId: stringField(true),
    lineageId: nullableStringField(false),
    summary: stringField(true),
    note: nullableStringField(false),
  }, true),
});
