/*
 * The reflection-engine rollout flag.
 *
 * Three states, not two. `off` is the compatibility passage path, `on` is the
 * Reflection Engine path, and `compare` renders BOTH so the two can be read
 * side by side on the same real reading. The beta default is explicit below;
 * compare remains available for parity evidence before the old engine is
 * retired.
 *
 * Pure, so the decision is testable without a browser, and so the precedence
 * between the URL and stored preference is written down once rather than
 * re-derived at each call site.
 */

export const REFLECTION_FLAG_KEY = "qise.flags.reflectionEngine";
export const REFLECTION_MODES = Object.freeze(["off", "on", "compare"]);
export const QISE_BETA_SAFETY_AUTHORIZATION = Object.freeze({
  policy: "NO_REFERRAL_GATE_BY_DESIGN",
  heritageConnectors: true,
});

/*
 * BETA DEFAULT.
 *
 * The product is now being prepared for closed beta, so the Reflection Engine
 * is the default experience on every origin. This does not relabel any source
 * as commercially cleared: the reading surfaces carry BETA_PREVIEW metadata
 * where the source record is not a release approval, and the release audit
 * remains an independent owner/counsel decision.
 *
 * `off` remains an explicit compatibility mode and `compare` remains the
 * diagnostic mode. A query/storage choice can still select either one. The
 * rights/provenance audit is intentionally independent of this runtime switch.
 */
export const INTERNAL_HOST_PATTERNS = Object.freeze([
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /^\[::1\]$/,
  /^0\.0\.0\.0$/,
  /\.app\.github\.dev$/i,
  /\.githubpreview\.dev$/i,
  /\.gitpod\.io$/i,
]);

/** Is this origin a development one? Pure; takes the hostname, not a global. */
export function isInternalHost(hostname) {
  const h = String(hostname || "");
  if (!h) return false;
  return INTERNAL_HOST_PATTERNS.some((re) => re.test(h));
}

/**
 * The default when nothing has been chosen.
 *
 * The closed-beta product gets the Reflection Engine on every origin. The
 * hostname argument is retained for API compatibility and diagnostics; it is
 * not a release gate.
 */
export function defaultMode(hostname) {
  void hostname;
  return "on";
}

const normalise = (v) => (REFLECTION_MODES.includes(String(v)) ? String(v) : null);

/**
 * @param {{search?:string, storage?:{getItem:Function}}} env
 * @returns {"off"|"on"|"compare"}
 */
export function reflectionMode(env = {}) {
  // The query string wins. A flag you can set by editing the address bar is a
  // flag you can hand to someone else in a link, which is what makes a
  // comparison reproducible by a second person.
  try {
    const fromUrl = normalise(new URLSearchParams(env.search || "").get("reflection"));
    if (fromUrl) return fromUrl;
  } catch { /* a malformed query string is an absent flag, not a crash */ }

  try {
    const stored = env.storage && normalise(env.storage.getItem(REFLECTION_FLAG_KEY));
    if (stored) return stored;
  } catch { /* storage denied — same answer */ }

  return defaultMode(env.hostname);
}

export const reflectionEngineEnabled = (env) => reflectionMode(env) !== "off";
export const reflectionComparing = (env) => reflectionMode(env) === "compare";
