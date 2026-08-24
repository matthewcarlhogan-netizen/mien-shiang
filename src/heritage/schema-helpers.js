
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
