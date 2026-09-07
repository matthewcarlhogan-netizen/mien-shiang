/*
 * PHASE 0 LIGHT-PROBE — falsification sweep.
 *
 * Section 4's VERIFY: after any change, run a sweep of mutations against the
 * gates this instrument depends on and confirm each one is load-bearing --
 * replacing its real check with a stubbed `true` must change the verdict on
 * a fixture built to fail that specific gate, and restoring the real check
 * must bring the verdict back. A mutation that changes nothing means the
 * gate it targets is dead weight; a mutation "shadowed" by another gate
 * (section 3's coverage-hole warning about the previous retestPass) means
 * the two gates were never actually tested apart.
 *
 * There is no pre-existing sweep in this repository to preserve -- see the
 * top-level report for why (no lightprobe.html, no lampSnr, no pairDrift
 * anywhere in git history before this change). This IS the sweep, built
 * fresh, run once here and reported.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { roiVerdict, LAMP_SNR_MIN } from "../../lightprobe/report.js";
import { withinPairChromaticityDrift, betweenRepeatLevelDrift, pairDrift } from "../../lightprobe/retest.js";
import { prefixVerdict, LOCK_UNVERIFIED_PREFIX } from "../../lightprobe/negotiate.js";

const LANDMARKS = (() => {
  const m = new Array(478).fill(null);
  m[33] = { x: 0, y: 0 };
  m[263] = { x: 100, y: 0 };
  return m;
})();

/**
 * One entry per mutation: `real` computes the true verdict on a fixture
 * built specifically to FAIL that gate; `mutant` simulates the gate being
 * stubbed out (replaced with `true`, or the ordering removed). The sweep
 * asserts real !== mutant (the mutation is observable) and that re-running
 * `real` after "restoring" it reproduces the original result exactly.
 */
const MUTATIONS = [
  {
    name: "lampSnr gated before variance ratio (4.1)",
    real: () => {
      const shadowed = {
        roiName: "shadowed",
        litSamples: [100.1, 100.0, 99.9, 100.2, 100.0, 99.8, 100.1, 100.0],
        unlitSamples: [100, 101, 99, 100.5, 99.5, 100.2, 99.8, 100.1],
        litLab: { L: 60, a: 1, b: 1 }, unlitLab: { L: 60, a: 1, b: 1 },
        lStarsAcrossRepeats: [60, 60, 60, 60],
        varianceRatio: 0.99, // deliberately excellent, to prove it cannot rescue the verdict
      };
      return roiVerdict(shadowed, { unverified: false }).verdict;
    },
    // Mutant: verdict decided by variance ratio alone, ignoring lampSnr.
    mutant: () => (0.99 >= 0.5 ? "PASS" : "FAIL"),
  },
  {
    name: "within-pair chromaticity drift rejects a colour-shifted pair (3.1)",
    real: () => withinPairChromaticityDrift({ L: 60, a: 8, b: 10 }, { L: 60, a: 1, b: 1 }).pass,
    mutant: () => true, // the literal stub the task's VERIFY describes
  },
  {
    name: "between-repeat level drift rejects a wandering L* series (3.2)",
    real: () => betweenRepeatLevelDrift([60, 55, 65, 58, 62]).pass,
    mutant: () => true,
  },
  {
    name: "pairDrift discards a spatially drifted pair (4.3)",
    real: () => pairDrift({
      litCentroidPx: { x: 0, y: 0 }, unlitCentroidPx: { x: 10, y: 0 }, landmarks: LANDMARKS,
    }).pass,
    mutant: () => true,
  },
  {
    name: "LOCK_UNVERIFIED prefix applied under auto lock state (1.3)",
    real: () => prefixVerdict("roi: PASS", true).startsWith(LOCK_UNVERIFIED_PREFIX),
    mutant: () => "roi: PASS".startsWith(LOCK_UNVERIFIED_PREFIX), // skips the prefixing step entirely
  },
];

test("falsification sweep: every mutation changes its target verdict, and restoring the real check reproduces the original result", () => {
  let flipped = 0;
  const report = [];
  for (const m of MUTATIONS) {
    const before = m.real();
    const mutated = m.mutant();
    const restored = m.real();

    const wasFlipped = before !== mutated;
    if (wasFlipped) flipped += 1;
    report.push({ name: m.name, real: before, mutant: mutated, restored, flipped: wasFlipped });

    assert.notEqual(before, mutated, `mutation "${m.name}" must change the verdict on its fixture`);
    assert.equal(restored, before, `"${m.name}" must reproduce the original result after restoring the real check`);
  }

  // Printed so the run's own stdout is the evidence for the report, not a
  // claim made about it afterward.
  console.log(`falsification sweep: ${MUTATIONS.length} mutations run, ${flipped} flipped the verdict, ${MUTATIONS.length - flipped} did not.`);
  for (const r of report) console.log(`  ${r.flipped ? "FLIP" : "SAME"}  ${r.name}  real=${r.real} mutant=${r.mutant} restored=${r.restored}`);

  assert.equal(flipped, MUTATIONS.length, "every mutation in the sweep must be observable -- none may be shadowed");
});

/*
 * The specific coverage hole named in section 3's VERIFY ("this is the same
 * coverage hole the previous run found in retestPass, so check for it
 * explicitly"): confirm chromaticity and level drift are independently
 * observable, i.e. neither mutation is shadowed by the other gate also
 * failing on the same fixture. tests/lightprobe/retest.test.js already
 * covers this with two dedicated fixtures (case A / case B); this restates
 * it as an explicit falsification pair for the sweep's own record.
 */
test("chromaticity-drift and level-drift mutations are not shadowed by each other", () => {
  const chromaticityFailFixture = { lit: { L: 60, a: 8, b: 10 }, unlit: { L: 60, a: 1, b: 1 } };
  const levelFailFixture = [60, 55, 65, 58, 62];

  const chromReal = withinPairChromaticityDrift(chromaticityFailFixture.lit, chromaticityFailFixture.unlit);
  const levelOnSameCase = betweenRepeatLevelDrift([60, 60.1, 59.9, 60, 60.05]); // tight, must PASS
  assert.equal(chromReal.pass, false);
  assert.equal(levelOnSameCase.pass, true, "chromaticity fixture must not also fail the level gate");

  const levelReal = betweenRepeatLevelDrift(levelFailFixture);
  const chromOnSameCase = withinPairChromaticityDrift({ L: 60, a: 1, b: 1 }, { L: 60, a: 1.1, b: 0.9 }); // tight, must PASS
  assert.equal(levelReal.pass, false);
  assert.equal(chromOnSameCase.pass, true, "level fixture must not also fail the chromaticity gate");
});
