/*
 * Composition root for the rule set.
 *
 * ── THIS FILE CONTAINS NO COPY ─────────────────────────────────────────────
 * Not one user-facing string. Module A's content lives in rules-a.js, Module
 * B's in rules-b.js, and the engine that runs them in rule-engine.js. This
 * file only decides which of them exist for this build.
 *
 * ── HOW THE FLAG WORKS HERE ────────────────────────────────────────────────
 * The entertainment-only flavour does not FILTER Module B's rules out after
 * building a combined list — it never puts them in the list at all. That is
 * deliberate: a filter is a predicate that can be got wrong (a mis-typed
 * category string, a rule added with the wrong category), and it fails open,
 * leaving health-adjacent output in a build that declares it has none.
 * Composition fails closed. If rules-b.js is not composed, there is nothing
 * for a bug to leak.
 */

import { RULES_A } from "./rules-a.js";
import { RULES_B } from "./rules-b.js";
import { MODULE_B_SAFETY_REFERRALS } from "./flags.js";
import { runRules as run } from "./rule-engine.js";

export { runRules as runEngine } from "./rule-engine.js";

/** The rule set for THIS build. Module B is absent entirely when flagged off. */
export const RULES = MODULE_B_SAFETY_REFERRALS
  ? [...RULES_A, ...RULES_B]
  : [...RULES_A];

/** Convenience wrapper so callers do not have to know the composition. */
export function runRules(facts, rules = RULES) {
  return run(facts, rules);
}
