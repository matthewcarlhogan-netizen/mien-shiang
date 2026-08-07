/*
 * Forward-chaining rule engine — machinery only, no content.
 *
 * Owned by neither module. Module A and Module B each supply their own rule
 * array; this file knows how to match, chain and prioritise them and nothing
 * about what they mean.
 *
 * The rule SET is passed in rather than imported. That is what makes the
 * feature flag work at composition time: an entertainment-only build simply
 * never hands Module B's rules to this function, so there is no filtering step
 * that could be got wrong, and no category string to mis-spell.
 */

const OPS = {
  ">": (a, b) => a > b, ">=": (a, b) => a >= b,
  "<": (a, b) => a < b, "<=": (a, b) => a <= b,
  "==": (a, b) => a === b, "!=": (a, b) => a !== b,
};

function matches(cond, f) {
  if (f.fact !== cond.fact) return false;
  for (const [k, expected] of Object.entries(cond)) {
    if (k === "fact" || k === "absent") continue;
    const actual = f[k];
    if (actual === undefined) return false;
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false;
    } else if (expected && typeof expected === "object") {
      for (const [op, operand] of Object.entries(expected)) {
        if (!OPS[op](actual, operand)) return false;
      }
    } else if (actual !== expected) return false;
  }
  return true;
}

const keyOf = (f) =>
  [f.fact, f.zone && `zone=${f.zone}`, f.condition && `condition=${f.condition}`,
   f.name && `name=${f.name}`].filter(Boolean).join("|");

/**
 * Forward chaining with a salience agenda and refractoriness.
 * Derived `imbalance` facts re-enter working memory, so rules chain.
 *
 * @param {Array} facts  working memory seed
 * @param {Array} rules  the composed rule set (see src/rules.js)
 */
export function runRules(facts, rules) {
  const wm = new Map();
  for (const f of facts) wm.set(keyOf(f), f);

  const fired = new Set();
  const agenda = [...rules].sort((a, b) => b.salience - a.salience);
  const out = {
    referrals: [], recommendations: [], advisories: [],
    trace: [], halted: false, haltedBy: null,
  };

  for (let cycle = 1; cycle <= 16; cycle++) {
    let changed = false;

    for (const rule of agenda) {
      if (out.halted && rule.category !== "safety_gate") continue;

      const pools = [];
      let ok = true;
      for (const cond of rule.all) {
        const hits = [...wm.entries()].filter(([, f]) => matches(cond, f)).map(([k]) => k);
        if (cond.absent) { if (hits.length) { ok = false; break; } continue; }
        if (!hits.length) { ok = false; break; }
        pools.push(hits);
      }
      if (!ok) continue;

      let combos = [[]];
      for (const pool of pools) {
        const next = [];
        for (const c of combos) for (const h of pool) next.push([...c, h]);
        combos = next;
        if (combos.length > 2000) break;   // guard against blowup
      }

      for (const binding of combos) {
        const sig = `${rule.id}|${[...binding].sort().join(",")}`;
        if (fired.has(sig)) continue;
        fired.add(sig);
        changed = true;

        if (rule.then.assert) {
          const nf = { ...rule.then.assert, derivedBy: rule.id, because: binding };
          const k = keyOf(nf);
          if (!wm.has(k)) wm.set(k, nf);
        }
        if (rule.then.haltTcm && !out.halted) {
          out.halted = true; out.haltedBy = rule.id;
        }
        const measured = binding
          .map((k) => wm.get(k))
          .filter((f) => f && f.measured)
          .map((f) => `${f.zone}: ${Object.entries(f.measured)
            .map(([mk, mv]) => `${mk}=${(+mv).toFixed(2)}`).join(", ")}`)
          .join("; ");

        if (rule.category === "safety_gate") {
          out.referrals.push({ rule: rule.id, ...rule.then, measured });
        } else if (rule.category === "safety_advisory") {
          // Module B, but not a referral: no halt, no alarm styling. Rendered
          // under Module B's own disclaimer, never inside Module A's reading.
          out.advisories.push({
            rule: rule.id, module: "B",
            message: rule.then.message,
            recommend: rule.then.recommend || [],
            measured,
          });
        } else {
          out.recommendations.push({
            rule: rule.id, name: rule.then.assert?.name,
            message: rule.then.message, recommend: rule.then.recommend || [],
            sourcesDiffer: rule.then.sourcesDiffer ?? null,
            measured,
          });
        }
        out.trace.push({ rule: rule.id, category: rule.category, describe: rule.describe, cycle });
      }
    }
    if (!changed) break;
  }

  // A gate pre-empts, but if reading rules fired first in the same pass,
  // withdraw them — a referral must not sit next to reassuring advice.
  if (out.halted) {
    out.recommendations = [];
    out.advisories = [];
    out.trace = out.trace.map((t) =>
      t.category === "safety_gate" ? t : { ...t, withdrawn: true });
  }
  return out;
}
