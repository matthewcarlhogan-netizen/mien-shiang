/*
 * Release profiles are deliberately explicit. The full product and the
 * disclosed beta have different entry points and different evidence bars;
 * neither profile is allowed to masquerade as the other.
 */

export const BETA_EXCLUDED_SOURCE_PREFIXES = Object.freeze([
  "qise.html",
  "qise/",
  "ui/qise/",
  "heritage/",
]);

export const BETA_RELEASE_PROFILE = Object.freeze({
  lane: "beta",
  name: "disclosed-beta",
  enabledSurface: "core-scanner",
  qiseFeatureEnabled: false,
  excludedSourcePrefixes: BETA_EXCLUDED_SOURCE_PREFIXES,
});

export const FULL_RELEASE_PROFILE = Object.freeze({
  lane: "full",
  name: "full-product",
  enabledSurface: "core-scanner-and-qise",
  qiseFeatureEnabled: true,
  excludedSourcePrefixes: Object.freeze([]),
});

export function normaliseRelativePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

export function isExcludedFromBeta(relativePath) {
  const path = normaliseRelativePath(relativePath);
  return BETA_EXCLUDED_SOURCE_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix);
}

export function buildProfile(argv = []) {
  return argv.includes("--beta") ? BETA_RELEASE_PROFILE : FULL_RELEASE_PROFILE;
}
