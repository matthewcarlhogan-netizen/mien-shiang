
export const HERITAGE_VERIFICATION_STATUSES = Object.freeze([
  "RECORDED_NOT_VERIFIED",
  "CORROBORATED_NOT_VERIFIED",
  "VERIFIED_SECONDARY",
  "VERIFIED_PRIMARY",
  "ABSTAINED",
]);

export const stringField = (required = false) => ({ type: "string", required });
export const nullableStringField = (required = false) => ({ type: "string|null", required });
export const enumField = (values, required = false) => ({ type: "enum", values, required });
export const arrayField = (required = false) => ({ type: "array", items: "string", required });
export const objectField = (properties, required = false) => ({
  type: "object",
  properties,
  required,
});
export const objectArrayField = (items, required = false) => ({
  type: "array",
  items,
  required,
});

/*
 * A bounded recursive AST field. `jsonSchema` is a real 2020-12 JSON Schema
 * fragment (with its own `$defs`) that `properties()` in schema.js splices
 * in verbatim, rather than falling back to `{ type: "object" }` — which is
 * indistinguishable from "any object is acceptable" and was the Stage 1
 * defect this helper exists to close. The runtime depth/operand-count limits
 * still live only in `validateConditionExpression` (validator.js); JSON
 * Schema can express the six allowed node SHAPES but not "depth <= 4" without
 * repeating the recursion by hand, so this fragment is deliberately a
 * structural contract, not a full re-implementation of the validator.
 */
export const conditionExpressionField = (jsonSchema, required = false) => ({
  type: "condition-expression",
  jsonSchema,
  required,
});
