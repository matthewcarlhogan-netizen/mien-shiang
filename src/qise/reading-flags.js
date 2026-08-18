/*
 * The reflection-engine rollout flag.
 *
 * Three states, not two. `off` is today's shipped behaviour, `on` is the new
 * path alone, and `compare` renders BOTH so the two can be read side by side on
 * the same real reading. Compare is the state that matters: the owner's
 * requirement is parity evidence before the old engine is removed, and evidence
 * means looking at the same input through both engines, not trusting a
 * changelog.
 *
 * Pure, so the decision is testable without a browser, and so the precedence
 * between the URL and stored preference is written down once rather than
 * re-derived at each call site.
 */

export const REFLECTION_FLAG_KEY = "qise.flags.reflectionEngine";
export const REFLECTION_MODES = Object.freeze(["off", "on", "compare"]);

/*
 * INTERNAL DEFAULT ≠ PUBLIC DEFAULT.
 *
 * Development should proceed against the engine we intend to keep, not the one
 * we intend to replace. But the heritage layer paraphrases sources whose
 * commercial rights are recorded as Blocked in `commercial-rights-audit.md`,
 * so "on by default" must not be able to reach a public user by accident.
 *
 * The split is by HOST rather than by a build flag, and that is deliberate. A
 * build flag is a variable someone can set wrongly in a release pipeline, and
 * the failure is silent and public. A host allowlist inverts the risk: the
 * shipped origin is not on it, so a misconfigured build fails CLOSED. There is
 * no value of any environment variable that turns the engine on for a visitor
 * to the published site.
 *
 * Every entry here is a development origin — a local server, a Codespaces
 * forwarded port, a preview host. The production origin is deliberately absent
 * and a test asserts it stays absent.
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
 * Internal origins get the Reflection Engine. Everywhere else — including any
 * origin this list has never heard of — gets the shipped passage engine.
 */
export function defaultMode(hostname) {
  return isInternalHost(hostname) ? "on" : "off";
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
