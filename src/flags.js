/*
 * Build flavour flags.
 *
 * --- WHAT THIS EXISTS TO DO ------------------------------------------------
 * The product has two modules with different regulatory characters:
 *
 *   Module A - the reading. Entertainment. Monetisable. Zero health vocabulary.
 *   Module B - safety referral. Health-adjacent. NEVER billed, NEVER paywalled,
 *              never behind a subscription. That is standing policy, not a
 *              default, and this flag does not change it: the flag decides
 *              whether Module B SHIPS, never whether it is charged for.
 *
 * Module B's existence is what stops the app self-certifying "no health
 * features" on Google Play's Health apps declaration. So the two flavours must
 * be distinguishable before the app runs, not at runtime by inspection.
 *
 * --- THE FLAG MUST GATE EVERY DOOR, NOT ONE ---------------------------------
 * Module B is reachable by two paths: `adapters/safety.js` and the legacy
 * `safety_gate` rules inside `rules.js`. BOTH consult this flag. Gating only
 * the adapter left the rule engine still emitting referrals while the flag
 * read as "off" -- the flavour would have been a label with nothing behind it.
 * If a third path is ever added, it gates here too.
 *
 * --- HONEST LIMITATION, DO NOT OVERSTATE THIS -------------------------------
 * This repo has no build step and no bundler (see CLAUDE.md). Flipping the
 * constant below removes Module B's BEHAVIOUR - no referral is evaluated, none
 * is rendered, and the safety adapter returns nothing - but it does NOT remove
 * Module B's BYTES from the deployed directory. `safety.js` is still served.
 *
 * That is enough to answer the Play declaration truthfully about what the app
 * DOES, and enough for the About screen to state the flavour. It is NOT a claim
 * that the code is absent. A genuinely stripped entertainment-only artefact
 * needs either a build step that omits `src/adapters/safety.js`, or a separate
 * deploy directory. Whoever does the Play submission has to know which of those
 * they actually did, so the flavour string describes the BEHAVIOUR and
 * DEPLOY/COMPLIANCE must record the ARTEFACT.
 *
 * --- ASCII ONLY IN THIS FILE ------------------------------------------------
 * Deliberate. This file gets edited by scripts that flip the flag between
 * builds, and a PowerShell 5.1 Get-Content/Set-Content round-trip reads
 * non-ASCII as ANSI and writes it back double-encoded, corrupting the file. It
 * already happened once here. Keep the separators plain.
 */

/**
 * Master switch for Module B (safety referrals).
 *
 * true  -> wellness flavour: referrals evaluated and shown.
 * false -> entertainment-only flavour: no referral path is reachable.
 */
export const MODULE_B_SAFETY_REFERRALS = true;

/** Compile-time-inspectable flavour name. Surfaced on the About screen. */
export const BUILD_FLAVOUR = MODULE_B_SAFETY_REFERRALS
  ? "wellness"
  : "entertainment-only";

/**
 * Standing policy, expressed as code so it cannot be quietly reversed by a
 * pricing change. Module B is never a paid feature in either flavour.
 * Asserted by the adapter tests.
 */
export const MODULE_B_IS_NEVER_MONETISED = true;
